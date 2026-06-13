/**
 * 同步数据打包/解包
 * 负责将 localStorage 中的所有 EclipseTab 数据打包为一个 JSON，
 * 以及从 JSON 恢复数据到 localStorage
 */

import { storage } from '@/shared/utils/storage';
import { db } from '@/shared/utils/db';

export interface SyncOptions {
    syncWallpaper: boolean;
    syncStickers: boolean;
}

/** 资产清单，记录需要同步的资产文件信息 */
export interface AssetManifest {
    wallpapers: string[];   // wallpaper IDs
    stickers: string[];     // sticker image IDs
}

/** 同步数据文件结构 */
export interface SyncData {
    version: number;
    lastUpdated: number;
    deviceName: string;
    assets: AssetManifest;  // 资产清单
    data: {
        config: ReturnType<typeof storage.getConfig>;
        dockItems: ReturnType<typeof storage.getDockItems>;
        searchEngine: ReturnType<typeof storage.getSearchEngine>;
        spaces: ReturnType<typeof storage.getSpaces>;
        stickers: ReturnType<typeof storage.getStickers>;
        deletedStickers: ReturnType<typeof storage.getDeletedStickers>;
        wallpaperId: string | null;
    };
}

const SYNC_VERSION = 1;
const STORAGE_KEY_LAST_SYNC = 'EclipseTab_lastSyncTime';

/** 获取设备名称（用于标识） */
function getDeviceName(): string {
    try {
        const saved = localStorage.getItem('EclipseTab_deviceName');
        if (saved) return saved;
    } catch { /* ignore */ }
    return 'Unknown Device';
}

/**
 * 将本地所有数据打包为 SyncData
 * @param options 同步选项，控制是否包含资产
 */
export async function packageLocalData(options?: SyncOptions): Promise<SyncData> {
    const syncData: SyncData = {
        version: SYNC_VERSION,
        lastUpdated: Date.now(),
        deviceName: getDeviceName(),
        assets: { wallpapers: [], stickers: [] },
        data: {
            config: storage.getConfig(),
            dockItems: storage.getDockItems(),
            searchEngine: storage.getSearchEngine(),
            spaces: storage.getSpaces(),
            stickers: storage.getStickers(),
            deletedStickers: storage.getDeletedStickers(),
            wallpaperId: storage.getWallpaperId(),
        },
    };

    // 收集资产清单
    if (options?.syncWallpaper) {
        try {
            const wallpapers = await db.getAll();
            syncData.assets.wallpapers = wallpapers.map(w => w.id);
        } catch { /* ignore */ }
    }
    if (options?.syncStickers) {
        try {
            const stickers = storage.getStickers();
            const imageIds = stickers
                .filter(s => s.type === 'image' && s.content && !s.content.startsWith('data:'))
                .map(s => s.content);
            syncData.assets.stickers = imageIds;
        } catch { /* ignore */ }
    }

    return syncData;
}

/**
 * 根据资产清单从 IndexedDB 读取 Blob 数据
 */
export async function collectAssetBlobs(syncData: SyncData): Promise<Map<string, Blob>> {
    const blobs = new Map<string, Blob>();

    for (const id of syncData.assets.wallpapers) {
        try {
            const item = await db.get(id);
            if (item?.data) blobs.set(`wallpaper_${id}`, item.data);
        } catch { /* ignore */ }
    }

    for (const id of syncData.assets.stickers) {
        try {
            const item = await db.getStickerImage(id);
            if (item?.data) blobs.set(`sticker_${id}`, item.data);
        } catch { /* ignore */ }
    }

    return blobs;
}

/**
 * 恢复资产文件到 IndexedDB
 */
export async function restoreAssetBlobs(syncData: SyncData, blobMap: Map<string, Blob>): Promise<void> {
    for (const id of syncData.assets.wallpapers) {
        const blob = blobMap.get(`wallpaper_${id}`);
        if (blob) {
            try {
                // 检查本地是否已有
                const existing = await db.get(id);
                if (!existing) {
                    await db.save({ id, data: blob, createdAt: Date.now() });
                }
            } catch (e) {
                console.warn('Sync: Failed to restore wallpaper', id, e);
            }
        }
    }

    for (const id of syncData.assets.stickers) {
        const blob = blobMap.get(`sticker_${id}`);
        if (blob) {
            try {
                const existing = await db.getStickerImage(id);
                if (!existing) {
                    await db.saveStickerImage({ id, data: blob });
                }
            } catch (e) {
                console.warn('Sync: Failed to restore sticker image', id, e);
            }
        }
    }
}

/**
 * 将 SyncData 恢复/写入本地存储
 * 会清空内存缓存以确保下次读取时使用新数据
 */
export function restoreFromSyncData(syncData: SyncData): void {
    const { data } = syncData;

    if (data.config) storage.saveConfig(data.config);
    if (data.dockItems) storage.saveDockItems(data.dockItems);
    if (data.searchEngine) storage.saveSearchEngine(data.searchEngine);
    if (data.spaces) storage.saveSpaces(data.spaces);
    if (data.stickers) storage.saveStickers(data.stickers);
    if (data.deletedStickers) storage.saveDeletedStickers(data.deletedStickers);
    if (data.wallpaperId !== undefined) storage.saveWallpaperId(data.wallpaperId);

    // 记录同步时间
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(syncData.lastUpdated));
}

/**
 * 获取本地最后同步时间
 */
export function getLastSyncTime(): number {
    try {
        const val = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
        return val ? parseInt(val, 10) : 0;
    } catch {
        return 0;
    }
}

/**
 * 获取人类可读的最后同步时间标签
 */
export function getLastSyncTimeLabel(): string {
    const time = getLastSyncTime();
    if (!time) return '';
    const diff = Date.now() - time;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * 检查云端数据是否比本地更新
 * 如果云端 lastUpdated > 本地 lastUpdated，说明云端更新
 */
export function isRemoteNewer(syncData: SyncData): boolean {
    const localTime = getLastSyncTime();
    return syncData.lastUpdated > localTime;
}

/** 存储键：上次上传的数据指纹 */
const STORAGE_KEY_FINGERPRINT = 'EclipseTab_lastFingerprint';

/**
 * 计算当前本地数据的指纹（用于检测是否有变化）
 * 只包含 localStorage 关键数据，不涉及资产文件
 */
export function computeLocalFingerprint(): string {
    const keys = [
        'EclipseTab_config',
        'EclipseTab_spaces',
        'EclipseTab_dockItems',
        'EclipseTab_searchEngine',
        'EclipseTab_stickers',
        'EclipseTab_deletedStickers',
        'EclipseTab_wallpaperId',
    ];
    let combined = '';
    for (const key of keys) {
        try {
            const val = localStorage.getItem(key);
            if (val) combined += val;
        } catch { /* ignore */ }
    }
    // 简单哈希
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

/**
 * 检查本地数据是否有变化（相比上次上传时）
 */
export function hasLocalChanges(): boolean {
    const lastFp = localStorage.getItem(STORAGE_KEY_FINGERPRINT);
    if (!lastFp) return true; // 从未上传过，视为有变化
    return computeLocalFingerprint() !== lastFp;
}

/**
 * 更新存储的上传指纹
 */
export function saveUploadFingerprint(): void {
    localStorage.setItem(STORAGE_KEY_FINGERPRINT, computeLocalFingerprint());
}
