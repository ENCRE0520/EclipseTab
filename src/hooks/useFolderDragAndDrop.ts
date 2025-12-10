import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DockItem } from '../types';
import { useDragBase, createFolderDragState, resetFolderDragState, FolderDragState } from './useDragBase';
import { createMouseDownHandler } from '../utils/dragUtils';
import { createGridStrategy, reorderItems } from '../utils/dragStrategies';

// 网格配置常量
const GRID_CONFIG = {
    columns: 4,
    itemSize: 64,
    gap: 8,
    get cellSize() { return this.itemSize + this.gap; }, // 72px
    padding: 8,
    hysteresisThreshold: 15, // 滞后阈值(像素)
};

interface UseFolderDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onDragOut?: (item: DockItem, mousePosition: { x: number; y: number }) => void;
    containerRef: React.RefObject<HTMLElement>;
    externalDragItem?: DockItem | null;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
}

export const useFolderDragAndDrop = ({
    items,
    isEditMode,
    onReorder,
    onDragOut,
    containerRef,
    externalDragItem,
    onDragStart,
    onDragEnd,
}: UseFolderDragAndDropOptions) => {
    const {
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
        startDragging,
        captureLayoutSnapshot,
        dragElementRef,
    } = useDragBase<FolderDragState>({
        items,
        isEditMode,
        onDragStart,
        onDragEnd,
        externalDragItem,
        createInitialState: createFolderDragState,
        resetState: resetFolderDragState,
    });

    // 使用网格策略
    const gridStrategy = useMemo(() => createGridStrategy(GRID_CONFIG.columns), []);

    const [isDraggingOut, setIsDraggingOut] = useState(false);
    const isDraggingOutRef = useRef(false);
    const localLastPlaceholderRef = useRef<number | null>(null); // 滞后机制

    useEffect(() => { isDraggingOutRef.current = isDraggingOut; }, [isDraggingOut]);

    const isOutsideContainer = useCallback((mouseX: number, mouseY: number): boolean => {
        const elementUnder = document.elementFromPoint(mouseX, mouseY);
        if (elementUnder && elementUnder.closest('[data-dock-container="true"]')) {
            return true;
        }

        if (!containerRef.current) return false;
        const rect = containerRef.current.getBoundingClientRect();
        const buffer = 10;
        return (
            mouseX < rect.left - buffer ||
            mouseX > rect.right + buffer ||
            mouseY < rect.top - buffer ||
            mouseY > rect.bottom + buffer
        );
    }, [containerRef]);

    // 基于网格槽位计算插入位置
    const calculateInsertIndex = useCallback((mouseX: number, mouseY: number): number => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();

        const { columns, cellSize, padding } = GRID_CONFIG;

        // 计算鼠标相对于容器内容区域的位置
        const relX = mouseX - rect.left - padding;
        const relY = mouseY - rect.top - padding;

        // 计算所在的列和行 (使用中点判断)
        const col = Math.floor(relX / cellSize + 0.5);
        const row = Math.floor(relY / cellSize + 0.5);

        // 限制列范围
        const safeCol = Math.max(0, Math.min(col, columns));
        const safeRow = Math.max(0, row);

        // 计算索引并限制在有效范围内
        const index = safeRow * columns + safeCol;
        const maxIndex = itemsRef.current.length;

        return Math.min(index, maxIndex);
    }, [containerRef, itemsRef]);

    // 获取指定槽位的中心坐标
    const getSlotCenter = useCallback((index: number): { x: number; y: number } => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();

        const { columns, cellSize, padding, itemSize } = GRID_CONFIG;
        const col = index % columns;
        const row = Math.floor(index / columns);

        return {
            x: rect.left + padding + col * cellSize + itemSize / 2,
            y: rect.top + padding + row * cellSize + itemSize / 2
        };
    }, [containerRef]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const state = dragRef.current;
        const activeItem = state.isDragging ? state.item : externalDragItem;

        if (!state.isDragging && !externalDragItem && state.item) {
            const dist = Math.hypot(e.clientX - state.startPosition.x, e.clientY - state.startPosition.y);
            if (dist > 8) {
                startDragging(state.item);
            } else {
                return;
            }
        }

        if (!activeItem) return;

        // Ensure layout snapshot exists for external drag or if missing
        if ((!layoutSnapshotRef.current || layoutSnapshotRef.current.length === 0) && itemsRef.current.length > 0) {
            captureLayoutSnapshot();
        }

        if (state.isDragging) {
            const x = e.clientX - state.offset.x;
            const y = e.clientY - state.offset.y;
            // setDragState(prev => ({ ...prev, currentPosition: { x, y } }));

            // Direct DOM manipulation
            if (dragElementRef.current) {
                dragElementRef.current.style.left = `${x}px`;
                dragElementRef.current.style.top = `${y}px`;
            }
        }

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        if (state.isDragging && isOutsideContainer(mouseX, mouseY)) {
            setIsDraggingOut(true);
            setPlaceholderIndex(null);
            localLastPlaceholderRef.current = null;
            return;
        }

        setIsDraggingOut(false);

        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const isInsideContainer = (
            mouseX >= containerRect.left &&
            mouseX <= containerRect.right &&
            mouseY >= containerRect.top &&
            mouseY <= containerRect.bottom
        );

        if (!isInsideContainer) {
            setPlaceholderIndex(null);
            localLastPlaceholderRef.current = null;
            return;
        }

        // 使用改进的网格槽位计算
        const newIndex = calculateInsertIndex(mouseX, mouseY);

        // 滞后机制: 只有当移动距离超过阈值时才切换位置
        if (localLastPlaceholderRef.current !== null && localLastPlaceholderRef.current !== newIndex) {
            const currentCenter = getSlotCenter(localLastPlaceholderRef.current);
            const newCenter = getSlotCenter(newIndex);

            const distFromCurrent = Math.hypot(mouseX - currentCenter.x, mouseY - currentCenter.y);
            const distToNew = Math.hypot(mouseX - newCenter.x, mouseY - newCenter.y);

            // 如果距离当前位置仍然很近，或者没有明显更接近新位置，则保持不变
            if (distFromCurrent < GRID_CONFIG.hysteresisThreshold ||
                distFromCurrent < distToNew * 0.8) {
                return; // 保持当前位置
            }
        }

        setPlaceholderIndex(newIndex);
        localLastPlaceholderRef.current = newIndex;

    }, [isOutsideContainer, containerRef, externalDragItem, startDragging, captureLayoutSnapshot, layoutSnapshotRef, itemsRef, setDragState, setPlaceholderIndex, calculateInsertIndex, getSlotCenter]);

    useEffect(() => {
        if (externalDragItem) {
            window.addEventListener('mousemove', handleMouseMove);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [externalDragItem, handleMouseMove]);

    const handleMouseUp = useCallback(() => {
        const state = dragRef.current;

        if (!state.isDragging && state.item && !hasMovedRef.current) {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
                thresholdListenerRef.current = null;
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            hasMovedRef.current = false;
            setDragState(resetFolderDragState());
            return;
        }

        if (!state.item) return;

        if (thresholdListenerRef.current) {
            window.removeEventListener('mousemove', thresholdListenerRef.current);
            thresholdListenerRef.current = null;
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const currentPlaceholder = placeholderRef.current;
        const currentItems = itemsRef.current;
        const snapshot = layoutSnapshotRef.current;
        const wasDraggingOut = isDraggingOutRef.current;

        let targetPos: { x: number, y: number } | null = null;
        let action: FolderDragState['targetAction'] = null;
        let actionData: any = null;

        if (wasDraggingOut && onDragOut) {
            const dockElement = document.querySelector('[data-dock-container="true"]');
            if (dockElement) {
                const dockRect = dockElement.getBoundingClientRect();
                const mouseX = state.currentPosition.x + state.offset.x;
                const mouseY = state.currentPosition.y + state.offset.y;
                targetPos = {
                    x: mouseX - 32,
                    y: dockRect.top,
                };
                action = 'dragOut';
                actionData = { item: state.item, mousePosition: { x: mouseX, y: mouseY } };
            }
        } else if (currentPlaceholder !== null && currentPlaceholder !== undefined) {
            const { columns, cellSize, padding } = GRID_CONFIG;

            // 计算目标位置
            let targetX = 0;
            let targetY = 0;

            const snapItem = snapshot.find(i => i.index === currentPlaceholder);

            if (snapItem) {
                targetX = snapItem.rect.left;
                targetY = snapItem.rect.top;
            } else if (containerRef.current) {
                // 使用网格计算备用位置
                const containerRect = containerRef.current.getBoundingClientRect();
                const col = currentPlaceholder % columns;
                const row = Math.floor(currentPlaceholder / columns);
                targetX = containerRect.left + padding + col * cellSize;
                targetY = containerRect.top + padding + row * cellSize;
            }

            targetPos = { x: targetX, y: targetY };
            action = 'reorder';

            // 使用共享工具函数进行重排序
            const newItems = reorderItems(currentItems, state.item, currentPlaceholder);

            actionData = { newItems };
        }

        if (targetPos && action) {
            setDragState(prev => ({
                ...prev,
                isDragging: false,
                isAnimatingReturn: true,
                targetPosition: targetPos!,
                targetAction: action,
                targetActionData: actionData,
            }));
            setIsDraggingOut(false);
            hasMovedRef.current = false;

            // Timeout fallback
            setTimeout(() => {
                const currentState = dragRef.current;
                if (currentState.isAnimatingReturn) {
                    handleAnimationComplete();
                }
            }, 350);

        } else {
            setDragState(resetFolderDragState());
            setPlaceholderIndex(null);
            setIsDraggingOut(false);
            hasMovedRef.current = false;
            if (onDragEnd) onDragEnd();
        }
    }, [onDragOut, handleMouseMove, onDragEnd, setDragState, setPlaceholderIndex, containerRef, dragRef, isDraggingOutRef, placeholderRef, itemsRef, layoutSnapshotRef, hasMovedRef, thresholdListenerRef]);

    const handleMouseDown = (e: React.MouseEvent, item: DockItem, index: number) => {
        createMouseDownHandler<FolderDragState>({
            isEditMode,
            item,
            index,
            event: e,
            setDragState,
            handleMouseMove,
            handleMouseUp,
            createDragState: (item, index, rect, startX, startY, offset) => {
                const initial = createFolderDragState();
                return {
                    ...initial,
                    item,
                    originalIndex: index,
                    currentPosition: { x: rect.left, y: rect.top },
                    startPosition: { x: startX, y: startY },
                    offset,
                };
            }
        }, hasMovedRef, thresholdListenerRef);
    };

    const handleAnimationComplete = useCallback(() => {
        const state = dragRef.current;

        if (!state.isAnimatingReturn || !state.targetAction || !state.item) {
            return;
        }

        switch (state.targetAction) {
            case 'reorder':
                if ((state.targetActionData as any)?.newItems) {
                    onReorder((state.targetActionData as any).newItems);
                }
                break;
            case 'dragOut':
                if ((state.targetActionData as any)?.mousePosition && onDragOut) {
                    onDragOut((state.targetActionData as any).item, (state.targetActionData as any).mousePosition);
                }
                break;
        }

        setDragState(resetFolderDragState());
        setPlaceholderIndex(null);
        localLastPlaceholderRef.current = null; // 重置滞后状态

        if (onDragEnd) onDragEnd();
    }, [onReorder, onDragOut, onDragEnd, setDragState, setPlaceholderIndex, dragRef]);

    // 使用策略计算偏移
    const getItemTransform = useCallback((index: number): { x: number; y: number } => {
        const targetSlot = placeholderRef.current;
        const state = dragRef.current;
        const originalIndex = externalDragItem ? -1 : state.originalIndex;
        const isDragging = state.isDragging || !!externalDragItem;

        return gridStrategy.calculateTransform(index, targetSlot, originalIndex, isDragging);
    }, [externalDragItem, placeholderRef, dragRef, gridStrategy]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, []);







    // Note: handleMouseMove logic needs to ensure it doesn't trigger "reorder" callbacks continuously.
    // It should just setPlaceholderIndex.

    // ... (rest of hook matches previous structure, but we ensure handleMouseMove is pure logic)

    return {
        dragState,
        placeholderIndex,
        isDraggingOut,
        itemRefs,
        handleMouseDown,
        handleAnimationComplete,
        getItemTransform,
        dragElementRef,
    };
};
