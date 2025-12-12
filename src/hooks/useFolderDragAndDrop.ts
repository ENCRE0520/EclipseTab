
import { useCallback, useEffect } from 'react';
import { DockItem } from '../types';
import {
    createMouseDownHandler,
    calculateFolderDropIndex,
} from '../utils/dragUtils';
import { setFolderPlaceholderActive } from '../utils/dragDetection';
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

    // ========== 同步文件夹占位符状态到全局检测系统 ==========
    // 这允许 Dock 的 handleMouseUp 知道是否应该将拖拽项放入文件夹
    useEffect(() => {
        // 只有当存在外部拖拽项时，才同步占位符状态
        // 内部拖拽不需要同步（由 useFolderDragAndDrop 自己处理）
        if (externalDragItem) {
            setFolderPlaceholderActive(placeholderIndex !== null);
        }

        // 组件卸载或外部拖拽结束时清理
        return () => {
            setFolderPlaceholderActive(false);
        };
    }, [externalDragItem, placeholderIndex]);

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
        // 使用 ref 获取最新值，避免闭包捕获旧状态
        const currentPlaceholder = placeholderRef.current ?? -1;

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
    }, [dragRef, placeholderRef, onReorder, onDragEnd, setDragState, resetPlaceholderState, handleMouseMove, onDragOut, itemsRef]);

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

    // ========== Z字形位移常量 (Z-Shaped Flow Constants) ==========
    const FOLDER_COLUMNS = 4;       // 文件夹固定4列布局
    const CELL_SIZE = 72;           // 单元格尺寸 (包含间距)

    /**
     * 辅助函数：计算从 originalIndex 到 visualIndex 的 Z字形位移
     * 
     * @param originalIndex - 元素在 DOM 中的原始索引
     * @param visualIndex   - 元素应该显示的目标视觉索引
     * @returns { x, y } 像素位移值
     */
    const calculateZShapedOffset = (originalIndex: number, visualIndex: number): { x: number; y: number } => {
        if (originalIndex === visualIndex) {
            return { x: 0, y: 0 };
        }

        // 当前 DOM 位置 (基于原始索引)
        const currentCol = originalIndex % FOLDER_COLUMNS;
        const currentRow = Math.floor(originalIndex / FOLDER_COLUMNS);

        // 目标视觉位置
        const targetCol = visualIndex % FOLDER_COLUMNS;
        const targetRow = Math.floor(visualIndex / FOLDER_COLUMNS);

        // 计算像素位移
        const x = (targetCol - currentCol) * CELL_SIZE;
        const y = (targetRow - currentRow) * CELL_SIZE;

        return { x, y };
    };

    /**
     * 计算 Grid 布局偏移 (Z-Shaped Flow Animation)
     * 
     * 核心逻辑：
     * 1. 外部拖入: index >= placeholderIndex 的所有图标 visualIndex = index + 1
     * 2. 内部拖拽:
     *    - 向前拖 (Drag Backwards, src > dst): 范围 [dst, src) 的元素 visualIndex = index + 1
     *    - 向后拖 (Drag Forwards, src < dst):  范围 (src, dst] 的元素 visualIndex = index - 1
     * 
     * Z字形位移算法：
     * - 当前位置: (currentRow, currentCol) = (floor(index/4), index%4)
     * - 目标位置: (targetRow, targetCol) = (floor(visualIndex/4), visualIndex%4)
     * - 位移值: x = (targetCol - currentCol) * 72, y = (targetRow - currentRow) * 72
     */
    const getItemTransform = useCallback((index: number) => {
        // 如果没有占位符，不偏移
        if (placeholderIndex === null) {
            return { x: 0, y: 0 };
        }

        // ========== Case 1: 外部拖入 (External Drag) ==========
        if (externalDragItem) {
            // 逻辑：所有 index >= placeholderIndex 的元素，visualIndex = index + 1
            if (index >= placeholderIndex) {
                return calculateZShapedOffset(index, index + 1);
            }
            return { x: 0, y: 0 };
        }

        // ========== Case 2: 内部拖拽 (Internal Drag) ==========
        if (dragState.isDragging && dragState.originalIndex !== -1) {
            const draggingIndex = dragState.originalIndex;

            // 如果是正在拖拽的源项，不需要位移 (它会被隐藏/跟随鼠标)
            if (index === draggingIndex) {
                return { x: 0, y: 0 };
            }

            // ===== 场景 B1: 向前拖 (Drag Backwards) =====
            // draggingIndex > placeholderIndex
            // 范围 [placeholderIndex, draggingIndex) 的元素需要向后移动 +1
            if (draggingIndex > placeholderIndex) {
                if (index >= placeholderIndex && index < draggingIndex) {
                    return calculateZShapedOffset(index, index + 1);
                }
            }

            // ===== 场景 B2: 向后拖 (Drag Forwards) =====
            // draggingIndex < placeholderIndex
            // 范围 (draggingIndex, placeholderIndex] 的元素需要向前移动 -1
            if (draggingIndex < placeholderIndex) {
                if (index > draggingIndex && index <= placeholderIndex) {
                    return calculateZShapedOffset(index, index - 1);
                }
            }

            // 不在影响范围内，保持不动
            return { x: 0, y: 0 };
        }

        return { x: 0, y: 0 };

    }, [dragState.isDragging, dragState.originalIndex, placeholderIndex, externalDragItem]);

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
