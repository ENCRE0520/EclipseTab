import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sticker, StickerInput, DEFAULT_TEXT_STYLE } from '../types';
import { storage } from '../utils/storage';

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
    confirmDelete: boolean;

    // 操作
    addSticker: (input: StickerInput) => void;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    deleteSticker: (id: string) => void;
    selectSticker: (id: string | null) => void;
    bringToTop: (id: string) => void;
    setConfirmDelete: (confirm: boolean) => void;
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
    const [confirmDelete, setConfirmDeleteState] = useState<boolean>(() => {
        const saved = localStorage.getItem('sticker_confirm_delete');
        return saved === null ? true : saved === 'true'; // Default to true
    });

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
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [stickers, deletedStickers]);

    const setConfirmDelete = useCallback((confirm: boolean) => {
        setConfirmDeleteState(confirm);
        localStorage.setItem('sticker_confirm_delete', String(confirm));
    }, []);



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
        setDeletedStickers(prev => prev.filter(s => s.id !== id));
    }, []);

    const clearRecycleBin = useCallback(() => {
        setDeletedStickers([]);
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
        confirmDelete,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        bringToTop,
        setConfirmDelete,
    }), [
        stickers,
        deletedStickers,
        selectedStickerId,
        confirmDelete,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        bringToTop,
        setConfirmDelete,
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
