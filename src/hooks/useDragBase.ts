/**
 * 共享拖拽 Hook 基础逻辑
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DockItem } from '../types';
import {
    BaseDragState,
    createInitialDragState,
    resetDragState,
    calculateDistance,
    toggleDraggingClass,
    LayoutItem,
    Position,
} from '../utils/dragUtils';
import { onReturnAnimationComplete } from '../utils/animationUtils';


/**
 * Dock 拖拽状态 - 扩展基础状态
 */

// ============================================================================
// 类型安全的 ActionData 定义
// ============================================================================

/** Dock 动作数据联合类型 */
export type DockActionData =
    | { type: 'reorder'; newItems: DockItem[] }
    | { type: 'dropToFolder'; item: DockItem; targetFolder: DockItem }
    | { type: 'mergeFolder'; item: DockItem; targetItem: DockItem }
    | { type: 'dragToOpenFolder'; item: DockItem }
    | null;

/** Folder 动作数据联合类型 */
export type FolderActionData =
    | { type: 'reorder'; newItems: DockItem[] }
    | { type: 'dragOut'; item: DockItem; mousePosition: { x: number; y: number } }
    | null;

export interface DockDragState extends BaseDragState {
    targetAction: 'reorder' | 'dropToFolder' | 'mergeFolder' | 'dragToOpenFolder' | null;
    targetActionData: DockActionData;
}

/**
 * 文件夹拖拽状态 - 扩展基础状态
 */
export interface FolderDragState extends BaseDragState {
    targetAction: 'reorder' | 'dragOut' | null;
    targetActionData: FolderActionData;
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
    /** 容器引用 (grid 布局需要) */
    containerRef?: React.RefObject<HTMLElement>;
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
    layoutSnapshotRef: React.MutableRefObject<LayoutItem[]>;
    hasMovedRef: React.MutableRefObject<boolean>;
    thresholdListenerRef: React.MutableRefObject<((e: MouseEvent) => void) | null>;
    lastPlaceholderRef: React.MutableRefObject<number | null>;
    dragElementRef: React.MutableRefObject<HTMLElement | null>;
    containerRef?: React.RefObject<HTMLElement>;
    /** 缓存的容器 Rect (拖拽开始时捕获) */
    cachedContainerRectRef: React.MutableRefObject<DOMRect | null>;
    startDragging: (item: DockItem) => void;
    handleDragThresholdCheck: (
        e: MouseEvent,
        startX: number,
        startY: number,
        onThresholdExceeded: () => void
    ) => boolean;
    captureLayoutSnapshot: () => void;
    resetPlaceholderState: () => void;
    cleanupDragListeners: (
        mouseMoveHandler: (e: MouseEvent) => void,
        mouseUpHandler: () => void
    ) => void;
    startReturnAnimation: (
        targetPos: Position,
        action: any,
        actionData: any,
        onAnimationCompleteCallback: () => void
    ) => void;
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
        containerRef,
    } = options;

    // 状态
    const [dragState, setDragState] = useState<T>(createInitialState);
    const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);

    // Refs
    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    const dragRef = useRef<T>(dragState);
    const itemsRef = useRef(items);
    const placeholderRef = useRef<number | null>(null);
    const layoutSnapshotRef = useRef<LayoutItem[]>([]);
    const hasMovedRef = useRef(false);
    const thresholdListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const lastPlaceholderRef = useRef<number | null>(null);
    const dragElementRef = useRef<HTMLElement | null>(null);
    // 缓存的容器 Rect (拖拽开始时捕获，避免每帧查询 DOM)
    const cachedContainerRectRef = useRef<DOMRect | null>(null);

    // 同步 refs
    useEffect(() => { dragRef.current = dragState; }, [dragState]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { placeholderRef.current = placeholderIndex; }, [placeholderIndex]);

    // 切换 body class
    useEffect(() => {
        toggleDraggingClass(dragState.isDragging);
    }, [dragState.isDragging]);

    // 捕获布局快照
    const captureLayoutSnapshot = useCallback(() => {
        const snapshot: LayoutItem[] = [];
        itemRefs.current.forEach((ref, index) => {
            if (ref && itemsRef.current[index]) {
                const rect = ref.getBoundingClientRect();
                snapshot.push({
                    id: itemsRef.current[index].id,
                    index: index,
                    rect: rect,
                    centerX: rect.left + rect.width / 2,
                    centerY: rect.top + rect.height / 2,
                });
            }
        });
        layoutSnapshotRef.current = snapshot;

        // 同时缓存容器 Rect
        if (containerRef?.current) {
            cachedContainerRectRef.current = containerRef.current.getBoundingClientRect();
        }
    }, [containerRef]);

    // 开始拖拽
    const startDragging = useCallback((item: DockItem) => {
        // 先捕获布局
        captureLayoutSnapshot();

        setDragState(prev => ({ ...prev, isDragging: true }));
        if (onDragStart) onDragStart(item);
    }, [onDragStart, captureLayoutSnapshot]);

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

    // 重置占位符状态
    const resetPlaceholderState = useCallback(() => {
        setPlaceholderIndex(null);
        lastPlaceholderRef.current = null;
    }, []);

    // 清理外部拖拽状态
    useEffect(() => {
        if (!externalDragItem) {
            resetPlaceholderState();
        }
    }, [externalDragItem, resetPlaceholderState]);

    // Helper: Cleanup window listeners
    const cleanupDragListeners = useCallback((
        mouseMoveHandler: (e: MouseEvent) => void,
        mouseUpHandler: () => void
    ) => {
        if (thresholdListenerRef.current) {
            window.removeEventListener('mousemove', thresholdListenerRef.current);
            thresholdListenerRef.current = null;
        }
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
    }, []);

    // Helper: Start Return Animation
    const startReturnAnimation = useCallback((
        targetPos: Position,
        action: any, // Allow any action type compatible with T
        actionData: any,
        onAnimationCompleteCallback: () => void
    ) => {
        setDragState(prev => ({
            ...prev,
            isDragging: false,
            isAnimatingReturn: true,
            targetPosition: targetPos,
            targetAction: action,
            targetActionData: actionData,
        }));

        // Reset movement tracking
        hasMovedRef.current = false;

        // Use shared animation utility
        onReturnAnimationComplete(dragElementRef.current, () => {
            // Check ref to ensure we are still in the expected state
            if (dragRef.current.isAnimatingReturn) {
                onAnimationCompleteCallback();
            }
        });
    }, [setDragState]);

    return {
        dragState,
        setDragState,
        placeholderIndex,
        setPlaceholderIndex,
        itemRefs,
        dragRef,
        itemsRef,
        placeholderRef,
        layoutSnapshotRef,
        hasMovedRef,
        thresholdListenerRef,
        lastPlaceholderRef,
        dragElementRef,
        containerRef,
        cachedContainerRectRef,
        startDragging,
        handleDragThresholdCheck,
        captureLayoutSnapshot,
        resetPlaceholderState,
        cleanupDragListeners,
        startReturnAnimation,
    };
};
