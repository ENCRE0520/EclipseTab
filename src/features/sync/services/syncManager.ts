/**
 * 同步管理器
 * 编排同步流程：上传、下载、冲突检测、权限请求
 */

import {
    LEGACY_ASSETS_PREFIX,
    LEGACY_SYNC_FILENAME,
    SNAPSHOT_DIR,
    WebDAVConfig,
    deleteFile,
    downloadFile,
    downloadText,
    listFiles,
    testWebDAVConnection,
    uploadFile,
    uploadText,
} from './webdavClient';
import { getLastSyncTime, hasLocalChanges, saveUploadFingerprint } from './syncData';
import {
    SnapshotPackage,
    applySnapshot,
    createSnapshot,
    getSnapshotAssetRefs,
    isSnapshotManifest,
    snapshotFromLegacySync,
} from '@/shared/utils/snapshot';

export interface SyncResult {
    ok: boolean;
    message: string;
}

type SyncOptions = {
    syncWallpaper: boolean;
    syncStickers: boolean;
};

type CloudSnapshot = SnapshotPackage & {
    isLegacy: boolean;
};

const MANIFEST_PATH = `${SNAPSHOT_DIR}/manifest.json`;
const DATA_PATH = `${SNAPSHOT_DIR}/data.json`;

/** 获取同步选项 */
function getSyncOptions(): SyncOptions {
    return {
        syncWallpaper: localStorage.getItem('EclipseTab_syncWallpaper') === 'true',
        syncStickers: localStorage.getItem('EclipseTab_syncStickers') === 'true',
    };
}

/** 自动同步是否启用 */
export function isAutoSyncEnabled(): boolean {
    return localStorage.getItem('EclipseTab_autoSync') === 'true';
}

export function setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem('EclipseTab_autoSync', String(enabled));
}

async function blobToJson<T>(blob: Blob): Promise<T> {
    return JSON.parse(await blob.text()) as T;
}

async function uploadSnapshot(config: WebDAVConfig, snapshot: SnapshotPackage): Promise<SyncResult> {
    const manifestResult = await uploadText(config, MANIFEST_PATH, JSON.stringify(snapshot.manifest, null, 2));
    if (!manifestResult.ok) return manifestResult;

    const dataResult = await uploadText(config, DATA_PATH, JSON.stringify(snapshot.data, null, 2));
    if (!dataResult.ok) return dataResult;

    let assetOk = 0;
    let assetFail = 0;
    for (const asset of snapshot.assets) {
        const result = await uploadFile(config, `${SNAPSHOT_DIR}/${asset.path}`, asset.blob, asset.blob.type || undefined);
        if (result.ok) assetOk++;
        else assetFail++;
    }

    await cleanupSnapshotAssets(config, snapshot);

    if (assetFail > 0) return { ok: true, message: `Upload successful. Assets: ${assetOk} ok, ${assetFail} failed` };
    return { ok: true, message: assetOk > 0 ? `Upload successful. ${assetOk} assets synced` : 'Upload successful' };
}

async function cleanupSnapshotAssets(config: WebDAVConfig, snapshot: SnapshotPackage): Promise<void> {
    const keep = new Set(snapshot.assets.map(asset => asset.path));
    for (const dir of ['assets/favicons', 'assets/stickers', 'assets/wallpapers']) {
        const files = await listFiles(config, `${SNAPSHOT_DIR}/${dir}`);
        for (const file of files) {
            const path = `${dir}/${file}`;
            if (!keep.has(path)) await deleteFile(config, `${SNAPSHOT_DIR}/${path}`);
        }
    }
}

async function downloadCloudSnapshot(config: WebDAVConfig, includeAssets: boolean): Promise<CloudSnapshot | null> {
    const manifestResult = await downloadFile(config, MANIFEST_PATH);
    if (manifestResult.ok && manifestResult.blob) {
        const manifest = await blobToJson<SnapshotPackage['manifest']>(manifestResult.blob);
        if (!isSnapshotManifest(manifest)) throw new Error('Invalid snapshot manifest');

        const dataResult = await downloadFile(config, DATA_PATH);
        if (!dataResult.ok || !dataResult.blob) throw new Error(dataResult.message);

        const data = await blobToJson<SnapshotPackage['data']>(dataResult.blob);
        const assets: SnapshotPackage['assets'] = [];
        if (includeAssets) {
            for (const asset of getSnapshotAssetRefs(manifest)) {
                const result = await downloadFile(config, `${SNAPSHOT_DIR}/${asset.path}`);
                if (result.ok && result.blob) assets.push({ path: asset.path, blob: result.blob });
            }
        }
        return { manifest, data, assets, isLegacy: false };
    }

    const legacyResult = await downloadText(config, LEGACY_SYNC_FILENAME);
    if (!legacyResult.ok || !legacyResult.data) return null;

    const legacy = JSON.parse(legacyResult.data);
    const snapshot = snapshotFromLegacySync(legacy);
    if (includeAssets) {
        for (const asset of snapshot.manifest.assets.wallpapers) {
            const result = await downloadFile(config, `${LEGACY_ASSETS_PREFIX}wallpaper_${asset.id}`);
            if (result.ok && result.blob) snapshot.assets.push({ path: asset.path, blob: result.blob });
        }
        for (const asset of snapshot.manifest.assets.stickerImages) {
            const result = await downloadFile(config, `${LEGACY_ASSETS_PREFIX}sticker_${asset.id}`);
            if (result.ok && result.blob) snapshot.assets.push({ path: asset.path, blob: result.blob });
        }
    }
    return { ...snapshot, isLegacy: true };
}

/**
 * 轻量检查云端是否有更新（只下载 manifest / 旧 JSON，不下载资产）
 */
export async function checkForUpdates(): Promise<{ hasUpdate: boolean; remoteTime?: number }> {
    const config = getWebDAVConfig();
    if (!config || !isAutoSyncEnabled()) return { hasUpdate: false };

    try {
        const snapshot = await downloadCloudSnapshot(config, false);
        if (!snapshot) return { hasUpdate: false };
        const remoteTime = snapshot.manifest.lastUpdated;
        return {
            hasUpdate: remoteTime > getLastSyncTime(),
            remoteTime,
        };
    } catch {
        return { hasUpdate: false };
    }
}

/**
 * 完整自动同步：检测更新 + 按需上传
 * 每次打开新标签页时调用
 */
export async function autoSync(): Promise<void> {
    const config = getWebDAVConfig();
    if (!config || !isAutoSyncEnabled()) return;

    const lastSync = getLastSyncTime();

    if (lastSync === 0) {
        const result = await downloadFromCloud(true);
        if (result.ok) {
            setTimeout(() => window.location.reload(), 300);
            return;
        }
        if (hasLocalChanges()) await uploadToCloud();
        return;
    }

    const update = await checkForUpdates();
    if (update.hasUpdate) {
        await downloadFromCloud(true);
        setTimeout(() => window.location.reload(), 300);
        return;
    }

    if (hasLocalChanges()) await uploadToCloud();
}

// ============================================================================

/**
 * 请求 Chrome 授予扩展对指定 URL 的访问权限
 */
async function requestHostPermission(url: string): Promise<boolean> {
    // 非扩展环境（如 dev server）跳过
    if (typeof chrome === 'undefined' || !chrome.permissions) return true;

    try {
        const origin = new URL(url).origin;
        return await chrome.permissions.request({ origins: [`${origin}/*`] });
    } catch {
        return false;
    }
}

/**
 * 在执行 WebDAV 请求前确保有权限
 */
async function ensureHostPermission(config: WebDAVConfig): Promise<boolean> {
    // 非扩展环境跳过权限检查
    if (typeof chrome === 'undefined' || !chrome.permissions) return true;

    try {
        const origin = new URL(config.url).origin;
        const hasIt = await chrome.permissions.contains({ origins: [`${origin}/*`] });
        if (hasIt) return true;
        return await requestHostPermission(config.url);
    } catch {
        return false;
    }
}

/** 获取当前 WebDAV 配置 */
export function getWebDAVConfig(): WebDAVConfig | null {
    try {
        const url = localStorage.getItem('EclipseTab_webdav_url');
        const username = localStorage.getItem('EclipseTab_webdav_user');
        const password = localStorage.getItem('EclipseTab_webdav_pass');
        if (url && username && password) return { url, username, password };
        return null;
    } catch {
        return null;
    }
}

/**
 * 测试 WebDAV 连接
 */
export async function testConnection(): Promise<SyncResult> {
    const config = getWebDAVConfig();
    if (!config) return { ok: false, message: 'Please fill in server URL, username and password' };

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    const result = await testWebDAVConnection(config);
    return { ok: result.ok, message: result.message };
}

/**
 * 上传数据到云端（覆盖新版 snapshot，不覆盖旧云备份）
 */
export async function uploadToCloud(): Promise<SyncResult> {
    const config = getWebDAVConfig();
    if (!config) return { ok: false, message: 'Please configure WebDAV connection first' };

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    const options = getSyncOptions();
    const snapshot = await createSnapshot({
        includeWallpaper: options.syncWallpaper,
        includeStickers: options.syncStickers,
        includeFavicons: true,
    });
    const result = await uploadSnapshot(config, snapshot);
    if (!result.ok) return result;

    localStorage.setItem('EclipseTab_lastSyncTime', String(snapshot.manifest.lastUpdated));
    saveUploadFingerprint();
    return result;
}

/**
 * 从云端下载数据
 * 检测冲突：如果云端比本地旧，询问用户是否仍要覆盖
 */
export async function downloadFromCloud(force = false): Promise<SyncResult & { hasConflict?: boolean; remoteTime?: number; localTime?: number }> {
    const config = getWebDAVConfig();
    if (!config) return { ok: false, message: 'Please configure WebDAV connection first' };

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    try {
        const snapshot = await downloadCloudSnapshot(config, true);
        if (!snapshot) return { ok: false, message: 'No backup file found on cloud' };

        const remoteTime = snapshot.manifest.lastUpdated;
        const localTime = getLastSyncTime();

        if (!force) {
            if (remoteTime === localTime) {
                return { ok: true, message: 'Already up to date', remoteTime, localTime };
            }
            if (remoteTime < localTime) {
                return {
                    ok: false,
                    message: 'Cloud data is older than local. Download anyway?',
                    hasConflict: true,
                    remoteTime,
                    localTime,
                };
            }
        }

        await applySnapshot(snapshot, false);
        localStorage.setItem('EclipseTab_lastSyncTime', String(remoteTime));
        saveUploadFingerprint();

        const source = snapshot.isLegacy ? 'legacy cloud backup' : 'cloud backup';
        return { ok: true, message: `Restored from ${source} (${new Date(remoteTime).toLocaleString()})` };
    } catch {
        return { ok: false, message: 'Failed to parse cloud backup file' };
    }
}

/**
 * 全量同步（下载 + 刷新页面）
 */
export async function fullSyncFromCloud(force = false): Promise<SyncResult & { hasConflict?: boolean; remoteTime?: number; localTime?: number }> {
    const result = await downloadFromCloud(force);
    if (result.ok) setTimeout(() => window.location.reload(), 500);
    return result;
}
