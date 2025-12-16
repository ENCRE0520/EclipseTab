/**
 * 图标压缩工具
 * 用于压缩上传的图标和导入的 Space 中的图标，减少 localStorage 使用
 */

import { DockItem } from '../types';

/** 目标压缩尺寸 - 图标 (192px 足够显示 56px 图标) */
const ICON_TARGET_SIZE = 192;

/** 目标压缩尺寸 - 贴纸图片 (800px 保证高清晰度) */
const STICKER_TARGET_WIDTH = 800;

/** WebP 压缩质量 - 图标 (更高压缩) */
const ICON_COMPRESSION_QUALITY = 0.6;

/** WebP 压缩质量 - 贴纸 (0.85 平衡质量与大小) */
const STICKER_COMPRESSION_QUALITY = 0.85;

/**
 * 压缩 Base64 图标到指定尺寸 (192x192)
 * @param dataUrl Base64 编码的图片
 * @returns 压缩后的 Base64 图片
 */
export async function compressIcon(dataUrl: string): Promise<string> {
    // 如果不是有效的 data URL，直接返回
    if (!dataUrl?.startsWith('data:image')) {
        return dataUrl;
    }

    return new Promise((resolve, _reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(dataUrl); // 无法获取 context，返回原图
                    return;
                }

                // 计算目标尺寸（保持宽高比，最大边为 ICON_TARGET_SIZE）
                let { width, height } = img;

                // 如果图片已经小于目标尺寸，不需要压缩尺寸，但仍然转换为 WebP 以减小体积
                if (width > ICON_TARGET_SIZE || height > ICON_TARGET_SIZE) {
                    if (width > height) {
                        height = Math.round((height * ICON_TARGET_SIZE) / width);
                        width = ICON_TARGET_SIZE;
                    } else {
                        width = Math.round((width * ICON_TARGET_SIZE) / height);
                        height = ICON_TARGET_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为 WebP 格式
                const compressedDataUrl = canvas.toDataURL('image/webp', ICON_COMPRESSION_QUALITY);

                // 如果压缩后更大（极少数情况），返回原图
                if (compressedDataUrl.length > dataUrl.length) {
                    resolve(dataUrl);
                } else {
                    resolve(compressedDataUrl);
                }
            } catch (error) {
                console.error('Failed to compress icon:', error);
                resolve(dataUrl); // 出错时返回原图
            }
        };

        img.onerror = () => {
            console.error('Failed to load image for compression');
            resolve(dataUrl); // 加载失败时返回原图
        };

        img.src = dataUrl;
    });
}

/**
 * 压缩贴纸图片到最大宽度 400px（保持比例）
 * @param dataUrl Base64 编码的图片
 * @returns 压缩后的 Base64 图片
 */
export async function compressStickerImage(dataUrl: string): Promise<string> {
    if (!dataUrl?.startsWith('data:image')) {
        return dataUrl;
    }

    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(dataUrl);
                    return;
                }

                let { width, height } = img;

                // 只有宽度超过目标尺寸时才压缩
                if (width > STICKER_TARGET_WIDTH) {
                    height = Math.round((height * STICKER_TARGET_WIDTH) / width);
                    width = STICKER_TARGET_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/webp', STICKER_COMPRESSION_QUALITY);

                if (compressedDataUrl.length > dataUrl.length) {
                    resolve(dataUrl);
                } else {
                    resolve(compressedDataUrl);
                }
            } catch (error) {
                console.error('Failed to compress sticker image:', error);
                resolve(dataUrl);
            }
        };

        img.onerror = () => {
            console.error('Failed to load image for sticker compression');
            resolve(dataUrl);
        };

        img.src = dataUrl;
    });
}


/**
 * 递归压缩 DockItem 数组中的所有图标
 * @param items DockItem 数组
 * @returns 压缩图标后的 DockItem 数组
 */
export async function compressIconsInItems(items: DockItem[]): Promise<DockItem[]> {
    return Promise.all(
        items.map(async (item) => {
            const compressedItem = { ...item };

            // 压缩项目本身的图标
            if (compressedItem.icon) {
                compressedItem.icon = await compressIcon(compressedItem.icon);
            }

            // 如果是文件夹，递归压缩子项
            if (compressedItem.type === 'folder' && compressedItem.items) {
                compressedItem.items = await compressIconsInItems(compressedItem.items);
            }

            return compressedItem;
        })
    );
}

/**
 * 估算 Base64 字符串的实际字节大小
 * @param base64 Base64 字符串
 * @returns 估算的字节数
 */
export function estimateBase64Size(base64: string): number {
    if (!base64) return 0;

    // 移除 data URL 前缀
    const base64Data = base64.split(',')[1] || base64;

    // Base64 编码后大小约为原始大小的 4/3
    return Math.ceil((base64Data.length * 3) / 4);
}

/**
 * 格式化字节大小为可读字符串
 * @param bytes 字节数
 * @returns 可读的大小字符串 (如 "1.5 MB")
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
