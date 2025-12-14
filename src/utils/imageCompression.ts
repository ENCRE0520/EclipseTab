/**
 * 图标压缩工具
 * 用于压缩上传的图标和导入的 Space 中的图标，减少 localStorage 使用
 */

import { DockItem } from '../types';

/** 目标压缩尺寸 */
const TARGET_SIZE = 500;

/** WebP 压缩质量 */
const COMPRESSION_QUALITY = 0.8;

/**
 * 压缩 Base64 图标到指定尺寸
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

                // 计算目标尺寸（保持宽高比，最大边为 TARGET_SIZE）
                let { width, height } = img;

                // 如果图片已经小于目标尺寸，不需要压缩尺寸，但仍然转换为 WebP 以减小体积
                if (width > TARGET_SIZE || height > TARGET_SIZE) {
                    if (width > height) {
                        height = Math.round((height * TARGET_SIZE) / width);
                        width = TARGET_SIZE;
                    } else {
                        width = Math.round((width * TARGET_SIZE) / height);
                        height = TARGET_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为 WebP 格式
                const compressedDataUrl = canvas.toDataURL('image/webp', COMPRESSION_QUALITY);

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
