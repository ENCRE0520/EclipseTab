/**
 * 获取网站图标
 * 优先级：
 * 1. 自定义图标（已上传）
 * 2. 网站根目录的 favicon.ico
 * 3. Google Favicon 服务
 * 4. 生成备用 SVG
 */
export const fetchIcon = async (url: string, minSize: number = 100): Promise<{ url: string; isFallback: boolean }> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const protocol = urlObj.protocol;
    const origin = `${protocol}//${domain}`;

    // Candidates to probe, prioritized by likelihood of high resolution
    const candidates = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`, // Google High Res
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-precomposed.png`, // Precomposed often better
      `${origin}/favicon.ico`,
    ];

    // Helper to probe an image URL
    // Modified to return image dimensions
    const probeImage = (src: string): Promise<{ url: string; width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        // Do not set crossOrigin to avoid CORS errors on opaque responses
        img.onload = () => {
          // Check for min resolution (100x100) or at least not tiny (1x1)
          // But requirement says "if < 100*100 -> use text icon"
          // So we should only consider it a "valid high res icon" if >= minSize.
          if (img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
            resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
          } else if (img.naturalWidth > 1) {
            // If minSize is 0, we accept anything > 1 (Manual Fetch Mode)
            if (minSize === 0) {
              resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
              return;
            }

            // Otherwise reject
            reject(`Image too small (< ${minSize}x${minSize})`);
          } else {
            reject('Image invalid');
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
      .filter((r): r is PromiseFulfilledResult<{ url: string; width: number; height: number }> => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.width - a.width); // Sort by size descending

    if (validIcons.length > 0) {
      return { url: validIcons[0].url, isFallback: false };
    }

    throw new Error('No high-res icons found');
  } catch {
    // If failed, generate text icon
    // Use domain as initial text? Or allow caller to update it later?
    // We will generate based on domain for now, caller can update with name.
    return { url: generateTextIcon(url), isFallback: true };
  }
};

/**
 * 生成文字图标
 */
export const generateTextIcon = (text: string): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 576;
    canvas.height = 576;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

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
          // Capitalize
          displayText = mainName.charAt(0).toUpperCase() + mainName.slice(1);
        }
      }
    } catch (e) {
      // ignore, use text as is
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

    // Font settings
    ctx.font = '500 128px "Bricolage Grotesque", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';


    const lines: string[] = [];

    if (displayText.length <= 4) {
      lines.push(displayText);
    } else {
      // Simple chunking
      const chunkSize = 4; // 4 chars per line approx
      for (let i = 0; i < displayText.length; i += chunkSize) {
        lines.push(displayText.slice(i, i + chunkSize));
      }
    }

    // Draw lines
    const lineHeight = 137; // 120% of 114px = 136.8px
    const totalHeight = lines.length * lineHeight;
    const startY = (576 - totalHeight) / 2 + (lineHeight / 2); // vertical center

    // Left alignment padding
    const paddingLeft = 48;

    lines.forEach((line, index) => {
      ctx.fillText(line, paddingLeft, startY + (index * lineHeight));
    });

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


