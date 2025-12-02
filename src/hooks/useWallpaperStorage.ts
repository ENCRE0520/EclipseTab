import { useState, useCallback, useEffect } from 'react';
import { db, WallpaperItem } from '../utils/db';

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

const COMPRESSION_THRESHOLD = 15 * 1024 * 1024; // 15MB

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

            // Calculate cover dimensions (center crop)
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

export const useWallpaperStorage = (): UseWallpaperStorageReturn => {
    const [isSupported, setIsSupported] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Track active object URLs for cleanup
    const [activeUrls, setActiveUrls] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            setIsSupported(false);
            setError(new Error('IndexedDB is not supported in this browser'));
        }
    }, []);

    // Cleanup all created URLs on unmount
    useEffect(() => {
        return () => {
            activeUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [activeUrls]);

    const createWallpaperUrl = useCallback((blob: Blob): string => {
        const url = URL.createObjectURL(blob);
        setActiveUrls(prev => {
            const next = new Set(prev);
            next.add(url);
            return next;
        });
        return url;
    }, []);

    const saveWallpaper = useCallback(async (file: File): Promise<string> => {
        if (!isSupported) {
            throw new Error('Storage not supported');
        }

        setIsProcessing(true);
        try {
            const [blobToSave, thumbnailBlob] = await Promise.all([
                compressImage(file),
                generateThumbnail(file).catch(err => {
                    console.warn('Failed to generate thumbnail:', err);
                    return undefined;
                })
            ]);

            const id = `wallpaper_${Date.now()}`;

            const item: WallpaperItem = {
                id,
                data: blobToSave,
                thumbnail: thumbnailBlob,
                createdAt: Date.now()
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
            // Sort by createdAt desc and take top 6
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
