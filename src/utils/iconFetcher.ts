import { getCachedIcon, setCachedIcon } from './iconCache';

// ============================================================================
// 请求去重: 跟踪进行中的请求，避免重复网络请求
// ============================================================================
type IconResult = { url: string; isFallback: boolean };
const pendingRequests = new Map<string, Promise<IconResult>>();

/**
 * 获取网站图标
 * 优先级：
 * 1. 缓存命中
 * 2. 进行中的请求 (去重)
 * 3. 自定义图标（已上传）
 * 4. 网站根目录的 favicon.ico
 * 5. Google Favicon 服务
 * 6. 生成备用 SVG
 */
export const fetchIcon = async (url: string, minSize: number = 100): Promise<IconResult> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 检查缓存
    const cached = getCachedIcon(domain);
    if (cached) {
      return cached;
    }

    // 检查是否有进行中的请求 (请求去重)
    const cacheKey = `${domain}:${minSize}`;
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // 创建新请求并缓存 Promise
    const fetchPromise = fetchIconInternal(url, domain, minSize);
    pendingRequests.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch {
    // If failed, generate text icon
    const result = { url: generateTextIcon(url), isFallback: true };
    return result;
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
    // 优化: 分批候选 URL，减少不必要的网络请求
    // ========================================================================

    // 第一批: 高优先级本地路径 (通常网络开销较小)
    const highPriorityCandidates = [
      // Apple Touch Icons (通常最高质量)
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-180x180.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      // 常见的高分辨率图标路径
      `${origin}/icon-192x192.png`,
      `${origin}/favicon.ico`,
    ];

    // 第二批: 外部 API 备用 (仅在第一批失败时尝试)
    const fallbackCandidates = [
      // DuckDuckGo Icons API (隐私友好)
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // Google Favicon API (最终备用)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    ];

    // Helper to probe an image URL
    const probeImage = (src: string): Promise<{ url: string; width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        let settled = false;

        // 清理函数 - 取消加载并释放资源
        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
          // 取消正在进行的图片加载
          if (!settled) {
            img.src = '';
          }
        };

        // Do not set crossOrigin to avoid CORS errors on opaque responses
        img.onload = () => {
          settled = true;
          // Check for min resolution (100x100) or at least not tiny (1x1)
          if (img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
            resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
          } else if (img.naturalWidth > 1) {
            // If minSize is 0, we accept anything > 1 (Manual Fetch Mode)
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
        // Timeout to prevent hanging
        setTimeout(() => {
          if (!settled) {
            cleanup();
            reject('Timeout');
          }
        }, 5000);
      });
    };

    // 辅助函数: 从候选列表中找到最佳图标
    const findBestIcon = async (candidates: string[]): Promise<{ url: string; width: number; height: number } | null> => {
      const results = await Promise.allSettled(candidates.map(src => probeImage(src)));
      const validIcons = results
        .filter((r): r is PromiseFulfilledResult<{ url: string; width: number; height: number }> => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => b.width - a.width); // Sort by size descending
      return validIcons.length > 0 ? validIcons[0] : null;
    };

    // 第一批: 尝试高优先级本地路径
    let bestIcon = await findBestIcon(highPriorityCandidates);

    // 第二批: 如果第一批失败，尝试外部 API
    if (!bestIcon) {
      bestIcon = await findBestIcon(fallbackCandidates);
    }

    if (bestIcon) {
      const result = { url: bestIcon.url, isFallback: false };
      // 缓存结果
      setCachedIcon(domain, result);
      return result;
    }

    throw new Error('No high-res icons found');
  } catch {
    // If failed, generate text icon
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

    // Extract text to display. If it's a URL, extract domain/name.
    let displayText = text;
    try {
      // Logic: 
      // 1. If it looks like a URL (http/https or contains dot), parse it.
      // 2. Extract hostname.
      // 3. Remove 'www.'.
      // 4. Take the first segment as the name (google.com -> google).
      // 5. Title case it.

      const isUrlLike = text.startsWith('http') || text.includes('.');
      if (isUrlLike) {
        let hostname = text;
        try {
          const urlObj = new URL(text.startsWith('http') ? text : `https://${text}`);
          hostname = urlObj.hostname;
        } catch {
          // fallback if URL parsing fails but had dots
          hostname = text;
        }

        // Remove www.
        hostname = hostname.replace(/^www\./, '');

        // Take first part
        const mainName = hostname.split('.')[0];

        if (mainName) {
          displayText = mainName;
        }
      }
    } catch {
      // ignore, use text as is
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

    // 1. Random low brightness background
    // H: 0-360, S: 40-80%, L: 20-35%
    const bgHue = Math.floor(Math.random() * 360);
    const bgSat = 40 + Math.floor(Math.random() * 40);
    const bgLig = 20 + Math.floor(Math.random() * 15);
    ctx.fillStyle = `hsl(${bgHue}, ${bgSat}%, ${bgLig}%)`;
    ctx.fillRect(0, 0, 576, 576);

    // 2. Random high brightness text
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
