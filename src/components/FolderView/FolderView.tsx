import React, { useEffect, useRef } from 'react';
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
    placeholderIndex,
    isDraggingOut,
    itemRefs,
    handleMouseDown,
    handleAnimationComplete,
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

  // Animate entry
  useEffect(() => {
    if (containerRef.current) {
      scaleFadeIn(containerRef.current);
    }
  }, []);

  // Close when clicking outside, but ignore clicks inside the Dock and Modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks inside the Dock (to allow dragging from Dock to Folder)
      // Ignore clicks inside any modal (to allow editing items in the modal)
      // Also ignore if we are currently dragging an item (to prevent closing while dragging)
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

  if (!folder.items || folder.items.length === 0) {
    return null;
  }

  // Layout calculations
  const columns = Math.min(4, folder.items.length);
  const rows = Math.ceil(folder.items.length / columns);
  const popupWidth = columns * 64 + (columns - 1) * 8 + 16;
  const popupHeight = rows * 64 + (rows - 1) * 8 + 16;
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
          style={{ width: `${popupWidth}px`, height: `${popupHeight}px` }}
        >
          <div
            ref={gridRef}
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${columns}, 64px)`,
              gridAutoRows: '64px',
              gridAutoFlow: 'row dense',
              justifyContent: 'start',
              alignContent: 'start',
            }}
          >
            {placeholderIndex === 0 && (
              <div className={styles.placeholder} />
            )}
            {folder.items.map((item, index) => {
              const isDragging = dragState.item?.id === item.id;
              return (
                <React.Fragment key={item.id}>
                  <div
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    style={{
                      display: isDragging ? 'none' : undefined,
                      width: 64,
                      height: 64,
                      opacity: isDragging ? 0 : 1,
                      transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <DockItemComponent
                      item={item}
                      isEditMode={isEditMode}
                      onClick={() => onItemClick(item)}
                      onEdit={(rect) => onItemEdit(item, rect)}
                      onDelete={() => onItemDelete(item)}
                      isDragging={isDragging}
                      staggerIndex={index}
                      onMouseDown={(e) => handleMouseDown(e, item, index)}
                    />
                  </div>
                  {placeholderIndex === index + 1 && (
                    <div className={styles.placeholder} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {/* Drag preview overlay */}
      {(dragState.isDragging || dragState.isAnimatingReturn) && dragState.item && createPortal(
        <div
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
            transform: isDraggingOut ? 'scale(1.15)' : 'scale(1.0)',
            filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))',
            transition: dragState.isAnimatingReturn
              ? 'left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.4,0,0.2,1)'
              : 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
          onTransitionEnd={(e) => {
            // Only trigger completion when left/top transition ends (return animation)
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
