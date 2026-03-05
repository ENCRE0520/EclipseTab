import { useEffect, useRef, useCallback, useMemo } from 'react';
import { DockItem } from '@/shared/types';
import { useDragBase, createDockDragState, resetDockDragState, DockDragState, DockActionData } from './useDragBase';
import { useDragMerge } from './useDragMerge';
import {
    DragRegion,
    LayoutItem,
    detectDragRegion as detectDragRegionUtil,
    detectMergeTarget as detectMergeTargetUtil,
    calculateDraggedCenter,
    calculateHorizontalReorderIndex,
    createMouseDownHandler,
    getFolderViewRect,
    createHorizontalStrategy,
} from '@/shared/utils/dragMath';
import { onReturnAnimationComplete } from '@/features/dock/utils/animationUtils';
import {
    DOCK_DRAG_BUFFER,
    DOCK_CELL_SIZE,
    DOCK_PADDING,
    DRAG_THRESHOLD,
    MERGE_DISTANCE_THRESHOLD,
    HAPTIC_PATTERNS,
} from '@/shared/constants/layout';

interface UseDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onDropToFolder?: (dragItem: DockItem, targetFolder: DockItem) => void;
    onMergeFolder?: (dragItem: DockItem, targetItem: DockItem) => void;
    onDragToOpenFolder?: (dragItem: DockItem) => void;
    onHoverOpenFolder?: (dragItem: DockItem, targetFolder: DockItem) => void;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    externalDragItem?: DockItem | null;
    /** 检查文件夹是否有活动占位符 - 从 Context 读取 */
    hasFolderPlaceholderActive?: () => boolean;
}

export const useDragAndDrop = ({
    items,
    isEditMode,
    onReorder,
    onDropToFolder,
    onMergeFolder,
    onDragToOpenFolder,
    onHoverOpenFolder,
    onDragStart,
    onDragEnd,
    externalDragItem,
    hasFolderPlaceholderActive,
}: UseDragAndDropOptions) => {
    const dockRef = useRef<HTMLElement | null>(null);

    // 使用基础 Hook
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
        cleanupDragListeners,
        performHapticFeedback,
        cachedContainerRectRef,
    } = useDragBase<DockDragState>({
        items,
        isEditMode,
        onDragStart,
        onDragEnd,
        externalDragItem,
        createInitialState: createDockDragState,
        resetState: resetDockDragState,
        containerRef: dockRef,
    });

    // 使用合并状态管理 Hook
    const {
        hoveredFolderId,
        hoveredAppId,
        mergeTargetId,
        isPreMerge,
        hoveredFolderRef,
        hoveredAppRef,
        isPreMergeRef,
        handleMergeTargetHover,
        resetMergeStates,
    } = useDragMerge({
        onHoverOpenFolder,
        getItems: () => itemsRef.current,
        performHapticFeedback,
    });

    // 创建拖拽策略
    const strategy = useMemo(() => createHorizontalStrategy(), []);

    const cachedDockRectRef = useRef<DOMRect | null>(null);
    const lastMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    // 使用 ref 跟踪外部拖拽状态
    const wasExternalDragActiveRef = useRef(false);

    // ============================================================================
    // RAF 节流 - 限制 mousemove 处理频率为每帧一次
    // ============================================================================
    const rafIdRef = useRef<number | null>(null);
    const pendingMouseEventRef = useRef<MouseEvent | null>(null);

    // 拖拽开始时缓存 Dock Rect
    const cacheDockRect = useCallback(() => {
        if (dockRef.current) {
            cachedDockRectRef.current = dockRef.current.getBoundingClientRect();
        }
    }, []);

    // 重排序的触觉反馈
    useEffect(() => {
        if (placeholderIndex !== null && dragState.isDragging) {
            performHapticFeedback(HAPTIC_PATTERNS.REORDER);
        }
    }, [placeholderIndex, performHapticFeedback, dragState.isDragging]);

    // ========================================================================
    // 使用提取的辅助函数
    // ========================================================================

    /** 重置所有 Dock 相关的拖拽状态 */
    const resetDockDragStates = useCallback(() => {
        setPlaceholderIndex(null);
        resetMergeStates();
    }, [setPlaceholderIndex, resetMergeStates]);

    /** 检测鼠标当前所在的区域 (使用提取的纯函数) */
    const detectDragRegion = useCallback((
        mouseX: number,
        mouseY: number,
        activeItem: DockItem | null
    ): DragRegion => {
        const dockRect = cachedDockRectRef.current || dockRef.current?.getBoundingClientRect();

        // 在编辑模式下，允许全屏拖拽（超大缓冲区）
        // 否则使用标准缓冲区
        const buffer = isEditMode
            ? Math.max(window.innerWidth, window.innerHeight)
            : DOCK_DRAG_BUFFER;

        return detectDragRegionUtil(
            mouseX,
            mouseY,
            dockRect || null,
            activeItem?.type === 'folder',
            buffer
        );
    }, [isEditMode]);

    /** 检测合并目标 (使用提取的纯函数) */
    const detectMergeTarget = useCallback((
        e: MouseEvent,
        state: DockDragState,
        snapshot: LayoutItem[],
        activeItem: DockItem
    ): { id: string; type: 'folder' | 'app' } | null => {
        const draggedCenter = calculateDraggedCenter(
            e.clientX,
            e.clientY,
            state.offset,
            state.isDragging
        );
        return detectMergeTargetUtil(
            draggedCenter,
            snapshot,
            activeItem.id,
            itemsRef.current,
            MERGE_DISTANCE_THRESHOLD
        );
    }, []);

    /** 计算重排序的目标索引 (使用提取的纯函数) */
    const calculateReorderIndex = useCallback((
        mouseX: number,
        snapshot: LayoutItem[]
    ): number => {
        return calculateHorizontalReorderIndex(mouseX, snapshot, itemsRef.current.length);
    }, []);

    // ========================================================================
    // handleMouseMove - 使用提取的模块 + RAF 节流
    // ========================================================================

    /** 实际处理 mousemove 逻辑的内部函数 */
    const processMouseMove = useCallback((e: MouseEvent) => {
        const state = dragRef.current;
        const activeItem = state.isDragging ? state.item : externalDragItem;

        // 第一阶段: 检查是否需要开始拖拽 (仅内部项目)
        if (!state.isDragging && !externalDragItem && state.item) {
            const dist = Math.hypot(e.clientX - state.startPosition.x, e.clientY - state.startPosition.y);
            if (dist > DRAG_THRESHOLD) {
                cacheDockRect();
                performHapticFeedback(HAPTIC_PATTERNS.PICKUP);
                startDragging(state.item);
            } else {
                return;
            }
        }

        if (!activeItem) return;

        // 第二阶段: 确保布局快照存在
        if ((!layoutSnapshotRef.current || layoutSnapshotRef.current.length === 0) && itemsRef.current.length > 0) {
            captureLayoutSnapshot();
        }

        // 第三阶段: 更新拖拽元素位置 (仅内部拖拽，使用直接 DOM 操作)
        if (state.isDragging && dragElementRef.current) {
            const x = e.clientX - state.offset.x;
            const y = e.clientY - state.offset.y;
            dragElementRef.current.style.left = `${x}px`;
            dragElementRef.current.style.top = `${y}px`;
        }

        // 第四阶段: 存储鼠标位置
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        lastMousePositionRef.current = { x: mouseX, y: mouseY };

        // 第五阶段: 区域检测与状态更新
        const region = detectDragRegion(mouseX, mouseY, activeItem);

        if (region.type === 'folder' || region.type === 'outside') {
            resetDockDragStates();
            return;
        }

        // 在 Dock 区域内，处理合并或重排序
        const snapshot = layoutSnapshotRef.current;
        const mergeTarget = detectMergeTarget(e, state, snapshot, activeItem);

        if (mergeTarget) {
            // 处理合并目标悬停
            const shouldReturn = handleMergeTargetHover(mergeTarget, activeItem);
            if (shouldReturn) return;
        } else {
            // 无合并目标，处理重排序
            if (snapshot.length > 0) {
                const targetIndex = calculateReorderIndex(mouseX, snapshot);
                setPlaceholderIndex(targetIndex);
            } else {
                setPlaceholderIndex(0);
            }
        }
    }, [
        externalDragItem,
        startDragging,
        captureLayoutSnapshot,
        cacheDockRect,
        detectDragRegion,
        detectMergeTarget,
        calculateReorderIndex,
        handleMergeTargetHover,
        resetDockDragStates,
        setPlaceholderIndex,
        performHapticFeedback,
    ]);

    /** RAF 节流包装的 handleMouseMove */
    const handleMouseMove = useCallback((e: MouseEvent) => {
        // 保存最新的 mousemove 事件
        pendingMouseEventRef.current = e;

        // 如果已经有 RAF 排队，跳过（下一帧会处理最新事件）
        if (rafIdRef.current !== null) return;

        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            const event = pendingMouseEventRef.current;
            if (event) {
                processMouseMove(event);
            }
        });
    }, [processMouseMove]);

    // ========================================================================
    // 优化 1: 合并外部拖拽相关的 useEffect
    // ========================================================================

    useEffect(() => {
        const wasActive = wasExternalDragActiveRef.current;

        if (externalDragItem) {
            // 外部拖拽开始
            wasExternalDragActiveRef.current = true;
            cacheDockRect();
            window.addEventListener('mousemove', handleMouseMove);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
            };
        } else if (wasActive) {
            // 外部拖拽刚刚结束，立即清理所有状态
            resetDockDragStates();
            layoutSnapshotRef.current = [];
            wasExternalDragActiveRef.current = false;
        }
    }, [externalDragItem, handleMouseMove, cacheDockRect, resetDockDragStates]);

    // 当 items 变化时清理占位符 (drop 完成的信号)
    useEffect(() => {
        if (wasExternalDragActiveRef.current) {
            setPlaceholderIndex(null);
            layoutSnapshotRef.current = [];
            wasExternalDragActiveRef.current = false;
        }
    }, [items, setPlaceholderIndex]);

    // Handle mouse up with animation delay logic
    const handleMouseUp = useCallback(() => {
        const state = dragRef.current;

        // If we never started dragging and just clicked, cleanup
        if (!state.isDragging && state.item && !hasMovedRef.current) {
            cleanupDragListeners(handleMouseMove, handleMouseUp);
            hasMovedRef.current = false;
            setDragState(resetDockDragState());
            return;
        }

        if (!state.item) return;

        cleanupDragListeners(handleMouseMove, handleMouseUp);

        const currentPlaceholder = placeholderRef.current;
        const currentHoveredFolder = hoveredFolderRef.current;
        const currentHoveredApp = hoveredAppRef.current;
        const currentItems = itemsRef.current;
        const isPreMergeState = isPreMergeRef.current;
        const snapshot = layoutSnapshotRef.current;

        let targetPos: { x: number, y: number } | null = null;
        let action: DockDragState['targetAction'] = null;
        let actionData: DockActionData = null;

        // 判断是否应该放入文件夹：以文件夹的占位符状态为准
        const shouldDropToFolder = state.item.type !== 'folder' && hasFolderPlaceholderActive?.();

        if (shouldDropToFolder && onDragToOpenFolder && state.item.type !== 'folder') {
            const folderRect = getFolderViewRect();
            if (folderRect) {
                targetPos = {
                    x: folderRect.left + folderRect.width / 2 - 32,
                    y: folderRect.top + folderRect.height / 2 - 32,
                };
                action = 'dragToOpenFolder';
                actionData = { type: 'dragToOpenFolder', item: state.item };
            }
        } else if (isPreMergeState) {
            // ... (相同的合并逻辑) ...
            if (currentHoveredFolder && onDropToFolder) {
                // Find rect from snapshot if possible for stability
                const targetFolderItem = snapshot.find(i => i.id === currentHoveredFolder);
                if (targetFolderItem) {
                    targetPos = { x: targetFolderItem.rect.left, y: targetFolderItem.rect.top };
                }
                const targetFolder = currentItems.find(i => i.id === currentHoveredFolder);
                if (targetFolder) {
                    action = 'dropToFolder';
                    actionData = { type: 'dropToFolder', item: state.item, targetFolder };
                }
            } else if (currentHoveredApp && onMergeFolder) {
                const targetAppItem = snapshot.find(i => i.id === currentHoveredApp);
                if (targetAppItem) {
                    targetPos = { x: targetAppItem.rect.left, y: targetAppItem.rect.top };
                }
                const targetApp = currentItems.find(i => i.id === currentHoveredApp);
                if (targetApp) {
                    action = 'mergeFolder';
                    actionData = { type: 'mergeFolder', item: state.item, targetItem: targetApp };
                }
            }
        } else if (currentPlaceholder !== null && currentPlaceholder !== undefined) {
            const oldIndex = state.originalIndex;

            // ========== 关键修复：先计算动画目标位置，再调整数据索引 ==========
            // 动画目标位置应该使用 currentPlaceholder（占位符的视觉位置）
            // 而不是调整后的 insertIndex（数据数组的插入位置）
            // 
            // 原因：当向右拖动时（oldIndex < currentPlaceholder），占位符显示在视觉位置 currentPlaceholder
            // 但数据插入需要 insertIndex = currentPlaceholder - 1（因为移除原项后索引会前移）
            // 动画应该飞向"空隙"的视觉位置，即 currentPlaceholder 对应的位置

            const dockContainer = dockRef.current || document.querySelector('[data-dock-container="true"]');
            const dockRect = dockContainer?.getBoundingClientRect();

            if (dockRect) {
                const CELL_SIZE = DOCK_CELL_SIZE;

                // 1. 计算视觉目标索引
                // 对于向右拖动：占位符在 currentPlaceholder，动画目标应该是该位置
                // 对于向左拖动：占位符在 currentPlaceholder，动画目标也应该是该位置
                // 
                // 但需要考虑：当从 oldIndex 拖到 currentPlaceholder 时，
                // 如果 oldIndex < currentPlaceholder，视觉上的目标槽位实际是 currentPlaceholder - 1
                // 因为原位置的"空隙"会消失，所有右侧项目会向左移动一格
                let visualTargetIndex = currentPlaceholder;
                if (oldIndex !== -1 && oldIndex < currentPlaceholder) {
                    visualTargetIndex = currentPlaceholder - 1;
                }

                // 2. 计算目标坐标 (相对偏移法)
                // 优先使用 cachedContainerRectRef 计算相对偏移
                // 相对偏移 = 快照中第一个元素Left - 快照中容器Left（这个差值包含了 Edit Tools 和 Padding）
                // 实时起点 = 当前容器Left + 相对偏移

                let startX = dockRect.left + DOCK_PADDING; // Fallback X
                let startY = dockRect.top + DOCK_PADDING;  // Fallback Y

                const snapshot = layoutSnapshotRef.current;
                const cachedContainerRect = cachedContainerRectRef.current;

                if (snapshot && snapshot.length > 0 && cachedContainerRect) {
                    // 相对偏移 = 快照中第一个元素位置 - 快照中容器位置
                    const relativeOffsetX = snapshot[0].rect.left - cachedContainerRect.left;
                    const relativeOffsetY = snapshot[0].rect.top - cachedContainerRect.top;

                    startX = dockRect.left + relativeOffsetX;
                    startY = dockRect.top + relativeOffsetY;
                } else if (snapshot && snapshot.length > 0) {
                    // 只有 snapshot 没有 container rect (罕见)
                    startX = snapshot[0].rect.left;
                    startY = snapshot[0].rect.top;
                } else if (isEditMode) {
                    // 空 Dock 且 Edit Mode Fallback
                    startX += 80;
                }

                const targetX = startX + visualTargetIndex * CELL_SIZE;
                const targetY = startY; // 水平布局，Y轴固定

                targetPos = { x: targetX, y: targetY };
            } else {
                // Fallback if no container found (rare)
                targetPos = { x: 0, y: 0 };
            }

            // ========== 数据重排逻辑 ==========
            let insertIndex = currentPlaceholder;
            const newItems = [...currentItems];
            if (oldIndex !== -1) {
                // 调整插入索引（移除原项后的正确位置）
                if (insertIndex > oldIndex) insertIndex -= 1;
                const [moved] = newItems.splice(oldIndex, 1);
                newItems.splice(insertIndex, 0, moved);
            }

            action = 'reorder';
            actionData = { type: 'reorder', newItems };
        }

        if (targetPos && action) {
            setDragState(prev => ({
                ...prev,
                isDragging: false,
                isAnimatingReturn: true,
                // 关键修复：更新 currentPosition 以触发 CSS transition
                // Portal 使用 currentPosition 作为 left/top，更新它才能触发动画
                currentPosition: targetPos!,
                targetPosition: targetPos!,
                targetAction: action,
                targetActionData: actionData,
            }));

            // Cleanup hover states immediately
            resetMergeStates();
            hasMovedRef.current = false;

            // 使用共享的动画完成工具
            onReturnAnimationComplete(dragElementRef.current, () => {
                const currentState = dragRef.current;
                if (currentState.isAnimatingReturn) {
                    handleAnimationComplete();
                }
            });

        } else {
            // Cancel / Reset
            setDragState(resetDockDragState());
            setPlaceholderIndex(null);
            resetMergeStates();
            hasMovedRef.current = false;

            if (onDragEnd) onDragEnd();
        }
    }, [
        strategy, onDropToFolder, onMergeFolder, onDragToOpenFolder, onDragEnd, onReorder,
        handleMouseMove,
        setDragState, setPlaceholderIndex,
        cleanupDragListeners,
        hasFolderPlaceholderActive,
    ]); // Optimized dependencies


    const handleMouseDown = (e: React.MouseEvent, item: DockItem, index: number) => {
        createMouseDownHandler<DockDragState>({
            isEditMode,
            item,
            index,
            event: e,
            setDragState,
            handleMouseMove,
            handleMouseUp,
            createDragState: (item, index, rect, startX, startY, offset) => {
                const initial = createDockDragState();
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

    // 处理归位动画完成
    const handleAnimationComplete = useCallback(() => {
        const state = dragRef.current;

        if (!state.isAnimatingReturn || !state.targetAction || !state.item) {
            return;
        }

        // 关键修复：先清理状态，再执行数据更新
        // 这避免了在动作执行后、状态清理前的一帧渲染中，
        // getItemTransform 使用旧的 originalIndex/placeholderIndex 计算新的 items 布局
        const data = state.targetActionData;

        // 先重置所有拖拽状态
        setDragState(resetDockDragState());
        setPlaceholderIndex(null);

        // 然后执行数据操作
        if (data) {
            // Success vibration
            performHapticFeedback(HAPTIC_PATTERNS.DROP);

            switch (data.type) {
                case 'reorder':
                    onReorder(data.newItems);
                    break;
                case 'dropToFolder':
                    if (onDropToFolder) {
                        onDropToFolder(data.item, data.targetFolder);
                    }
                    break;
                case 'mergeFolder':
                    if (onMergeFolder) {
                        onMergeFolder(data.item, data.targetItem);
                    }
                    break;
                case 'dragToOpenFolder':
                    if (onDragToOpenFolder) {
                        onDragToOpenFolder(data.item);
                    }
                    break;
            }
        }

        if (onDragEnd) onDragEnd();
    }, [onReorder, onDropToFolder, onMergeFolder, onDragToOpenFolder, onDragEnd, setDragState, setPlaceholderIndex, dragRef]);


    // ========================================================================
    // 优化 3: 使用 useMemo 缓存 transform 计算
    // ========================================================================

    /** 预计算所有项目的 transform 值，避免每个项目渲染时重复计算 */
    const itemTransforms = useMemo(() => {
        const targetSlot = placeholderIndex;

        // 无占位符时，所有项目不偏移
        if (targetSlot === null) {
            return items.map(() => 0);
        }

        const isInternalDragActive = (dragState.isDragging || dragState.isAnimatingReturn) && dragState.originalIndex !== -1;
        const originalIndex = isInternalDragActive
            ? dragState.originalIndex
            : (externalDragItem ? -1 : dragState.originalIndex);
        const isDragging = dragState.isDragging || dragState.isAnimatingReturn;

        const transforms = items.map((_, index) => {
            const transform = strategy.calculateTransform(
                index,
                targetSlot,
                originalIndex,
                isDragging
            );
            return transform.x;
        });

        // Add transform for the divider/extra elements at the end
        const dividerTransform = strategy.calculateTransform(
            items.length,
            targetSlot,
            originalIndex,
            isDragging
        );
        transforms.push(dividerTransform.x);

        return transforms;
    }, [
        placeholderIndex,
        dragState.isDragging,
        dragState.isAnimatingReturn,
        dragState.originalIndex,
        externalDragItem,
        items.length,
        strategy
    ]);

    /** 获取指定索引的 transform 值 (简化的 getter) */
    const getItemTransform = useCallback((index: number): number => {
        return itemTransforms[index] ?? 0;
    }, [itemTransforms]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            // 清理 RAF
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            cleanupDragListeners(handleMouseMove, handleMouseUp);
        };
    }, []);

    return {
        dragState,
        placeholderIndex,
        hoveredFolderId,
        hoveredAppId,
        mergeTargetId,
        isPreMerge,
        itemRefs,
        dockRef,
        handleMouseDown,
        handleAnimationComplete,
        getItemTransform,
        dragElementRef,
    };
};
