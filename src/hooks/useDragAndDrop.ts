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
    targetAction: 'reorder' | 'dropToFolder' | 'mergeFolder' | 'dragToOpenFolder' | null;
    targetActionData: any;
}

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
    const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
    const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
    const [isPreMerge, setIsPreMerge] = useState(false);
    const [isOverFolderView, setIsOverFolderView] = useState(false);

    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    const dockRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<DragState>(dragState);
    const itemsRef = useRef(items);
    const placeholderRef = useRef<number | null>(null);
    const hoveredFolderRef = useRef<string | null>(null);
    const hoveredAppRef = useRef<string | null>(null);
    const mergeTargetRef = useRef<string | null>(null);
    const isPreMergeRef = useRef(false);
    const hoverStartTime = useRef<number>(0);
    const potentialMergeTarget = useRef<string | null>(null);
    const hasMovedRef = useRef(false);
    const thresholdListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

    useEffect(() => { dragRef.current = dragState; }, [dragState]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { placeholderRef.current = placeholderIndex; }, [placeholderIndex]);
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
                hasMovedRef.current = true;
                setDragState(prev => ({ ...prev, isDragging: true }));
                if (onDragStart) onDragStart(state.item);
            } else {
                return; // Not dragging yet
            }
        }

        if (!activeItem) return;

        // Only update position for internal drags
        if (state.isDragging) {
            const x = e.clientX - state.offset.x;
            const y = e.clientY - state.offset.y;
            setDragState(prev => ({ ...prev, currentPosition: { x, y } }));
        }

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is over an open folder view
        const folderViewElement = document.querySelector('[data-folder-view="true"]');
        if (folderViewElement && activeItem?.type !== 'folder') {  // Don't allow folders into folders
            const folderRect = folderViewElement.getBoundingClientRect();
            if (
                mouseX >= folderRect.left &&
                mouseX <= folderRect.right &&
                mouseY >= folderRect.top &&
                mouseY <= folderRect.bottom
            ) {
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
        }
        setIsOverFolderView(false);

        let isInsideDock = false;

        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            const buffer = 150;
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

        let foundMergeTargetId: string | null = null;
        let foundMergeType: 'folder' | 'app' | null = null;

        itemRefs.current.forEach((ref, index) => {
            if (!ref) return;
            const rect = ref.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Use mouse position for external drags, or calculated center for internal
            const draggedCenterX = state.isDragging ? (e.clientX - state.offset.x) + 32 : mouseX;
            const draggedCenterY = state.isDragging ? (e.clientY - state.offset.y) + 32 : mouseY;
            const dist = Math.hypot(draggedCenterX - centerX, draggedCenterY - centerY);

            if (dist < 30) {
                const targetItem = itemsRef.current[index];
                if (targetItem.id !== activeItem?.id) {
                    foundMergeTargetId = targetItem.id;
                    foundMergeType = targetItem.type;
                }
            }
        });

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
                // If hovering over a folder for > 500ms, trigger open
                if (foundMergeType === 'folder' && dwellTime > 500 && !isPreMergeRef.current) {
                    if (onHoverOpenFolder && state.item) {
                        const targetFolder = itemsRef.current.find(i => i.id === foundMergeTargetId);
                        if (targetFolder) {
                            onHoverOpenFolder(state.item, targetFolder);
                            // Reset to avoid repeated calls or weird states
                            potentialMergeTarget.current = null;
                            return;
                        }
                    }
                }

                // Case A: Direct Drop (Blind Operation) - handled by isPreMerge visual feedback
                // We still want the "blob" effect or highlighting for merging/dropping
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

            const dockRect = dockRef.current?.getBoundingClientRect();
            if (dockRect) {
                // For transform-based layout, we consider ALL items including the dragged one
                // The "gap" is technically where the dragged item IS, but we want to know where it SHOULD be.

                // We want to find the insertion index based on the mouse X position relative to the items.
                // If we are dragging internally, the item is still in the list taking up space.
                // We want to find which "slot" the mouse is closest to.

                // Iterate through all items to find the closest slot
                // Slots are: Before item 0, Between 0 and 1, ..., After last item

                // However, a simpler approach for 1D list is:
                // Find the item whose center is closest to mouseX? 
                // Or find the first item whose center is > mouseX?

                // Let's use the "Center Crossing" rule (Overlap > 50%)
                // If mouseX < ItemCenter, we insert before that item.

                let targetIndex = -1;

                for (let i = 0; i < itemsRef.current.length; i++) {
                    const ref = itemRefs.current[i];
                    if (ref) {
                        const rect = ref.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;

                        // If mouse is to the left of this item's center, we insert here
                        if (mouseX < centerX) {
                            targetIndex = i;
                            break;
                        }
                    }
                }

                if (targetIndex === -1) {
                    targetIndex = itemsRef.current.length;
                }

                setPlaceholderIndex(targetIndex);
            }
        }
    }, [onDragStart, externalDragItem]);

    // Handle external drag tracking
    useEffect(() => {
        if (externalDragItem) {
            window.addEventListener('mousemove', handleMouseMove);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
            };
        } else {
            // Reset placeholder when external drag ends
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
        }
    }, [externalDragItem, handleMouseMove]);

    const handleMouseUp = useCallback(() => {
        const state = dragRef.current;

        // If we never started dragging and just clicked, cleanup and allow click event to fire
        if (!state.isDragging && state.item && !hasMovedRef.current) {
            if (thresholdListenerRef.current) {
                window.removeEventListener('mousemove', thresholdListenerRef.current);
                thresholdListenerRef.current = null;
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            hasMovedRef.current = false;
            // Reset state to allow click
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
        const currentHoveredFolder = hoveredFolderRef.current;
        const currentHoveredApp = hoveredAppRef.current;
        const currentItems = itemsRef.current;
        const isPreMergeState = isPreMergeRef.current;

        // 计算目标位置并设置动画状态
        let targetPos: Position | null = null;
        let action: DragState['targetAction'] = null;
        let actionData: any = null;

        // Check if dropping onto open folder view
        if (isOverFolderView && onDragToOpenFolder && state.item.type !== 'folder') {
            // 找到打开的文件夹视图元素
            const folderViewElement = document.querySelector('[data-folder-view="true"]');
            if (folderViewElement) {
                const rect = folderViewElement.getBoundingClientRect();
                targetPos = {
                    x: rect.left + rect.width / 2 - 32, // 减去图标宽度的一半
                    y: rect.top + rect.height / 2 - 32,
                };
                action = 'dragToOpenFolder';
                actionData = { item: state.item };
            }
        } else if (isPreMergeState) {
            if (currentHoveredFolder && onDropToFolder) {
                const targetFolder = currentItems.find(i => i.id === currentHoveredFolder);
                if (targetFolder) {
                    // 找到目标文件夹图标的位置
                    const folderIndex = currentItems.findIndex(i => i.id === currentHoveredFolder);
                    const folderElement = itemRefs.current[folderIndex];
                    if (folderElement) {
                        const rect = folderElement.getBoundingClientRect();
                        targetPos = {
                            x: rect.left,
                            y: rect.top,
                        };
                        action = 'dropToFolder';
                        actionData = { item: state.item, targetFolder };
                    }
                }
            } else if (currentHoveredApp && onMergeFolder) {
                const targetApp = currentItems.find(i => i.id === currentHoveredApp);
                if (targetApp) {
                    // 找到目标应用图标的位置
                    const appIndex = currentItems.findIndex(i => i.id === currentHoveredApp);
                    const appElement = itemRefs.current[appIndex];
                    if (appElement) {
                        const rect = appElement.getBoundingClientRect();
                        targetPos = {
                            x: rect.left,
                            y: rect.top,
                        };
                        action = 'mergeFolder';
                        actionData = { item: state.item, targetItem: targetApp };
                    }
                }
            }
        } else if (currentPlaceholder !== null && currentPlaceholder !== undefined) {
            const oldIndex = state.originalIndex;

            if (oldIndex !== -1) {
                // 计算插入索引
                let insertIndex = currentPlaceholder;
                if (insertIndex > oldIndex) {
                    insertIndex -= 1;
                }

                // 准备新数组用于动画完成后更新
                const newItems = [...currentItems];
                const [moved] = newItems.splice(oldIndex, 1);
                newItems.splice(insertIndex, 0, moved);

                // 计算目标位置：图标在新数组中的位置对应的 DOM 坐标
                // insertIndex 是图标在重排后数组中的索引
                // 我们需要找到对应的 DOM 元素位置
                let targetElement: HTMLElement | null = null;

                // 如果图标向后移动（insertIndex > oldIndex），目标元素是 insertIndex + 1
                // 因为被拖动的元素在当前 DOM 中还在 oldIndex，所以后面的元素索引要 +1
                if (insertIndex >= oldIndex) {
                    targetElement = itemRefs.current[insertIndex + 1];
                } else {
                    // 如果图标向前移动，目标元素就是 insertIndex
                    targetElement = itemRefs.current[insertIndex];
                }

                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    targetPos = {
                        x: rect.left,
                        y: rect.top,
                    };
                    action = 'reorder';
                    actionData = { newItems };
                }
            }
        }

        // 如果有目标位置，触发归位动画
        if (targetPos && action) {
            setDragState(prev => ({
                ...prev,
                isDragging: false,
                isAnimatingReturn: true,
                targetPosition: targetPos,
                targetAction: action,
                targetActionData: actionData,
            }));
            // 清理拖拽相关的 UI 状态
            setPlaceholderIndex(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            hasMovedRef.current = false;
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
            setHoveredFolderId(null);
            setHoveredAppId(null);
            setMergeTargetId(null);
            setIsPreMerge(false);
            potentialMergeTarget.current = null;
            hasMovedRef.current = false;

            if (onDragEnd) onDragEnd();
        }
    }, [onDropToFolder, onMergeFolder, onReorder, onDragEnd, onDragToOpenFolder, handleMouseMove]);

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

        // Delay adding mousemove listener to avoid false drag detection
        const moveThresholdCheck = (moveEvent: MouseEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 3) { // 3px threshold before we start tracking
                hasMovedRef.current = true;

                // NOW set the drag state for the first time
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

            // If we never started dragging, don't interfere - let click event handle it
            if (!dragDataSet) {
                // Click will fire naturally
                return;
            }

            // If we did start setting up drag, call the real handleMouseUp
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
            case 'dropToFolder':
                if (state.targetActionData?.targetFolder && onDropToFolder) {
                    onDropToFolder(state.targetActionData.item, state.targetActionData.targetFolder);
                }
                break;
            case 'mergeFolder':
                if (state.targetActionData?.targetItem && onMergeFolder) {
                    onMergeFolder(state.targetActionData.item, state.targetActionData.targetItem);
                }
                break;
            case 'dragToOpenFolder':
                if (onDragToOpenFolder) {
                    onDragToOpenFolder(state.targetActionData.item);
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

        if (onDragEnd) onDragEnd();
    }, [onReorder, onDropToFolder, onMergeFolder, onDragToOpenFolder, onDragEnd]);

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
    };
};
