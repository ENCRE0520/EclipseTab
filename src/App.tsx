import { useState } from 'react';
import { DockItem } from './types';
import { SEARCH_ENGINES } from './constants/searchEngines';
import { useDock } from './context/DockContext';
import { Searcher } from './components/Searcher/Searcher';
import { Dock } from './components/Dock/Dock';
import { Editor } from './components/Editor/Editor';
import { Settings } from './components/Settings/Settings';
import { FolderView } from './components/FolderView/FolderView';
import { AddEditModal } from './components/Modal/AddEditModal';
import { SearchEngineModal } from './components/Modal/SearchEngineModal';
import { SettingsModal } from './components/Modal/SettingsModal.tsx';
import { Background } from './components/Background/Background';
import styles from './App.module.css';

function App() {
  // 使用 DockContext 获取状态和操作
  const {
    dockItems,
    isEditMode,
    selectedSearchEngine,
    folderAnchor,
    draggingItem,
    setIsEditMode,
    setSelectedSearchEngine,
    setOpenFolderId,
    setFolderAnchor,
    setDraggingItem,
    handleItemClick,
    handleItemDelete,
    handleItemSave,
    handleItemsReorder,
    handleFolderItemsReorder,
    handleFolderItemDelete,
    handleDragFromFolder,
    handleDragToFolder,
    handleDropOnFolder,
    handleHoverOpenFolder,
    openFolder,
    setFolderPlaceholderActive, // Add this
  } = useDock();

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

  const handleFolderItemClick = () => (item: DockItem) => {
    if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleFolderItemEdit = () => (item: DockItem, rect?: DOMRect) => {
    handleItemEdit(item, rect);
  };

  return (
    <div className={styles.app}>
      <Background />
      <div className={styles.container}>
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
        <FolderView
          folder={openFolder}
          isEditMode={isEditMode}
          onItemClick={handleFolderItemClick()}
          onItemEdit={handleFolderItemEdit()}
          onItemDelete={(item) => handleFolderItemDelete(openFolder.id, item)}
          onClose={() => { setOpenFolderId(null); setFolderAnchor(null); }}
          onItemsReorder={(items) => handleFolderItemsReorder(openFolder.id, items)}
          onItemDragOut={handleDragFromFolder}
          anchorRect={folderAnchor}
          onDragStart={(item) => { setDraggingItem(item); setDraggingFromFolder(true); }}
          onDragEnd={() => { setDraggingItem(null); setDraggingFromFolder(false); }}
          // 只有当拖拽来自 Dock 时才传递 externalDragItem，避免内部拖拽导致宽度扩展
          externalDragItem={draggingFromFolder ? null : draggingItem}
          onFolderPlaceholderChange={setFolderPlaceholderActive} // Add this
        />
      )}
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
      <SearchEngineModal
        isOpen={isSearchEngineModalOpen}
        selectedEngine={selectedSearchEngine}
        engines={SEARCH_ENGINES}
        onClose={() => setIsSearchEngineModalOpen(false)}
        onSelect={setSelectedSearchEngine}
        anchorRect={searchEngineAnchor}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        anchorPosition={settingsAnchor ? { x: settingsAnchor.left, y: settingsAnchor.top } : { x: 0, y: 0 }}
      />
    </div>
  );
}

export default App;
