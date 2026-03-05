import { getCachedIcon, setCachedIcon } from './iconCache';
import { compressIcon } from '@/features/theme/utils/imageCompression';
import { db } from '@/shared/utils/db';

// ============================================================================
// 请求去重: 跟踪进行中的请求，避免重复网络请求
// ============================================================================
type IconResult = { url: string; isFallback: boolean };
const pendingRequests = new Map<string, Promise<IconResult>>();

/**
 * 获取网站图标
 * 优先级：
 * 1. 内存缓存命中 (LRU)
 * 2. IndexedDB 缓存命中
 * 3. 进行中的请求 (去重)
 * 4. 外部获取逻辑 (fetchIconInternal)
 */
export const fetchIcon = async (url: string, minSize: number = 100): Promise<IconResult> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 1. 检查内存缓存 (最快)
    const cached = getCachedIcon(domain);
    if (cached) {
      return cached;
    }

    // 2. 检查 IndexedDB 缓存 (持久化)
    try {
      const dbCached = await db.getFavicon(domain);
      if (dbCached) {
        const result = { url: dbCached.url, isFallback: dbCached.isFallback };
        // 存入内存缓存供下次快速访问
        setCachedIcon(domain, result);
        return result;
      }
    } catch (dbError) {
      console.warn('Failed to read from IndexedDB favicon cache:', dbError);
    }

    // 3. 检查是否有进行中的请求 (请求去重)
    const cacheKey = `${domain}:${minSize}`;
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // 4. 创建新请求并缓存 Promise
    const fetchPromise = fetchIconInternal(url, domain, minSize).then(async (result) => {
      // 获取成功后，存入 IndexedDB
      try {
        await db.saveFavicon({
          domain,
          url: result.url,
          isFallback: result.isFallback,
          lastUpdated: Date.now()
        });
      } catch (dbError) {
        console.warn('Failed to save to IndexedDB favicon cache:', dbError);
      }
      return result;
    });
    pendingRequests.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch {
    // 如果失败，则生成文本图标
    const result = { url: generateTextIcon(url), isFallback: true };
    return result;
  }
};

/**
 * 获取并自动压缩图标
 * 组合了 fetchIcon 和 compressIcon 的逻辑，用于统一 Modal 和其他组件的调用
 */
export const fetchAndProcessIcon = async (url: string, minSize: number = 100): Promise<{ url: string; isFallback: boolean }> => {
  try {
    const fetchResult = await fetchIcon(url, minSize);

    // 如果是 fallback (生成的文本图标)，直接返回
    if (fetchResult.isFallback) {
      return fetchResult;
    }

    // 压缩网络图片 (compressIcon 内部会处理 data URL 或跳过不需要压缩的)
    const compressedUrl = await compressIcon(fetchResult.url);

    return {
      url: compressedUrl,
      isFallback: false
    };
  } catch (error) {
    return { url: generateTextIcon(url), isFallback: true };
  }
};

/**
 * 内部图标获取逻辑
 * 优化策略: 分批并行请求，减少不必要的网络请求
 * 第一批: 高优先级本地路径 (网络开销小)
 * 第二批: 外部 API 备用 (仅在第一批全部失败时尝试)
 */
const fetchIconInternal = async (url: string, domain: string, minSize: number): Promise<IconResult> => {
  try {
    const urlObj = new URL(url);

    const protocol = urlObj.protocol;
    const origin = `${protocol}//${domain}`;

    // ========================================================================
    // 性能优化: 串行尝试策略 - 找到符合条件的图标后立即返回
    // 减少不必要的网络请求，同时缩短单次请求超时时间
    // ========================================================================

    // 第一批: 高优先级本地路径 (按优先级排序)
    const highPriorityCandidates = [
      // Apple Touch Icons (通常最高质量，180x180)
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-180x180.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      // 常见的高分辨率图标路径
      `${origin}/icon-192x192.png`,
      `${origin}/favicon.ico`,
    ];

    // 第二批: 外部 API 备用 (仅在第一批全部失败时尝试)
    const fallbackCandidates = [
      // DuckDuckGo Icons API (隐私友好)
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // Google Favicon API (最终备用)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    ];

    // 单个图片探测函数 (带超时)
    const probeImage = (src: string, timeout: number = 3000): Promise<{ url: string; width: number; height: number }> => {
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

        img.onload = () => {
          settled = true;
          if (img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
            resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
          } else if (img.naturalWidth > 1) {
            if (minSize === 0) {
              resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
              return;
            }
            reject(`Image too small (< ${minSize}x${minSize})`);
          } else {
            reject('Image invalid');
          }
        };
        img.onerror = () => {
          settled = true;
          reject('Failed to load');
        };
        img.src = src;

        // 缩短超时时间，加快失败检测
        setTimeout(() => {
          if (!settled) {
            cleanup();
            reject('Timeout');
          }
        }, timeout);
      });
    };

    // ========================================================================
    // 策略1: 串行尝试高优先级候选 (找到即停止，减少请求数)
    // ========================================================================
    for (const candidate of highPriorityCandidates) {
      try {
        // 本地路径使用较短超时 (2秒)
        const icon = await probeImage(candidate, 2000);
        // 找到符合条件的图标，立即返回
        const result = { url: icon.url, isFallback: false };
        setCachedIcon(domain, result);
        return result;
      } catch {
        // 继续尝试下一个候选
        continue;
      }
    }

    // ========================================================================
    // 策略2: 并行尝试 fallback 候选 (加快响应速度)
    // ========================================================================
    const fallbackResults = await Promise.allSettled(
      fallbackCandidates.map(src => probeImage(src, 4000))
    );

    const validFallbacks = fallbackResults
      .filter((r): r is PromiseFulfilledResult<{ url: string; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (validFallbacks.length > 0) {
      const result = { url: validFallbacks[0].url, isFallback: false };
      setCachedIcon(domain, result);
      return result;
    }

    throw new Error('未找到高分辨率图标');
  } catch {
    // 如果失败，则生成文本图标
    const result = { url: generateTextIcon(url), isFallback: true };
    return result;
  }
};

// ============================================================================
// 性能优化: 复用单个 Canvas 元素，避免重复创建 DOM 元素
// 注意：OffscreenCanvas 不支持同步的 toDataURL()，因此使用常规 Canvas
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
  // 清空画布以便复用
  reusableCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return { canvas: reusableCanvas, ctx: reusableCtx };
}

/**
 * 生成文字图标
 */
export const generateTextIcon = (text: string): string => {
  try {
    const canvasData = getReusableCanvas();
    if (!canvasData) return '';
    const { canvas, ctx } = canvasData;

    // 提取显示的文本。如果是 URL，提取域名/名称。
    let displayText = text;
    try {
      // 逻辑: 
      // 1. 如果看起来像 URL（以 http/https 开头或包含点），则进行解析。
      // 2. 提取主机名 (hostname)。
      // 3. 移除 'www.'。
      // 4. 取第一部分作为名称 (google.com -> google)。
      // 5. 转换为首字母大写。

      const isUrlLike = text.startsWith('http') || text.includes('.');
      if (isUrlLike) {
        let hostname = text;
        try {
          const urlObj = new URL(text.startsWith('http') ? text : `https://${text}`);
          hostname = urlObj.hostname;
        } catch {
          // 如果 URL 解析失败但包含点，则回退处理
          hostname = text;
        }

        // 移除 www.
        hostname = hostname.replace(/^www\./, '');

        // 取第一部分
        const mainName = hostname.split('.')[0];

        if (mainName) {
          displayText = mainName;
        }
      }
    } catch {
      // 忽略错误，直接使用原始文本
    }

    // 判断是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(displayText);

    // 根据文字类型处理显示文本
    if (hasChinese) {
      // 中文：取第一个汉字
      const chineseMatch = displayText.match(/[\u4e00-\u9fa5]/);
      displayText = chineseMatch ? chineseMatch[0] : displayText.charAt(0);
    } else {
      // 英文：取前两个字母，首字母大写
      const twoLetters = displayText.substring(0, 2).toLowerCase();
      displayText = twoLetters.charAt(0).toUpperCase() + twoLetters.slice(1);
    }

    // 1. 随机低亮度背景
    // H: 0-360, S: 40-80%, L: 20-35%
    const bgHue = Math.floor(Math.random() * 360);
    const bgSat = 40 + Math.floor(Math.random() * 40);
    const bgLig = 20 + Math.floor(Math.random() * 15);
    ctx.fillStyle = `hsl(${bgHue}, ${bgSat}%, ${bgLig}%)`;
    ctx.fillRect(0, 0, 576, 576);

    // 2. 随机高亮度文字
    const ranTextHue = Math.floor(Math.random() * 360);
    const textSat = 50 + Math.floor(Math.random() * 40);
    const textLig = 80 + Math.floor(Math.random() * 15);
    ctx.fillStyle = `hsl(${ranTextHue}, ${textSat}%, ${textLig}%)`;

    // Font settings - 字重900，居中对齐
    ctx.font = '900 360px "Bricolage Grotesque", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // 居中绘制文字（根据文字类型应用不同偏移以修正视觉居中）
    const yOffset = hasChinese ? 40 : 20;
    ctx.fillText(displayText, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + yOffset);

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};



/**
 * 为文件夹生成图标（前4个应用的图标组合成2x2网格）
 * Updated to handle Data URLs from text icons
 */
export const generateFolderIcon = (items: Array<{ icon?: string }>): string => {
  if (items.length === 0) {
    return generateTextIcon('');
  }

  // 创建2x2网格SVG图标
  const icons = items.slice(0, 4).map(item => item.icon || generateTextIcon(''));

  // 创建组合SVG
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
