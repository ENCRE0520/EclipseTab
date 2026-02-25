import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sticker, StickerInput, DEFAULT_TEXT_STYLE } from '../types';
import { storage } from '../utils/storage';
import { db } from '../utils/db';

// 防抖保存延迟 (ms)
const SAVE_DEBOUNCE_MS = 500;

// ============================================================================
// Context 类型定义
// ============================================================================

interface ZenShelfContextType {
    // 状态
    stickers: Sticker[];
    deletedStickers: Sticker[];
    selectedStickerId: string | null;

    // 操作
    addSticker: (input: StickerInput) => void;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    deleteSticker: (id: string) => void;
    selectSticker: (id: string | null) => void;
    bringToTop: (id: string) => void;
    restoreSticker: (sticker: Sticker) => void;
    permanentlyDeleteSticker: (id: string) => void;
    clearRecycleBin: () => void;
}

const ZenShelfContext = createContext<ZenShelfContextType | undefined>(undefined);

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成 UUID
 */
const generateId = (): string => {
    return `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// Provider 实现
// ============================================================================

export const ZenShelfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 状态初始化：从 localStorage 加载
    const [stickers, setStickers] = useState<Sticker[]>(() => storage.getStickers());
    const [deletedStickers, setDeletedStickers] = useState<Sticker[]>(() => storage.getDeletedStickers());
    const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

    // 防抖保存 ref
    const saveTimeoutRef = useRef<number>();

    // 持久化：stickers 变化时防抖保存到 localStorage
    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            storage.saveStickers(stickers);
            storage.saveDeletedStickers(deletedStickers);
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [stickers, deletedStickers]);

    // ========================================================================
    // 数据迁移：将旧的 base64 图片贴纸迁移到 IndexedDB
    // ========================================================================
    useEffect(() => {
        if (storage.isStickerImagesMigrated()) return;

        const migrateStickers = async () => {
            try {
                // 迁移活跃贴纸
                const activeStickers = storage.getStickers();
                const deletedStickersList = storage.getDeletedStickers();
                let hasChanges = false;

                const migrateList = async (list: Sticker[]): Promise<Sticker[]> => {
                    const migrated = [...list];
                    for (let i = 0; i < migrated.length; i++) {
                        const s = migrated[i];
                        if (s.type === 'image' && s.content.startsWith('data:')) {
                            try {
                                // base64 转 Blob
                                const response = await fetch(s.content);
                                const blob = await response.blob();
                                const id = `stickerimg_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                                await db.saveStickerImage({ id, data: blob });
                                migrated[i] = { ...s, content: id };
                                hasChanges = true;
                            } catch (err) {
                                console.warn('Failed to migrate sticker image:', s.id, err);
                            }
                        }
                    }
                    return migrated;
                };

                const migratedActive = await migrateList(activeStickers);
                const migratedDeleted = await migrateList(deletedStickersList);

                if (hasChanges) {
                    storage.saveStickers(migratedActive);
                    storage.saveDeletedStickers(migratedDeleted);
                    setStickers(migratedActive);
                    setDeletedStickers(migratedDeleted);
                }

                storage.markStickerImagesMigrated();
                console.log('Sticker image migration completed');
            } catch (error) {
                console.error('Sticker image migration failed:', error);
            }
        };

        migrateStickers();
    }, []); // 仅在首次挂载时执行
    // ========================================================================
    // 操作函数
    // ========================================================================

    const addSticker = useCallback((input: StickerInput) => {
        setStickers(prev => {
            // 计算下一个 zIndex (比当前最大值高 1)
            const maxZ = Math.max(...prev.map(s => s.zIndex || 1), 0);
            const newSticker: Sticker = {
                ...input,
                id: generateId(),
                zIndex: maxZ + 1,
                // 确保文字贴纸有默认样式
                style: input.type === 'text' ? (input.style || DEFAULT_TEXT_STYLE) : undefined,
            };
            return [...prev, newSticker];
        });
    }, []);

    const updateSticker = useCallback((id: string, updates: Partial<Sticker>) => {
        setStickers(prev => prev.map(sticker =>
            sticker.id === id ? { ...sticker, ...updates } : sticker
        ));
    }, []);

    const deleteSticker = useCallback((id: string) => {
        const stickerToDelete = stickers.find(s => s.id === id);

        setStickers(prev => prev.filter(sticker => sticker.id !== id));

        if (stickerToDelete) {
            setDeletedStickers(prev => {
                const newDeleted = [stickerToDelete, ...prev];
                // Limit to 30 items
                if (newDeleted.length > 30) {
                    // 清理被截断的贴纸的 IndexedDB 图片数据
                    const truncated = newDeleted.slice(30);
                    const imageIds = truncated
                        .filter(s => s.type === 'image' && !s.content.startsWith('data:'))
                        .map(s => s.content);
                    if (imageIds.length > 0) {
                        db.removeStickerImages(imageIds).catch(console.error);
                    }
                    return newDeleted.slice(0, 30);
                }
                return newDeleted;
            });
        }

        // 如果删除的是选中的贴纸，取消选中
        setSelectedStickerId(prev => prev === id ? null : prev);
    }, [stickers]);

    const restoreSticker = useCallback((stickerToRestore: Sticker) => {
        // Remove from deleted
        setDeletedStickers(prev => prev.filter(s => s.id !== stickerToRestore.id));

        // Add back to active stickers
        setStickers(prev => {
            // Recalculate zIndex to be on top
            const maxZ = Math.max(...prev.map(s => s.zIndex || 1), 0);
            return [...prev, { ...stickerToRestore, zIndex: maxZ + 1 }];
        });
    }, []);

    const permanentlyDeleteSticker = useCallback((id: string) => {
        setDeletedStickers(prev => {
            const sticker = prev.find(s => s.id === id);
            // 清理 IndexedDB 中的图片数据
            if (sticker && sticker.type === 'image' && !sticker.content.startsWith('data:')) {
                db.removeStickerImage(sticker.content).catch(console.error);
            }
            return prev.filter(s => s.id !== id);
        });
    }, []);

    const clearRecycleBin = useCallback(() => {
        setDeletedStickers(prev => {
            // 清理所有图片贴纸的 IndexedDB 数据
            const imageIds = prev
                .filter(s => s.type === 'image' && !s.content.startsWith('data:'))
                .map(s => s.content);
            if (imageIds.length > 0) {
                db.removeStickerImages(imageIds).catch(console.error);
            }
            return [];
        });
    }, []);

    const bringToTop = useCallback((id: string) => {
        setStickers(prev => {
            // 计算当前最大 zIndex
            const maxZ = Math.max(...prev.map(s => s.zIndex || 1), 0);
            return prev.map(sticker =>
                sticker.id === id ? { ...sticker, zIndex: maxZ + 1 } : sticker
            );
        });
    }, []);

    const selectSticker = useCallback((id: string | null) => {
        setSelectedStickerId(id);
    }, []);


    // ========================================================================
    // Context 值
    // ========================================================================

    const contextValue: ZenShelfContextType = useMemo(() => ({
        stickers,
        deletedStickers,
        selectedStickerId,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        bringToTop,
    }), [
        stickers,
        deletedStickers,
        selectedStickerId,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        bringToTop,
    ]);

    return (
        <ZenShelfContext.Provider value={contextValue}>
            {children}
        </ZenShelfContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * 获取 Zen Shelf 上下文
 */
export const useZenShelf = (): ZenShelfContextType => {
    const context = useContext(ZenShelfContext);
    if (context === undefined) {
        throw new Error('useZenShelf must be used within a ZenShelfProvider');
    }
    return context;
};
