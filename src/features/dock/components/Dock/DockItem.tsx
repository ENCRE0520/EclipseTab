import React, { useRef, useState } from 'react';
import { DockItem as DockItemType } from '@/shared/types';
import { Tooltip } from '@/shared/components/Tooltip/Tooltip';
import styles from './DockItem.module.css';
import editIcon from '@/assets/icons/edit.svg';

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
  // ... (现有状态)
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

    // 在编辑模式下，点击文件夹应打开文件夹视图，而不是编辑模态框
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

    // 启动提示文本定时器
    if (!isDragging && !isEditMode) { // 拖拽中或编辑模式下不显示提示文本
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

    // 清除提示文本定时器并隐藏提示文本
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    setShowTooltip(false);
  };

  const handleMouseDownInternal = (e: React.MouseEvent) => {
    // 点击/鼠标按下时隐藏提示文本
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

  // 处理右键上下文菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      onContextMenu(e.clientX, e.clientY, rect);
    }
  };

  // 根据项目 ID 生成稳定的随机延迟，以使抖动动画去同步
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
        {/* 编辑模式悬停叠加层 - 始终渲染以便进行淡入淡出动画 */}
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

// 为 React.memo 自定义比较函数
const arePropsEqual = (prev: DockItemProps, next: DockItemProps) => {
  // 基础属性比较
  if (
    prev.item.id !== next.item.id ||
    prev.item.name !== next.item.name ||
    prev.item.icon !== next.item.icon ||
    prev.isEditMode !== next.isEditMode ||
    prev.isDragging !== next.isDragging ||
    prev.isDropTarget !== next.isDropTarget ||
    prev.isMergeTarget !== next.isMergeTarget ||
    prev.staggerIndex !== next.staggerIndex
  ) {
    return false;
  }

  // ============================================================================
  // 性能优化: 改进文件夹子项比较逻辑
  // 不仅检查长度，还检查子项 ID 和图标以确保文件夹图标正确更新
  // ============================================================================
  const prevItems = prev.item.items;
  const nextItems = next.item.items;

  if (prevItems?.length !== nextItems?.length) {
    return false;
  }

  // 检查前4个子项的 ID 和图标 (文件夹图标只显示前4个)
  if (prevItems && nextItems) {
    const checkCount = Math.min(4, prevItems.length);
    for (let i = 0; i < checkCount; i++) {
      if (prevItems[i].id !== nextItems[i].id ||
        prevItems[i].icon !== nextItems[i].icon) {
        return false;
      }
    }
  }

  return true;
  // 忽略函数属性 (onClick, onEdit 等)，因为它们在父组件的每次渲染中都会重新创建
  // 但底层逻辑依赖于我们上面检查过的相同项目数据。
};

export const DockItem = React.memo(DockItemComponent, arePropsEqual);
