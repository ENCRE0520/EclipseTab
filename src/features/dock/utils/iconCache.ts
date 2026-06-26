/**
 * 图标解析服务
 * 管理 favicon 的 objectURL 缓存，从 IndexedDB 加载 Blob 并转换为 objectURL
 * 同一会话内复用 objectURL，避免重复读取 IndexedDB
 */

import { db } from '@/shared/utils/db';

// favicon 引用 ID 前缀
export const FAVICON_PREFIX = 'favicon:';
const REMOTE_ICON_PREFIX = 'remote-icon:';

// ============================================================================
// objectURL 内存缓存: domain → objectURL
// 同一标签页会话内复用，不需要 LRU 淘汰（objectURL 占用极少内存）
// ============================================================================
const objectURLCache = new Map<string, string>();

// 进行中的加载请求去重
const pendingLoads = new Map<string, Promise<string>>();

/**
 * 判断 icon 字符串是否为 favicon 引用 ID
 */
export const isFaviconRef = (icon: string): boolean => {
  return icon.startsWith(FAVICON_PREFIX);
};

/**
 * 从 favicon 引用 ID 中提取 domain
 */
export const getDomainFromRef = (icon: string): string => {
  return icon.slice(FAVICON_PREFIX.length);
};

/**
 * 生成 favicon 引用 ID
 */
export const makeFaviconRef = (domain: string): string => {
  return `${FAVICON_PREFIX}${domain}`;
};

export const isRemoteIconUrl = (icon: string): boolean => {
  return /^https?:\/\//.test(icon);
};

const getRemoteIconCacheKey = (iconUrl: string): string => {
  return `${REMOTE_ICON_PREFIX}${iconUrl}`;
};

export const getCachedRemoteIconUrlSync = (iconUrl: string): string | undefined => {
  return objectURLCache.get(getRemoteIconCacheKey(iconUrl));
};

/**
 * 同步获取已缓存的图标 URL（如果已加载过）
 * @returns objectURL 或 undefined（未缓存）
 */
export const getCachedIconUrlSync = (domain: string): string | undefined => {
  return objectURLCache.get(domain);
};

/**
 * 解析 favicon 引用 ID 为可用的图片 URL
 * - 如果已缓存 objectURL，直接返回（同步的 Promise）
 * - 否则从 IndexedDB 加载 Blob，生成 objectURL 并缓存
 * - 请求去重：同一 domain 的并发请求复用同一个 Promise
 * @returns objectURL 或空字符串（加载失败时）
 */
export const resolveIconUrl = async (domain: string): Promise<string> => {
  // 1. 检查内存缓存
  const cached = objectURLCache.get(domain);
  if (cached) {
    return cached;
  }

  // 2. 请求去重
  const pending = pendingLoads.get(domain);
  if (pending) {
    return pending;
  }

  // 3. 从 IndexedDB 加载
  const loadPromise = (async () => {
    try {
      const item = await db.getFavicon(domain);
      if (item && item.data) {
        const url = URL.createObjectURL(item.data);
        objectURLCache.set(domain, url);
        return url;
      }
      return '';
    } catch {
      return '';
    } finally {
      pendingLoads.delete(domain);
    }
  })();

  pendingLoads.set(domain, loadPromise);
  return loadPromise;
};

export const resolveRemoteIconUrl = async (iconUrl: string): Promise<string> => {
  const key = getRemoteIconCacheKey(iconUrl);
  const cached = await resolveIconUrl(key);
  if (cached) return cached;

  const pending = pendingLoads.get(key);
  if (pending) return pending;

  const loadPromise = (async () => {
    try {
      const response = await fetch(iconUrl, { redirect: 'follow' });
      if (!response.ok) return iconUrl;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/') && !contentType.includes('icon')) return iconUrl;

      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      bitmap.close();

      await db.saveFavicon({
        domain: key,
        data: blob,
        isFallback: false,
        lastUpdated: Date.now(),
      });

      const objectUrl = URL.createObjectURL(blob);
      objectURLCache.set(key, objectUrl);
      return objectUrl;
    } catch {
      return iconUrl;
    } finally {
      pendingLoads.delete(key);
    }
  })();

  pendingLoads.set(key, loadPromise);
  return loadPromise;
};

/**
 * 批量预加载多个域名的图标（用于初始化时优化）
 */
export const prefetchIcons = async (domains: string[]): Promise<void> => {
  const uniqueDomains = [...new Set(domains)];
  await Promise.allSettled(uniqueDomains.map(d => resolveIconUrl(d)));
};

/**
 * 获取 favicon 的元信息（isFallback, iconSmall）
 * 用于需要判断图标状态的场景
 */
export const getFaviconMeta = async (domain: string): Promise<{ isFallback: boolean; iconSmall?: boolean } | null> => {
  try {
    const item = await db.getFavicon(domain);
    if (item) {
      return { isFallback: item.isFallback, iconSmall: item.iconSmall };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 清除指定 domain 的缓存（用于刷新图标时）
 */
export const invalidateIconCache = (domain: string): void => {
  const url = objectURLCache.get(domain);
  if (url) {
    URL.revokeObjectURL(url);
    objectURLCache.delete(domain);
  }
};

/**
 * 获取缓存大小（调试用）
 */
export const getCacheSize = (): number => {
  return objectURLCache.size;
};

/**
 * 清空所有缓存（调试用）
 */
export const clearIconCache = (): void => {
  objectURLCache.forEach(url => URL.revokeObjectURL(url));
  objectURLCache.clear();
};
