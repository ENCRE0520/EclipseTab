import { useState, useEffect, useRef, useCallback } from 'react';
import { DockItem } from '../types';
import { useDragBase, createDockDragState, resetDockDragState, DockDragState } from './useDragBase';
import { createMouseDownHandler } from '../utils/dragUtils';
import { isMouseOverFolderView, getFolderViewRect, hasFolderActivePlaceholder } from '../utils/dragDetection';

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
}: UseDragAndDropOptions) => {
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
    } = useDragBase<DockDragState>({
        items,
        isEditMode,
        onDragStart,
        onDragEnd,
        externalDragItem,
        createInitialState: createDockDragState,
        resetState: resetDockDragState,
    });

    // Dock 特有的状态
    const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
    const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
    const [isPreMerge, setIsPreMerge] = useState(false);
    const [isOverFolderView, setIsOverFolderView] = useState(false);

    // Refs
    const dockRef = useRef<HTMLElement | null>(null);
    const hoveredFolderRef = useRef<string | null>(null);
    const hoveredAppRef = useRef<string | null>(null);
    const mergeTargetRef = useRef<string | null>(null);
    const isPreMergeRef = useRef(false);
    const hoverStartTime = useRef<number>(0);
    const potentialMergeTarget = useRef<string | null>(null);
    const lastMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 同步 Refs
    useEffect(() => { hoveredFolderRef.current = hoveredFolderId; }, [hoveredFolderId]);
    useEffect(() => { hoveredAppRef.current = hoveredAppId; }, [hoveredAppId]);
    useEffect(() => { mergeTargetRef.current = mergeTargetId; }, [mergeTargetId]);
    useEffect(() => { isPreMergeRef.current = isPreMerge; }, [isPreMerge]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const state = dragRef.current;
        const activeItem = state.isDragging ? state.item : externalDragItem;

        // Check if we should start dragging (only for internal items)
        if (!state.isDragging && !externalDragItem && state.item) {
            const dist = Math.hypot(e.clientX - state.startPosition.x, e.clientY - state.startPosition.y);
            if (dist > 8) { // Increased threshold from 5 to 8px
                startDragging(state.item);
            } else {
                return; // Not dragging yet
            }
        }

        if (!activeItem) return;

        // Ensure layout snapshot exists for external drag or if missing
        if ((!layoutSnapshotRef.current || layoutSnapshotRef.current.length === 0) && itemsRef.current.length > 0) {
            captureLayoutSnapshot();
        }

        // Only update position for internal drags
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
        // 存储最后的鼠标位置，供 mouseUp 使用
        lastMousePositionRef.current = { x: mouseX, y: mouseY };

        // 使用共享工具函数检测是否在文件夹视图内 - 确保与落点判断一致
        if (activeItem?.type !== 'folder' && isMouseOverFolderView(mouseX, mouseY)) {
            // Over folder view - reset dock-related states
            setIsOverFolderView(true);
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            return;
        }
        setIsOverFolderView(false);

        let isInsideDock = false;

        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            const buffer = 50; // 减小缓冲区，只在靠近 Dock 时触发
            if (
                mouseX >= dockRect.left - buffer &&
                mouseX <= dockRect.right + buffer &&
                mouseY >= dockRect.top - buffer &&
                mouseY <= dockRect.bottom + buffer
            ) {
                isInsideDock = true;
            }
        }

        if (!isInsideDock) {
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            return;
        }

        // --- Use Layout Snapshot for Calculations ---
        const snapshot = layoutSnapshotRef.current;
        let foundMergeTargetId: string | null = null;
        let foundMergeType: 'folder' | 'app' | null = null;

        // 1. Detect collisions with static items (using snapshot)
        for (const layoutItem of snapshot) {
            // Calculate center relative to mouse
            const draggedCenterX = state.isDragging ? (e.clientX - state.offset.x) + 32 : mouseX;
            const draggedCenterY = state.isDragging ? (e.clientY - state.offset.y) + 32 : mouseY;

            const dist = Math.hypot(draggedCenterX - layoutItem.centerX, draggedCenterY - layoutItem.centerY);

            // Distance threshold for merging (30px)
            if (dist < 30) {
                const targetItem = itemsRef.current.find(i => i.id === layoutItem.id);
                if (targetItem && targetItem.id !== activeItem?.id) {
                    foundMergeTargetId = targetItem.id;
                    foundMergeType = targetItem.type;
                    break; // Prioritize the first close match
                }
            }
        }

        if (foundMergeTargetId) {
            if (potentialMergeTarget.current !== foundMergeTargetId) {
                potentialMergeTarget.current = foundMergeTargetId;
                hoverStartTime.current = Date.now();
                setIsPreMerge(false);
                setMergeTargetId(null);
                setHoveredFolderId(null);
                setHoveredAppId(null);
            } else {
                const dwellTime = Date.now() - hoverStartTime.current;

                // Case B: Hover to Open (Precise Operation)
                if (foundMergeType === 'folder' && dwellTime > 500 && !isPreMergeRef.current) {
                    if (onHoverOpenFolder && activeItem) {
                        const targetFolder = itemsRef.current.find(i => i.id === foundMergeTargetId);
                        if (targetFolder) {
                            onHoverOpenFolder(activeItem, targetFolder);
                            potentialMergeTarget.current = null;
                            return;
                        }
                    }
                }

                // Case A: Direct Drop (Blind Operation)
                if (dwellTime > 300 && !isPreMergeRef.current) {
                    setIsPreMerge(true);
                    setMergeTargetId(foundMergeTargetId);
                    if (foundMergeType === 'folder') {
                        setHoveredFolderId(foundMergeTargetId);
                        setHoveredAppId(null);
                    } else {
                        setHoveredFolderId(null);
                        setHoveredAppId(foundMergeTargetId);
                    }
                }
            }
        } else {
            potentialMergeTarget.current = null;
            setIsPreMerge(false);

            // Reordering logic using Static Snapshot
            if (snapshot.length > 0) {
                // Find the closest insertion point based on X-axis and global distance
                // Hysteresis: We want to find the gap between items.
                // Simplified approach: find closest item center, then decide left/right.

                // If items are empty, index is 0
                if (itemsRef.current.length === 0) {
                    setPlaceholderIndex(0);
                    return;
                }

                // Calculate insertion index
                // We iterate through visual slots.
                let targetIndex = -1;

                // Naive approach: Find where the mouse X is in relation to item centers
                // Snapshot is ordered by index? It should be, based on how we captured it from itemRefs which are mapped from items.

                for (let i = 0; i < snapshot.length; i++) {
                    const item = snapshot[i];
                    if (mouseX < item.centerX) {
                        targetIndex = i;
                        break;
                    }
                }

                if (targetIndex === -1) {
                    targetIndex = itemsRef.current.length;
                }

                // Hysteresis check:
                // Only change if we are significantly into the new zone?
                // For now, the static snapshot ALREADY provides immense stability because
                // the "zones" (item centers) do not move when the placeholder appears.
                // The placeholder is purely visual. The `targetIndex` calculation is based on 
                // the *original* layout.

                // One edge case: if we are dragging an item from right to left, the indices shift.
                // But `snapshot` preserves original indices.
                // If I am dragging item at index 5.
                // I move layout to index 2.
                // In the snapshot, I am over item 2.
                // So target should be 2.
                // Visual placeholder shows at 2. 
                // This is stable.

                if (activeItem && state.isDragging && state.originalIndex !== -1) {
                    // Adjust for the fact that the item itself is "gone" from the flow visually if we were to just remove it
                    // But here we are inserting *around* static items.
                }

                setPlaceholderIndex(targetIndex);
            } else {
                // Fallback if snapshot failed or empty
                setPlaceholderIndex(0);
            }
        }
    }, [onDragStart, externalDragItem, startDragging, captureLayoutSnapshot, onHoverOpenFolder, layoutSnapshotRef, itemsRef, setDragState, setPlaceholderIndex, setHoveredFolderId, setHoveredAppId, setMergeTargetId]);

    // Handle external drag tracking
    useEffect(() => {
        if (externalDragItem) {
            window.addEventListener('mousemove', handleMouseMove);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
            };
        } else {
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
        }
    }, [externalDragItem, handleMouseMove, setPlaceholderIndex]);

    // Handle mouse up with animation delay logic
    const handleMouseUp = useCallback(() => {
        const state = dragRef.current;

        // If we never started dragging and just clicked, cleanup
        if (!state.isDragging && state.item && !hasMovedRef.current) {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
                thresholdListenerRef.current = null;
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            hasMovedRef.current = false;
            setDragState(resetDockDragState());
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
        const currentHoveredFolder = hoveredFolderRef.current;
        const currentHoveredApp = hoveredAppRef.current;
        const currentItems = itemsRef.current;
        const isPreMergeState = isPreMergeRef.current;
        const snapshot = layoutSnapshotRef.current;

        let targetPos: { x: number, y: number } | null = null;
        let action: DockDragState['targetAction'] = null;
        let actionData: any = null;

        // 判断是否应该放入文件夹：以文件夹的占位符状态为准
        // 如果文件夹显示了占位符，就放入文件夹，无论鼠标当前位置在哪
        const shouldDropToFolder = state.item.type !== 'folder' && hasFolderActivePlaceholder();

        if (shouldDropToFolder && onDragToOpenFolder && state.item.type !== 'folder') {
            const folderRect = getFolderViewRect();
            if (folderRect) {
                targetPos = {
                    x: folderRect.left + folderRect.width / 2 - 32,
                    y: folderRect.top + folderRect.height / 2 - 32,
                };
                action = 'dragToOpenFolder';
                actionData = { item: state.item };
            }
        } else if (isPreMergeState) {
            // ... (Same merge logic) ...
            if (currentHoveredFolder && onDropToFolder) {
                // Find rect from snapshot if possible for stability
                const targetFolderItem = snapshot.find(i => i.id === currentHoveredFolder);
                if (targetFolderItem) {
                    targetPos = { x: targetFolderItem.rect.left, y: targetFolderItem.rect.top };
                }
                const targetFolder = currentItems.find(i => i.id === currentHoveredFolder);
                if (targetFolder) {
                    action = 'dropToFolder';
                    actionData = { item: state.item, targetFolder };
                }
            } else if (currentHoveredApp && onMergeFolder) {
                const targetAppItem = snapshot.find(i => i.id === currentHoveredApp);
                if (targetAppItem) {
                    targetPos = { x: targetAppItem.rect.left, y: targetAppItem.rect.top };
                }
                const targetApp = currentItems.find(i => i.id === currentHoveredApp);
                if (targetApp) {
                    action = 'mergeFolder';
                    actionData = { item: state.item, targetItem: targetApp };
                }
            }
        } else if (currentPlaceholder !== null && currentPlaceholder !== undefined) {
            const oldIndex = state.originalIndex;
            let insertIndex = currentPlaceholder;

            // Logic to calculate final items
            const newItems = [...currentItems];
            // If internal drag, move item. If external, insert.
            if (oldIndex !== -1) {
                if (insertIndex > oldIndex) insertIndex -= 1;
                const [moved] = newItems.splice(oldIndex, 1);
                newItems.splice(insertIndex, 0, moved);
            }

            // Calculate Target Position for "Fly Back"
            // This is tricky. We need the position of the *slot* where it will land.
            // We can use the snapshot.

            // If we drop at index 2. The item currently at index 2 (in snapshot) is the visual target?
            // Or we calculate based on gap.

            // Simplified: Just use the coordinate of the snapshot item at that index?
            // If I insert at 0, I want to fly to snapshot[0].left.
            // If I insert at end, I want snapshot[last].right + gap.

            // But wait, if I am reordering from 0 to 1.
            // Original: [A, B, C]
            // Snapshot: A(0), B(64), C(128)
            // Drag A. Target index 2.
            // List becomes [B, A, C]
            // A should fly to position of B (in visual flow) or C? 
            // Position of index 1 (where A lands).
            // In original snapshot, index 1 is B at 64. 
            // So A should fly to 64.

            // So, targetX = snapshot[insertIndex] (or effective visual index)

            // Wait, if I shift everything, using original snapshot is good.
            // Layout: 0:0px, 1:72px, 2:144px.
            // Insert at 1. Target is 72px.

            let targetX = 0;

            if (currentPlaceholder < snapshot.length) {
                const snapItem = snapshot[currentPlaceholder];
                if (snapItem) {
                    targetX = snapItem.rect.left;
                }
            } else {
                // Append to end
                const lastItem = snapshot[snapshot.length - 1];
                if (lastItem) {
                    targetX = lastItem.rect.right + 8; // + gap
                } else {
                    // Empty dock
                    const dockContainer = document.querySelector('[data-dock-container="true"]');
                    if (dockContainer) {
                        targetX = dockContainer.getBoundingClientRect().left + 8;
                    }
                }
            }

            // Adjust if we are moving the item itself (internal drag)
            // If dragging item 0 to index 0... 
            // If dragging item 0 to index 1.
            // New list: B, A.
            // Insert index is 1. (Provided we subtracted 1 if needed).
            // Yes, `insertIndex` is the index in the *new* array.
            // So we want the position corresponding to `insertIndex` in the *snapshot* array?
            // Snapshot is static.
            // Index 0 in Snapshot is at 0px. Index 1 at 72px.
            // If A ends up at index 1 in new array, it should be at 72px.
            // So yes, `snapshot[insertIndex].rect.left` is the correct target X.
            // Unless we appended, then it's after the last one.

            // Correction: If we drag item from left to right, the items in between shift LEFT.
            // Visual holes are handled by `getItemTransform`.
            // But the *final* destination is a specific slot.

            targetPos = {
                x: targetX,
                y: snapshot[0]?.rect.top || (dockRef.current?.getBoundingClientRect().top || 0) + 8
            };

            action = 'reorder';
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

            // Cleanup hover states immediately
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            hasMovedRef.current = false;

            // Backup timeout in case transitionend fails
            setTimeout(() => {
                const currentState = dragRef.current;
                if (currentState.isAnimatingReturn) {
                    handleAnimationComplete();
                }
            }, 350); // Slightly longer than CSS transition

        } else {
            // Cancel / Reset
            setDragState(resetDockDragState());
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            hasMovedRef.current = false;

            if (onDragEnd) onDragEnd();
        }
    }, [isOverFolderView, onDropToFolder, onMergeFolder, onDragToOpenFolder, onDragEnd, handleMouseMove, setDragState, setPlaceholderIndex, placeholderRef, itemsRef, layoutSnapshotRef, dragRef, hasMovedRef, thresholdListenerRef, hoveredFolderRef, hoveredAppRef, isPreMergeRef]);


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

        // Apply Logic
        switch (state.targetAction) {
            case 'reorder':
                if ((state.targetActionData as any)?.newItems) {
                    onReorder((state.targetActionData as any).newItems);
                }
                break;
            case 'dropToFolder':
                if ((state.targetActionData as any)?.targetFolder && onDropToFolder) {
                    onDropToFolder((state.targetActionData as any).item, (state.targetActionData as any).targetFolder);
                }
                break;
            case 'mergeFolder':
                if ((state.targetActionData as any)?.targetItem && onMergeFolder) {
                    onMergeFolder((state.targetActionData as any).item, (state.targetActionData as any).targetItem);
                }
                break;
            case 'dragToOpenFolder':
                if (onDragToOpenFolder) {
                    onDragToOpenFolder((state.targetActionData as any).item);
                }
                break;
        }

        setDragState(resetDockDragState());
        setPlaceholderIndex(null);

        if (onDragEnd) onDragEnd();
    }, [onReorder, onDropToFolder, onMergeFolder, onDragToOpenFolder, onDragEnd, setDragState, setPlaceholderIndex, dragRef]);

    const getItemTransform = useCallback((index: number): number => {
        const targetSlot = placeholderRef.current;
        if (targetSlot === null) return 0;

        const state = dragRef.current;
        const itemGap = 72; // 64 (width) + 8 (gap)

        // If dragging internally
        if (state.isDragging && state.originalIndex !== -1) {
            const draggedIndex = state.originalIndex;

            // The dragged item itself is hidden or absolute, so its gap is "gone".
            // But we want to visualize the *new* gap opening up.

            if (index === draggedIndex) return 0; // It's being dragged

            // Shift items to fill the hole left by draggedIndex
            // And open a hole at targetSlot.

            // Simplified Logic:
            // Items between draggedIndex and targetSlot need to shift.

            if (draggedIndex < targetSlot) {
                // Dragging right
                // Items from [draggedIndex + 1] to [targetSlot - 1] shift LEFT (-itemGap)
                if (index > draggedIndex && index < targetSlot) {
                    return -itemGap;
                }
            } else if (draggedIndex > targetSlot) {
                // Dragging left
                // Items from [targetSlot] to [draggedIndex - 1] shift RIGHT (+itemGap)
                if (index >= targetSlot && index < draggedIndex) {
                    return itemGap;
                }
            }
        }
        // If external drag
        else if (externalDragItem) {
            // Open a hole at targetSlot
            // Items >= targetSlot shift RIGHT
            if (index >= targetSlot) {
                return itemGap;
            }
        }

        return 0;
    }, [externalDragItem, placeholderRef, dragRef]);

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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
