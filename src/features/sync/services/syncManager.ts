/**
 * 同步管理器
 * 编排同步流程：上传、下载、冲突检测、权限请求
 */

import { WebDAVConfig, testWebDAVConnection, uploadSyncData, downloadSyncData, uploadAsset, downloadAsset, listAssetKeys, deleteAsset } from './webdavClient';
import { packageLocalData, collectAssetBlobs, restoreAssetBlobs, restoreFromSyncData, isRemoteNewer, getLastSyncTime, SyncOptions, hasLocalChanges, saveUploadFingerprint } from './syncData';

export interface SyncResult {
    ok: boolean;
    message: string;
}

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

/**
 * 轻量检查云端是否有更新（只下载 head，不下载全部数据）
 */
export async function checkForUpdates(): Promise<{ hasUpdate: boolean; remoteTime?: number }> {
    const config = getWebDAVConfig();
    if (!config || !isAutoSyncEnabled()) return { hasUpdate: false };

    try {
        const localTime = getLastSyncTime();
        const result = await downloadSyncData(config);
        if (!result.ok || !result.data) return { hasUpdate: false };

        const syncData = JSON.parse(result.data);
        return {
            hasUpdate: syncData.lastUpdated > localTime,
            remoteTime: syncData.lastUpdated,
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
        if (hasLocalChanges()) {
            await uploadToCloud();
        }
        return;
    }

    const update = await checkForUpdates();
    if (update.hasUpdate) {
        await downloadFromCloud(true);
        setTimeout(() => window.location.reload(), 300);
        return;
    }

    if (hasLocalChanges()) {
        await uploadToCloud();
    }
}

// ============================================================================

/**
 * 请求 Chrome 授予扩展对指定 URL 的访问权限
 */
async function requestHostPermission(url: string): Promise<boolean> {
    // 非扩展环境（如 dev server）跳过
    if (typeof chrome === 'undefined' || !chrome.permissions) {
        return true;
    }

    try {
        // 从 URL 提取 origin
        const origin = new URL(url).origin;
        const granted = await chrome.permissions.request({
            origins: [`${origin}/*`],
        });
        return granted;
    } catch {
        return false;
    }
}

/**
 * 在执行 WebDAV 请求前确保有权限
 */
async function ensureHostPermission(config: WebDAVConfig): Promise<boolean> {
    // 非扩展环境跳过权限检查
    if (typeof chrome === 'undefined' || !chrome.permissions) {
        return true;
    }

    try {
        const origin = new URL(config.url).origin;
        const hasIt = await chrome.permissions.contains({
            origins: [`${origin}/*`],
        });
        if (hasIt) return true;

        // 请求权限，用户会看到浏览器弹窗
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
        if (url && username && password) {
            return { url, username, password };
        }
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
    if (!config) {
        return { ok: false, message: 'Please fill in server URL, username and password' };
    }

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    const result = await testWebDAVConnection(config);
    return { ok: result.ok, message: result.message };
}

/**
 * 上传数据到云端（覆盖）
 */
export async function uploadToCloud(): Promise<SyncResult> {
    const config = getWebDAVConfig();
    if (!config) {
        return { ok: false, message: 'Please configure WebDAV connection first' };
    }

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    const options = getSyncOptions();
    const syncData = await packageLocalData(options);
    const jsonContent = JSON.stringify(syncData, null, 2);
    const result = await uploadSyncData(config, jsonContent);

    if (!result.ok) return result;

    // 上传资产文件
    let assetInfo = '';
    if (syncData.assets.wallpapers.length > 0 || syncData.assets.stickers.length > 0) {
        const blobs = await collectAssetBlobs(syncData);
        let assetOk = 0;
        let assetFail = 0;

        for (const [key, blob] of blobs) {
            const ok = await uploadAsset(config, key, blob);
            if (ok) assetOk++; else assetFail++;
        }

        if (assetFail > 0) {
            assetInfo = `. Assets: ${assetOk} ok, ${assetFail} failed`;
            console.warn('Sync upload: some assets failed', { assetOk, assetFail });
        } else if (assetOk > 0) {
            assetInfo = `. ${assetOk} assets synced`;
        }

        // 清理云端孤儿文件（不在当前资产清单中的旧文件）
        const allKeys = [
            ...syncData.assets.wallpapers.map(id => `wallpaper_${id}`),
            ...syncData.assets.stickers.map(id => `sticker_${id}`),
        ];
        if (allKeys.length > 0) {
            try {
                const cloudFiles = await listAssetKeys(config);
                for (const file of cloudFiles) {
                    if (!allKeys.includes(file)) {
                        await deleteAsset(config, file);
                    }
                }
            } catch { /* cleanup is non-critical */ }
        }
    }

    localStorage.setItem('EclipseTab_lastSyncTime', String(syncData.lastUpdated));
    saveUploadFingerprint();
    return { ok: true, message: `Upload successful${assetInfo}` };
}

/**
 * 从云端下载数据
 * 检测冲突：如果云端比本地旧，询问用户是否仍要覆盖
 */
export async function downloadFromCloud(force = false): Promise<SyncResult & { hasConflict?: boolean; remoteTime?: number; localTime?: number }> {
    const config = getWebDAVConfig();
    if (!config) {
        return { ok: false, message: 'Please configure WebDAV connection first' };
    }

    const hasPermission = await ensureHostPermission(config);
    if (!hasPermission) {
        return { ok: false, message: 'Permission denied. Please grant access to the WebDAV server in the popup.' };
    }

    const result = await downloadSyncData(config);
    if (!result.ok || !result.data) {
        return { ok: false, message: result.message };
    }

    try {
        const syncData = JSON.parse(result.data);

        // 校验数据格式
        if (!syncData.version || !syncData.lastUpdated || !syncData.data) {
            return { ok: false, message: 'Invalid backup file format' };
        }

        // 向后兼容：旧备份没有 assets 字段
        if (!syncData.assets) {
            syncData.assets = { wallpapers: [], stickers: [] };
        }

        const localTime = getLastSyncTime();

        // 冲突检测
        if (!force) {
            if (syncData.lastUpdated === localTime) {
                return {
                    ok: true,
                    message: 'Already up to date',
                    remoteTime: syncData.lastUpdated,
                    localTime,
                };
            }
            if (!isRemoteNewer(syncData)) {
                return {
                    ok: false,
                    message: 'Cloud data is older than local. Download anyway?',
                    hasConflict: true,
                    remoteTime: syncData.lastUpdated,
                    localTime,
                };
            }
        }

        // 先恢复资产文件（不论本地开关如何，云端有就下载）
        let assetCount = 0;
        if ((syncData.assets?.wallpapers?.length || 0) > 0) {
            const blobMap = new Map<string, Blob>();
            for (const id of syncData.assets.wallpapers) {
                const blob = await downloadAsset(config, `wallpaper_${id}`);
                if (blob) blobMap.set(`wallpaper_${id}`, blob);
            }
            if (blobMap.size > 0) {
                await restoreAssetBlobs(syncData, blobMap);
                assetCount += blobMap.size;
            }
        }
        if ((syncData.assets?.stickers?.length || 0) > 0) {
            const blobMap = new Map<string, Blob>();
            for (const id of syncData.assets.stickers) {
                const blob = await downloadAsset(config, `sticker_${id}`);
                if (blob) blobMap.set(`sticker_${id}`, blob);
            }
            if (blobMap.size > 0) {
                await restoreAssetBlobs(syncData, blobMap);
                assetCount += blobMap.size;
            }
        }

        // 再恢复 localStorage 数据（贴纸/配置等会触发 UI 更新）
        restoreFromSyncData(syncData);

        // 更新指纹，避免自动同步时误判为有本地改动
        saveUploadFingerprint();

        return { ok: true, message: `Restored from cloud backup (${new Date(syncData.lastUpdated).toLocaleString()})` };
    } catch (e) {
        return { ok: false, message: 'Failed to parse cloud backup file' };
    }
}

/**
 * 全量同步（下载 + 刷新页面）
 */
export async function fullSyncFromCloud(force = false): Promise<SyncResult & { hasConflict?: boolean; remoteTime?: number; localTime?: number }> {
    const result = await downloadFromCloud(force);
    if (result.ok) {
        setTimeout(() => window.location.reload(), 500);
    }
    return result;
}
