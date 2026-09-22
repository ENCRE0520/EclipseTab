
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DockItem } from '@/shared/types';
import { useDockDrag } from '@/features/dock/context/DockContext';
import { DockItem as DockItemComponent } from '../Dock/DockItem';
import { DockContextMenu } from '../Dock/DockContextMenu';
import { DragPreview } from '@/features/dock/components/DragPreview';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import { useFolderDragAndDrop } from '@/features/dock/hooks/useFolderDragAndDrop';
import {
  FOLDER_COLUMNS,
  FOLDER_PADDING,
} from '@/shared/constants/layout';
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
  // 跨组件拖拽反馈
  externalDragItem?: DockItem | null;
  onDragStart?: (item: DockItem) => void;
  onDragEnd?: () => void;
  /** 切换编辑模式 */
  onToggleEditMode?: () => void;
}

// 布局常量 (从共享常量导入)
const COLUMNS = FOLDER_COLUMNS;

const getIconSize = () => {
  if (typeof window === 'undefined') return 64;
  const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--icon-size'));
  return Number.isFinite(size) ? size : 64;
};

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
  onToggleEditMode,
}) => {
  const { dragTarget } = useDockDrag();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const iconSize = getIconSize();
  const gap = iconSize / 8;
  const padding = iconSize / 8 || FOLDER_PADDING;
  const cellSize = iconSize + gap;

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: DockItem;
    rect: DOMRect;
  } | null>(null);

  const handleItemContextMenu = useCallback((item: DockItem, x: number, y: number, rect: DOMRect) => {
    setContextMenu({ x, y, item, rect });
  }, []);

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
  // 蛇形流体网格布局计算
  // ==================================================================================

  // Calculate effective layout indices for render
  const layoutPositions = useMemo(() => {
    const positions: { [key: string]: { x: number; y: number; visualIndex: number } } = {};

    // Internal state
    const srcIndex = dragState.originalIndex; // -1 if not dragging internally
    const dstIndex = dragTarget === 'folder' ? placeholderIndex : null;        // null if no target slot
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
      const x = col * cellSize;
      const y = row * cellSize;

      positions[item.id] = { x, y, visualIndex };
    });

    return positions;
  }, [items, dragState.originalIndex, dragState.isDragging, dragState.isAnimatingReturn, placeholderIndex, externalDragItem, cellSize, dragTarget]);

  // A source leaves the flow; only the active destination adds one slot.
  const internalDrag = dragState.isDragging || dragState.isAnimatingReturn;
  const hasPlaceholder = dragTarget === 'folder' && (internalDrag || !!externalDragItem);
  const visualCount = items.length - (internalDrag ? 1 : 0) + (hasPlaceholder ? 1 : 0);
  const widthItemCount = Math.max(visualCount, 1);

  const totalRows = Math.ceil(Math.max(visualCount, 1) / COLUMNS);
  const gridHeight = totalRows * cellSize - gap; // Remove last gap



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


  // Positioning
  // We use the same formula as the container width to ensure perfectly centered positioning.
  const displayWidth = (Math.min(widthItemCount, COLUMNS) * cellSize - gap) + (padding * 2) + 2;
  const halfWidth = displayWidth / 2;

  // ============================================================================
  // 性能优化: 使用 useMemo 缓存内联样式对象
  // ============================================================================
  const popupWrapperStyle = useMemo(() => ({
    left: `${Math.min(
      Math.max(Math.round((anchorRect?.left ?? 0) + (anchorRect?.width ?? 0) / 2),
        halfWidth
      ), window.innerWidth - halfWidth)}px`,
    top: `${Math.round((anchorRect?.top ?? 0) - 24)}px`,
  }), [anchorRect?.left, anchorRect?.width, anchorRect?.top, halfWidth]);

  const containerStyle = useMemo(() => ({
    width: (Math.min(widthItemCount, COLUMNS) * cellSize - gap) + (padding * 2) + 2,
    height: 'auto' as const,
    padding,
    pointerEvents: (dragState.isAnimatingReturn ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
  }), [widthItemCount, cellSize, gap, padding, dragState.isAnimatingReturn]);

  // Hit testing uses the destination size, even on the frame before expansion.
  // This keeps the preview and mouseup index identical while the panel animates.
  const dropCount = items.length + (externalDragItem ? 1 : 0);
  const dropWidth = Math.min(Math.max(dropCount, 1), COLUMNS) * cellSize - gap + padding * 2 + 2;
  const dropHeight = Math.ceil(Math.max(dropCount, 1) / COLUMNS) * cellSize - gap;
  const dropCenter = Math.min(Math.max(Math.round((anchorRect?.left ?? 0) + (anchorRect?.width ?? 0) / 2), dropWidth / 2), window.innerWidth - dropWidth / 2);

  const gridStyle = useMemo(() => ({
    height: gridHeight,
    width: '100%' as const,
  }), [gridHeight]);

  if (items.length === 0 && !externalDragItem) return null;

  return createPortal(
    <>
      <div
        className={styles.popupWrapper}
        style={popupWrapperStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          className={`${styles.container} ${styles.popover}`}
          data-folder-view="true"
          style={containerStyle}
        >
          <div
            ref={gridRef}
            className={styles.grid}
            data-folder-grid="true"
            data-target-left={dropCenter - dropWidth / 2 + padding + 1}
            data-target-top={parseFloat(popupWrapperStyle.top) - dropHeight - padding - 1}
            style={gridStyle}
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
                    width: iconSize,
                    height: iconSize,
                    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                    transition: dragState.isDragging || dragState.isAnimatingReturn || externalDragItem ? undefined : 'none',
                  }}
                >
                  <DockItemComponent
                    item={item}
                    isEditMode={isEditMode}
                    onClick={() => onItemClick(item)}
                    onEdit={(rect) => onItemEdit(item, rect)}
                    onDelete={() => onItemDelete(item)}
                    isDragging={isDraggingSource}
                    staggerIndex={index}
                    onMouseDown={(e) => handleMouseDown(e, item, index)}
                    onContextMenu={(x, y, rect) => handleItemContextMenu(item, x, y, rect)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Drag preview overlay */}
      <DragPreview
        isActive={dragState.isDragging || dragState.isAnimatingReturn}
        item={dragState.item}
        position={dragState.currentPosition}
        isAnimatingReturn={dragState.isAnimatingReturn}
        isEditMode={isEditMode}
        dragElementRef={dragElementRef}
        isDraggingOut={isDraggingOut}
      />
      {/* 右键菜单 */}
      {contextMenu && (
        <DockContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          isEditMode={isEditMode}
          onClose={() => setContextMenu(null)}
          onEdit={() => onItemEdit(contextMenu.item, contextMenu.rect)}
          onToggleEditMode={() => onToggleEditMode?.()}
          onDelete={() => onItemDelete(contextMenu.item)}
        />
      )}
    </>
    , document.body);
};
