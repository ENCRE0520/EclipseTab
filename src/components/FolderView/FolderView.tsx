
import { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DockItem } from '../../types';
import { DockItem as DockItemComponent } from '../Dock/DockItem';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import { useFolderDragAndDrop } from '../../hooks/useFolderDragAndDrop';
import {
  FOLDER_COLUMNS,
  FOLDER_ITEM_WIDTH,
  FOLDER_ITEM_HEIGHT,
  FOLDER_GAP,
  FOLDER_CELL_SIZE,
  EASE_SPRING,
  EASE_SMOOTH,
  SQUEEZE_ANIMATION_DURATION,
  RETURN_ANIMATION_DURATION,
  FADE_DURATION,
} from '../../constants/layout';
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
  /** 占位符状态变化回调 - 用于同步到 Context */
  onFolderPlaceholderChange?: (active: boolean) => void;
}

// Layout Constants (imported from shared constants)
const COLUMNS = FOLDER_COLUMNS;
const ITEM_WIDTH = FOLDER_ITEM_WIDTH;
const ITEM_HEIGHT = FOLDER_ITEM_HEIGHT;
const GAP = FOLDER_GAP;
const CELL_WIDTH = FOLDER_CELL_SIZE;
const CELL_HEIGHT = FOLDER_CELL_SIZE;

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
  onFolderPlaceholderChange,
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
    onFolderPlaceholderChange,
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
    // 关键修复：isAnimatingReturn 期间也要保持挤压效果
    const isInternal = (dragState.isDragging || dragState.isAnimatingReturn) && srcIndex !== -1;


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
  }, [items, dragState.originalIndex, dragState.isDragging, dragState.isAnimatingReturn, placeholderIndex, externalDragItem]);

  // Calculate Container Dimensions
  // Total visible slots = Items count (internal drag: N, external: N+1)
  // Actually, if internal drag: N items. Source is hidden (count-1), Gap is adding (count+1-1 = N). Total N.
  // If external drag: N items. Gap is adding. Total N+1.
  const visualCount = externalDragItem ? items.length + 1 : items.length;

  // 宽度计算专用：内部拖拽时不扩展宽度（保持 items.length）
  // 只有外部拖入时才扩展宽度（items.length + 1）
  const widthItemCount = externalDragItem ? items.length + 1 : items.length;

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
            // 内部拖拽时使用 items.length，不扩展宽度
            // 外部拖入时使用 items.length + 1，扩展宽度
            width: (Math.min(widthItemCount, COLUMNS) * CELL_WIDTH - GAP) + 16,
            height: 'auto', // Controlled by grid height + padding
            transition: `width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SPRING}`,
            // 交互安全锁：动画期间禁用交互，防止误操作
            pointerEvents: dragState.isAnimatingReturn ? 'none' : 'auto'
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
              // 归位动画：使用 iOS 风格阻尼曲线
              ? `left ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, top ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, transform ${SQUEEZE_ANIMATION_DURATION}ms ease-out`
              : `transform ${FADE_DURATION}ms ${EASE_SMOOTH}`,
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
