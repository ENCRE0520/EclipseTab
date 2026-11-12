import React, { useRef, useState, useEffect } from 'react';
import { DockItem as DockItemType } from '@/shared/types';
import { Tooltip } from '@/shared/components/Tooltip/Tooltip';
import { isFaviconRef, isRemoteIconUrl, getDomainFromRef, resolveIconUrl, resolveRemoteIconUrl, getCachedIconUrlSync, getCachedRemoteIconUrlSync } from '@/features/dock/utils/iconCache';
import { generateStableTextIcon } from '@/features/dock/utils/iconFetcher';
import styles from './DockItem.module.css';
import editIcon from '@/assets/icons/edit.svg';

// 占位符 SVG（半透明圆角矩形）
const PLACEHOLDER_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg==';

/**
 * 解析图标：如果是 favicon: 引用则异步加载，否则直接使用
 * 优化：如果图标已在内存缓存中，同步返回，避免占位符闪烁
 * 离线且没有本地副本时，返回固定配色的文字图标兜底
 */
function useResolvedIcon(icon: string | undefined, name?: string, url?: string): { src: string; fallback: string } {
  const fallbackText = name || url || '';
  const fallback = React.useMemo(
    () => (fallbackText ? generateStableTextIcon(fallbackText, url || fallbackText) : PLACEHOLDER_ICON),
    [fallbackText, url]
  );

  const [resolved, setResolved] = useState<string>(() => {
    if (!icon) return navigator.onLine ? PLACEHOLDER_ICON : fallback;
    if (isFaviconRef(icon)) {
      const cached = getCachedIconUrlSync(getDomainFromRef(icon));
      return cached || (navigator.onLine ? PLACEHOLDER_ICON : fallback);
    }
    if (isRemoteIconUrl(icon)) {
      return getCachedRemoteIconUrlSync(icon) || icon;
    }
    return icon; // data URL 或其他直接可用的 URL
  });

  useEffect(() => {
    if (!icon) {
      setResolved(navigator.onLine ? PLACEHOLDER_ICON : fallback);
      return;
    }
    if (!isFaviconRef(icon)) {
      if (isRemoteIconUrl(icon)) {
        const cached = getCachedRemoteIconUrlSync(icon);
        if (cached) {
          setResolved(cached);
          return;
        }

        let cancelled = false;
        resolveRemoteIconUrl(icon).then(url => {
          if (!cancelled) {
            setResolved(url || fallback);
          }
        });

        return () => { cancelled = true; };
      }
      setResolved(icon);
      return;
    }

    // 再次检查缓存（可能在上次渲染后已缓存）
    const domain = getDomainFromRef(icon);
    const cached = getCachedIconUrlSync(domain);
    if (cached) {
      setResolved(cached);
      return;
    }

    let cancelled = false;
    resolveIconUrl(domain).then(url => {
      if (!cancelled) {
        setResolved(url || fallback);
      }
    });

    return () => { cancelled = true; };
  }, [icon, fallback]);

  return { src: resolved, fallback };
}

const ResolvedIconImage: React.FC<{
  icon?: string;
  name?: string;
  url?: string;
  alt: string;
  className?: string;
}> = ({ icon, name, url, alt, className }) => {
  const { src, fallback } = useResolvedIcon(icon, name, url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      src={failed ? fallback : src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

interface DockItemProps {
  item: DockItemType;
  isEditMode: boolean;
  onClick: (rect?: DOMRect) => void;
  onEdit: (rect?: DOMRect) => void;
  onDelete: () => void;
  isDragging?: boolean;
  staggerIndex?: number;
  isDropTarget?: boolean;
  isMergeTarget?: boolean;
  onLongPress?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
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
    if (!isDragging && !isEditMode) {
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
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    setShowTooltip(false);
  };

  const handleMouseDownInternal = (e: React.MouseEvent) => {
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      onContextMenu(e.clientX, e.clientY, rect);
    }
  };

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
        {isEditMode && item.type !== 'folder' && (
          <div className={`${styles.editOverlay} ${isHovered ? styles.editOverlayVisible : ''}`}>
            <img src={editIcon} alt="edit" className={styles.editIcon} />
          </div>
        )}
        {item.type === 'folder' ? (
          <FolderIconGrid items={item.items} />
        ) : (
          <ResolvedIconImage
            icon={item.icon}
            name={item.name}
            url={item.url}
            alt={item.name}
            className={`${styles.icon} ${item.iconSmall ? styles.iconSmall : ''}`}
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

/**
 * 文件夹图标网格：子项图标也需要异步解析
 */
const FolderIconGrid: React.FC<{ items?: DockItemType[] }> = ({ items }) => {
  return (
    <div className={styles.folderIcon}>
      {items && items.slice(0, 4).map((subItem) => (
        <FolderIconTile key={subItem.id} subItem={subItem} />
      ))}
    </div>
  );
};

const FolderIconTile: React.FC<{ subItem: DockItemType }> = ({ subItem }) => {
  return (
    <div className={styles.folderIconTile}>
      <ResolvedIconImage
        icon={subItem.icon}
        name={subItem.name}
        url={subItem.url}
        alt={subItem.name}
      />
    </div>
  );
};

// React.memo 自定义比较函数
const arePropsEqual = (prev: DockItemProps, next: DockItemProps) => {
  if (
    prev.item.id !== next.item.id ||
    prev.item.name !== next.item.name ||
    prev.item.icon !== next.item.icon ||
    prev.item.iconSmall !== next.item.iconSmall ||
    prev.isEditMode !== next.isEditMode ||
    prev.isDragging !== next.isDragging ||
    prev.isDropTarget !== next.isDropTarget ||
    prev.isMergeTarget !== next.isMergeTarget ||
    prev.staggerIndex !== next.staggerIndex
  ) {
    return false;
  }

  const prevItems = prev.item.items;
  const nextItems = next.item.items;

  if (prevItems?.length !== nextItems?.length) {
    return false;
  }

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
};

export const DockItem = React.memo(DockItemComponent, arePropsEqual);
