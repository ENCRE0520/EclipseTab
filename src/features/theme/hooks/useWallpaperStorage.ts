import { useState, useCallback, useEffect, useRef } from 'react';
import { db, WallpaperItem } from '@/shared/utils/db';

export interface UseWallpaperStorageReturn {
    saveWallpaper: (file: File) => Promise<string>;
    getWallpaper: (id: string) => Promise<Blob | null>;
    deleteWallpaper: (id: string) => Promise<void>;
    getRecentWallpapers: () => Promise<WallpaperItem[]>;
    createWallpaperUrl: (blob: Blob) => string;
    isSupported: boolean;
    isProcessing: boolean;
    error: Error | null;
}

const COMPRESSION_THRESHOLD = 15 * 1024 * 1024; // 15MB 压缩阈值

const compressImage = async (file: File): Promise<Blob> => {
    if (file.size <= COMPRESSION_THRESHOLD) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (blob && blob.size < file.size) {
                        resolve(blob);
                    } else {
                        resolve(file);
                    }
                },
                'image/webp',
                0.8
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for compression'));
        };

        img.src = url;
    });
};

const generateThumbnail = async (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            const targetSize = 200;
            canvas.width = targetSize;
            canvas.height = targetSize;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // 计算封面尺寸（居中裁剪）
            const minDimension = Math.min(img.width, img.height);
            const sourceX = (img.width - minDimension) / 2;
            const sourceY = (img.height - minDimension) / 2;
            const sourceWidth = minDimension;
            const sourceHeight = minDimension;

            ctx.drawImage(
                img,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                targetSize,
                targetSize
            );

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate thumbnail blob'));
                    }
                },
                'image/webp',
                0.6
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for thumbnail'));
        };

        img.src = url;
    });
};

const generateVideoThumbnail = async (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);

        // 10 秒超时，避免 promise 永远不 resolve
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Video thumbnail generation timed out'));
        }, 10000);

        const cleanup = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
        };

        const captureFrame = () => {
            const canvas = document.createElement('canvas');
            const targetSize = 200;
            canvas.width = targetSize;
            canvas.height = targetSize;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                cleanup();
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // 计算封面尺寸（居中裁剪）
            const vw = video.videoWidth || 320;
            const vh = video.videoHeight || 240;
            const minDimension = Math.min(vw, vh);
            const sourceX = (vw - minDimension) / 2;
            const sourceY = (vh - minDimension) / 2;

            ctx.drawImage(
                video,
                sourceX,
                sourceY,
                minDimension,
                minDimension,
                0,
                0,
                targetSize,
                targetSize
            );

            canvas.toBlob(
                (blob) => {
                    cleanup();
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate video thumbnail blob'));
                    }
                },
                'image/webp',
                0.6
            );
        };

        video.onseeked = captureFrame;

        video.onloadedmetadata = () => {
            // metadata 加载完成后，duration 可用
            const seekTime = (video.duration && isFinite(video.duration))
                ? Math.min(1, video.duration * 0.1)
                : 0;

            if (seekTime === 0 && video.currentTime === 0) {
                // 已经在第 0 帧，不会触发 onseeked，直接截帧
                // 但需要等帧数据就绪
                video.oncanplay = () => captureFrame();
            } else {
                video.currentTime = seekTime;
            }
        };

        video.onerror = () => {
            cleanup();
            reject(new Error('Failed to load video for thumbnail'));
        };

        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = url;
    });
};

export const useWallpaperStorage = (): UseWallpaperStorageReturn => {
    const [isSupported, setIsSupported] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 性能优化: 使用 useRef 跟踪 URL，避免每次添加 URL 触发重渲染
    const activeUrlsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            setIsSupported(false);
            setError(new Error('IndexedDB is not supported in this browser'));
        }
    }, []);

    // 卸载时清理所有创建的 URL
    useEffect(() => {
        const urlsRef = activeUrlsRef;
        return () => {
            urlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const createWallpaperUrl = useCallback((blob: Blob): string => {
        const url = URL.createObjectURL(blob);
        activeUrlsRef.current.add(url);
        return url;
    }, []);

    const saveWallpaper = useCallback(async (file: File): Promise<string> => {
        if (!isSupported) {
            throw new Error('Storage not supported');
        }

        setIsProcessing(true);
        try {
            const isVideo = file.type.startsWith('video/');

            let blobToSave: Blob;
            let thumbnailBlob: Blob | undefined;

            if (isVideo) {
                // 视频不做压缩，直接存储
                blobToSave = file;
                thumbnailBlob = await generateVideoThumbnail(file).catch(err => {
                    console.warn('Failed to generate video thumbnail:', err);
                    return undefined;
                });
            } else {
                [blobToSave, thumbnailBlob] = await Promise.all([
                    compressImage(file),
                    generateThumbnail(file).catch(err => {
                        console.warn('Failed to generate thumbnail:', err);
                        return undefined;
                    })
                ]);
            }

            const id = `wallpaper_${Date.now()}`;

            const item: WallpaperItem = {
                id,
                data: blobToSave,
                thumbnail: thumbnailBlob,
                createdAt: Date.now(),
                type: isVideo ? 'video' : 'image'
            };

            await db.save(item);
            return id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to save wallpaper');
            setError(error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [isSupported]);

    const getWallpaper = useCallback(async (id: string): Promise<Blob | null> => {
        if (!isSupported) return null;

        try {
            const item = await db.get(id);
            return item ? item.data : null;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to get wallpaper');
            setError(error);
            return null;
        }
    }, [isSupported]);

    const deleteWallpaper = useCallback(async (id: string): Promise<void> => {
        if (!isSupported) return;

        try {
            await db.remove(id);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete wallpaper');
            setError(error);
            throw error;
        }
    }, [isSupported]);

    const getRecentWallpapers = useCallback(async (): Promise<WallpaperItem[]> => {
        if (!isSupported) return [];

        try {
            const allItems = await db.getAll();
            // 按 createdAt 降序排序并取前 6 个
            return allItems
                .sort((a, b) => b.createdAt - a.createdAt);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to get recent wallpapers');
            setError(error);
            return [];
        }
    }, [isSupported]);

    return {
        saveWallpaper,
        getWallpaper,
        deleteWallpaper,
        getRecentWallpapers,
        createWallpaperUrl,
        isSupported,
        isProcessing,
        error
    };
};
