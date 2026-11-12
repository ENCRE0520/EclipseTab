import {
  makeFaviconRef,
  invalidateIconCache,
  resolveIconUrl,
  getDomainFromRef,
  isFaviconRef,
  isRemoteIconUrl,
  ensureRemoteIconCached,
} from './iconCache';
import { db } from '@/shared/utils/db';
import { ensureHostPermission } from '@/shared/utils/hostPermission';
import { probeImageBlob } from './imageBlob';

// ============================================================================
// 请求去重: 跟踪进行中的请求，避免重复网络请求
// ============================================================================
type IconResult = { url: string; isFallback: boolean; iconSmall?: boolean };

// 网络获取结果: 区分 Blob（可存 IndexedDB）和直接 URL（跨域无法获取 Blob 时）
type NetworkIconResult =
  | { kind: 'blob'; blob: Blob; iconSmall: boolean }
  | { kind: 'url'; url: string; iconSmall: boolean };

const pendingRequests = new Map<string, Promise<IconResult>>();

// Fallback 自动刷新间隔: 24小时
const FALLBACK_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
// 小图标阈值: 低于此尺寸标记为 iconSmall
const SMALL_ICON_THRESHOLD = 100;

// ============================================================================
// 基于 fetch 的图标探测
// 使用 fetch() + Blob + createImageBitmap
// 解决浏览器扩展新标签页中的 CSP / 跨域限制
// ============================================================================

/**
 * 通过 fetch 获取图片 Blob 并检查尺寸
 */
const fetchAndProbeImage = async (
  src: string,
  timeout: number = 3000,
  probeMinSize: number = 100
): Promise<{ blob: Blob; width: number; height: number }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(src, {
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.includes('icon')) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const blob = await response.blob();
    const size = await probeImageBlob(blob);
    if (!size) {
      throw new Error('Image invalid');
    }
    const { width, height } = size;

    if (probeMinSize > 0) {
      if (width < probeMinSize || height < probeMinSize) {
        throw new Error(`Image too small (${width}x${height} < ${probeMinSize})`);
      }
    }

    return { blob, width, height };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * 获取网站图标
 * 返回的 url 是 favicon:domain 引用 ID（非 fallback 时）
 * 或 data URL（fallback 文字图标时）
 *
 * 优先级：
 * 1. IndexedDB 缓存命中 → 返回引用 ID (除非 forceRefresh)
 * 2. 进行中的请求 (去重)
 * 3. 网络获取 → 存 Blob 到 IndexedDB → 返回引用 ID
 */
export const fetchIcon = async (
  url: string,
  minSize: number = 100,
  forceRefresh: boolean = false,
  allowPermissionRequest: boolean = false
): Promise<IconResult> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 1. 检查 IndexedDB 缓存 (如果不强制刷新)
    if (!forceRefresh) {
      try {
        const dbCached = await db.getFavicon(domain);
      if (dbCached && dbCached.data) {
        // 验证 Blob 有效性：空 Blob（之前的 bug 导致）需要重新获取
        const blobValid = dbCached.data instanceof Blob && dbCached.data.size > 0;

        if (!blobValid) {
          // 清除损坏的缓存条目，让下次重新获取，并使其内存缓存失效
          try { 
            await db.deleteFavicon(domain); 
            invalidateIconCache(domain);
          } catch { /* ignore */ }
        } else {
          // Fallback 自动刷新
          const isFallbackExpired = dbCached.isFallback &&
            dbCached.lastUpdated &&
            (Date.now() - dbCached.lastUpdated) > FALLBACK_REFRESH_INTERVAL;

          if (isFallbackExpired) {
            refreshFallbackIcon(url, domain, minSize);
          }

          if (dbCached.isFallback) {
            // Fallback 存的是文字图标的 Blob，需要转为 objectURL 显示
            const objectUrl = await resolveIconUrl(domain);
            return { url: objectUrl || makeFaviconRef(domain), isFallback: true, iconSmall: dbCached.iconSmall };
          }

          // 正常图标：返回引用 ID，DockItem 渲染时会异步解析
          return { url: makeFaviconRef(domain), isFallback: false, iconSmall: dbCached.iconSmall };
        }
        }
      } catch (dbError) {
        console.warn('Failed to read from IndexedDB favicon cache:', dbError);
      }
    }

    // 2. 请求去重
    const cacheKey = `${domain}:${minSize}:${forceRefresh}:${allowPermissionRequest}`;
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // 3. 网络获取
    const fetchPromise = fetchIconInternal(url, domain, minSize, allowPermissionRequest);
    pendingRequests.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch {
    const fallbackBlob = generateTextIconBlob(url);
    return { url: fallbackBlob.dataUrl, isFallback: true };
  }
};

/**
 * 后台刷新 fallback 图标
 */
const refreshFallbackIcon = async (url: string, domain: string, minSize: number) => {
  try {
    const result = await fetchIconFromNetwork(url, domain, minSize, false);
    if (result && result.kind === 'blob') {
      invalidateIconCache(domain);
      await db.saveFavicon({
        domain,
        data: result.blob,
        isFallback: false,
        iconSmall: result.iconSmall,
        lastUpdated: Date.now()
      });
    }
  } catch {
    // 静默失败
  }
};

/**
 * 获取并自动处理图标（供 Modal 等组件使用）
 * 返回可直接显示的 URL（引用 ID 或 data URL）
 */
export const fetchAndProcessIcon = async (
  url: string,
  minSize: number = 100,
  forceRefresh: boolean = false,
  allowPermissionRequest: boolean = false
): Promise<IconResult> => {
  return fetchIcon(url, minSize, forceRefresh, allowPermissionRequest);
};

/**
 * 为已有 Dock 条目补一份离线可用的本地图标副本。
 *
 * - favicon: 引用且本地 Blob 完好 → 不用处理
 * - favicon: 引用但本地缺失/是文字兜底 → 静默重新下载
 * - https 图标 → 先缓存原图；不行再改用站点图标
 * - data URL → 已经是本地图标，跳过
 *
 * 只做静默下载，失败时不写入文字兜底图标，避免污染缓存和 24h 刷新逻辑。
 * @returns null 表示无需修改；否则返回应写回条目的新图标
 */
export const ensureOfflineIcon = async (
  url: string,
  currentIcon?: string
): Promise<{ icon: string; iconSmall?: boolean } | null> => {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return null;
  }
  if (!domain) return null;

  if (currentIcon && currentIcon.startsWith('data:')) {
    return null;
  }

  if (currentIcon && isFaviconRef(currentIcon)) {
    const refDomain = getDomainFromRef(currentIcon);
    try {
      const cached = await db.getFavicon(refDomain);
      if (cached && cached.data instanceof Blob && cached.data.size > 0 && !cached.isFallback) {
        return null;
      }
    } catch {
      return null;
    }
    return downloadSiteIcon(url, refDomain);
  }

  if (currentIcon && isRemoteIconUrl(currentIcon)) {
    if (await ensureRemoteIconCached(currentIcon)) {
      return null;
    }
    return downloadSiteIcon(url, domain);
  }

  // 没有图标，或存的是已失效的 blob: 引用
  if (currentIcon && !currentIcon.startsWith('blob:')) {
    return null;
  }
  return downloadSiteIcon(url, domain);
};

const downloadSiteIcon = async (
  url: string,
  domain: string
): Promise<{ icon: string; iconSmall?: boolean } | null> => {
  const networkResult = await fetchIconFromNetwork(url, domain, 100, false);
  if (!networkResult || networkResult.kind !== 'blob') {
    return null;
  }

  try {
    invalidateIconCache(domain);
    await db.saveFavicon({
      domain,
      data: networkResult.blob,
      isFallback: false,
      iconSmall: networkResult.iconSmall,
      lastUpdated: Date.now(),
    });
  } catch {
    return null;
  }

  return {
    icon: makeFaviconRef(domain),
    iconSmall: networkResult.iconSmall,
  };
};

/**
 * 纯网络获取逻辑（不涉及缓存读取）
 * 三层 fallback 策略：
 *   1. 新版 fetch() + Blob（需要 host_permissions）
 *   2. 旧版 Image 探测（不需要 CORS → 返回 Blob 或直接 URL）
 *   3. 动态请求 host 权限后重试 fetch
 * 成功时返回 NetworkIconResult，失败时返回 null
 */
const fetchIconFromNetwork = async (
  url: string,
  domain: string,
  minSize: number,
  allowPermissionRequest: boolean
): Promise<NetworkIconResult | null> => {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    const origin = `${protocol}//${domain}`;
    const normalizedDomain = domain.replace(/^www\./, '');

    const specialCandidates: Record<string, string[]> = {
      'chatgpt.com': [
        'https://chatgpt.com/favicon.ico',
        'https://chatgpt.com/apple-touch-icon.png',
      ],
      'youtube.com': [
        'https://www.youtube.com/favicon.ico',
      ],
      'photos.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/photos_96dp.png',
        'https://photos.google.com/favicon.ico',
      ],
    };

    const highPriorityCandidates = Array.from(new Set([
      ...(specialCandidates[normalizedDomain] || []),
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-180x180.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      `${origin}/icon-192x192.png`,
      `${origin}/favicon.ico`,
    ]));

    const fallbackCandidates = [
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://api.faviconkit.com/${domain}/256`,
      `https://icon.horse/icon/${domain}`,
    ];

    const allCandidates = [...highPriorityCandidates, ...fallbackCandidates];

    // ================================================================
    // 策略 1: 新版 fetch（需要 host_permissions）→ 返回 Blob
    // ================================================================
    const fetchResult = await tryFetchStrategy(highPriorityCandidates, fallbackCandidates, minSize);
    if (fetchResult) return fetchResult;

    const retryWithPermission = async (probeMinSize: number): Promise<NetworkIconResult | null> => {
      const permitted = await ensureHostPermission();
      if (permitted) {
        const retryResult = await tryFetchStrategy(highPriorityCandidates, fallbackCandidates, probeMinSize);
        if (retryResult) return retryResult;
      }
      return null;
    };

    // ================================================================
    // 策略 2: 官方小图标兜底
    // 有些网站（如 ChatGPT）官方 favicon 小于 100px，不能因为尺寸小就选第三方图标
    // ================================================================
    if (minSize > 0) {
      const officialSmallResult = await tryImageProbeStrategy(highPriorityCandidates, 0);
      if (officialSmallResult) {
        if (officialSmallResult.kind === 'blob') return officialSmallResult;
        if (allowPermissionRequest) {
          const retryResult = await retryWithPermission(0);
          if (retryResult) return retryResult;
        }
        return officialSmallResult;
      }
    }

    // ================================================================
    // 策略 3: 旧版 Image 探测（不需要 CORS 权限）
    // 能获取 Blob 则返回 Blob，否则只在权限重试失败后返回直接 URL
    // ================================================================
    const legacyResult = await tryImageProbeStrategy(allCandidates, minSize);
    if (legacyResult) {
      if (legacyResult.kind === 'blob') return legacyResult;
      if (allowPermissionRequest) {
        const retryResult = await retryWithPermission(minSize);
        if (retryResult) return retryResult;
      }
      return legacyResult;
    }

    // ================================================================
    // 策略 4: 动态请求权限后重试 fetch → 返回 Blob
    // ================================================================
    if (allowPermissionRequest) {
      const retryResult = await retryWithPermission(minSize);
      if (retryResult) return retryResult;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 策略 1: 使用 fetch API 获取图标 Blob
 */
const tryFetchStrategy = async (
  highPriorityCandidates: string[],
  fallbackCandidates: string[],
  minSize: number
): Promise<NetworkIconResult | null> => {
  try {
    // 并行尝试高优先级候选
    const highResults = await Promise.allSettled(
      highPriorityCandidates.map(src => fetchAndProbeImage(src, 2000, minSize))
    );

    const validHigh = highResults
      .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (validHigh.length > 0) {
      const best = validHigh[0];
      return {
        kind: 'blob',
        blob: best.blob,
        iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
      };
    }

    // 官方图标即使小于 100px，也比第三方服务返回的非官方图标更可信
    if (minSize > 0) {
      const smallOfficialResults = await Promise.allSettled(
        highPriorityCandidates.map(src => fetchAndProbeImage(src, 2000, 0))
      );

      const validSmallOfficial = smallOfficialResults
        .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
          r.status === 'fulfilled'
        )
        .map(r => r.value)
        .sort((a, b) => b.width - a.width);

      if (validSmallOfficial.length > 0) {
        const best = validSmallOfficial[0];
        return {
          kind: 'blob',
          blob: best.blob,
          iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
        };
      }
    }

    // 并行尝试 fallback（接受任意尺寸）
    const fallbackResults = await Promise.allSettled(
      fallbackCandidates.map(src => fetchAndProbeImage(src, 4000, 0))
    );

    const validFallbacks = fallbackResults
      .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (validFallbacks.length > 0) {
      const best = validFallbacks[0];
      return {
        kind: 'blob',
        blob: best.blob,
        iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
      };
    }
  } catch {
    // fetch 策略整体失败，继续下一策略
  }
  return null;
};

/**
 * 策略 2: 旧版 Image 探测（兼容无 CORS 权限场景）
 * 使用 new Image() 加载图片（浏览器允许 <img> 跨域加载）
 *
 * 尝试将图片转为 Blob 存储，如果因跨域限制无法获取 Blob，
 * 则直接返回图片 URL（和旧版 v1.0.0 行为一致）
 */
const tryImageProbeStrategy = async (
  candidates: string[],
  minSize: number
): Promise<NetworkIconResult | null> => {
  try {
    const results = await Promise.allSettled(
      candidates.map(src => probeImageLegacy(src, minSize))
    );

    const valid = results
      .filter((r): r is PromiseFulfilledResult<{ url: string; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (valid.length > 0) {
      const best = valid[0];
      const isSmall = best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD;

      // 尝试获取 Blob（用于 IndexedDB 离线缓存）
      const blob = await imageUrlToBlob(best.url, best.width, best.height);
      if (blob) {
        return { kind: 'blob', blob, iconSmall: isSmall };
      }

      // Blob 获取失败（跨域限制）→ 直接返回 URL（和旧版行为一致）
      return { kind: 'url', url: best.url, iconSmall: isSmall };
    }
  } catch {
    // Image 探测策略整体失败
  }
  return null;
};

/**
 * 旧版图片探测：使用 new Image() 加载并检查尺寸
 * 不设置 crossOrigin 以避免 CORS 错误（允许 opaque response）
 */
const probeImageLegacy = (
  src: string,
  minSize: number
): Promise<{ url: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (!settled) {
        img.src = '';
      }
    };

    // 不设置 crossOrigin，允许跨域加载（opaque response）
    img.onload = () => {
      settled = true;
      if (minSize > 0) {
        if (img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
          resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
        } else if (img.naturalWidth > 1) {
          reject(`Image too small (${img.naturalWidth}x${img.naturalHeight} < ${minSize})`);
        } else {
          reject('Image invalid');
        }
      } else {
        if (img.naturalWidth > 1) {
          resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
        } else {
          reject('Image invalid');
        }
      }
    };
    img.onerror = () => {
      settled = true;
      reject('Failed to load');
    };
    img.src = src;

    setTimeout(() => {
      if (!settled) {
        cleanup();
        reject('Timeout');
      }
    }, 5000);
  });
};

/**
 * 将图片 URL 转为 Blob（用于存入 IndexedDB）
 * 先尝试 canvas 转换，失败则 fetch 获取
 * 全部失败时返回 null（而非空 Blob），调用方据此决定回退到直接 URL
 */
const imageUrlToBlob = async (
  imageUrl: string,
  width: number,
  height: number
): Promise<Blob | null> => {
  // 方式 1: 尝试通过 canvas 转换（需要 CORS 允许）
  try {
    const img = await loadImageWithCORS(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject('toBlob failed'), 'image/png');
      });
      return blob;
    }
  } catch {
    // canvas tainted 或其他错误，继续尝试
  }

  // 方式 2: 尝试 fetch 获取 Blob 并验证
  try {
    const response = await fetch(imageUrl, { redirect: 'follow' });
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.startsWith('image/') || contentType.includes('icon')) {
        const blob = await response.blob();
        // 验证 Blob 是否真的是有效图片（SVG 也能通过 <img> 探测）
        if (!(await probeImageBlob(blob))) return null;
        return blob;
      }
    }
  } catch {
    // fetch 或验证失败
  }

  // 无法获取 Blob（跨域限制），返回 null
  return null;
};

/**
 * 带 crossOrigin 属性加载图片（canvas 绘制需要）
 */
const loadImageWithCORS = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject('Failed to load with CORS');
    img.src = src;
    setTimeout(() => reject('Timeout'), 5000);
  });
};

/**
 * 内部图标获取逻辑：网络获取 → 存 IndexedDB → 返回引用 ID 或直接 URL
 */
const fetchIconInternal = async (
  url: string,
  domain: string,
  minSize: number,
  allowPermissionRequest: boolean
): Promise<IconResult> => {
  const networkResult = await fetchIconFromNetwork(url, domain, minSize, allowPermissionRequest);

  if (networkResult) {
    if (networkResult.kind === 'blob') {
      // Blob 可用 → 存 IndexedDB，返回 favicon:domain 引用
      try {
        invalidateIconCache(domain);
        await db.saveFavicon({
          domain,
          data: networkResult.blob,
          isFallback: false,
          iconSmall: networkResult.iconSmall,
          lastUpdated: Date.now()
        });
      } catch (dbError) {
        console.warn('Failed to save favicon to IndexedDB:', dbError);
      }

      return {
        url: makeFaviconRef(domain),
        isFallback: false,
        iconSmall: networkResult.iconSmall
      };
    } else {
      // 直接 URL（跨域无法获取 Blob）→ 直接返回 URL，不存 IndexedDB
      // 和旧版 v1.0.0 行为一致：<img src="https://..."> 直接渲染
      return {
        url: networkResult.url,
        isFallback: false,
        iconSmall: networkResult.iconSmall
      };
    }
  }

  // 全部失败 → 生成文字图标 Blob 并存入 IndexedDB
  const fallback = generateTextIconBlob(url);
  try {
    invalidateIconCache(domain);
    await db.saveFavicon({
      domain,
      data: fallback.blob,
      isFallback: true,
      lastUpdated: Date.now()
    });
  } catch {
    // 存储失败时直接返回 data URL
  }

  return { url: makeFaviconRef(domain), isFallback: true };
};

// ============================================================================
// 文字图标生成
// ============================================================================
const CANVAS_SIZE = 576;
let reusableCanvas: HTMLCanvasElement | null = null;
let reusableCtx: CanvasRenderingContext2D | null = null;

function getReusableCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!reusableCanvas) {
    reusableCanvas = document.createElement('canvas');
    reusableCanvas.width = CANVAS_SIZE;
    reusableCanvas.height = CANVAS_SIZE;
    reusableCtx = reusableCanvas.getContext('2d');
  }
  if (!reusableCtx) return null;
  reusableCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return { canvas: reusableCanvas, ctx: reusableCtx };
}

/**
 * 生成文字图标，同时返回 Blob 和 data URL
 */
const generateTextIconBlob = (text: string): { blob: Blob; dataUrl: string } => {
  // 用文字本身做种子，同一站点每次生成的配色一致
  const dataUrl = generateStableTextIcon(text, text);
  // 将 data URL 转为 Blob
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1] || '');
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return { blob: new Blob([u8arr], { type: mime }), dataUrl };
};

/**
 * 生成文字图标（返回 data URL）
 * 
 * 颜色方案：活力浅色背景 + 高饱和度深色文字（同色相）
 * 换行逻辑：文字中有空格时按空格拆分为多行显示
 * @param text 显示的文本
 * @param hue  可选，指定色相（0-359）。不传时随机生成。
 */
export const generateTextIcon = (text: string, hue?: number): string => {
  try {
    const canvasData = getReusableCanvas();
    if (!canvasData) return '';
    const { canvas, ctx } = canvasData;

    let displayText = text;
    try {
      const isUrlLike = text.startsWith('http') || text.includes('.');
      if (isUrlLike) {
        let hostname = text;
        try {
          const urlObj = new URL(text.startsWith('http') ? text : `https://${text}`);
          hostname = urlObj.hostname;
        } catch {
          hostname = text;
        }
        hostname = hostname.replace(/^www\./, '');
        const mainName = hostname.split('.')[0];
        if (mainName) {
          displayText = mainName;
        }
      }
    } catch {
      // 忽略
    }

    // 按空格拆分文字为多行，无空格时直接显示一行
    const trimmed = displayText.trim();
    const lines = trimmed.includes(' ')
      ? trimmed.split(/\s+/).filter(Boolean)
      : [trimmed];

    // 颜色：活力浅色背景
    const bgHue = hue ?? Math.floor(Math.random() * 360);
    const bgSat = 55 + (bgHue * 7) % 25;      // 饱和度 55-80%
    const bgLig = 82 + (bgHue * 3) % 10;       // 亮度 82-92%（浅色）
    ctx.fillStyle = `hsl(${bgHue}, ${bgSat}%, ${bgLig}%)`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 文字颜色：同色相，提高饱和度，降低明度
    const textSat = Math.min(bgSat + 20, 100);
    const textLig = 25 + (bgHue * 11) % 15;    // 亮度 25-40%（深色）
    ctx.fillStyle = `hsl(${bgHue}, ${textSat}%, ${textLig}%)`;

    // 字体样式：按 Figma 设计稿（192px 容器中 48px，等比到 576px canvas = 144px）
    // Bricolage Grotesque SemiBold 600, lineHeight 90%
    const fontSize = 144;
    const lineHeight = fontSize * 0.9; // 129.6px

    ctx.font = `600 ${fontSize}px "Bricolage Grotesque", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // padding: 设计稿 16px / 192px * 576 = 48px
    const padding = 48;
    const textAreaWidth = CANVAS_SIZE - padding * 2;

    // 计算总文字块高度，垂直居中
    const totalTextHeight = lines.length * lineHeight;
    // alphabetic baseline 约在字体高度的 75% 处，首行基线位置
    const startY = (CANVAS_SIZE - totalTextHeight) / 2 + fontSize * 0.75;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      // 如果文字超出宽度，缩放绘制
      const measured = ctx.measureText(lineText);
      if (measured.width > textAreaWidth) {
        const scale = textAreaWidth / measured.width;
        ctx.save();
        ctx.translate(padding, startY + i * lineHeight);
        ctx.scale(scale, 1);
        ctx.fillText(lineText, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(lineText, padding, startY + i * lineHeight);
      }
    }

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

/**
 * 生成色彩固定的文字图标，用于离线且没有本地缓存时兜底。
 * 色相由 seed 决定，同一站点每次渲染颜色一致。
 */
export const generateStableTextIcon = (text: string, seed: string = text): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return generateTextIcon(text, Math.abs(hash) % 360);
};

/**
 * 为文件夹生成图标（前4个应用的图标组合成2x2网格）
 * 注意：文件夹图标中的子项 icon 可能是 favicon:domain 引用，
 * 这里只用于文件夹预览缩略图（SVG 中嵌入），
 * 如果子项 icon 是引用 ID 则显示空白块
 */
export const generateFolderIcon = (items: Array<{ icon?: string }>): string => {
  if (items.length === 0) {
    return generateTextIcon('');
  }

  const icons = items.slice(0, 4).map(item => {
    const icon = item.icon || '';
    // favicon: 引用无法嵌入 SVG，用空字符串（会显示为空白）
    if (icon.startsWith('favicon:')) return '';
    return icon || generateTextIcon('');
  });

  const svg = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-0">
          <rect x="0" y="0" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-1">
          <rect x="32" y="0" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-2">
          <rect x="0" y="32" width="32" height="32" rx="8"/>
        </clipPath>
        <clipPath id="clip-3">
          <rect x="32" y="32" width="32" height="32" rx="8"/>
        </clipPath>
      </defs>
      ${icons.map((icon, index) => {
    const x = (index % 2) * 32;
    const y = Math.floor(index / 2) * 32;
    if (!icon) {
      return `<rect x="${x}" y="${y}" width="32" height="32" rx="8" fill="rgba(128,128,128,0.2)"/>`;
    }
    return `
          <g clip-path="url(#clip-${index})">
            <image href="${icon}" x="${x}" y="${y}" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>
          </g>
        `;
  }).join('')}
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
