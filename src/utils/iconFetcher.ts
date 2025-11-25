/**
 * 获取网站图标
 * 优先级：
 * 1. 自定义图标（已上传）
 * 2. 网站根目录的 favicon.ico
 * 3. Google Favicon 服务
 * 4. 生成备用 SVG
 */
export const fetchIcon = async (url: string): Promise<string> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const protocol = urlObj.protocol;
    const origin = `${protocol}//${domain}`;

    // Candidates to probe, prioritized by likelihood of high resolution
    const candidates = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`, // Google High Res
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      `${origin}/favicon.ico`,
    ];

    // Helper to probe an image URL
    const probeImage = (src: string): Promise<{ url: string; size: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        // Do not set crossOrigin to avoid CORS errors on opaque responses
        img.onload = () => {
          // Filter out very small images (like 1x1 tracking pixels)
          if (img.naturalWidth > 1) {
            resolve({ url: src, size: img.naturalWidth });
          } else {
            reject('Image too small');
          }
        };
        img.onerror = () => reject('Failed to load');
        img.src = src;
        // Timeout to prevent hanging
        setTimeout(() => reject('Timeout'), 5000);
      });
    };

    // Probe all candidates in parallel
    const results = await Promise.allSettled(candidates.map(src => probeImage(src)));

    // Filter successful results
    const validIcons = results
      .filter((r): r is PromiseFulfilledResult<{ url: string; size: number }> => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.size - a.size); // Sort by size descending

    if (validIcons.length > 0) {
      return validIcons[0].url;
    }

    // If all probes fail, fall back to Google's default (which might return a default globe)
    // or just let the catch block handle it
    throw new Error('No icons found');
  } catch {
    // If failed, generate fallback SVG
    return generateFallbackIcon(url);
  }
};

/**
 * 生成备用图标（网站名称首字母）
 */
const generateFallbackIcon = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    const firstLetter = domain.charAt(0).toUpperCase();
    const svg = `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="16" fill="rgba(255,255,255,0.2)"/>
        <text x="32" y="42" font-family="Bricolage Grotesque" font-size="32" font-weight="500" text-anchor="middle" fill="white">${firstLetter}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch {
    // 完全失败时返回默认图标
    const svg = `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="16" fill="rgba(255,255,255,0.2)"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
};

/**
 * 为文件夹生成图标（前4个应用的图标组合成2x2网格）
 */
export const generateFolderIcon = (items: Array<{ icon?: string }>): string => {
  if (items.length === 0) {
    return generateFallbackIcon('');
  }

  // 创建2x2网格SVG图标
  const icons = items.slice(0, 4).map(item => item.icon || generateFallbackIcon(''));

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

