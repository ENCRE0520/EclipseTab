const STORAGE_KEY_LAST_SYNC = 'EclipseTab_lastSyncTime';
const STORAGE_KEY_FINGERPRINT = 'EclipseTab_lastFingerprint';

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
 * 计算当前本地数据的指纹（用于检测是否有变化）
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
        } catch {
            // ignore
        }
    }

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
    if (!lastFp) return true;
    return computeLocalFingerprint() !== lastFp;
}

/**
 * 更新存储的上传指纹
 */
export function saveUploadFingerprint(): void {
    localStorage.setItem(STORAGE_KEY_FINGERPRINT, computeLocalFingerprint());
}
