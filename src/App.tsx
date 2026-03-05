import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { DockItem } from './shared/types';
import { SEARCH_ENGINES } from './features/search/constants/searchEngines';
import { useDockData, useDockUI, useDockDrag } from './features/dock/context/DockContext';
import { DockLayoutContainer } from './features/dock/components/DockLayoutContainer';
import { Editor } from './features/editor/components/Editor/Editor';
import { Settings } from './features/settings/components/Settings/Settings';
import { Background } from './features/theme/components/Background/Background';
import { ZenShelf } from './features/shelf/components/ZenShelf';
import styles from './App.module.css';

// ============================================================================
// 性能优化: 懒加载非核心组件，减少初始包大小
// ============================================================================
const FolderView = lazy(() => import('./features/dock/components/FolderView/FolderView').then(m => ({ default: m.FolderView })));
const AddEditModal = lazy(() => import('./features/dock/components/Modal/AddEditModal').then(m => ({ default: m.AddEditModal })));
const SearchEngineModal = lazy(() => import('./features/search/components/Modal/SearchEngineModal').then(m => ({ default: m.SearchEngineModal })));
const SettingsModal = lazy(() => import('./features/settings/components/Modal/SettingsModal').then(m => ({ default: m.SettingsModal })));

function App() {
  // ============================================================================
  // 性能优化: 使用细粒度 Context Hooks 减少不必要的重渲染
  // ============================================================================

  // 数据层 (低频变化) - 仅在 dockItems/searchEngine 变化时重渲染
  const {
    dockItems,
    selectedSearchEngine,
    setSelectedSearchEngine,
    handleItemSave,
    handleFolderItemsReorder,
    handleFolderItemDelete,
    handleDragFromFolder,
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

  // 计算派生状态
  const openFolder = useMemo(
    () => dockItems.find((item) => item.id === openFolderId),
    [dockItems, openFolderId]
  );

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

  // 跟踪拖拽来源，用于区分内部拖拽和外部拖拽
  const [draggingFromFolder, setDraggingFromFolder] = useState(false);

  // 用于检测悬停区域的 Refs
  const settingsAreaRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // 跟踪哪些 Modal 已经被打开过，以便保持挂载从而播放退出动画
  const mountedModals = useRef({
    addEdit: false,
    searchEngine: false,
    settings: false,
  });

  if (isAddEditModalOpen) mountedModals.current.addEdit = true;
  if (isSearchEngineModalOpen) mountedModals.current.searchEngine = true;
  if (isSettingsModalOpen) mountedModals.current.settings = true;

  // ============================================================================
  // 性能优化: 使用 RAF 节流 + 状态变化检测，减少 mousemove 期间的重渲染
  // ============================================================================
  const lastSettingsState = useRef(false);
  const lastEditorState = useRef(false);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 取消上一帧的待处理更新
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        // 检查设置区域 (左上角)
        if (settingsAreaRef.current) {
          const rect = settingsAreaRef.current.getBoundingClientRect();
          const inSettingsZone = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;
          // 仅在状态变化时更新
          if (inSettingsZone !== lastSettingsState.current) {
            lastSettingsState.current = inSettingsZone;
            setShowSettings(inSettingsZone);
          }
        }
        // 检查编辑器区域 (右上角)
        if (editorAreaRef.current) {
          const rect = editorAreaRef.current.getBoundingClientRect();
          const inEditorZone = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;
          // 仅在状态变化时更新
          if (inEditorZone !== lastEditorState.current) {
            lastEditorState.current = inEditorZone;
            setShowEditor(inEditorZone);
          }
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);



  const handleItemEdit = useCallback((item: DockItem, rect?: DOMRect) => {
    setEditingItem(item);
    setAddIconAnchor(rect ?? null);
    setIsAddEditModalOpen(true);
  }, []);

  const handleItemAdd = useCallback(() => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  }, []);

  const handleModalSave = useCallback((data: Partial<DockItem>) => {
    handleItemSave(data, editingItem);
    setIsAddEditModalOpen(false);
    setEditingItem(null);
  }, [handleItemSave, editingItem]);

  const handleFolderItemClick = useCallback((item: DockItem) => {
    if (item.url) {
      window.open(item.url, '_blank'); // Temporary fallback, should be handled by DockLayoutContainer or openInNewTab value passed down
    }
  }, []);

  const handleFolderItemEdit = useCallback((item: DockItem, rect?: DOMRect) => {
    handleItemEdit(item, rect);
  }, []);

  // 根据 CSS 变量更新 SVG 滤镜的描边颜色
  useEffect(() => {
    const updateStrokeColor = () => {
      const strokeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-sticker-stroke').trim();

      const floodElement = document.querySelector('#text-sticker-stroke feFlood');
      if (floodElement && strokeColor) {
        floodElement.setAttribute('flood-color', strokeColor);
      }
    };

    // 组件挂载时更新
    updateStrokeColor();

    // 当主题变化时更新 (观察 data-theme 属性变化)
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
            {/* 步骤3: 使用 feComponentTransfer 锐化边缘, 将模糊重新变成实心硬边缘 */}
            <feComponentTransfer in="blurred" result="rounded">
              <feFuncA type="discrete" tableValues="0 1" />
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
        // 直接使用传入的位置，不需要为了抵消 SettingsModal 的内部偏移而做运算
        setSettingsAnchor({ left: pos.x, top: pos.y, right: pos.x, bottom: pos.y, width: 0, height: 0, x: pos.x, y: pos.y, toJSON: () => ({}) } as DOMRect);
        setIsSettingsModalOpen(true);
      }} />
      <DockLayoutContainer
        onSearchEngineClick={(rect) => {
          setSearchEngineAnchor(rect);
          setIsSearchEngineModalOpen(true);
        }}
        onItemEdit={handleItemEdit}
        onItemAdd={(rect) => {
          setAddIconAnchor(rect ?? null);
          handleItemAdd();
        }}
      />
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
      {mountedModals.current.addEdit && (
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
      {mountedModals.current.searchEngine && (
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
      {mountedModals.current.settings && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            // 显式添加偏移量：ZenShelf 右键菜单不需要偏移（anchorPosition 已经是鼠标位置），
            // 但如果是从左上角按钮触发（settingsAnchor 来自 getBoundingClientRect），我们需要手动加上偏移量（+60px 或按钮高度+间距）
            // 这里我们简单判断：如果是从按钮触发（通常 y < 100），加上偏移；如果是 ZenShelf 右键（通常 y > 100），不加偏移
            anchorPosition={settingsAnchor ? {
              x: settingsAnchor.left,
              y: settingsAnchor.top < 100 ? settingsAnchor.top + 60 : settingsAnchor.top
            } : { x: 0, y: 0 }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
