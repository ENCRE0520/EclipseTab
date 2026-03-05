import React, { useState, useLayoutEffect, useCallback } from 'react';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { useDockData, useDockUI, useDockDrag } from '@/features/dock/context/DockContext';
import { Searcher } from '@/features/search/components/Searcher/Searcher';
import { Dock } from './Dock/Dock';
import { DockItem } from '@/shared/types';
import styles from '@/App.module.css';

interface DockLayoutContainerProps {
    onSearchEngineClick: (rect: DOMRect) => void;
    onItemEdit: (item: DockItem, rect?: DOMRect) => void;
    onItemAdd: (rect?: DOMRect | null) => void;
}

export const DockLayoutContainer: React.FC<DockLayoutContainerProps> = React.memo(({
    onSearchEngineClick,
    onItemEdit,
    onItemAdd
}) => {
    // 布局设置 (从全局拆分出来，避免变更导致 App 级别重渲染)
    const { dockPosition, openInNewTab } = useThemeData();

    // 数据层
    const {
        dockItems,
        selectedSearchEngine,
        handleItemDelete,
        handleItemsReorder,
        handleDropOnFolder,
        handleDragToFolder,
    } = useDockData();

    // UI 层
    const {
        isEditMode,
        setIsEditMode,
        setOpenFolderId,
        setFolderAnchor,
    } = useDockUI();

    // 拖拽层
    const { draggingItem, setDraggingItem } = useDockDrag();

    const [dockWidth, setDockWidth] = useState<number | null>(null);

    // ============================================================================
    // 响应式缩放: 当窗口宽度接近容器宽度时，缩放底部容器
    // ============================================================================
    const SCALE_PADDING = 48; // 左右各留 24px 边距
    const MIN_SCALE = 0.5; // 最小缩放比例

    const [containerScale, setContainerScale] = useState(1);

    useLayoutEffect(() => {
        let rafId: number;
        const calculateScale = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const windowWidth = window.innerWidth;
                // 使用实际的 dockWidth 作为阈值基准，如果还没有测量到则使用默认值 640
                const containerWidth = dockWidth ?? 640;
                const scaleThreshold = containerWidth + SCALE_PADDING;

                if (windowWidth >= scaleThreshold) {
                    setContainerScale(1);
                } else {
                    // 计算缩放比例: 窗口宽度 / 阈值宽度
                    const scale = Math.max(MIN_SCALE, windowWidth / scaleThreshold);
                    setContainerScale(scale);
                }
            });
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => {
            window.removeEventListener('resize', calculateScale);
            cancelAnimationFrame(rafId);
        };
    }, [dockWidth]);

    const handleItemClick = useCallback((item: DockItem, rect?: DOMRect) => {
        if (item.type === 'folder') {
            setOpenFolderId(item.id);
            setFolderAnchor(rect ?? null);
        } else if (item.url) {
            window.open(item.url, openInNewTab ? '_blank' : '_self');
        }
    }, [setOpenFolderId, setFolderAnchor, openInNewTab]);

    const handleHoverOpenFolder = useCallback((_item: DockItem, folder: DockItem) => {
        if (folder.type === 'folder') {
            setOpenFolderId(folder.id);
        }
    }, [setOpenFolderId]);

    const handleSearch = useCallback((query: string) => {
        if (selectedSearchEngine.id === 'default') {
            // @ts-ignore
            if (typeof chrome !== 'undefined' && chrome.search && chrome.search.query) {
                // @ts-ignore
                chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
                return;
            }
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, openInNewTab ? '_blank' : '_self');
            return;
        }

        const searchUrl = `${selectedSearchEngine.url}${encodeURIComponent(query)}`;
        window.open(searchUrl, openInNewTab ? '_blank' : '_self');
    }, [selectedSearchEngine, openInNewTab]);

    return (
        <div
            className={dockPosition === 'center' ? styles.containerCenter : styles.container}
            data-ui-zone="bottom"
            style={containerScale < 1 ? {
                transform: dockPosition === 'center'
                    ? `translate(-50%, -50%) scale(${containerScale})`
                    : `translate(-50%, -100%) scale(${containerScale})`,
                transformOrigin: dockPosition === 'center' ? 'center center' : 'bottom center',
            } : undefined}
        >
            <Searcher
                searchEngine={selectedSearchEngine}
                onSearch={handleSearch}
                onSearchEngineClick={onSearchEngineClick}
                openInNewTab={openInNewTab}
                containerStyle={dockWidth ? { width: `${dockWidth}px` } : undefined}
            />
            <Dock
                items={dockItems}
                isEditMode={isEditMode}
                onItemClick={handleItemClick}
                onItemEdit={onItemEdit}
                onItemDelete={handleItemDelete}
                onItemAdd={onItemAdd}
                onItemsReorder={handleItemsReorder}
                onDropToFolder={handleDropOnFolder}
                onDragToOpenFolder={handleDragToFolder}
                onHoverOpenFolder={handleHoverOpenFolder}
                onLongPressEdit={() => setIsEditMode(true)}
                onWidthChange={(w) => setDockWidth(w)}
                onDragStart={(item) => setDraggingItem(item)}
                onDragEnd={() => setDraggingItem(null)}
                externalDragItem={draggingItem}
            />
        </div>
    );
});
