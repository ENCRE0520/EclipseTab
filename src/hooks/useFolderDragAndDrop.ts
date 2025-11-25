import { useState, useEffect, useRef, useCallback } from 'react';
import { DockItem } from '../types';

interface Position {
    x: number;
    y: number;
}

interface DragState {
    isDragging: boolean;
    item: DockItem | null;
    originalIndex: number;
    currentPosition: Position;
    startPosition: Position;
    offset: Position;
    // 归位动画相关状态
    isAnimatingReturn: boolean;
    targetPosition: Position | null;
    targetAction: 'reorder' | 'dragOut' | null;
    targetActionData: any;
}

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
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        item: null,
        originalIndex: -1,
        currentPosition: { x: 0, y: 0 },
        startPosition: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        isAnimatingReturn: false,
        targetPosition: null,
        targetAction: null,
        targetActionData: null,
    });

    useEffect(() => {
        if (dragState.isDragging) {
            document.body.classList.add('is-dragging');
        } else {
            document.body.classList.remove('is-dragging');
        }
    }, [dragState.isDragging]);

    const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);
    const [isDraggingOut, setIsDraggingOut] = useState(false);

    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    const dragRef = useRef<DragState>(dragState);
    const itemsRef = useRef(items);
    const placeholderRef = useRef<number | null>(null);
    const isDraggingOutRef = useRef(false);
    const hasMovedRef = useRef(false);
    const thresholdListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

    useEffect(() => { dragRef.current = dragState; }, [dragState]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { placeholderRef.current = placeholderIndex; }, [placeholderIndex]);
    useEffect(() => { isDraggingOutRef.current = isDraggingOut; }, [isDraggingOut]);

    const isOutsideContainer = useCallback((mouseX: number, mouseY: number): boolean => {
        // Check if over Dock explicitly (more robust than just distance)
        const elementUnder = document.elementFromPoint(mouseX, mouseY);
        if (elementUnder && elementUnder.closest('[data-dock-container="true"]')) {
            return true;
        }

        if (!containerRef.current) return false;
        const rect = containerRef.current.getBoundingClientRect();
        const buffer = 10; // Reduced buffer zone from 50px to 10px
        return (
            mouseX < rect.left - buffer ||
            mouseX > rect.right + buffer ||
            mouseY < rect.top - buffer ||
            mouseY > rect.bottom + buffer
        );
    }, [containerRef]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const state = dragRef.current;
        const activeItem = state.isDragging ? state.item : externalDragItem;

        // Check if we should start dragging
        if (!state.isDragging && !externalDragItem && state.item) {
            const dist = Math.hypot(e.clientX - state.startPosition.x, e.clientY - state.startPosition.y);
            if (dist > 8) {
                hasMovedRef.current = true;
                setDragState(prev => ({ ...prev, isDragging: true }));
                if (onDragStart) onDragStart(state.item);
            } else {
                return;
            }
        }

        if (!activeItem) return;

        if (state.isDragging) {
            const x = e.clientX - state.offset.x;
            const y = e.clientY - state.offset.y;
            setDragState(prev => ({ ...prev, currentPosition: { x, y } }));
        }

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if dragging outside container
        if (state.isDragging && isOutsideContainer(mouseX, mouseY)) {
            setIsDraggingOut(true);
            setPlaceholderIndex(null);
            return;
        }

        setIsDraggingOut(false);

        // Calculate placeholder position for items within the folder
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
            return;
        }

        // Find the closest item based on position
        // For external items, we consider all items. For internal, we skip the dragged one.
        const itemsToCheck = state.isDragging
            ? itemsRef.current.filter((_, idx) => idx !== state.originalIndex)
            : itemsRef.current;

        let closestIndex = itemsToCheck.length;
        let minDistance = Infinity;
        let checkIndex = 0;

        itemRefs.current.forEach((ref, index) => {
            if (!ref || (state.isDragging && index === state.originalIndex)) return;
            const rect = ref.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = checkIndex;
            }
            checkIndex++;
        });

        // Adjust placeholder index based on drag direction
        let finalPlaceholderIndex = closestIndex;

        // If internal drag, we need to map back to original indices logic
        // But since we filtered, 'closestIndex' is relative to the compacted list
        // which is exactly what we want for the placeholder visual usually.
        // However, the original logic was:
        // if (state.originalIndex !== -1 && closestIndex > state.originalIndex) {
        //     finalPlaceholderIndex = closestIndex + 1;
        // }

        // Let's stick to the simpler logic:
        // If external, closestIndex is the index to insert at.
        // If internal, we need to be careful.

        if (state.isDragging) {
            // Re-calculate using original list to match original logic if needed, 
            // but actually finding the index in the compacted list is often enough for the visual gap.
            // Let's use the previous logic's approach but adapted.

            // Reset to original logic for internal drag to be safe
            closestIndex = itemsRef.current.length;
            minDistance = Infinity;

            itemRefs.current.forEach((ref, index) => {
                if (!ref || index === state.originalIndex) return;
                const rect = ref.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = index;
                }
            });

            finalPlaceholderIndex = closestIndex;
            if (state.originalIndex !== -1 && closestIndex > state.originalIndex) {
                finalPlaceholderIndex = closestIndex + 1;
            }
        } else {
            // External drag: closestIndex is simply the index in the full list
            closestIndex = itemsRef.current.length;
            minDistance = Infinity;

            itemRefs.current.forEach((ref, index) => {
                if (!ref) return;
                const rect = ref.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = index;
                }
            });
            finalPlaceholderIndex = closestIndex;
        }

        setPlaceholderIndex(finalPlaceholderIndex);
    }, [isOutsideContainer, containerRef, externalDragItem, onDragStart]);

    // Handle external drag tracking
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

        // If we never started dragging, cleanup
        if (!state.isDragging && state.item && !hasMovedRef.current) {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
                thresholdListenerRef.current = null;
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            hasMovedRef.current = false;
            setDragState({
                isDragging: false,
                item: null,
                originalIndex: -1,
                currentPosition: { x: 0, y: 0 },
                startPosition: { x: 0, y: 0 },
                offset: { x: 0, y: 0 },
                isAnimatingReturn: false,
                targetPosition: null,
                targetAction: null,
                targetActionData: null,
            });
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

        // 计算目标位置并设置动画状态
        let targetPos: Position | null = null;
        let action: DragState['targetAction'] = null;
        let actionData: any = null;

        // Check if item was dragged out of the folder
        const wasDraggingOut = isDraggingOutRef.current;
        console.log('[useFolderDragAndDrop] handleMouseUp:', { wasDraggingOut, hasOnDragOut: !!onDragOut, item: state.item?.name });
        if (wasDraggingOut && onDragOut) {
            // 拖出到 Dock，找到 Dock 元素的位置
            const dockElement = document.querySelector('[data-dock-container="true"]');
            if (dockElement) {
                const dockRect = dockElement.getBoundingClientRect();
                const mouseX = state.currentPosition.x + state.offset.x;
                const mouseY = state.currentPosition.y + state.offset.y;
                // 使用鼠标位置或 Dock 的中心位置
                targetPos = {
                    x: mouseX - 32, // 大致居中到图标
                    y: dockRect.top,
                };
                action = 'dragOut';
                actionData = { item: state.item, mousePosition: { x: mouseX, y: mouseY } };
                console.log('[useFolderDragAndDrop] Preparing dragOut animation:', { targetPos, item: state.item?.name });

                // Trigger return animation to the Dock
                setDragState(prev => ({
                    ...prev,
                    isDragging: false,
                    isAnimatingReturn: true,
                    targetPosition: targetPos,
                    targetAction: action,
                    targetActionData: actionData,
                }));
                setIsDraggingOut(false);
                hasMovedRef.current = false;
            } else {
                // Fallback if dock not found (shouldn't happen)
                setDragState({
                    isDragging: false,
                    item: null,
                    originalIndex: -1,
                    currentPosition: { x: 0, y: 0 },
                    startPosition: { x: 0, y: 0 },
                    offset: { x: 0, y: 0 },
                    isAnimatingReturn: false,
                    targetPosition: null,
                    targetAction: null,
                    targetActionData: null,
                });
                setPlaceholderIndex(null);
                setIsDraggingOut(false);
                hasMovedRef.current = false;
                if (onDragEnd) onDragEnd();
            }
        } else if (currentPlaceholder !== null && currentPlaceholder !== undefined) {
            // Reorder within folder

            // Calculate target position for reorder
            // We need to calculate where the item *should* land based on the placeholder index.
            // Since we don't have direct access to the grid layout logic here easily without refs,
            // we can use the same logic as in the previous fix: calculate based on grid.

            const columns = 4; // Fixed 4 columns
            const itemSize = 64;
            const gap = 8;

            // Calculate row and col for the placeholder index
            const col = currentPlaceholder % columns;
            const row = Math.floor(currentPlaceholder / columns);

            if (containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                // padding is usually 16px or similar, let's assume standard grid start
                // Actually, let's look at FolderView.tsx styles.
                // It uses padding: var(--spacing-gap-small) which is 8px.
                // But wait, the grid itself has styles.

                const targetX = containerRect.left + 8 + col * (itemSize + gap);
                const targetY = containerRect.top + 8 + row * (itemSize + gap);

                targetPos = {
                    x: targetX,
                    y: targetY
                };
                action = 'reorder';

                // For reorder, we need the new items list
                const newItems = [...currentItems];
                const [movedItem] = newItems.splice(state.originalIndex, 1);
                // Adjust insert index if needed
                let insertIndex = currentPlaceholder;
                if (state.originalIndex < currentPlaceholder) {
                    insertIndex -= 1;
                }
                newItems.splice(insertIndex, 0, movedItem);
                actionData = { newItems };

                setDragState(prev => ({
                    ...prev,
                    isDragging: false,
                    isAnimatingReturn: true,
                    targetPosition: targetPos,
                    targetAction: action,
                    targetActionData: actionData,
                }));
                // setPlaceholderIndex(null); // Keep placeholder during animation
                setIsDraggingOut(false);
                hasMovedRef.current = false;
            } else {
                // Fallback
                setDragState({
                    isDragging: false,
                    item: null,
                    originalIndex: -1,
                    currentPosition: { x: 0, y: 0 },
                    startPosition: { x: 0, y: 0 },
                    offset: { x: 0, y: 0 },
                    isAnimatingReturn: false,
                    targetPosition: null,
                    targetAction: null,
                    targetActionData: null,
                });
                setPlaceholderIndex(null);
                setIsDraggingOut(false);
                hasMovedRef.current = false;
                if (onDragEnd) onDragEnd();
            }

        } else {
            // 没有有效的放置目标，直接清理状态
            setDragState({
                isDragging: false,
                item: null,
                originalIndex: -1,
                currentPosition: { x: 0, y: 0 },
                startPosition: { x: 0, y: 0 },
                offset: { x: 0, y: 0 },
                isAnimatingReturn: false,
                targetPosition: null,
                targetAction: null,
                targetActionData: null,
            });
            setPlaceholderIndex(null);
            setIsDraggingOut(false);
            hasMovedRef.current = false;

            if (onDragEnd) onDragEnd();
        }
    }, [onDragOut, onReorder, handleMouseMove, onDragEnd]);

    const handleMouseDown = (e: React.MouseEvent, item: DockItem, index: number) => {
        if (!isEditMode) return;

        // Prevent default to avoid text selection during drag
        e.preventDefault();

        hasMovedRef.current = false;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const startX = e.clientX;
        const startY = e.clientY;

        let dragDataSet = false;

        const moveThresholdCheck = (moveEvent: MouseEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 3) {
                hasMovedRef.current = true;

                if (!dragDataSet) {
                    dragDataSet = true;
                    setDragState({
                        isDragging: false,
                        item,
                        originalIndex: index,
                        currentPosition: { x: rect.left, y: rect.top },
                        startPosition: { x: startX, y: startY },
                        offset,
                        isAnimatingReturn: false,
                        targetPosition: null,
                        targetAction: null,
                        targetActionData: null,
                    });
                }

                window.removeEventListener('mousemove', moveThresholdCheck);
                thresholdListenerRef.current = null;
                window.addEventListener('mousemove', handleMouseMove);
            }
        };

        const cleanupMouseUp = () => {
            window.removeEventListener('mousemove', moveThresholdCheck);
            window.removeEventListener('mouseup', cleanupMouseUp);
            thresholdListenerRef.current = null;
            hasMovedRef.current = false;

            if (!dragDataSet) {
                return;
            }

            handleMouseUp();
        };

        thresholdListenerRef.current = moveThresholdCheck;
        window.addEventListener('mousemove', moveThresholdCheck);
        window.addEventListener('mouseup', cleanupMouseUp);
    };

    // 处理归位动画完成
    const handleAnimationComplete = useCallback(() => {
        const state = dragRef.current;

        if (!state.isAnimatingReturn || !state.targetAction || !state.item) {
            return;
        }

        // 根据 targetAction 执行相应的数据更新
        switch (state.targetAction) {
            case 'reorder':
                if (state.targetActionData?.newItems) {
                    onReorder(state.targetActionData.newItems);
                }
                break;
            case 'dragOut':
                if (state.targetActionData?.mousePosition && onDragOut) {
                    onDragOut(state.targetActionData.item, state.targetActionData.mousePosition);
                }
                break;
        }

        // 清理所有状态
        setDragState({
            isDragging: false,
            item: null,
            originalIndex: -1,
            currentPosition: { x: 0, y: 0 },
            startPosition: { x: 0, y: 0 },
            offset: { x: 0, y: 0 },
            isAnimatingReturn: false,
            targetPosition: null,
            targetAction: null,
            targetActionData: null,
        });
        setPlaceholderIndex(null); // Clear placeholder after animation

        if (onDragEnd) onDragEnd();
    }, [onReorder, onDragOut, onDragEnd]);

    return {
        dragState,
        placeholderIndex,
        isDraggingOut,
        itemRefs,
        handleMouseDown,
        handleAnimationComplete,
    };
};
