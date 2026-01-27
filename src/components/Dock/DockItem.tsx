import React, { useRef, useState } from 'react';
import { DockItem as DockItemType } from '../../types';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './DockItem.module.css';
import editIcon from '../../assets/icons/edit.svg';

interface DockItemProps {
  item: DockItemType;
  isEditMode: boolean;
  onClick: (rect?: DOMRect) => void;
  onEdit: (rect?: DOMRect) => void;
  onDelete: () => void;
  isDragging?: boolean;
  staggerIndex?: number;
  isDropTarget?: boolean;
  /** 是否为合并目标（触发脉冲动画） */
  isMergeTarget?: boolean;
  onLongPress?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  /** 右键菜单回调，传递位置和元素rect */
  onContextMenu?: (x: number, y: number, rect: DOMRect) => void;
}

const DockItemComponent: React.FC<DockItemProps> = ({
  item,
  isEditMode,
  onClick,
  onEdit,
  onDelete,
  isDragging = false,
  staggerIndex: _staggerIndex,
  isDropTarget = false,
  isMergeTarget = false,
  onLongPress,
  onMouseDown,
  onContextMenu,
}) => {
  // ... (existing state)
  const [isHovered, setIsHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  const isLongPressTriggered = useRef(false);

  const handleClick = () => {
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }

    const rect = rootRef.current?.getBoundingClientRect();

    // In edit mode, folders should open the folder view, not the edit modal
    if (isEditMode && item.type !== 'folder') {
      onEdit(rect);
    } else {
      onClick(rect);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<number | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);

    // Start tooltip timer
    if (!isDragging && !isEditMode) { // Don't show tooltip while dragging or in edit mode
      tooltipTimer.current = window.setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }

    // Clear tooltip timer and hide tooltip
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    setShowTooltip(false);
  };

  const handleMouseDownInternal = (e: React.MouseEvent) => {
    // Hide tooltip on click/mousedown
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    setShowTooltip(false);

    if (onMouseDown) onMouseDown(e);
    isLongPressTriggered.current = false;
    if (onLongPress && !isEditMode) {
      const t = window.setTimeout(() => {
        isLongPressTriggered.current = true;
        onLongPress();
      }, 600);
      setPressTimer(t);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      onContextMenu(e.clientX, e.clientY, rect);
    }
  };

  // Generate a stable random delay based on item ID to desynchronize shake animation
  const animationDelay = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = ((hash << 5) - hash) + item.id.charCodeAt(i);
      hash |= 0;
    }
    return `${-(Math.abs(hash) % 1000)}ms`;
  }, [item.id]);

  return (
    <div
      className={`${styles.dockItem} ${isEditMode ? styles.editMode : ''} ${isDragging ? styles.dragging : ''} ${isDropTarget ? styles.dropTarget : ''} ${isMergeTarget ? styles.pulse : ''}`}
      style={{ animationDelay }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={rootRef}
      onMouseDown={handleMouseDownInternal}
      onMouseUp={() => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          setPressTimer(null);
        }
      }}
    >
      <div className={`${styles.iconContainer} ${item.type !== 'folder' ? styles.nonFolderBg : ''} ${isHovered && !isEditMode ? styles.hovered : ''}`}>
        {/* Edit mode hover overlay - always rendered for fade animation */}
        {isEditMode && item.type !== 'folder' && (
          <div className={`${styles.editOverlay} ${isHovered ? styles.editOverlayVisible : ''}`}>
            <img src={editIcon} alt="edit" className={styles.editIcon} />
          </div>
        )}
        {item.type === 'folder' ? (
          <div className={styles.folderIcon}>
            {item.items && item.items.slice(0, 4).map((subItem) => (
              <div key={subItem.id} className={styles.folderIconTile}>
                {subItem.icon ? (
                  <img src={subItem.icon} alt={subItem.name} loading="lazy" decoding="async" />
                ) : (
                  <div className={styles.fallbackIcon} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <img
            src={item.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg=='}
            alt={item.name}
            className={styles.icon}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      {isEditMode && (
        <button
          className={styles.deleteButton}
          onClick={handleDeleteClick}
          aria-label="删除"
        >
          ×
        </button>
      )}
      {showTooltip && (
        <Tooltip text={item.name} targetRef={rootRef} />
      )}
    </div>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prev: DockItemProps, next: DockItemProps) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.icon === next.item.icon &&
    // Check items length for folder icon updates
    (prev.item.items?.length === next.item.items?.length) &&
    prev.isEditMode === next.isEditMode &&
    prev.isDragging === next.isDragging &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isMergeTarget === next.isMergeTarget && // Check pulse state
    prev.staggerIndex === next.staggerIndex
    // Ignore function props (onClick, onEdit, etc.) as they are recreated on every render of parent
    // but the underlying logic relies on the same item data which we checked above.
  );
};

export const DockItem = React.memo(DockItemComponent, arePropsEqual);
