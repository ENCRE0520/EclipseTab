import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
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
  // 跟踪拖拽来源，用于区分内部拖拽和外部拖拽
  const [draggingFromFolder, setDraggingFromFolder] = useState(false);

  const handleSearch = (query: string) => {
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

  return (
    <div className={styles.app}>
      <Background />
      <ZenShelf onOpenSettings={(pos) => {
        // Use negative y offset to counteract the +60 in SettingsModal
        setSettingsAnchor({ left: pos.x, top: pos.y - 60, right: pos.x, bottom: pos.y - 60, width: 0, height: 0, x: pos.x, y: pos.y - 60, toJSON: () => ({}) } as DOMRect);
        setIsSettingsModalOpen(true);
      }} />
      <div className={dockPosition === 'center' ? styles.containerCenter : styles.container}>
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
        className={styles.settingsArea}
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
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
        className={styles.editorArea}
        onMouseEnter={() => setShowEditor(true)}
        onMouseLeave={() => setShowEditor(false)}
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
      {isSearchEngineModalOpen && (
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
      )}
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
