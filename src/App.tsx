import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef, useLayoutEffect } from 'react';
import { DockItem } from './types';
import { SEARCH_ENGINES } from './constants/searchEngines';
import { useDockData, useDockUI, useDockDrag } from './context/DockContext';
import { useThemeData } from './context/ThemeContext';
import { Searcher } from './components/Searcher/Searcher';
import { Dock } from './components/Dock/Dock';
import { Editor } from './components/Editor/Editor';
import { Settings } from './components/Settings/Settings';
import { Background } from './components/Background/Background';
import { ZenShelf } from './components/ZenShelf';
import styles from './App.module.css';

// ============================================================================
// 性能优化: 懒加载非核心组件，减少初始包大小
// ============================================================================
const FolderView = lazy(() => import('./components/FolderView/FolderView').then(m => ({ default: m.FolderView })));
const AddEditModal = lazy(() => import('./components/Modal/AddEditModal').then(m => ({ default: m.AddEditModal })));
const SearchEngineModal = lazy(() => import('./components/Modal/SearchEngineModal').then(m => ({ default: m.SearchEngineModal })));
const SettingsModal = lazy(() => import('./components/Modal/SettingsModal').then(m => ({ default: m.SettingsModal })));

function App() {
  // ============================================================================
  // 性能优化: 使用细粒度 Context Hooks 减少不必要的重渲染
  // ============================================================================

  // 数据层 (低频变化) - 仅在 dockItems/searchEngine 变化时重渲染
  const {
    dockItems,
    selectedSearchEngine,
    setSelectedSearchEngine,
    handleItemDelete,
    handleItemSave,
    handleItemsReorder,
    handleFolderItemsReorder,
    handleFolderItemDelete,
    handleDragFromFolder,
    handleDragToFolder,
    handleDropOnFolder,
  } = useDockData();

  // UI 层 (中频变化) - 仅在 editMode/openFolder 变化时重渲染
  const {
    isEditMode,
    openFolderId,
    folderAnchor,
    setIsEditMode,
    setOpenFolderId,
    setFolderAnchor,
  } = useDockUI();

  // 拖拽层 (高频变化) - 仅在拖拽状态变化时重渲染
  const { draggingItem, setDraggingItem, setFolderPlaceholderActive } = useDockDrag();

  // 布局设置
  const { dockPosition } = useThemeData();

  // 计算派生状态
  const openFolder = useMemo(
    () => dockItems.find((item) => item.id === openFolderId),
    [dockItems, openFolderId]
  );

  // 组合操作 - 需要同时访问数据和 UI
  const handleItemClick = useCallback((item: DockItem, rect?: DOMRect) => {
    if (item.type === 'folder') {
      setOpenFolderId(item.id);
      setFolderAnchor(rect ?? null);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  }, [setOpenFolderId, setFolderAnchor]);

  const handleHoverOpenFolder = useCallback((_item: DockItem, folder: DockItem) => {
    if (folder.type === 'folder') {
      setOpenFolderId(folder.id);
    }
  }, [setOpenFolderId]);

  // 本地 UI 状态 (Modal 相关)
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSearchEngineModalOpen, setIsSearchEngineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchEngineAnchor, setSearchEngineAnchor] = useState<DOMRect | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<DOMRect | null>(null);
  const [addIconAnchor, setAddIconAnchor] = useState<DOMRect | null>(null);
  const [editingItem, setEditingItem] = useState<DockItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dockWidth, setDockWidth] = useState<number | null>(null);

  // ============================================================================
  // 响应式缩放: 当窗口宽度接近容器宽度时，缩放底部容器
  // ============================================================================
  const SCALE_PADDING = 48; // 左右各留 24px 边距
  const MIN_SCALE = 0.5; // 最小缩放比例

  const [containerScale, setContainerScale] = useState(1);

  useLayoutEffect(() => {
    const calculateScale = () => {
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
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [dockWidth]);
  // 跟踪拖拽来源，用于区分内部拖拽和外部拖拽
  const [draggingFromFolder, setDraggingFromFolder] = useState(false);

  // Refs for hover zone detection
  const settingsAreaRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // Use global mousemove to detect hover on zones (allows pointer-events: none)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Check settings area (top-left)
      if (settingsAreaRef.current) {
        const rect = settingsAreaRef.current.getBoundingClientRect();
        const inSettingsZone = e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;
        setShowSettings(inSettingsZone);
      }
      // Check editor area (top-right)
      if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        const inEditorZone = e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;
        setShowEditor(inEditorZone);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSearch = (query: string) => {
    if (selectedSearchEngine.id === 'default') {
      // 使用 Chrome Search API (如果在扩展环境)
      // @ts-ignore - chrome namespace
      if (typeof chrome !== 'undefined' && chrome.search && chrome.search.query) {
        // @ts-ignore - chrome.search types
        chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
        return;
      }

      // 开发环境或 API 不可用时的回退方案 (使用 Google)
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
      return;
    }

    const searchUrl = `${selectedSearchEngine.url}${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  };

  const handleItemEdit = (item: DockItem, rect?: DOMRect) => {
    setEditingItem(item);
    setAddIconAnchor(rect ?? null);
    setIsAddEditModalOpen(true);
  };

  const handleItemAdd = () => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  };

  const handleModalSave = (data: Partial<DockItem>) => {
    handleItemSave(data, editingItem);
    setIsAddEditModalOpen(false);
    setEditingItem(null);
  };

  const handleFolderItemClick = useCallback((item: DockItem) => {
    if (item.url) {
      window.open(item.url, '_blank');
    }
  }, []);

  const handleFolderItemEdit = useCallback((item: DockItem, rect?: DOMRect) => {
    handleItemEdit(item, rect);
  }, []);

  // Update SVG filter stroke color based on CSS variable
  useEffect(() => {
    const updateStrokeColor = () => {
      const strokeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-sticker-stroke').trim();

      const floodElement = document.querySelector('#text-sticker-stroke feFlood');
      if (floodElement && strokeColor) {
        floodElement.setAttribute('flood-color', strokeColor);
      }
    };

    // Update on mount
    updateStrokeColor();

    // Update when theme changes (observe data-theme attribute)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateStrokeColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.app}>
      {/* SVG 滤镜定义 - 用于文字贴纸的平滑描边效果 */}
      <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
        <defs>
          {/* 圆角描边滤镜：使用 feMorphology dilate + 模糊 + 锐化实现圆角效果 */}
          <filter id="text-sticker-stroke" x="-25%" y="-25%" width="150%" height="150%">
            {/* 步骤1: 扩展原始图形轮廓 */}
            <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="dilated" />
            {/* 步骤2: 轻微模糊使边缘变圆滑 */}
            <feGaussianBlur in="dilated" stdDeviation="2" result="blurred" />
            {/* 步骤3: 使用 feComponentTransfer 锐化边缘,将模糊重新变成实心 */}
            <feComponentTransfer in="blurred" result="rounded">
              <feFuncA type="table" tableValues="0 0 0.5 1 1 1 1 1" />
            </feComponentTransfer>
            {/* 步骤4: 将圆角轮廓填充为 --color-sticker-stroke (动态更新) */}
            <feFlood floodColor="white" result="white" />
            <feComposite in="white" in2="rounded" operator="in" result="stroke" />
            {/* 步骤5: 将描边放在原始图形下方 */}
            <feMerge>
              <feMergeNode in="stroke" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <Background />
      <ZenShelf onOpenSettings={(pos) => {
        // Use negative y offset to counteract the +60 in SettingsModal
        setSettingsAnchor({ left: pos.x, top: pos.y - 60, right: pos.x, bottom: pos.y - 60, width: 0, height: 0, x: pos.x, y: pos.y - 60, toJSON: () => ({}) } as DOMRect);
        setIsSettingsModalOpen(true);
      }} />
      <div
        className={dockPosition === 'center' ? styles.containerCenter : styles.container}
        data-ui-zone="bottom"
        style={containerScale < 1 ? {
          transform: dockPosition === 'center'
            ? `translate(-50%, -50%) scale(${containerScale})`
            : `translateX(-50%) scale(${containerScale})`,
          transformOrigin: dockPosition === 'center' ? 'center center' : 'bottom center',
        } : undefined}
      >
        <Searcher
          searchEngine={selectedSearchEngine}
          onSearch={handleSearch}
          onSearchEngineClick={(rect) => {
            setSearchEngineAnchor(rect);
            setIsSearchEngineModalOpen(true);
          }}
          containerStyle={dockWidth ? { width: `${dockWidth}px` } : undefined}
        />
        <Dock
          items={dockItems}
          isEditMode={isEditMode}
          onItemClick={handleItemClick}
          onItemEdit={handleItemEdit}
          onItemDelete={handleItemDelete}
          onItemAdd={(rect) => {
            setAddIconAnchor(rect ?? null);
            handleItemAdd();
          }}
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
      {/* 左上角触发热点：悬停显示设置按钮 */}
      <div
        ref={settingsAreaRef}
        className={styles.settingsArea}
        data-ui-zone="top-left"
      >
        <Settings
          visible={showSettings}
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSettingsAnchor(rect);
            setIsSettingsModalOpen(true);
          }}
        />
      </div>
      {/* 右上角触发热点：悬停显示编辑按钮 */}
      <div
        ref={editorAreaRef}
        className={styles.editorArea}
        data-ui-zone="top-right"
      >
        <Editor
          visible={showEditor || isEditMode}
          isEditMode={isEditMode}
          onClick={() => setIsEditMode(!isEditMode)}
        />
      </div>
      {openFolder && openFolder.type === 'folder' && (
        <Suspense fallback={null}>
          <FolderView
            folder={openFolder}
            isEditMode={isEditMode}
            onItemClick={handleFolderItemClick}
            onItemEdit={handleFolderItemEdit}
            onItemDelete={(item) => handleFolderItemDelete(openFolder.id, item)}
            onClose={() => { setOpenFolderId(null); setFolderAnchor(null); }}
            onItemsReorder={(items) => handleFolderItemsReorder(openFolder.id, items)}
            onItemDragOut={handleDragFromFolder}
            anchorRect={folderAnchor}
            onDragStart={(item) => { setDraggingItem(item); setDraggingFromFolder(true); }}
            onDragEnd={() => { setDraggingItem(null); setDraggingFromFolder(false); }}
            externalDragItem={draggingFromFolder ? null : draggingItem}
            onFolderPlaceholderChange={setFolderPlaceholderActive}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
          />
        </Suspense>
      )}
      {isAddEditModalOpen && (
        <Suspense fallback={null}>
          <AddEditModal
            isOpen={isAddEditModalOpen}
            item={editingItem}
            onClose={() => {
              setIsAddEditModalOpen(false);
              setEditingItem(null);
            }}
            onSave={handleModalSave}
            anchorRect={addIconAnchor}
            hideHeader
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <SearchEngineModal
          isOpen={isSearchEngineModalOpen}
          selectedEngine={selectedSearchEngine}
          engines={SEARCH_ENGINES}
          onClose={() => setIsSearchEngineModalOpen(false)}
          onSelect={setSelectedSearchEngine}
          anchorRect={searchEngineAnchor}
        />
      </Suspense>
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            anchorPosition={settingsAnchor ? { x: settingsAnchor.left, y: settingsAnchor.top } : { x: 0, y: 0 }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
