
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

// Consants for Grid Layout
const COLUMNS = 4;
const ITEM_WIDTH = 64;
const ITEM_HEIGHT = 64;
const GAP = 8;
const CELL_WIDTH = ITEM_WIDTH + GAP;
const CELL_HEIGHT = ITEM_HEIGHT + GAP;

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
    dragElementRef, // For Portal
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

  const items = folder.items || [];

  // ==================================================================================
  // Snake-like Fluid Grid Layout Calculation
  // ==================================================================================

  // Calculate effective layout indices for render
  const layoutPositions = useMemo(() => {
    const positions: { [key: string]: { x: number; y: number; visualIndex: number } } = {};

    // Internal state
    const srcIndex = dragState.originalIndex; // -1 if not dragging internally
    const dstIndex = placeholderIndex;        // null if no target slot
    const isInternal = dragState.isDragging && srcIndex !== -1;


    items.forEach((item, index) => {
      // Step 1: Determine "Flow Index" (Layout Order)
      // If internal drag, the source item is conceptually removed from the flow.
      let flowIndex = index;

      if (isInternal) {
        if (index === srcIndex) {
          // The source item is "floating". 
          // We can either position it at the placeholder for symmetry or just hide it.
          // Let's give it the dstIndex so if it *were* to be shown, it shows there.
          // But wait, if we give it dstIndex, it might overlap with the item currently pushed there.
          // We'll calculate it, but "isBeingDragged" class usually hides it.
          flowIndex = -1; // Special marker
        } else if (index > srcIndex) {
          // Items after source shift backward to fill the gap
          flowIndex = index - 1;
        }
      }

      // Step 2: Determine "Visual Index" (Screen Position)
      // Apply the gap for the placeholder
      let visualIndex = flowIndex;

      if (flowIndex !== -1 && dstIndex !== null) {
        // If this item is at or after the target gap, shift it forward
        if (flowIndex >= dstIndex) {
          visualIndex = flowIndex + 1;
        }
      }

      // Special handling for the dragged source item to let it "fly" towards target if needed (e.g. drop animation)
      // But drag hook handles return animation via separate ref/portal usually.
      // If we drop, isAnimatingReturn is true.
      // However, here we just calculating static layout.
      if (flowIndex === -1 && dstIndex !== null) {
        // If we really wanted to position the hidden source somewhere, it would be dstIndex
        visualIndex = dstIndex;
      }

      // Step 3: Map to Pixels
      const col = visualIndex % COLUMNS;
      const row = Math.floor(visualIndex / COLUMNS);
      const x = col * CELL_WIDTH;
      const y = row * CELL_HEIGHT;

      positions[item.id] = { x, y, visualIndex };
    });

    return positions;
  }, [items, dragState.originalIndex, dragState.isDragging, placeholderIndex, externalDragItem]);

  // Calculate Container Dimensions
  // Total visible slots = Items count (internal drag: N, external: N+1)
  // Actually, if internal drag: N items. Source is hidden (count-1), Gap is adding (count+1-1 = N). Total N.
  // If external drag: N items. Gap is adding. Total N+1.
  const visualCount = externalDragItem ? items.length + 1 : items.length;
  // But wait, if internal drag, we have N items in the list. Source is 1.
  // We effectively show N visual slots (the source is hidden, but the placeholder takes a spot).
  // So count is items.length.

  const totalRows = Math.ceil(Math.max(visualCount, 1) / COLUMNS);
  const gridHeight = totalRows * CELL_HEIGHT - GAP; // Remove last gap



  // ==================================================================================
  // Render
  // ==================================================================================

  // Animate entry
  useEffect(() => {
    if (containerRef.current) {
      scaleFadeIn(containerRef.current);
    }
  }, []);

  // Close logic
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

  if (items.length === 0 && !externalDragItem) {
    return null;
  }

  // Positioning
  // Logic from original FolderView: Center logic using estimated width.
  // We can reuse `gridWidth` calculated above? Or standard max width.
  const displayWidth = Math.min(items.length, COLUMNS) * 64 + (Math.max(Math.min(items.length, COLUMNS) - 1, 0) * 8) + 16;
  const halfWidth = displayWidth / 2;

  // Wait, `gridWidth` we calculated includes gaps properly.
  // Let's use `gridWidth` + padding (16) for wrapper centering?
  // But `items.length` changes visually during drag? No, layout positions change.
  // The container width should theoretically stabilize to "Max columns used".

  return createPortal(
    <>
      <div
        className={styles.popupWrapper}
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
          data-folder-view="true"
          style={{
            // 宽度: Padding(8*2) + Width
            // If items < COLUMNS, width adapts.
            // But we want to avoid jitter.
            width: (Math.min(visualCount, COLUMNS) * CELL_WIDTH - GAP) + 16,
            height: 'auto', // Controlled by grid height + padding
            transition: 'width 200ms cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          <div
            ref={gridRef}
            className={styles.grid}
            style={{
              // Absolute Layout Container needs explicit height
              height: gridHeight,
              width: '100%' // matches parent
            }}
          >
            {items.map((item, index) => {
              const pos = layoutPositions[item.id] || { x: 0, y: 0, visualIndex: 0 };
              const isDraggingSource = (dragState.isDragging || dragState.isAnimatingReturn) && dragState.item?.id === item.id;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`${styles.gridItem} ${isDraggingSource ? styles.isBeingDragged : ''}`}
                  style={{
                    width: ITEM_WIDTH,
                    height: ITEM_HEIGHT,
                    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                  }}
                >
                  <DockItemComponent
                    item={item}
                    isEditMode={isEditMode}
                    onClick={() => onItemClick(item)}
                    onEdit={(rect) => onItemEdit(item, rect)}
                    onDelete={() => onItemDelete(item)}
                    isDragging={isDraggingSource}
                    staggerIndex={index} // Maybe use visualIndex for stagger delay?
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
              ? 'transform 0.2s cubic-bezier(0.4,0,0.2,1), left 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              : 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
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
