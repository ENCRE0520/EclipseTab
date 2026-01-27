/**
 * 图标 LRU 缓存
 * 性能优化: 限制缓存大小，自动淘汰最久未使用的条目防止内存泄漏
 */

type IconCacheValue = { url: string; isFallback: boolean };

// ============================================================================
// LRU 缓存实现: 使用 Map 的有序特性实现 LRU
// Map 会按插入顺序保持 key，删除并重新插入可将条目移到末尾
// ============================================================================

const MAX_CACHE_SIZE = 100; // 最大缓存条目数
const iconCache = new Map<string, IconCacheValue>();

/**
 * 获取缓存的图标
 * 命中时将条目移到末尾（最近使用）
 */
export const getCachedIcon = (domain: string): IconCacheValue | undefined => {
    const cached = iconCache.get(domain);
    if (cached) {
        // LRU: 移动到末尾表示最近使用
        iconCache.delete(domain);
        iconCache.set(domain, cached);
    }
    return cached;
};

/**
 * 设置图标缓存
 * 超出容量时淘汰最久未使用的条目（Map 的第一个条目）
 */
export const setCachedIcon = (domain: string, icon: IconCacheValue): void => {
    // 如果已存在，先删除以便重新插入到末尾
    if (iconCache.has(domain)) {
        iconCache.delete(domain);
    }

    // 检查容量，淘汰最旧条目
    if (iconCache.size >= MAX_CACHE_SIZE) {
        // Map.keys().next() 返回第一个（最旧的）key
        const oldestKey = iconCache.keys().next().value;
        if (oldestKey) {
            iconCache.delete(oldestKey);
        }
    }

    iconCache.set(domain, icon);
};

/**
 * 获取当前缓存大小（用于调试）
 */
export const getCacheSize = (): number => {
    return iconCache.size;
};

/**
 * 清空缓存（用于调试/重置）
 */
export const clearIconCache = (): void => {
    iconCache.clear();
};
