import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sticker, StickerInput, DEFAULT_TEXT_STYLE } from '../types';
import { storage } from '../utils/storage';

// 防抖保存延迟 (ms)
const SAVE_DEBOUNCE_MS = 500;

// ============================================================================
// Context Type Definition
// ============================================================================

interface ZenShelfContextType {
    // 状态
    stickers: Sticker[];
    selectedStickerId: string | null;

    // 操作
    addSticker: (input: StickerInput) => void;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    deleteSticker: (id: string) => void;
    selectSticker: (id: string | null) => void;
    layoutStickers: (scaleX: number, scaleY: number) => void;
}

const ZenShelfContext = createContext<ZenShelfContextType | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 生成 UUID
 */
const generateId = (): string => {
    return `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// Provider
// ============================================================================

export const ZenShelfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 状态初始化：从 localStorage 加载
    const [stickers, setStickers] = useState<Sticker[]>(() => storage.getStickers());
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
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [stickers]);



    // ========================================================================
    // 操作函数
    // ========================================================================

    const addSticker = useCallback((input: StickerInput) => {
        const newSticker: Sticker = {
            ...input,
            id: generateId(),
            // 确保文字贴纸有默认样式
            style: input.type === 'text' ? (input.style || DEFAULT_TEXT_STYLE) : undefined,
        };
        setStickers(prev => [...prev, newSticker]);
    }, []);

    const updateSticker = useCallback((id: string, updates: Partial<Sticker>) => {
        setStickers(prev => prev.map(sticker =>
            sticker.id === id ? { ...sticker, ...updates } : sticker
        ));
    }, []);

    const deleteSticker = useCallback((id: string) => {
        setStickers(prev => prev.filter(sticker => sticker.id !== id));
        // 如果删除的是选中的贴纸，取消选中
        setSelectedStickerId(prev => prev === id ? null : prev);
    }, []);



    const selectSticker = useCallback((id: string | null) => {
        setSelectedStickerId(id);
    }, []);

    const layoutStickers = useCallback((scaleX: number, scaleY: number) => {
        setStickers(prev => prev.map(sticker => ({
            ...sticker,
            x: sticker.x * scaleX,
            y: sticker.y * scaleY,
        })));
    }, []);

    // ========================================================================
    // Context Value
    // ========================================================================

    const contextValue: ZenShelfContextType = useMemo(() => ({
        stickers,
        selectedStickerId,
        addSticker,
        updateSticker,
        deleteSticker,
        selectSticker,
        layoutStickers,
    }), [
        stickers,
        selectedStickerId,
        addSticker,
        updateSticker,
        deleteSticker,
        selectSticker,
        layoutStickers,
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
