import { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DockItem } from '../../types';
import { DockItem as DockItemComponent } from '../Dock/DockItem';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import { useFolderDragAndDrop } from '../../hooks/useFolderDragAndDrop';
import styles from './FolderView.module.css';

interface FolderViewProps {
  folder: DockItem;
  isEditMode: boolean;
  onItemClick: (item: DockItem) => void;
  onItemEdit: (item: DockItem, rect?: DOMRect) => void;
  onItemDelete: (item: DockItem) => void;
  onClose: () => void;
  onItemsReorder: (items: DockItem[]) => void;
  onItemDragOut?: (item: DockItem, mousePosition: { x: number; y: number }) => void;
  anchorRect?: DOMRect | null;
  // Cross‑component drag feedback
  externalDragItem?: DockItem | null;
  onDragStart?: (item: DockItem) => void;
  onDragEnd?: () => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  folder,
  isEditMode,
  onItemClick,
  onItemEdit,
  onItemDelete,
  onClose,
  onItemsReorder,
  onItemDragOut,
  anchorRect,
  externalDragItem,
  onDragStart,
  onDragEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    dragState,
    isDraggingOut,
    placeholderIndex,
    itemRefs,
    handleMouseDown,
    handleAnimationComplete,
    dragElementRef,
  } = useFolderDragAndDrop({
    items: folder.items || [],
    isEditMode,
    onReorder: onItemsReorder,
    onDragOut: onItemDragOut,
    containerRef: gridRef,
    externalDragItem,
    onDragStart,
    onDragEnd,
  });

  // Projection / Render Items Logic
  const renderItems = useMemo(() => {
    const activeDragItem = dragState.isDragging ? dragState.item : externalDragItem;
    // Base items: All items minus the one currently being dragged (if it exists in the list)
    let base = (folder.items || []);

    // Helper: Unique ID check
    const uniqueMap = new Map();
    base.forEach(b => uniqueMap.set(b.id, b));

    // If an item is being dragged, we remove it from the 'base' view because we will re-insert it at placeholder
    if (activeDragItem) {
      uniqueMap.delete(activeDragItem.id);
    }

    // Convert back to array
    const cleanBase = Array.from(uniqueMap.values());

    // If we are dragging out, we just show start items (minus dragged)
    if (isDraggingOut) {
      return cleanBase;
    }

    // Insert at placeholder
    const result = [...cleanBase];
    if (activeDragItem && (placeholderIndex !== null || externalDragItem)) {
      // Default to end if placeholder is null but we have external item (hovering empty space)
      // Actually, if placeholderIndex is null, usually we don't insert. 
      // But the user wants 'infinite duplication' fixed. 
      // Strict rule: Insert ONCE.

      const targetIndex = placeholderIndex !== null ? placeholderIndex : result.length;
      const safeIndex = Math.min(Math.max(0, targetIndex), result.length);

      result.splice(safeIndex, 0, activeDragItem);
    }

    return result;
  }, [folder.items, dragState.item, dragState.isDragging, externalDragItem, placeholderIndex, isDraggingOut]);

  // Animate entry
  useEffect(() => {
    if (containerRef.current) {
      scaleFadeIn(containerRef.current);
    }
  }, []);

  // Close when clicking outside... (logic unchanged)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-dock-container="true"]') ||
        target.closest('[data-modal="true"]') ||
        document.body.classList.contains('is-dragging')) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    if (containerRef.current) {
      scaleFadeOut(containerRef.current, 300, onClose);
    } else {
      onClose();
    }
  };

  // If even projected items are empty, show nothing? Or just standard check.
  if ((!folder.items || folder.items.length === 0) && (!externalDragItem)) {
    // If we have external drag item, projected items will not be empty.
    // So checking projectedItems.length is better but we can keep basic check.
    if (renderItems.length === 0) return null;
  }

  // Layout calculations based on PROJECTED items
  const itemCount = renderItems.length;
  const columns = Math.min(4, Math.max(itemCount, 1));

  // Calculate width
  const popupWidth = (columns * 64) + ((Math.max(columns - 1, 0)) * 8) + 16;
  const halfWidth = popupWidth / 2;

  return createPortal(
    <>
      <div
        className={styles.popupWrapper}
        data-folder-view="true"
        style={{
          left: `${Math.min(
            Math.max(Math.round((anchorRect?.left ?? 0) + (anchorRect?.width ?? 0) / 2),
              halfWidth
            ), window.innerWidth - halfWidth)}px`,
          top: `${Math.round((anchorRect?.top ?? 0) - 24)}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          className={`${styles.container} ${styles.popover}`}
          style={{
            width: `${popupWidth}px`,
            height: 'auto',
            minHeight: '120px',
            overflow: 'visible'
          }}
        >
          <div
            ref={gridRef}
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${columns}, 64px)`,
              gridAutoRows: 'min-content',
              gridAutoFlow: 'row dense',
              justifyContent: 'start',
              alignContent: 'start',
            }}
          >
            {renderItems.map((item, index) => {
              // Check if this item is the one being dragged (source)
              // If it is internal drag, projectedItems has the RE-INSERTED item at new position.
              // We want to render it invisible to hold the space, while Overlay shows the visual.

              const isDraggingSource = dragState.isDragging && dragState.item?.id === item.id;
              // Also check external, though external source isn't in this list usually unless we dropped?
              // The projection puts the external item IN the list. So we need to render it as a placeholder.

              const isExternalPlaceholder = externalDragItem?.id === item.id;
              // We DO NOT need getItemTransform shifting anymore because projection array HAS the gap!
              // The projection "physically" moves the items in the list.
              // Wait, previous logic used `getItemTransform` to slide items around a fixed list.
              // IF we use projection, React reorders DOM nodes. Animation might be lost unless we use framer-motion or Flip Move.
              // However, the user asked for Projection State to fix duplication.
              // If we strictly use projection, existing CSS transforms (sliding) might fight.
              // But for robustness, Projection is safer.
              // Let's rely on standard CSS Grid layout flow.

              // To Restore Animation: We would need `react-flip-move` or similar, OR keep `getItemTransform` but apply to projected?
              // `getItemTransform` was designed for "Static List + Visual Shift".
              // "Projection" is "Dynamic List + React Re-render".
              // Dynamic List is much less buggy for things like overflow/wrapping.
              // Let's stick to Projection (Dynamic List).

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={styles.gridItem}
                  style={{
                    width: 64,
                    height: 64,
                    // For projection, we can just let them sit.
                    // If we want to hide the source one (ghost):
                    opacity: (isDraggingSource || isExternalPlaceholder) ? 0 : 1,
                    visibility: (isDraggingSource || isExternalPlaceholder) ? 'hidden' : 'visible',
                  }}
                >
                  <DockItemComponent
                    item={item}
                    isEditMode={isEditMode}
                    onClick={() => onItemClick(item)}
                    onEdit={(rect) => onItemEdit(item, rect)}
                    onDelete={() => onItemDelete(item)}
                    isDragging={isDraggingSource} // Passes prop down
                    staggerIndex={index}
                    // We only attaching mousedown if it's a real item? Yes.
                    onMouseDown={(e) => handleMouseDown(e, item, index)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Drag preview overlay */}
      {(dragState.isDragging || dragState.isAnimatingReturn) && dragState.item && createPortal(
        <div
          ref={el => {
            if (dragElementRef) {
              dragElementRef.current = el;
            }
          }}
          style={{
            position: 'fixed',
            left: dragState.currentPosition.x,
            top: dragState.currentPosition.y,
            width: 64,
            height: 64,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: isDraggingOut ? 'scale(1.0)' : 'scale(1.0)',
            filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))',
            transition: dragState.isAnimatingReturn
              ? 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.4,0,0.2,1)'
              : 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
          onTransitionEnd={(e) => {
            if (dragState.isAnimatingReturn && (e.propertyName === 'left' || e.propertyName === 'top')) {
              handleAnimationComplete();
            }
          }}
        >
          <DockItemComponent
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
    </>
    , document.body);
};
