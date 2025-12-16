/**
 * 图标缓存
 * 用于避免重复请求相同 URL 的图标
 */

// 内存缓存
const iconCache = new Map<string, { url: string; isFallback: boolean }>();

/**
 * 获取缓存的图标
 */
export const getCachedIcon = (url: string): { url: string; isFallback: boolean } | undefined => {
    return iconCache.get(url);
};

/**
 * 设置图标缓存
 */
export const setCachedIcon = (url: string, icon: { url: string; isFallback: boolean }): void => {
    iconCache.set(url, icon);
};

/**
 * 检查是否有缓存
 */
export const hasIconCache = (url: string): boolean => {
    return iconCache.has(url);
};

/**
 * 清除所有缓存
 */
export const clearIconCache = (): void => {
    iconCache.clear();
};
