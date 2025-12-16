
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DockItem } from '../types';
import {
    createMouseDownHandler,
    reorderList,
} from '../utils/dragUtils';
import { createGridStrategy } from '../utils/dragStrategies';
import { onReturnAnimationComplete } from '../utils/animationUtils';
import {
    useDragBase,
    createFolderDragState,
    resetFolderDragState,
    FolderDragState,
} from './useDragBase';
import {
    FOLDER_COLUMNS,
    FOLDER_CELL_SIZE,
    HAPTIC_PATTERNS,
} from '../constants/layout';

export interface UseFolderDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    containerRef: React.RefObject<HTMLElement>;
    externalDragItem?: DockItem | null;
    onDragOut?: (item: DockItem, mousePosition: { x: number; y: number }) => void;
    /** 占位符状态变化回调，用于通知父组件同步到 Context */
    onFolderPlaceholderChange?: (active: boolean) => void;
}

export const useFolderDragAndDrop = (options: UseFolderDragAndDropOptions) => {
    const {
        items,
        isEditMode,
        onReorder,
        onDragStart,
        onDragEnd,
        containerRef,
        externalDragItem,
        onDragOut,
        onFolderPlaceholderChange,
    } = options;

    const {
        dragState,
        setDragState,
        placeholderIndex,
        setPlaceholderIndex,
        placeholderRef,
        itemRefs,
        dragRef,
        itemsRef,
        layoutSnapshotRef,
        hasMovedRef,
        thresholdListenerRef,
        startDragging,
        resetPlaceholderState,
        dragElementRef,
        captureLayoutSnapshot,
        cachedContainerRectRef, // 缓存的容器 Rect
        performHapticFeedback,
    } = useDragBase<FolderDragState>({
        items,
        isEditMode,
        onDragStart,
        onDragEnd,
        externalDragItem,
        createInitialState: createFolderDragState,
        resetState: resetFolderDragState,
        containerRef
    });

    // 创建网格布局策略
    const strategy = useMemo(() => createGridStrategy(FOLDER_COLUMNS), []);

    // Haptic Feedback for Reordering
    useEffect(() => {
        if (placeholderIndex !== null && dragState.isDragging) {
            performHapticFeedback(HAPTIC_PATTERNS.REORDER);
        }
    }, [placeholderIndex, performHapticFeedback, dragState.isDragging]);

    // ========== 同步文件夹占位符状态到父组件 (Context) ==========
    useEffect(() => {
        if (externalDragItem && onFolderPlaceholderChange) {
            onFolderPlaceholderChange(placeholderIndex !== null);
        }

        return () => {
            if (onFolderPlaceholderChange) {
                onFolderPlaceholderChange(false);
            }
        };
    }, [externalDragItem, placeholderIndex, onFolderPlaceholderChange]);

    // Track last position for drop events (since we don't update state during drag)
    const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

    // ============================================================================
    // RAF 节流 - 限制 mousemove 处理频率为每帧一次
    // ============================================================================
    const rafIdRef = useRef<number | null>(null);
    const pendingMouseEventRef = useRef<MouseEvent | null>(null);

    /**
     * 处理鼠标移动逻辑 (Internal) - 实际处理函数
     */
    const processInternalMouseMove = useCallback((e: MouseEvent) => {
        const currentDrag = dragRef.current;
        // 如果是内部拖拽
        if (currentDrag.isDragging && currentDrag.item) {
            // Calculate new position
            const x = e.clientX - currentDrag.offset.x;
            const y = e.clientY - currentDrag.offset.y;

            // Update ref for MouseUp handler
            lastPositionRef.current = { x, y };

            // Direct DOM manipulation for performance (avoids re-renders)
            if (dragElementRef.current) {
                dragElementRef.current.style.left = `${x}px`;
                dragElementRef.current.style.top = `${y}px`;
            }

            // 检查是否拖出文件夹区域 (Drag Out Detection) - 使用缓存的 Rect
            const containerRect = cachedContainerRectRef.current || containerRef.current?.getBoundingClientRect();
            if (onDragOut && containerRect) {


                // 如果鼠标超出文件夹边界一定距离
                const isOutside = strategy.isOutsideContainer
                    ? strategy.isOutsideContainer(e.clientX, e.clientY, containerRect)
                    : false;

                if (isOutside) {
                    // Only update state if status changes
                    if (currentDrag.targetAction !== 'dragOut') {
                        setDragState(prev => ({
                            ...prev,
                            targetAction: 'dragOut'
                        }));
                        setPlaceholderIndex(null);
                    }
                    return;
                } else {
                    // Back inside
                    if (currentDrag.targetAction === 'dragOut') {
                        setDragState(prev => ({
                            ...prev,
                            targetAction: 'reorder'
                        }));
                    }
                }
            }

            // 计算落点
            // 使用策略计算新的 Index
            const newIndex = strategy.calculatePlaceholder(
                e.clientX,
                e.clientY,
                layoutSnapshotRef.current,
                itemsRef.current.length,
                cachedContainerRectRef.current || undefined
            );
            setPlaceholderIndex(newIndex);
        }
    }, [dragRef, itemsRef, layoutSnapshotRef, containerRef, setDragState, setPlaceholderIndex, onDragOut, strategy, dragElementRef, cachedContainerRectRef]);

    /** RAF 节流包装的 handleMouseMove */
    const handleMouseMove = useCallback((e: MouseEvent) => {
        pendingMouseEventRef.current = e;
        if (rafIdRef.current !== null) return;

        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            const event = pendingMouseEventRef.current;
            if (event) {
                processInternalMouseMove(event);
            }
        });
    }, [processInternalMouseMove]);

    /**
     * 处理外部拖拽 (External Drag) - 同样使用 RAF 节流
     */
    useEffect(() => {
        if (!externalDragItem) return;

        // 确保 Layout Snapshot 已经捕获
        if (layoutSnapshotRef.current.length === 0 && items.length > 0) {
            captureLayoutSnapshot();
        }

        let externalRafId: number | null = null;
        let pendingExternalEvent: MouseEvent | null = null;

        const handleExternalMouseMove = (e: MouseEvent) => {
            pendingExternalEvent = e;
            if (externalRafId !== null) return;

            externalRafId = requestAnimationFrame(() => {
                externalRafId = null;
                if (pendingExternalEvent) {
                    const newIndex = strategy.calculatePlaceholder(
                        pendingExternalEvent.clientX,
                        pendingExternalEvent.clientY,
                        layoutSnapshotRef.current,
                        items.length,
                        cachedContainerRectRef.current || undefined
                    );
                    setPlaceholderIndex(newIndex);
                }
            });
        };

        window.addEventListener('mousemove', handleExternalMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleExternalMouseMove);
            if (externalRafId !== null) {
                cancelAnimationFrame(externalRafId);
            }
        };
    }, [externalDragItem, items.length, setPlaceholderIndex, captureLayoutSnapshot, strategy, cachedContainerRectRef]);


    /**
     * 处理归位动画完成 (Stage 2: Commit)
     * 在动画结束后执行实际的数据更新
     * 
     * 关键点：
     * 1. 此函数应由 transitionend 事件触发，而非 setTimeout
     * 2. 必须在此函数中才重置 placeholderIndex，以保持挤压动画状态
     * 3. 数据更新 (onReorder) 必须在所有视觉动画完成后执行
     */
    const handleAnimationComplete = useCallback(() => {
        const currentDrag = dragRef.current;

        if (!currentDrag.isAnimatingReturn) return;

        // 类型安全的动作处理
        const data = currentDrag.targetActionData;
        if (data) {
            performHapticFeedback(HAPTIC_PATTERNS.DROP);
            switch (data.type) {
                case 'reorder':
                    onReorder(data.newItems);
                    break;
                case 'dragOut':
                    if (onDragOut) {
                        onDragOut(data.item, data.mousePosition);
                    }
                    break;
            }
        }

        // 重置所有状态
        setDragState(resetFolderDragState());
        resetPlaceholderState();

        if (onDragEnd) {
            onDragEnd();
        }
    }, [dragRef, onReorder, onDragOut, onDragEnd, setDragState, resetPlaceholderState]);

    /**
     * 处理鼠标松开 (Drop) - 两阶段释放
     * 
     * Stage 1 (本函数): 触发归位动画，设置 isAnimatingReturn = true
     * Stage 2 (handleAnimationComplete): 动画结束后提交数据
     * 
     * 关键：
     * 1. 不在此处调用 onReorder
     * 2. 保留 placeholderIndex 维持挤压动画
     * 3. 使用 transitionend 监听动画完成
     */
    const handleMouseUp = useCallback(() => {
        const currentDrag = dragRef.current;
        // 使用 ref 获取最新值，避免闭包捕获旧状态
        const currentPlaceholder = placeholderRef.current ?? -1;

        // 清理事件监听
        window.removeEventListener('mousemove', handleMouseMove);

        if (currentDrag.isDragging && currentDrag.item) {
            // ========== Case: Drag Out ==========
            if (currentDrag.targetAction === 'dragOut' && onDragOut) {
                // DragOut 不需要归位动画，直接执行
                // Use last known position from ref (since state is not updated during drag)
                const finalPos = lastPositionRef.current || currentDrag.currentPosition;
                onDragOut(currentDrag.item, finalPos);

                setDragState(resetFolderDragState());
                resetPlaceholderState();
                if (onDragEnd) onDragEnd();
                return;
            }

            // ========== Case: Reorder with Animation ==========
            if (currentPlaceholder !== -1 && currentPlaceholder !== currentDrag.originalIndex) {
                // 计算目标位置 (网格坐标 -> 屏幕坐标)
                const gridElement = containerRef.current;
                const gridRect = gridElement?.getBoundingClientRect();
                if (gridRect && gridElement) {
                    const CELL_SIZE = FOLDER_CELL_SIZE;
                    const COLUMNS = FOLDER_COLUMNS;

                    // 获取容器 Padding 偏移量 (CRITICAL: 确保与 CSS Grid 像素级对齐)
                    const computedStyle = window.getComputedStyle(gridElement);
                    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

                    const targetCol = currentPlaceholder % COLUMNS;
                    const targetRow = Math.floor(currentPlaceholder / COLUMNS);

                    // 目标屏幕坐标 = 容器左上角 + Padding偏移 + 网格偏移
                    const targetX = gridRect.left + paddingLeft + targetCol * CELL_SIZE;
                    const targetY = gridRect.top + paddingTop + targetRow * CELL_SIZE;

                    // 预计算新的 items 顺序 (保存到 state 中，Step 2 使用)
                    const newItems = reorderList(itemsRef.current, currentDrag.originalIndex, currentPlaceholder);

                    // Stage 1: 触发归位动画
                    // 关键：isDragging 设为 false，但保留 placeholderIndex 维持挤压效果
                    setDragState(prev => ({
                        ...prev,
                        isDragging: false,
                        isAnimatingReturn: true,
                        currentPosition: { x: targetX, y: targetY },
                        targetPosition: { x: targetX, y: targetY },
                        targetActionData: {
                            type: 'reorder',
                            newItems
                        }
                    }));

                    // Stage 2: 使用共享的动画完成工具
                    onReturnAnimationComplete(dragElementRef.current, () => {
                        if (dragRef.current.isAnimatingReturn) {
                            handleAnimationComplete();
                        }
                    });

                    return;
                }
            }
        }

        // Fallback: 无需动画，直接重置
        setDragState(resetFolderDragState());
        resetPlaceholderState();

        if (onDragEnd) {
            onDragEnd();
        }
    }, [dragRef, placeholderRef, containerRef, onDragOut, onDragEnd, setDragState, resetPlaceholderState, handleMouseMove, handleAnimationComplete, itemsRef, dragElementRef]);

    /**
     * 鼠标按下处理
     */
    const handleMouseDown = useCallback((e: React.MouseEvent, item: DockItem, index: number) => {
        createMouseDownHandler<FolderDragState>(
            {
                isEditMode,
                item,
                index,
                event: e,
                setDragState,
                onDragStart: (item) => {
                    performHapticFeedback(HAPTIC_PATTERNS.PICKUP);
                    startDragging(item);
                },
                handleMouseMove,
                handleMouseUp,
                createDragState: (item, index, _rect, startX, startY, offset) => ({
                    ...createFolderDragState(),
                    isDragging: true,
                    item,
                    originalIndex: index,
                    currentPosition: { x: startX, y: startY },
                    startPosition: { x: startX, y: startY },
                    offset,
                    targetAction: 'reorder', // 默认行为
                })
            },
            hasMovedRef,
            thresholdListenerRef
        );
    }, [isEditMode, setDragState, startDragging, handleMouseMove, handleMouseUp, hasMovedRef, thresholdListenerRef]);

    /**
     * 计算 Grid 布局偏移 (使用 Strategy)
     */
    const getItemTransform = useCallback((index: number) => {
        // 如果没有占位符，不偏移
        if (placeholderIndex === null) {
            return { x: 0, y: 0 };
        }

        // 关键：isAnimatingReturn 期间也要保持挤压效果，直到数据更新
        const isInternalDragActive = (dragState.isDragging || dragState.isAnimatingReturn) && dragState.originalIndex !== -1;

        return strategy.calculateTransform(
            index,
            placeholderIndex,
            isInternalDragActive ? dragState.originalIndex : (externalDragItem ? -1 : dragState.originalIndex),
            dragState.isDragging || dragState.isAnimatingReturn
        );

    }, [dragState.isDragging, dragState.isAnimatingReturn, dragState.originalIndex, placeholderIndex, externalDragItem, strategy]);

    const isDraggingOut = dragState.targetAction === 'dragOut';

    return {
        dragState,
        placeholderIndex,
        itemRefs,
        dragElementRef, // 暴露给 FolderView 用于 Portal
        isDraggingOut,
        handleMouseDown,
        getItemTransform,
    };
};
