import React, { useRef, useState } from 'react';
import { DockItem as DockItemType } from '../../types';
import styles from './DockItem.module.css';

interface DockItemProps {
  item: DockItemType;
  isEditMode: boolean;
  onClick: (rect?: DOMRect) => void;
  onEdit: (rect?: DOMRect) => void;
  onDelete: () => void;
  isDragging?: boolean;
  staggerIndex?: number;
  isDropTarget?: boolean;
  onLongPress?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const DockItem: React.FC<DockItemProps> = ({
  item,
  isEditMode,
  onClick,
  onEdit,
  onDelete,
  isDragging = false,
  staggerIndex,
  isDropTarget = false,
  onLongPress,
  onMouseDown,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
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

  return (
    <div
      className={`${styles.dockItem} ${isEditMode ? styles.editMode : ''} ${isDragging ? styles.dragging : ''} ${isDropTarget ? styles.dropTarget : ''}`}
      onClick={handleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        if (isEditMode) {
          setShowDeleteButton(true);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowDeleteButton(false);
        if (pressTimer) {
          clearTimeout(pressTimer);
          setPressTimer(null);
        }
      }}
      ref={rootRef}
      // draggable={isEditMode} // Removed
      // onDragStart removed
      // onDragEnd removed
      onMouseDown={(e) => {
        if (onMouseDown) onMouseDown(e);
        isLongPressTriggered.current = false;
        if (onLongPress && !isEditMode) {
          const t = window.setTimeout(() => {
            isLongPressTriggered.current = true;
            onLongPress();
          }, 600);
          setPressTimer(t);
        }
      }}
      onMouseUp={() => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          setPressTimer(null);
        }
      }}
      style={isEditMode && staggerIndex !== undefined ? { animationDelay: `${staggerIndex * 0.04}s` } : undefined}
    >
      <div className={`${styles.iconContainer} ${item.type !== 'folder' ? styles.nonFolderBg : ''} ${isHovered && !isEditMode ? styles.hovered : ''}`}>
        {item.type === 'folder' ? (
          <div className={styles.folderIcon}>
            {item.items && item.items.slice(0, 4).map((subItem, index) => (
              <div key={index} className={styles.folderIconTile}>
                {subItem.icon ? (
                  <img src={subItem.icon} alt={subItem.name} />
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
          />
        )}
      </div>
      {isEditMode && showDeleteButton && (
        <button
          className={styles.deleteButton}
          onClick={handleDeleteClick}
          aria-label="删除"
        >
          ×
        </button>
      )}
    </div>
  );
};

