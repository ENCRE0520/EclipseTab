import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DockItem, SearchEngine } from '../types';
import { storage } from '../utils/storage';
import { DEFAULT_SEARCH_ENGINE } from '../constants/searchEngines';
import { generateFolderIcon, fetchIcon } from '../utils/iconFetcher';

// ============================================================================
// 数据层 Context (低频变化)
// ============================================================================

interface DockDataContextType {
    dockItems: DockItem[];
    selectedSearchEngine: SearchEngine;
    setDockItems: React.Dispatch<React.SetStateAction<DockItem[]>>;
    setSelectedSearchEngine: (engine: SearchEngine) => void;
    handleItemSave: (data: Partial<DockItem>, editingItem: DockItem | null) => void;
    handleItemsReorder: (items: DockItem[]) => void;
    handleItemDelete: (item: DockItem) => void;
    handleFolderItemsReorder: (folderId: string, items: DockItem[]) => void;
    handleFolderItemDelete: (folderId: string, item: DockItem) => void;
    handleDragFromFolder: (item: DockItem, mousePosition: { x: number; y: number }) => void;
    handleDragToFolder: (item: DockItem) => void;
    handleDropOnFolder: (dragItem: DockItem, targetFolder: DockItem) => void;
}

const DockDataContext = createContext<DockDataContextType | undefined>(undefined);

// ============================================================================
// UI 层 Context (中频变化)
// ============================================================================

interface DockUIContextType {
    isEditMode: boolean;
    openFolderId: string | null;
    folderAnchor: DOMRect | null;
    setIsEditMode: (value: boolean) => void;
    setOpenFolderId: (id: string | null) => void;
    setFolderAnchor: (rect: DOMRect | null) => void;
}

const DockUIContext = createContext<DockUIContextType | undefined>(undefined);

// ============================================================================
// Drag Context (频繁变化/拖拽相关)
// ============================================================================

interface DockDragContextType {
    draggingItem: DockItem | null;
    setDraggingItem: (item: DockItem | null) => void;
}

const DockDragContext = createContext<DockDragContextType | undefined>(undefined);

// ============================================================================
// 组合 Context (用于需要同时访问数据和 UI 的场景)
// ============================================================================

interface DockContextType extends DockDataContextType, DockUIContextType, DockDragContextType {
    handleItemClick: (item: DockItem, rect?: DOMRect) => void;
    handleItemEdit: (item: DockItem, rect?: DOMRect) => void;
    handleHoverOpenFolder: (item: DockItem, folder: DockItem) => void;
    openFolder: DockItem | undefined;
}

// ============================================================================
// Provider 实现
// ============================================================================

export const DockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 数据状态 (低频变化)
    const [dockItems, setDockItems] = useState<DockItem[]>([]);
    const [selectedSearchEngine, setSelectedSearchEngineState] = useState<SearchEngine>(DEFAULT_SEARCH_ENGINE);

    // UI 状态 (中频变化)
    const [isEditMode, setIsEditModeState] = useState(false);
    const [openFolderId, setOpenFolderIdState] = useState<string | null>(null);
    const [folderAnchor, setFolderAnchor] = useState<DOMRect | null>(null);
    const [draggingItem, setDraggingItem] = useState<DockItem | null>(null);

    // 加载数据
    useEffect(() => {
        const savedItems = storage.getDockItems();
        if (savedItems.length > 0) {
            setDockItems(savedItems);
        } else {
            // 默认常用网站
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
            setSelectedSearchEngineState(savedEngine);
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

    // Helper function to check and dissolve folder if needed
    const checkAndDissolveFolderIfNeeded = useCallback((folderId: string, updatedItems: DockItem[]): DockItem[] => {
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
            newItems[folderIndex] = remainingItem;
            return newItems;
        }

        return updatedItems;
    }, []);

    // ========================================================================
    // UI 操作 (中频)
    // ========================================================================

    const setIsEditMode = useCallback((value: boolean) => {
        setIsEditModeState(value);
    }, []);

    const setSelectedSearchEngine = useCallback((engine: SearchEngine) => {
        setSelectedSearchEngineState(engine);
    }, []);

    const setOpenFolderId = useCallback((id: string | null) => {
        setOpenFolderIdState(id);
        if (!id) {
            setFolderAnchor(null);
        }
    }, []);

    // ========================================================================
    // 数据操作 (低频)
    // ========================================================================

    const handleItemDelete = useCallback((item: DockItem) => {
        if (window.confirm(`确定要删除 "${item.name}" 吗？${item.type === 'folder' ? '文件夹内的所有内容也将被删除。' : ''}`)) {
            setDockItems(prev => {
                const newItems = prev.filter((i) => i.id !== item.id);
                return newItems;
            });
            if (openFolderId === item.id) {
                setOpenFolderIdState(null);
            }
        }
    }, [openFolderId]);

    const handleItemSave = useCallback((data: Partial<DockItem>, editingItem: DockItem | null) => {
        if (editingItem) {
            const updateItemRecursively = (items: DockItem[]): DockItem[] => {
                return items.map((item) => {
                    if (item.id === editingItem.id) {
                        return { ...item, ...data };
                    }
                    if (item.type === 'folder' && item.items) {
                        return {
                            ...item,
                            items: updateItemRecursively(item.items),
                        };
                    }
                    return item;
                });
            };

            setDockItems(prev => updateItemRecursively(prev));
        } else {
            const newItem: DockItem = {
                id: `item-${Date.now()}`,
                name: data.name || '',
                url: data.url,
                icon: data.icon,
                type: 'app',
            };
            setDockItems(prev => [...prev, newItem]);
        }
    }, []);

    const handleItemsReorder = useCallback((items: DockItem[]) => {
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
    }, []);

    const handleFolderItemsReorder = useCallback((folderId: string, items: DockItem[]) => {
        setDockItems(prev => prev.map((item) => {
            if (item.id === folderId && item.type === 'folder') {
                return {
                    ...item,
                    items,
                    icon: generateFolderIcon(items),
                };
            }
            return item;
        }));
    }, []);

    const handleFolderItemDelete = useCallback((folderId: string, item: DockItem) => {
        setDockItems(prev => {
            const folder = prev.find((i) => i.id === folderId);
            if (folder && folder.type === 'folder' && folder.items) {
                const newItems = folder.items.filter((i) => i.id !== item.id);

                let newDockItems = prev.map((i) => {
                    if (i.id === folderId) {
                        return {
                            ...i,
                            items: newItems,
                            icon: generateFolderIcon(newItems),
                        };
                    }
                    return i;
                });

                newDockItems = checkAndDissolveFolderIfNeeded(folderId, newDockItems);

                const dissolvedFolder = newDockItems.find(i => i.id === folderId);
                if (!dissolvedFolder || dissolvedFolder.type !== 'folder') {
                    setOpenFolderIdState(null);
                }

                return newDockItems;
            }
            return prev;
        });
    }, [checkAndDissolveFolderIfNeeded]);

    const handleDragFromFolder = useCallback((item: DockItem, mousePosition: { x: number; y: number }) => {
        if (!openFolderId) return;

        setDockItems(prev => {
            const folder = prev.find(i => i.id === openFolderId);
            if (!folder || folder.type !== 'folder' || !folder.items) return prev;

            const newFolderItems = folder.items.filter(i => i.id !== item.id);

            let newDockItems = prev.map(i => {
                if (i.id === openFolderId) {
                    return {
                        ...i,
                        items: newFolderItems,
                        icon: newFolderItems.length > 0 ? generateFolderIcon(newFolderItems) : undefined,
                    };
                }
                return i;
            });

            const updatedDockItems = checkAndDissolveFolderIfNeeded(openFolderId, newDockItems);

            const folderAfter = updatedDockItems.find(i => i.id === openFolderId);
            if (!folderAfter || folderAfter.type !== 'folder') {
                setOpenFolderIdState(null);
            }

            const dockElement = document.querySelector('[data-dock-container="true"]');
            if (!dockElement) {
                const finalItems = [...updatedDockItems];
                const existingIdx = finalItems.findIndex(i => i.id === item.id);
                if (existingIdx !== -1) finalItems.splice(existingIdx, 1);
                finalItems.push(item);
                return finalItems;
            }

            const dockItemElements = Array.from(dockElement.querySelectorAll('[data-dock-item-wrapper="true"]'));
            let insertIndex = updatedDockItems.length;

            for (let i = 0; i < dockItemElements.length; i++) {
                const rect = dockItemElements[i].getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;

                if (mousePosition.x < centerX) {
                    insertIndex = i;
                    break;
                }
            }

            let finalItems = updatedDockItems.filter(i => i.id !== item.id);
            insertIndex = Math.max(0, Math.min(insertIndex, finalItems.length));
            finalItems.splice(insertIndex, 0, item);

            return finalItems;
        });
    }, [openFolderId, checkAndDissolveFolderIfNeeded]);

    const handleDragToFolder = useCallback((item: DockItem) => {
        if (!openFolderId || item.type === 'folder') return;

        setDockItems(prev => {
            const folder = prev.find(i => i.id === openFolderId);
            if (!folder || folder.type !== 'folder') return prev;

            const newFolderItems = [...(folder.items || []), item];

            return prev.map(i => {
                if (i.id === openFolderId) {
                    return {
                        ...i,
                        items: newFolderItems,
                        icon: generateFolderIcon(newFolderItems),
                    };
                }
                return i;
            }).filter(i => i.id !== item.id);
        });
    }, [openFolderId]);

    const handleDropOnFolder = useCallback((dragItem: DockItem, targetFolder: DockItem) => {
        if (targetFolder.type !== 'folder') return;

        let itemsToAdd: DockItem[] = [];
        if (dragItem.type === 'folder' && dragItem.items) {
            itemsToAdd = dragItem.items;
        } else {
            itemsToAdd = [dragItem];
        }

        setDockItems(prev => {
            return prev.map(item => {
                if (item.id === targetFolder.id) {
                    const mergedItems = [...(item.items || []), ...itemsToAdd];
                    return {
                        ...item,
                        items: mergedItems,
                        icon: generateFolderIcon(mergedItems),
                    };
                }
                return item;
            }).filter(item => item.id !== dragItem.id);
        });
    }, []);

    // ========================================================================
    // Context Values (使用 useMemo 避免不必要的 Re-render)
    // ========================================================================

    const dataValue: DockDataContextType = useMemo(() => ({
        dockItems,
        selectedSearchEngine,
        setDockItems,
        setSelectedSearchEngine,
        handleItemSave,
        handleItemsReorder,
        handleItemDelete,
        handleFolderItemsReorder,
        handleFolderItemDelete,
        handleDragFromFolder,
        handleDragToFolder,
        handleDropOnFolder,
    }), [
        dockItems,
        selectedSearchEngine,
        handleItemSave,
        handleItemsReorder,
        handleItemDelete,
        handleFolderItemsReorder,
        handleFolderItemDelete,
        handleDragFromFolder,
        handleDragToFolder,
        handleDropOnFolder,
    ]);

    const uiValue: DockUIContextType = useMemo(() => ({
        isEditMode,
        openFolderId,
        folderAnchor,
        setIsEditMode,
        setOpenFolderId,
        setFolderAnchor,
    }), [
        isEditMode,
        openFolderId,
        folderAnchor,
        setIsEditMode,
        setOpenFolderId,
    ]);

    const dragValue: DockDragContextType = useMemo(() => ({
        draggingItem,
        setDraggingItem,
    }), [draggingItem]);

    return (
        <DockDataContext.Provider value={dataValue}>
            <DockUIContext.Provider value={uiValue}>
                <DockDragContext.Provider value={dragValue}>
                    {children}
                </DockDragContext.Provider>
            </DockUIContext.Provider>
        </DockDataContext.Provider>
    );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取 Dock 数据状态 (低频变化)
 * 用于需要访问 dockItems、searchEngine 等数据的组件
 */
export const useDockData = () => {
    const context = useContext(DockDataContext);
    if (context === undefined) {
        throw new Error('useDockData must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取 Dock UI 状态 (中频变化)
 * 用于需要访问 isEditMode、openFolderId 等 UI 状态的组件
 */
export const useDockUI = () => {
    const context = useContext(DockUIContext);
    if (context === undefined) {
        throw new Error('useDockUI must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取 Dock 拖拽状态
 */
export const useDockDrag = () => {
    const context = useContext(DockDragContext);
    if (context === undefined) {
        throw new Error('useDockDrag must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取完整的 Dock 上下文 (兼容层)
 * 组合 DockDataContext 和 DockUIContext，提供完整功能
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useDockData 或 useDockUI
 */
export const useDock = (): DockContextType => {
    const dataContext = useContext(DockDataContext);
    const uiContext = useContext(DockUIContext);
    const dragContext = useContext(DockDragContext);

    if (dataContext === undefined || uiContext === undefined || dragContext === undefined) {
        throw new Error('useDock must be used within a DockProvider');
    }

    // 组合操作 - 需要同时访问数据和 UI
    const handleItemClick = useCallback((item: DockItem, rect?: DOMRect) => {
        if (item.type === 'folder') {
            uiContext.setOpenFolderId(item.id);
            uiContext.setFolderAnchor(rect ?? null);
        } else if (item.url) {
            window.open(item.url, '_blank');
        }
    }, [uiContext]);

    const handleItemEdit = useCallback((_item: DockItem, _rect?: DOMRect) => {
        // 这个函数在 App 中处理
    }, []);

    const handleHoverOpenFolder = useCallback((_item: DockItem, folder: DockItem) => {
        if (folder.type === 'folder') {
            uiContext.setOpenFolderId(folder.id);
        }
    }, [uiContext]);

    const openFolder = useMemo(() =>
        dataContext.dockItems.find((item) => item.id === uiContext.openFolderId),
        [dataContext.dockItems, uiContext.openFolderId]
    );

    return {
        ...dataContext,
        ...uiContext,
        ...dragContext,
        handleItemClick,
        handleItemEdit,
        handleHoverOpenFolder,
        openFolder,
    };
};
