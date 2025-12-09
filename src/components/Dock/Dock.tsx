import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DockItem as DockItemType } from '../../types';
import { DockItem } from './DockItem';
import { AddIcon } from './AddIcon';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { generateFolderIcon } from '../../utils/iconFetcher';
import styles from './Dock.module.css';

interface DockProps {
    items: DockItemType[];
    isEditMode: boolean;
    onItemClick: (item: DockItemType, rect?: DOMRect) => void;
    onItemEdit: (item: DockItemType, rect?: DOMRect) => void;
    onItemDelete: (item: DockItemType) => void;
    onItemAdd: (rect?: DOMRect) => void;
    onItemsReorder: (items: DockItemType[]) => void;
    onDropToFolder?: (item: DockItemType, folder: DockItemType) => void;
    onDragToOpenFolder?: (item: DockItemType) => void;
    onHoverOpenFolder?: (item: DockItemType, folder: DockItemType) => void;
    onLongPressEdit?: () => void;
    onWidthChange?: (width: number) => void;
    // Cross‑component drag feedback
    externalDragItem?: DockItemType | null;
    onDragStart?: (item: DockItemType) => void;
    onDragEnd?: () => void;
}

export const Dock: React.FC<DockProps> = ({
    items,
    isEditMode,
    onItemClick,
    onItemEdit,
    onItemDelete,
    onItemAdd,
    onItemsReorder,
    onDropToFolder,
    onDragToOpenFolder,
    onHoverOpenFolder,
    onLongPressEdit,
    onWidthChange,
    externalDragItem,
    onDragStart,
    onDragEnd,
}) => {
    const innerRef = useRef<HTMLDivElement>(null);

    const {
        dragState,
        placeholderIndex,
        mergeTargetId,
        isPreMerge,
        itemRefs,
        dockRef,
        handleMouseDown,
        handleAnimationComplete,
        getItemTransform,
    } = useDragAndDrop({
        items,
        isEditMode,
        onReorder: onItemsReorder,
        onDragToOpenFolder,
        onHoverOpenFolder: (item, folder) => {
            if (onHoverOpenFolder) onHoverOpenFolder(item, folder);
        },
        onDropToFolder,
        onMergeFolder: (item, target) => {
            if (target.type === 'folder') {
                const itemsToMerge = item.type === 'folder' && item.items ? item.items : [item];
                const newItems = items.map(i => {
                    if (i.id === target.id) {
                        const merged = [...(i.items || []), ...itemsToMerge];
                        return { ...i, items: merged, icon: generateFolderIcon(merged) };
                    }
                    return i;
                }).filter(i => i.id !== item.id);
                onItemsReorder(newItems);
            } else {
                const newFolder: DockItemType = {
                    id: `folder-${Date.now()}`,
                    name: 'Folder',
                    type: 'folder',
                    items: [target, item],
                };
                newFolder.icon = generateFolderIcon(newFolder.items!);
                const finalItems = items.map(i => (i.id === target.id ? newFolder : i)).filter(i => i.id !== item.id);
                onItemsReorder(finalItems);
            }
        },
        externalDragItem,
        onDragStart,
        onDragEnd,
    });

    const isInteracting = dragState.isDragging || dragState.isAnimatingReturn || !!externalDragItem;

    // Sync innerRef with dockRef from hook
    useEffect(() => {
        if (innerRef.current) {
            (dockRef as any).current = innerRef.current;
        }
    }, [dockRef]);

    // Observe width changes
    useEffect(() => {
        if (!onWidthChange || !innerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                let w = 0;
                if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
                    w = Math.round(entry.borderBoxSize[0].inlineSize);
                } else {
                    w = Math.round(entry.contentRect.width);
                    if (entry.target instanceof HTMLElement) {
                        w = Math.round(entry.target.getBoundingClientRect().width);
                    }
                }
                onWidthChange(w);
            }
        });
        ro.observe(innerRef.current);
        return () => ro.disconnect();
    }, [onWidthChange]);

    return (
        <header ref={innerRef} className={`${styles.dock} ${isEditMode ? styles.editMode : ''}`}>
            <div className={styles.dockContent} data-dock-container="true">
                <div className={`${styles.editTools} ${isEditMode ? styles.visible : ''}`}>
                    <AddIcon onClick={rect => onItemAdd(rect)} />
                    <div className={styles.divider}>
                        <svg width="1" height="48" viewBox="0 0 1 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0.5" y1="0" x2="0.5" y2="48" strokeWidth="1" />
                        </svg>
                    </div>
                </div>

                {items.map((item, index) => {
                    const isMergeTarget = mergeTargetId === item.id;
                    const isDragging = dragState.item?.id === item.id;

                    // Transform-based animation: calculate horizontal offset for smooth sliding
                    const translateX = getItemTransform(index);

                    return (
                        <div
                            key={item.id}
                            ref={el => { itemRefs.current[index] = el; }}
                            className={styles.dockItemWrapper}
                            data-dock-item-wrapper="true"
                            style={isDragging ? (
                                // When cursor is far from dock, collapse width so dock shrinks
                                // When cursor is over dock (placeholderIndex set), keep width for transform-based gap
                                placeholderIndex === null ? {
                                    width: 0,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    transition: isInteracting
                                        ? 'width 200ms cubic-bezier(0.2, 0, 0, 1), min-width 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms'
                                        : 'none',
                                } : {
                                    width: 64,
                                    minWidth: 64,
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    transform: `translateX(${translateX}px)`,
                                    transition: isInteracting
                                        ? 'width 200ms cubic-bezier(0.2, 0, 0, 1), min-width 200ms cubic-bezier(0.2, 0, 0, 1), transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms'
                                        : 'none',
                                }
                            ) : {
                                transform: `translateX(${translateX}px)`,
                                transition: isInteracting
                                    ? 'transform 200ms cubic-bezier(0.2, 0, 0, 1)'
                                    : 'none',
                            }}
                        >
                            <DockItem
                                item={item}
                                isEditMode={isEditMode}
                                onClick={rect => onItemClick(item, rect)}
                                onEdit={rect => onItemEdit(item, rect)}
                                onDelete={() => onItemDelete(item)}
                                isDragging={isDragging}
                                staggerIndex={index}
                                isDropTarget={isMergeTarget}
                                onLongPress={onLongPressEdit}
                                onMouseDown={e => handleMouseDown(e, item, index)}
                            />
                        </div>
                    );
                })}
                <div className={styles.divider}>
                    <svg width="1" height="48" viewBox="0 0 1 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0.5" y1="0" x2="0.5" y2="48" strokeWidth="1" />
                    </svg>
                </div>
                <div className={styles.dockNavigator}>
                    <div className={styles.navigatorIcon}>
                        {/* AddIcon removed in non-edit mode as per request */}
                    </div>
                </div>
            </div>
            {(dragState.isDragging || dragState.isAnimatingReturn) && dragState.item && createPortal(
                <div
                    className={dragState.isAnimatingReturn ? styles.dragPreviewReturn : ''}
                    style={{
                        position: 'fixed',
                        left: dragState.isAnimatingReturn && dragState.targetPosition
                            ? dragState.targetPosition.x
                            : dragState.currentPosition.x,
                        top: dragState.isAnimatingReturn && dragState.targetPosition
                            ? dragState.targetPosition.y
                            : dragState.currentPosition.y,
                        width: 64,
                        height: 64,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        transform: isPreMerge ? 'scale(0.6)' : 'scale(1.0)',
                        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                        transition: dragState.isAnimatingReturn
                            ? 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.4,0,0.2,1)'
                            : 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                    }}
                    onTransitionEnd={(e) => {
                        // 只在归位动画的 left/top 过渡完成时触发回调
                        if (dragState.isAnimatingReturn && (e.propertyName === 'left' || e.propertyName === 'top')) {
                            handleAnimationComplete();
                        }
                    }}
                >
                    <DockItem
                        item={dragState.item}
                        isEditMode={isEditMode}
                        onClick={() => { }}
                        onEdit={() => { }}
                        onDelete={() => { }}
                        isDragging={true}
                    />
                </div>,
                document.body
            )}
        </header>
    );
};
