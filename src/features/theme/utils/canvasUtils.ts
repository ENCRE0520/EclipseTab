import { Sticker } from '@/shared/types';

/**
 * 将 Blob 作为文件下载，并指定文件名。
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 将 Blob 复制到剪贴板，格式为 PNG 图片。
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
    } catch (error) {
        console.error('无法将 blob 复制到剪贴板:', error);
        throw error;
    }
}

/**
 * 将 HTMLImageElement 转换为 Blob (PNG)。
 * @param img 已加载的图片元素。
 */
export function imageToBlob(img: HTMLImageElement): Promise<Blob | null> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        } else {
            resolve(null);
        }
    });
}

/**
 * 为文字贴纸生成 PNG Blob。
 * 处理样式、内边距和文本绘制。
 */
export function createTextStickerImage(sticker: Sticker): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (sticker.type !== 'text') {
            resolve(null);
            return;
        }

        // 从 CSS 变量获取描边颜色
        const strokeColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-sticker-stroke').trim() || 'white';

        const MIN_HEIGHT = 600;
        const BASE_FONT_SIZE = 48;
        // const PADDING_RATIO = 0.5; // 已移除：未使用
        const STROKE_RATIO = 0.25;

        // 创建用于测量的临时画布
        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        if (!measureCtx) {
            resolve(null);
            return;
        }

        // 匹配 CSS 样式: font-weight 900, line-height 0.95, Bricolage Grotesque
        measureCtx.font = `900 ${BASE_FONT_SIZE}px "Bricolage Grotesque", sans-serif`;

        // 测量文本内容
        const lines = sticker.content.split('\n');
        const lineHeight = BASE_FONT_SIZE * 0.95;

        // 寻找最大行宽
        let maxWidth = 0;
        for (const line of lines) {
            const metrics = measureCtx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        }

        // 计算包含描边缓冲的内容维度
        // CSS 内边距: 垂直 12px, 水平 16px
        // 描边: 12px (外侧 6px)
        const strokeWidth = BASE_FONT_SIZE * STROKE_RATIO;
        const strokeBuffer = strokeWidth / 2;

        const paddingX = 16 + strokeBuffer;
        const paddingY = 12 + strokeBuffer;

        const contentWidth = maxWidth;
        const contentHeight = lineHeight * lines.length;

        // 添加额外的垂直缓冲，以防止由于紧凑的行高导致的上伸部/下伸部轻微裁剪
        const verticalBuffer = BASE_FONT_SIZE * 0.2;

        const baseWidth = contentWidth + paddingX * 2;
        const baseHeight = contentHeight + paddingY * 2 + verticalBuffer;

        // 缩放以确保最小高度，同时保持纵横比
        const scale = baseHeight < MIN_HEIGHT ? MIN_HEIGHT / baseHeight : 1;
        const canvasWidth = Math.ceil(baseWidth * scale);
        const canvasHeight = Math.ceil(baseHeight * scale);
        const fontSize = Math.round(BASE_FONT_SIZE * scale);

        const finalPaddingX = Math.round(paddingX * scale);
        // const finalPaddingY = Math.round(paddingY * scale); // 未使用的变量

        const finalStrokeWidth = Math.round(strokeWidth * scale);
        const finalLineHeight = fontSize * 0.95;

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // 设置文本样式
            ctx.font = `900 ${fontSize}px "Bricolage Grotesque", sans-serif`;
            ctx.textBaseline = 'middle';

            // 根据对齐方式计算文本位置
            let textX: number;
            if (sticker.style?.textAlign === 'center') {
                ctx.textAlign = 'center';
                textX = canvasWidth / 2;
            } else if (sticker.style?.textAlign === 'right') {
                ctx.textAlign = 'right';
                textX = canvasWidth - finalPaddingX;
            } else {
                ctx.textAlign = 'left';
                textX = finalPaddingX;
            }

            // 使用 --color-sticker-stroke 绘制描边
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = finalStrokeWidth;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;

            // 计算垂直中心
            const totalTextHeight = finalLineHeight * lines.length;
            // 在画布中居中
            let y = (canvasHeight - totalTextHeight) / 2 + finalLineHeight / 2;

            for (const line of lines) {
                ctx.strokeText(line, textX, y);
                y += finalLineHeight;
            }

            // 绘制填充颜色
            ctx.fillStyle = sticker.style?.color || '#1C1C1E';
            y = (canvasHeight - totalTextHeight) / 2 + finalLineHeight / 2;
            for (const line of lines) {
                ctx.fillText(line, textX, y);
                y += finalLineHeight;
            }

            // 转换为 Blob
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        } else {
            resolve(null);
        }
    });
}

/**
 * 为图片贴纸生成具有圆角、描边和阴影的 PNG Blob。
 */
export function createImageStickerImage(sticker: Sticker): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (sticker.type !== 'image') {
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            // 从 CSS 变量获取描边颜色
            const strokeColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--color-sticker-stroke').trim() || 'white';

            const BORDER_RADIUS = 16;
            const STROKE_WIDTH = 6;
            const SHADOW_BLUR = 12;
            const SHADOW_OFFSET = 6;
            const PADDING = STROKE_WIDTH + SHADOW_BLUR;

            // 画布尺寸包括图片 + 描边和阴影的内边距
            const canvasWidth = img.width + PADDING * 2;
            const canvasHeight = img.height + PADDING * 2 + SHADOW_OFFSET;

            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                const imgX = PADDING;
                const imgY = PADDING;

                // 创建圆角矩形路径
                const createRoundedPath = (x: number, y: number, w: number, h: number, r: number) => {
                    ctx.beginPath();
                    ctx.moveTo(x + r, y);
                    ctx.lineTo(x + w - r, y);
                    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                    ctx.lineTo(x + w, y + h - r);
                    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                    ctx.lineTo(x + r, y + h);
                    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                    ctx.lineTo(x, y + r);
                    ctx.quadraticCurveTo(x, y, x + r, y);
                    ctx.closePath();
                };

                // 绘制外删除阴影
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = SHADOW_BLUR;
                ctx.shadowOffsetY = SHADOW_OFFSET;
                createRoundedPath(imgX, imgY, img.width, img.height, BORDER_RADIUS);
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.restore();

                // 使用 --color-sticker-stroke 绘制描边/轮廓
                createRoundedPath(imgX, imgY, img.width, img.height, BORDER_RADIUS);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = STROKE_WIDTH * 2; // 双倍宽度，因为有一半会被裁剪掉
                ctx.stroke();

                // 裁剪到圆角矩形并绘制图片
                ctx.save();
                createRoundedPath(imgX, imgY, img.width, img.height, BORDER_RADIUS);
                ctx.clip();
                ctx.drawImage(img, imgX, imgY);
                ctx.restore();

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            } else {
                resolve(null);
            }
        };
        img.onerror = () => {
            console.error('无法为贴纸导出加载图片');
            resolve(null);
        };
        img.src = sticker.content;
    });
}
