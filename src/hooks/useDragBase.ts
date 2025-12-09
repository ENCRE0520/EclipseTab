/**
 * 共享拖拽 Hook 基础逻辑
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DockItem } from '../types';
import {
    Position,
    BaseDragState,
    createInitialDragState,
    resetDragState,
    calculateDistance,
    toggleDraggingClass,
} from '../utils/dragUtils';

/**
 * Dock 拖拽状态 - 扩展基础状态
 */
export interface DockDragState extends BaseDragState {
    targetAction: 'reorder' | 'dropToFolder' | 'mergeFolder' | 'dragToOpenFolder' | null;
    targetActionData: unknown;
}

/**
 * 文件夹拖拽状态 - 扩展基础状态
 */
export interface FolderDragState extends BaseDragState {
    targetAction: 'reorder' | 'dragOut' | null;
    targetActionData: unknown;
}

/**
 * 创建 Dock 拖拽初始状态
 */
export const createDockDragState = (): DockDragState => {
    return createInitialDragState<DockDragState>({
        targetAction: null,
        targetActionData: null,
    });
};

/**
 * 创建文件夹拖拽初始状态
 */
export const createFolderDragState = (): FolderDragState => {
    return createInitialDragState<FolderDragState>({
        targetAction: null,
        targetActionData: null,
    });
};

/**
 * 重置 Dock 拖拽状态
 */
export const resetDockDragState = (): DockDragState => {
    return resetDragState<DockDragState>({
        targetAction: null,
        targetActionData: null,
    });
};

/**
 * 重置文件夹拖拽状态
 */
export const resetFolderDragState = (): FolderDragState => {
    return resetDragState<FolderDragState>({
        targetAction: null,
        targetActionData: null,
    });
};

/**
 * 共享拖拽 Hook 配置
 */
export interface UseDragBaseOptions<T extends BaseDragState> {
    items: DockItem[];
    isEditMode: boolean;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    externalDragItem?: DockItem | null;
    createInitialState: () => T;
    resetState: () => T;
}

/**
 * 共享拖拽 Hook 返回值
 */
export interface UseDragBaseReturn<T extends BaseDragState> {
    dragState: T;
    setDragState: React.Dispatch<React.SetStateAction<T>>;
    placeholderIndex: number | null;
    setPlaceholderIndex: React.Dispatch<React.SetStateAction<number | null>>;
    itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
    dragRef: React.MutableRefObject<T>;
    itemsRef: React.MutableRefObject<DockItem[]>;
    placeholderRef: React.MutableRefObject<number | null>;
    hasMovedRef: React.MutableRefObject<boolean>;
    thresholdListenerRef: React.MutableRefObject<((e: MouseEvent) => void) | null>;
    startDragging: (item: DockItem) => void;
    handleDragThresholdCheck: (
        e: MouseEvent,
        startX: number,
        startY: number,
        onThresholdExceeded: () => void
    ) => boolean;
}

/**
 * 共享拖拽 Hook - 提供基础拖拽功能
 */
export const useDragBase = <T extends BaseDragState>(
    options: UseDragBaseOptions<T>
): UseDragBaseReturn<T> => {
    const {
        items,
        onDragStart,
        externalDragItem,
        createInitialState,
    } = options;

    // 状态
    const [dragState, setDragState] = useState<T>(createInitialState);
    const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);

    // Refs
    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    const dragRef = useRef<T>(dragState);
    const itemsRef = useRef(items);
    const placeholderRef = useRef<number | null>(null);
    const hasMovedRef = useRef(false);
    const thresholdListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

    // 同步 refs
    useEffect(() => { dragRef.current = dragState; }, [dragState]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { placeholderRef.current = placeholderIndex; }, [placeholderIndex]);

    // 切换 body class
    useEffect(() => {
        toggleDraggingClass(dragState.isDragging);
    }, [dragState.isDragging]);

    // 开始拖拽
    const startDragging = useCallback((item: DockItem) => {
        setDragState(prev => ({ ...prev, isDragging: true }));
        if (onDragStart) onDragStart(item);
    }, [onDragStart]);

    // 检查拖拽阈值
    const handleDragThresholdCheck = useCallback((
        e: MouseEvent,
        startX: number,
        startY: number,
        onThresholdExceeded: () => void
    ): boolean => {
        const dist = calculateDistance(e.clientX, e.clientY, startX, startY);
        if (dist > 8) {
            hasMovedRef.current = true;
            onThresholdExceeded();
            return true;
        }
        return false;
    }, []);

    // 清理外部拖拽状态
    useEffect(() => {
        if (!externalDragItem) {
            setPlaceholderIndex(null);
        }
    }, [externalDragItem]);

    return {
        dragState,
        setDragState,
        placeholderIndex,
        setPlaceholderIndex,
        itemRefs,
        dragRef,
        itemsRef,
        placeholderRef,
        hasMovedRef,
        thresholdListenerRef,
        startDragging,
        handleDragThresholdCheck,
    };
};
