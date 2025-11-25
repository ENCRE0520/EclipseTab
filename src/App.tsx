import { useState, useEffect } from 'react';
import { DockItem, SearchEngine } from './types';
import { storage } from './utils/storage';
import { SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE } from './constants/searchEngines';
import { generateFolderIcon, fetchIcon } from './utils/iconFetcher';
import { Searcher } from './components/Searcher/Searcher';
import { Dock } from './components/Dock/Dock';
import { Editor } from './components/Editor/Editor';
import { Settings } from './components/Settings/Settings';
import { FolderView } from './components/FolderView/FolderView';
import { AddEditModal } from './components/Modal/AddEditModal';
import { SearchEngineModal } from './components/Modal/SearchEngineModal';
import { SettingsModal } from './components/Modal/SettingsModal.tsx';
import styles from './App.module.css';

function App() {
  // Theme context - theme management now handled by SettingsModal via context
  const [dockItems, setDockItems] = useState<DockItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSearchEngine, setSelectedSearchEngine] = useState<SearchEngine>(DEFAULT_SEARCH_ENGINE);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderAnchor, setFolderAnchor] = useState<DOMRect | null>(null);
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
  const [draggingItem, setDraggingItem] = useState<DockItem | null>(null);

  // 加载数据
  useEffect(() => {
    const savedItems = storage.getDockItems();
    if (savedItems.length > 0) {
      setDockItems(savedItems);
    } else {
      // 默认常用网站
      // 默认配置
      const defaults: DockItem[] = [
        { id: 'bilibili', name: 'Bilibili', url: 'https://www.bilibili.com/', type: 'app' },
        { id: 'xiaohongshu', name: '小红书', url: 'https://www.xiaohongshu.com/', type: 'app' },
        { id: 'notion', name: 'Notion', url: 'https://www.notion.so/', type: 'app' },
        { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', type: 'app' },
        {
          id: 'folder-design',
          name: 'Design',
          type: 'folder',
          items: [
            { id: 'behance', name: 'Behance', url: 'https://www.behance.net/', type: 'app' },
            { id: 'pinterest', name: 'Pinterest', url: 'https://pinterest.com/', type: 'app' },
            { id: 'iconfont', name: 'Iconfont', url: 'https://www.iconfont.cn/', type: 'app' },
            { id: 'dribbble', name: 'Dribble', url: 'https://dribbble.com', type: 'app' },
            { id: 'x', name: 'X', url: 'https://x.com/', type: 'app' },
          ]
        },
        {
          id: 'folder-ai',
          name: 'AI',
          type: 'folder',
          items: [
            { id: 'ai-studio', name: 'AI studio', url: 'https://aistudio.google.com/prompts/new_chat', type: 'app' },
            { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', type: 'app' },
            { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', type: 'app' },
          ]
        },
        {
          id: 'folder-tools',
          name: 'Tools',
          type: 'folder',
          items: [
            { id: 'keep', name: 'Keep', url: 'https://keep.google.com/', type: 'app' },
            { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/', type: 'app' },
            { id: 'github', name: 'Github', url: 'https://github.com/', type: 'app' },
          ]
        },
      ];

      // Generate icons for folders
      defaults.forEach(item => {
        if (item.type === 'folder' && item.items) {
          item.icon = generateFolderIcon(item.items);
        }
      });
      setDockItems(defaults);

      // Asynchronously fetch icons for default items
      const fetchAllIcons = async () => {
        const itemsWithIcons = await Promise.all(defaults.map(async (item) => {
          if (item.type === 'folder' && item.items) {
            const updatedSubItems = await Promise.all(item.items.map(async (subItem) => {
              if (subItem.url) {
                try {
                  const icon = await fetchIcon(subItem.url);
                  return { ...subItem, icon };
                } catch (e) {
                  console.error(`Failed to fetch icon for ${subItem.name}`, e);
                  return subItem;
                }
              }
              return subItem;
            }));
            return {
              ...item,
              items: updatedSubItems,
              icon: generateFolderIcon(updatedSubItems)
            };
          } else if (item.url) {
            try {
              const icon = await fetchIcon(item.url);
              return { ...item, icon };
            } catch (e) {
              console.error(`Failed to fetch icon for ${item.name}`, e);
              return item;
            }
          }
          return item;
        }));
        setDockItems(itemsWithIcons);
      };

      fetchAllIcons();
    }

    const savedEngine = storage.getSearchEngine();
    if (savedEngine) {
      setSelectedSearchEngine(savedEngine);
    }
  }, []);

  // 保存数据
  useEffect(() => {
    if (dockItems.length > 0) {
      storage.saveDockItems(dockItems);
    }
  }, [dockItems]);

  useEffect(() => {
    storage.saveSearchEngine(selectedSearchEngine);
  }, [selectedSearchEngine]);

  const handleSearch = (query: string) => {
    const searchUrl = `${selectedSearchEngine.url}${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  };

  const handleItemClick = (item: DockItem, rect?: DOMRect) => {
    if (item.type === 'folder') {
      setOpenFolderId(item.id);
      setFolderAnchor(rect ?? null);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleItemEdit = (item: DockItem, rect?: DOMRect) => {
    setEditingItem(item);
    setAddIconAnchor(rect ?? null);
    setIsAddEditModalOpen(true);
  };

  const handleItemDelete = (item: DockItem) => {
    if (window.confirm(`确定要删除 "${item.name}" 吗？${item.type === 'folder' ? '文件夹内的所有内容也将被删除。' : ''}`)) {
      const newItems = dockItems.filter((i) => i.id !== item.id);
      setDockItems(newItems);
      if (openFolderId === item.id) {
        setOpenFolderId(null);
      }
    }
  };

  const handleItemAdd = () => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  };

  const handleItemSave = (data: Partial<DockItem>) => {
    if (editingItem) {
      // 编辑现有项目
      const updateItemRecursively = (items: DockItem[]): DockItem[] => {
        return items.map((item) => {
          // Check if this is the item we're editing
          if (item.id === editingItem.id) {
            return { ...item, ...data };
          }
          // If it's a folder, check inside the folder
          if (item.type === 'folder' && item.items) {
            return {
              ...item,
              items: updateItemRecursively(item.items),
            };
          }
          return item;
        });
      };

      const newItems = updateItemRecursively(dockItems);
      setDockItems(newItems);
    } else {
      // 添加新项目
      const newItem: DockItem = {
        id: `item-${Date.now()}`,
        name: data.name || '',
        url: data.url,
        icon: data.icon,
        type: 'app',
      };
      setDockItems([...dockItems, newItem]);
    }
    setIsAddEditModalOpen(false);
    setEditingItem(null);
  };

  const handleItemsReorder = (items: DockItem[]) => {
    // 更新文件夹图标
    const updatedItems = items.map((item) => {
      if (item.type === 'folder' && item.items && item.items.length > 0) {
        return {
          ...item,
          icon: generateFolderIcon(item.items),
        };
      }
      return item;
    });
    setDockItems(updatedItems);
  };

  const handleFolderItemsReorder = (folderId: string) => (items: DockItem[]) => {
    const newDockItems = dockItems.map((item) => {
      if (item.id === folderId && item.type === 'folder') {
        return {
          ...item,
          items,
          icon: generateFolderIcon(items),
        };
      }
      return item;
    });
    setDockItems(newDockItems);
  };

  const handleFolderItemClick = () => (item: DockItem) => {
    if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleFolderItemEdit = () => (item: DockItem, rect?: DOMRect) => {
    handleItemEdit(item, rect);
  };

  const handleFolderItemDelete = (folderId: string) => (item: DockItem) => {
    const folder = dockItems.find((i) => i.id === folderId);
    if (folder && folder.type === 'folder' && folder.items) {
      const newItems = folder.items.filter((i) => i.id !== item.id);

      // Update items and check for dissolution
      let newDockItems = dockItems.map((i) => {
        if (i.id === folderId) {
          return {
            ...i,
            items: newItems,
            icon: generateFolderIcon(newItems),
          };
        }
        return i;
      });

      // Auto-dissolve folder if only 1 or 0 items remain
      newDockItems = checkAndDissolveFolderIfNeeded(folderId, newDockItems);
      setDockItems(newDockItems);

      // Close folder view if it was dissolved
      const dissolvedFolder = newDockItems.find(i => i.id === folderId);
      if (!dissolvedFolder || dissolvedFolder.type !== 'folder') {
        setOpenFolderId(null);
      }
    }
  };

  // Helper function to check and dissolve folder if needed
  const checkAndDissolveFolderIfNeeded = (folderId: string, updatedItems: DockItem[]): DockItem[] => {
    const folder = updatedItems.find(i => i.id === folderId);
    if (!folder || folder.type !== 'folder' || !folder.items) return updatedItems;

    const folderIndex = updatedItems.findIndex(i => i.id === folderId);
    if (folderIndex === -1) return updatedItems;

    // If folder has 0 items, remove it completely
    if (folder.items.length === 0) {
      return updatedItems.filter(i => i.id !== folderId);
    }

    // If folder has exactly 1 item, dissolve and replace with that item
    if (folder.items.length === 1) {
      const remainingItem = folder.items[0];
      const newItems = [...updatedItems];
      newItems[folderIndex] = remainingItem; // Replace folder with the single remaining item
      return newItems;
    }

    return updatedItems;
  };

  // Handle dragging item from folder to dock
  const handleDragFromFolder = (item: DockItem, mousePosition: { x: number; y: number }) => {
    console.log('[App] handleDragFromFolder called:', { item: item.name, mousePosition, openFolderId });
    if (!openFolderId) return;

    const folder = dockItems.find(i => i.id === openFolderId);
    if (!folder || folder.type !== 'folder' || !folder.items) return;

    // Remove item from folder
    const newFolderItems = folder.items.filter(i => i.id !== item.id);

    // Update dock items, removing item from folder
    let newDockItems = dockItems.map(i => {
      if (i.id === openFolderId) {
        return {
          ...i,
          items: newFolderItems,
          icon: newFolderItems.length > 0 ? generateFolderIcon(newFolderItems) : undefined,
        };
      }
      return i;
    });

    // Check and dissolve folder if needed (0 or 1 items remaining)
    const updatedDockItems = checkAndDissolveFolderIfNeeded(openFolderId, newDockItems);

    // If the folder was dissolved (item count changed or item type changed), close the folder view
    const folderAfter = updatedDockItems.find(i => i.id === openFolderId);
    if (!folderAfter || folderAfter.type !== 'folder') {
      setOpenFolderId(null);
    }

    // Calculate insertion position based on mouse X coordinate
    // Get all dock item elements to determine insertion point
    const dockElement = document.querySelector('[data-dock-container="true"]');
    if (!dockElement) {
      // Fallback: append to end
      // Note: updatedDockItems might not contain the folder anymore if it dissolved
      // We need to insert 'item' into updatedDockItems
      const finalItems = [...updatedDockItems];
      // Remove the item if it somehow exists (shouldn't)
      const existingIdx = finalItems.findIndex(i => i.id === item.id);
      if (existingIdx !== -1) finalItems.splice(existingIdx, 1);

      finalItems.push(item);
      setDockItems(finalItems);
      return;
    }

    const dockItemElements = Array.from(dockElement.querySelectorAll('[data-dock-item-wrapper="true"]'));
    let insertIndex = updatedDockItems.length; // Default to end

    // Find the best insertion position based on mousePosition.x
    for (let i = 0; i < dockItemElements.length; i++) {
      const rect = dockItemElements[i].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      if (mousePosition.x < centerX) {
        insertIndex = i;
        break;
      }
    }

    // Insert at the calculated position
    // First ensure item is not in the list (it shouldn't be)
    let finalItems = updatedDockItems.filter(i => i.id !== item.id);

    // Adjust insertIndex if necessary (e.g. if we removed something before it)
    insertIndex = Math.max(0, Math.min(insertIndex, finalItems.length));
    finalItems.splice(insertIndex, 0, item);

    console.log('[App] handleDragFromFolder updating dockItems:', { insertIndex, finalItemsCount: finalItems.length });
    setDockItems(finalItems);
  };

  const openFolder = dockItems.find((item) => item.id === openFolderId);

  // Handle dragging item from dock to open folder view
  const handleDragToFolder = (item: DockItem) => {
    if (!openFolderId || item.type === 'folder') return; // Don't allow dragging folders into folders

    const folder = dockItems.find(i => i.id === openFolderId);
    if (!folder || folder.type !== 'folder') return;

    // Add item to folder
    const newFolderItems = [...(folder.items || []), item];

    // Update dock items: remove from dock, add to folder
    const newDockItems = dockItems.map(i => {
      if (i.id === openFolderId) {
        return {
          ...i,
          items: newFolderItems,
          icon: generateFolderIcon(newFolderItems),
        };
      }
      return i;
    }).filter(i => i.id !== item.id); // Remove the item from dock

    setDockItems(newDockItems);
  };

  // Handle dropping an item (app or folder) onto a folder in the Dock
  const handleDropOnFolder = (dragItem: DockItem, targetFolder: DockItem) => {
    if (targetFolder.type !== 'folder') return;

    // If dragging a folder onto a folder, merge items
    let itemsToAdd: DockItem[] = [];
    if (dragItem.type === 'folder' && dragItem.items) {
      itemsToAdd = dragItem.items;
    } else {
      itemsToAdd = [dragItem];
    }

    const newDockItems = dockItems.map(item => {
      // Add items to target folder
      if (item.id === targetFolder.id) {
        const mergedItems = [...(item.items || []), ...itemsToAdd];
        return {
          ...item,
          items: mergedItems,
          icon: generateFolderIcon(mergedItems),
        };
      }
      return item;
    }).filter(item => item.id !== dragItem.id); // Remove dragged item from root

    setDockItems(newDockItems);
  };

  const handleHoverOpenFolder = (_item: DockItem, folder: DockItem) => {
    if (folder.type === 'folder') {
      setOpenFolderId(folder.id);
    }
  };

  return (
    <div className={styles.app}>
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
          onItemDelete={handleFolderItemDelete(openFolder.id)}
          onClose={() => { setOpenFolderId(null); setFolderAnchor(null); }}
          onItemsReorder={handleFolderItemsReorder(openFolder.id)}
          onItemDragOut={handleDragFromFolder}
          anchorRect={folderAnchor}
          onDragStart={(item) => setDraggingItem(item)}
          onDragEnd={() => setDraggingItem(null)}
          externalDragItem={draggingItem}
        />
      )}
      <AddEditModal
        isOpen={isAddEditModalOpen}
        item={editingItem}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleItemSave}
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
