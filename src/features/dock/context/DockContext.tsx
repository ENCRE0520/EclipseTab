import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DockItem, SearchEngine } from '@/shared/types';
import { storage } from '@/shared/utils/storage';
import { DEFAULT_SEARCH_ENGINE } from '@/features/search/constants/searchEngines';
import { generateFolderIcon, fetchIcon } from '@/features/dock/utils/iconFetcher';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import { useThemeData } from '@/features/theme/context/ThemeContext';

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
    /** 文件夹是否有活动的占位符 (用于跨组件拖拽检测) */
    folderPlaceholderActive: boolean;
    setFolderPlaceholderActive: (active: boolean) => void;
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
    // 从 SpacesContext 获取当前空间的 apps
    const { currentSpace, updateCurrentSpaceApps } = useSpaces();

    // 数据状态: dockItems 来自当前 Space
    const [dockItems, setDockItemsInternal] = useState<DockItem[]>(currentSpace.apps);
    const [selectedSearchEngine, setSelectedSearchEngineState] = useState<SearchEngine>(DEFAULT_SEARCH_ENGINE);

    // UI 状态 (中频变化)
    const [isEditMode, setIsEditModeState] = useState(false);
    const [openFolderId, setOpenFolderIdState] = useState<string | null>(null);
    const [folderAnchor, setFolderAnchor] = useState<DOMRect | null>(null);
    const [draggingItem, setDraggingItem] = useState<DockItem | null>(null);
    const [folderPlaceholderActive, setFolderPlaceholderActive] = useState(false);

    // 当 currentSpace 变化时同步 dockItems
    useEffect(() => {
        setDockItemsInternal(currentSpace.apps);
    }, [currentSpace.id, currentSpace.apps]);

    // 包装 setDockItems: 同时更新本地状态和 SpacesContext
    const setDockItems: React.Dispatch<React.SetStateAction<DockItem[]>> = useCallback(
        (action) => {
            setDockItemsInternal((prev) => {
                const newItems = typeof action === 'function' ? action(prev) : action;
                // 同步回 SpacesContext（异步避免渲染循环）
                setTimeout(() => updateCurrentSpaceApps(newItems), 0);
                return newItems;
            });
        },
        [updateCurrentSpaceApps]
    );

    // 初始化: 只在首次安装时加载默认常用网站
    // 注意：这个 ref 确保默认数据只加载一次，新建空间不会自动填充
    const hasLoadedDefaultsRef = React.useRef(false);

    useEffect(() => {
        // 只在首次运行且当前空间为空时初始化默认数据
        // 使用 hasLoadedDefaultsRef 确保只加载一次
        if (
            !hasLoadedDefaultsRef.current &&
            currentSpace.apps.length === 0 &&
            dockItems.length === 0 &&
            currentSpace.name === 'Main' // 只在 Main 空间为空时加载默认数据
        ) {
            hasLoadedDefaultsRef.current = true;

            // 默认常用网站 - Main 空间
            const defaults: DockItem[] = [
                { id: 'bilibili', name: 'Bilibili', url: 'https://www.bilibili.com/', type: 'app' },
                { id: 'notion', name: 'Notion', url: 'https://www.notion.so/', type: 'app' },
                { id: 'notion-calendar', name: 'NotionCalendar', url: 'https://calendar.notion.so/', type: 'app' },
                { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', type: 'app' },
                { id: 'jike', name: '即刻', url: 'https://web.okjike.com', type: 'app' },
                { id: 'behance', name: 'Behance', url: 'https://www.behance.net/', type: 'app' },
                { id: 'x', name: 'X', url: 'https://x.com/', type: 'app' },
                { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', type: 'app' },
                { id: 'claude', name: 'Claude', url: 'https://claude.ai/new', type: 'app' },
            ];

            // 为文件夹生成图标
            defaults.forEach(item => {
                if (item.type === 'folder' && item.items) {
                    item.icon = generateFolderIcon(item.items);
                }
            });
            setDockItems(defaults);

            // 异步获取默认项目的图标
            const fetchAllIcons = async () => {
                let isMounted = true;

                type IconUpdateResult =
                    | { id: string; icon: string; isFolder?: undefined; subItems?: undefined }
                    | { id: string; isFolder: true; subItems: { id: string; icon: string }[]; icon?: undefined }
                    | null;

                // 并行获取图标，但不立即更新状态
                const iconResults: IconUpdateResult[] = await Promise.all(defaults.map(async (item) => {
                    if (item.type === 'folder' && item.items) {
                        const updatedSubItems = await Promise.all(item.items.map(async (subItem) => {
                            if (subItem.url) {
                                try {
                                    const { url: icon } = await fetchIcon(subItem.url);
                                    return { id: subItem.id, icon };
                                } catch (e) {
                                    return null;
                                }
                            }
                            return null;
                        }));

                        // 过滤出获取到图标的项目
                        const validSubUpdates = updatedSubItems.filter((i): i is { id: string, icon: string } => i !== null);

                        if (validSubUpdates.length > 0) {
                            return {
                                id: item.id,
                                isFolder: true,
                                subItems: validSubUpdates
                            };
                        }
                    } else if (item.url) {
                        try {
                            const { url: icon } = await fetchIcon(item.url);
                            return { id: item.id, icon };
                        } catch (e) {
                            console.error(`Failed to fetch icon for ${item.name}`, e);
                        }
                    }
                    return null;
                }));

                // 过滤有效结果
                const updates = iconResults.filter((r): r is NonNullable<IconUpdateResult> => r !== null);

                if (!isMounted) return;

                // 安全更新: 仅更新图标，保留用户可能已做的操作（如排序、删除）
                setDockItems(prev => {
                    return prev.map(item => {
                        const update = updates.find(u => u && u.id === item.id);
                        if (!update) return item;

                        if (update.isFolder && item.type === 'folder' && item.items) {
                            // 更新文件夹内的图标
                            const newSubItems = item.items.map(subItem => {
                                const subUpdate = update.subItems?.find(su => su.id === subItem.id);
                                return subUpdate ? { ...subItem, icon: subUpdate.icon } : subItem;
                            });
                            return {
                                ...item,
                                items: newSubItems,
                                icon: generateFolderIcon(newSubItems) // 重新生成文件夹预览图
                            };
                        } else if (!update.isFolder && update.icon) {
                            // 更新 App 图标
                            return { ...item, icon: update.icon };
                        }
                        return item;
                    });
                });

                return () => { isMounted = false; };
            };

            fetchAllIcons();
            // 注意：useEffect 的 cleanup 实际上不能直接处理 async 函数内部的变量
            // 所以我们在 fetchAllIcons 内部处理 mount 状态，或者使用 ref 跟踪 mount 状态
        }

        // 搜索引擎仍使用独立存储
        const savedEngine = storage.getSearchEngine();
        if (savedEngine) {
            setSelectedSearchEngineState(savedEngine);
        }
    }, []); // 仅首次运行

    // 保存搜索引擎 (dockItems 存储由 SpacesContext 管理)
    useEffect(() => {
        storage.saveSearchEngine(selectedSearchEngine);
    }, [selectedSearchEngine]);

    // 辅助函数: 检查并在需要时解散文件夹
    const checkAndDissolveFolderIfNeeded = useCallback((folderId: string, updatedItems: DockItem[]): DockItem[] => {
        const folder = updatedItems.find(i => i.id === folderId);
        if (!folder || folder.type !== 'folder' || !folder.items) return updatedItems;

        const folderIndex = updatedItems.findIndex(i => i.id === folderId);
        if (folderIndex === -1) return updatedItems;

        // 如果文件夹没有项目，完全移除它
        if (folder.items.length === 0) {
            return updatedItems.filter(i => i.id !== folderId);
        }

        // 如果文件夹恰好只有 1 个项目，解散并用该项目替换文件夹
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
                    // 防止重复: 过滤掉已经存在于文件夹中的项目
                    const existingIds = new Set((item.items || []).map(i => i.id));
                    const uniqueItemsToAdd = itemsToAdd.filter(add => !existingIds.has(add.id));

                    const mergedItems = [...(item.items || []), ...uniqueItemsToAdd];
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
        folderPlaceholderActive,
        setFolderPlaceholderActive,
    }), [draggingItem, folderPlaceholderActive]);

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

    const { openInNewTab } = useThemeData();

    // 组合操作 - 需要同时访问数据和 UI
    const handleItemClick = useCallback((item: DockItem, rect?: DOMRect) => {
        if (item.type === 'folder') {
            uiContext.setOpenFolderId(item.id);
            uiContext.setFolderAnchor(rect ?? null);
        } else if (item.url) {
            window.open(item.url, openInNewTab ? '_blank' : '_self');
        }
    }, [uiContext, openInNewTab]);

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
