
import { useCallback, useEffect } from 'react';
import { DockItem } from '../types';
import {
    createMouseDownHandler,
    calculateFolderDropIndex,
} from '../utils/dragUtils';
import {
    useDragBase,
    createFolderDragState,
    resetFolderDragState,
    FolderDragState
} from './useDragBase';

export interface UseFolderDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    containerRef: React.RefObject<HTMLElement>;
    externalDragItem?: DockItem | null;
    onDragOut?: (item: DockItem, mousePosition: { x: number; y: number }) => void;
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
        onDragOut
    } = options;

    const {
        dragState,
        setDragState,
        placeholderIndex,
        setPlaceholderIndex,
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

    /**
     * 处理鼠标移动 (Internal)
     */
    const handleMouseMove = useCallback((e: MouseEvent) => {
        const currentDrag = dragRef.current;
        // 如果是内部拖拽
        if (currentDrag.isDragging && currentDrag.item) {
            // 更新拖拽位置
            setDragState(prev => ({
                ...prev,
                currentPosition: { x: e.clientX, y: e.clientY }
            }));

            // 检查是否拖出文件夹区域 (Drag Out Detection)
            if (onDragOut && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const BUFFER = 50; // 50px buffer zone

                // 如果鼠标超出文件夹边界一定距离
                const isOutside =
                    e.clientX < rect.left - BUFFER ||
                    e.clientX > rect.right + BUFFER ||
                    e.clientY < rect.top - BUFFER ||
                    e.clientY > rect.bottom + BUFFER;

                if (isOutside) {
                    setDragState(prev => ({
                        ...prev,
                        targetAction: 'dragOut'
                    }));
                    setPlaceholderIndex(null); // Clear placeholder inside folder
                    // Optional: trigger onDragOut callback immediately or wait for drop?
                    // Typically we wait for drop to confirm. Status update is enough for visual feedback.
                    return;
                } else {
                    // Back inside
                    setDragState(prev => ({
                        ...prev,
                        targetAction: 'reorder'
                    }));
                }
            }

            // 计算落点
            const newIndex = calculateFolderDropIndex(
                e.clientX,
                e.clientY,
                layoutSnapshotRef.current,
                itemsRef.current.length,
                containerRef.current?.getBoundingClientRect() ?? null
            );
            setPlaceholderIndex(newIndex);
        }
    }, [dragRef, itemsRef, layoutSnapshotRef, containerRef, setDragState, setPlaceholderIndex, onDragOut]);

    /**
     * 处理外部拖拽 (External Drag)
     */
    useEffect(() => {
        if (!externalDragItem) return;

        // 确保 Layout Snapshot 已经捕获 (因为外部拖拽可能随时进入)
        // 最好在外部拖拽开始进入时捕获，但这里我们无法感知"进入"，只能持续监测
        // 为了性能，我们可以简单判断 snapshot 是否为空，或者依赖 externalDragItem 的传入时机
        if (layoutSnapshotRef.current.length === 0 && items.length > 0) {
            captureLayoutSnapshot();
        }

        const handleExternalMouseMove = (e: MouseEvent) => {
            // 计算落点
            const newIndex = calculateFolderDropIndex(
                e.clientX,
                e.clientY,
                layoutSnapshotRef.current,
                items.length, // 使用当前 items 长度 (外部 item 尚未加入)
                containerRef.current?.getBoundingClientRect() ?? null
            );
            setPlaceholderIndex(newIndex);
        };

        window.addEventListener('mousemove', handleExternalMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleExternalMouseMove);
        };
    }, [externalDragItem, items.length, containerRef, setPlaceholderIndex, captureLayoutSnapshot, layoutSnapshotRef]);


    /**
     * 处理鼠标松开 (Drop)
     */
    const handleMouseUp = useCallback(() => {
        const currentDrag = dragRef.current;
        const currentPlaceholder = placeholderIndex ?? -1;

        // 清理事件监听
        window.removeEventListener('mousemove', handleMouseMove);

        if (currentDrag.isDragging && currentDrag.item) {
            // Case: Drag Out
            if (currentDrag.targetAction === 'dragOut' && onDragOut) {
                onDragOut(currentDrag.item, currentDrag.currentPosition);
            }
            // Case: Reorder
            // 执行排序
            else if (currentPlaceholder !== -1 && currentPlaceholder !== currentDrag.originalIndex) {
                const newItems = reorderList(itemsRef.current, currentDrag.originalIndex, currentPlaceholder);
                onReorder(newItems);
            }
        }

        // 重置状态
        setDragState(resetFolderDragState());
        resetPlaceholderState();

        if (onDragEnd) {
            onDragEnd();
        }
    }, [dragRef, placeholderIndex, onReorder, onDragEnd, setDragState, resetPlaceholderState, handleMouseMove]);

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
                onDragStart: startDragging,
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

    // 数组重排辅助
    const reorderList = (list: DockItem[], startIndex: number, endIndex: number) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    /**
     * 计算 Grid 布局偏移 (Squeeze Animation)
     */
    const getItemTransform = useCallback((index: number) => {
        // 如果没有占位符，不偏移
        if (placeholderIndex === null) {
            return { x: 0, y: 0 };
        }

        // Case 1: 外部拖入
        if (externalDragItem) {
            // 逻辑：所有 index >= placeholderIndex 的元素，都向后移动一格
            // 注意：这里没有"源空位"，只有"目标占位"
            if (index >= placeholderIndex) {
                const currentDOMIndex = index;
                const targetVisualIndex = index + 1; // 挤往下一格

                // 计算坐标差异
                const cols = Math.min(Math.max(items.length, 1), 4);
                const c1 = currentDOMIndex % cols;
                const r1 = Math.floor(currentDOMIndex / cols);

                const c2 = targetVisualIndex % cols;
                const r2 = Math.floor(targetVisualIndex / cols);

                const ITEM_SIZE_WITH_GAP = 72;
                const x = (c2 - c1) * ITEM_SIZE_WITH_GAP;
                const y = (r2 - r1) * ITEM_SIZE_WITH_GAP;
                return { x, y };
            }
            return { x: 0, y: 0 };
        }

        // Case 2: 内部拖拽
        if (dragState.isDragging && dragState.originalIndex !== -1) {
            // 如果是正在拖拽的源项
            if (index === dragState.originalIndex) {
                return { x: 0, y: 0 };
            }

            const src = dragState.originalIndex;
            const dst = placeholderIndex;

            // 1. 计算"DOM流"位置 (Current DOM Flow Index)
            // 由于源项视觉上消失(width:0)，在此索引之后的元素会自动前移一位
            const currentDOMIndex = index > src ? index - 1 : index;

            // 2. 计算"目标视觉"位置 (Target Visual Index)
            // 我们希望在 dst 处再次空出位置，所以 >= dst 的元素后移一位
            const targetVisualIndex = currentDOMIndex >= dst ? currentDOMIndex + 1 : currentDOMIndex;

            if (currentDOMIndex === targetVisualIndex) {
                return { x: 0, y: 0 };
            }

            const cols = Math.min(Math.max(items.length, 1), 4);
            const c1 = currentDOMIndex % cols;
            const r1 = Math.floor(currentDOMIndex / cols);
            const c2 = targetVisualIndex % cols;
            const r2 = Math.floor(targetVisualIndex / cols);
            const ITEM_SIZE_WITH_GAP = 72;
            const x = (c2 - c1) * ITEM_SIZE_WITH_GAP;
            const y = (r2 - r1) * ITEM_SIZE_WITH_GAP;
            return { x, y };
        }

        return { x: 0, y: 0 };

    }, [dragState.isDragging, dragState.originalIndex, placeholderIndex, items.length, externalDragItem]);

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
