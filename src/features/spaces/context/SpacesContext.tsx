import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Space, SpacesState, DockItem, createDefaultSpace } from '@/shared/types';
import { storage } from '@/shared/utils/storage';
import { SpaceExportData, MultiSpaceExportData, createSpaceFromImport, createSpacesFromMultiImport } from '@/features/spaces/utils/spaceExportImport';
import { prefetchIcons } from '@/features/dock/utils/iconCache';
import { generateFolderIcon } from '@/features/dock/utils/iconFetcher';

function containsDockItem(items: DockItem[], itemId: string): boolean {
    return items.some(item =>
        item.id === itemId ||
        (item.type === 'folder' && item.items ? containsDockItem(item.items, itemId) : false)
    );
}

function extractDockItem(
    items: DockItem[],
    itemId: string
): { items: DockItem[]; extractedItem: DockItem | null } {
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];

        if (item.id === itemId) {
            return {
                items: [...items.slice(0, index), ...items.slice(index + 1)],
                extractedItem: item,
            };
        }

        if (item.type === 'folder' && item.items) {
            const nestedResult = extractDockItem(item.items, itemId);
            if (!nestedResult.extractedItem) continue;

            const nextItems = [...items];
            if (nestedResult.items.length === 0) {
                nextItems.splice(index, 1);
            } else if (nestedResult.items.length === 1) {
                nextItems[index] = nestedResult.items[0];
            } else {
                nextItems[index] = {
                    ...item,
                    items: nestedResult.items,
                    icon: generateFolderIcon(nestedResult.items),
                };
            }

            return {
                items: nextItems,
                extractedItem: nestedResult.extractedItem,
            };
        }
    }

    return { items, extractedItem: null };
}

// ============================================================================
// 数据层 Context 类型定义 (低频变化)
// ============================================================================

interface SpacesDataContextType {
    // 状态
    spaces: Space[];
    activeSpaceId: string;
    isSwitching: boolean;

    // 派生
    currentSpace: Space;
    currentIndex: number;
}

const SpacesDataContext = createContext<SpacesDataContextType | undefined>(undefined);

// ============================================================================
// 操作层 Context 类型定义 (几乎不变)
// ============================================================================

interface SpacesActionsContextType {
    switchToNextSpace: () => void;
    switchToSpace: (spaceId: string) => void;
    addSpace: (name?: string) => void;
    deleteSpace: (spaceId: string) => void;
    renameSpace: (spaceId: string, newName: string) => void;
    updateCurrentSpaceApps: (apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => void;
    /** 按指定空间 ID 更新 apps（异步操作安全，不受空间切换影响） */
    updateSpaceApps: (spaceId: string, apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => void;
    moveItemToSpace: (sourceSpaceId: string, targetSpaceId: string, itemId: string) => void;
    importSpace: (data: SpaceExportData) => Promise<Space>;
    importMultipleSpaces: (data: MultiSpaceExportData) => Promise<Space[]>;
    pinSpace: (spaceId: string) => void;
    setIsSwitching: (value: boolean) => void;
}

const SpacesActionsContext = createContext<SpacesActionsContextType | undefined>(undefined);

// ============================================================================
// 组合类型 (兼容层)
// ============================================================================

interface SpacesContextType extends SpacesDataContextType, SpacesActionsContextType { }

// ============================================================================
// Provider 实现
// ============================================================================

interface SpacesProviderProps {
    children: React.ReactNode;
}

export function SpacesProvider({ children }: SpacesProviderProps) {
    // 初始化状态（从 localStorage 读取，只调用一次）
    const [spacesState, setSpacesState] = useState<SpacesState>(() => {
        const loaded = storage.getSpaces();
        return loaded;
    });
    const [isSwitching, setIsSwitching] = useState(false);

    // 解构状态
    const { spaces, activeSpaceId } = spacesState;

    // 派生：当前空间
    const currentSpace = useMemo(() => {
        return spaces.find(s => s.id === activeSpaceId) || spaces[0];
    }, [spaces, activeSpaceId]);

    // 派生：当前索引
    const currentIndex = useMemo(() => {
        return spaces.findIndex(s => s.id === activeSpaceId);
    }, [spaces, activeSpaceId]);

    // 首次加载时预取所有空间的图标到内存缓存
    // 这样切换空间时图标已在缓存中，不需要重新从 IndexedDB 加载
    const hasPrefetchedRef = useRef(false);
    useEffect(() => {
        if (hasPrefetchedRef.current) return;
        hasPrefetchedRef.current = true;

        const allDomains: string[] = [];
        for (const space of spaces) {
            for (const item of space.apps) {
                if (item.url) {
                    try { allDomains.push(new URL(item.url).hostname); } catch {}
                }
                if (item.type === 'folder' && item.items) {
                    for (const sub of item.items) {
                        if (sub.url) {
                            try { allDomains.push(new URL(sub.url).hostname); } catch {}
                        }
                    }
                }
            }
        }

        if (allDomains.length > 0) {
            prefetchIcons(allDomains).catch(() => {});
        }
    }, []); // 仅首次运行

    // 快捷方式的编辑和删除是低频、用户明确触发的操作，应在状态提交后立即落盘。
    // 原先的 500ms 防抖在新标签页快速关闭/刷新时会被 effect cleanup 取消，导致
    // 修改看似成功却在下次打开时恢复为旧数据。
    useEffect(() => {
        storage.saveSpaces(spacesState);
    }, [spacesState]);

    // ============================================================================
    // 空间切换操作
    // ============================================================================

    const switchToNextSpace = useCallback(() => {
        if (isSwitching || spaces.length <= 1) return;

        const nextIndex = (currentIndex + 1) % spaces.length;
        const nextSpace = spaces[nextIndex];

        setSpacesState(prev => ({
            ...prev,
            activeSpaceId: nextSpace.id,
        }));
    }, [isSwitching, spaces, currentIndex]);

    const switchToSpace = useCallback((spaceId: string) => {
        if (isSwitching) return;

        const targetSpace = spaces.find(s => s.id === spaceId);
        if (!targetSpace) return;

        setSpacesState(prev => ({
            ...prev,
            activeSpaceId: spaceId,
        }));
    }, [isSwitching, spaces]);

    // ============================================================================
    // 空间管理操作
    // ============================================================================

    const addSpace = useCallback((name?: string) => {
        const newSpace = createDefaultSpace(name || `Space ${spaces.length + 1}`);

        setSpacesState(prev => ({
            ...prev,
            spaces: [...prev.spaces, newSpace],
            activeSpaceId: newSpace.id, // 自动跳转到新空间
        }));
    }, [spaces.length]);

    const deleteSpace = useCallback((spaceId: string) => {
        if (spaces.length <= 1) {
            console.warn('[SpacesContext] Cannot delete the last space');
            return;
        }

        const deleteIndex = spaces.findIndex(s => s.id === spaceId);
        if (deleteIndex === -1) return;

        // 确定删除后要跳转到的空间
        let newActiveId = activeSpaceId;
        if (spaceId === activeSpaceId) {
            // 删除的是当前空间，跳转到上一个（如果是第一个则跳转到下一个）
            const newIndex = deleteIndex === 0 ? 1 : deleteIndex - 1;
            newActiveId = spaces[newIndex].id;
        }

        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.filter(s => s.id !== spaceId),
            activeSpaceId: newActiveId,
        }));
    }, [spaces, activeSpaceId]);

    const renameSpace = useCallback((spaceId: string, newName: string) => {
        if (!newName.trim()) return;

        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === spaceId ? { ...s, name: newName.trim() } : s
            ),
        }));
    }, []);

    // ============================================================================
    // 导入空间
    // ============================================================================

    const importSpace = useCallback(async (data: SpaceExportData) => {
        // createSpaceFromImport 现在是 async，会压缩图标
        const newSpace = await createSpaceFromImport(data, spaces);

        setSpacesState(prev => ({
            ...prev,
            spaces: [...prev.spaces, newSpace],
            activeSpaceId: newSpace.id, // 自动跳转到新导入的空间
        }));

        return newSpace;
    }, [spaces]);

    const importMultipleSpaces = useCallback(async (data: MultiSpaceExportData) => {
        // 创建多个空间
        const newSpaces = await createSpacesFromMultiImport(data, spaces);

        if (newSpaces.length > 0) {
            setSpacesState(prev => ({
                ...prev,
                spaces: [...prev.spaces, ...newSpaces],
                activeSpaceId: newSpaces[0].id, // 自动跳转到第一个导入的空间
            }));
        }

        return newSpaces;
    }, [spaces]);

    // ============================================================================
    // 置顶空间
    // ============================================================================

    const pinSpace = useCallback((spaceId: string) => {
        setSpacesState(prev => {
            const targetIndex = prev.spaces.findIndex(s => s.id === spaceId);
            if (targetIndex <= 0) return prev; // 已经在第一位或找不到

            const targetSpace = prev.spaces[targetIndex];
            const newSpaces = [
                targetSpace,
                ...prev.spaces.slice(0, targetIndex),
                ...prev.spaces.slice(targetIndex + 1),
            ];

            return {
                ...prev,
                spaces: newSpaces,
            };
        });
    }, []);

    // ============================================================================
    // Apps 更新（供 DockContext 调用）
    // ============================================================================

    const updateCurrentSpaceApps = useCallback((apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => {
        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === prev.activeSpaceId
                    ? { ...s, apps: typeof apps === 'function' ? apps(s.apps) : apps }
                    : s
            ),
        }));
    }, []);

    const updateSpaceApps = useCallback((spaceId: string, apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => {
        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === spaceId
                    ? { ...s, apps: typeof apps === 'function' ? apps(s.apps) : apps }
                    : s
            ),
        }));
    }, []);

    const moveItemToSpace = useCallback((sourceSpaceId: string, targetSpaceId: string, itemId: string) => {
        if (sourceSpaceId === targetSpaceId) return;

        setSpacesState(prev => {
            const sourceSpace = prev.spaces.find(space => space.id === sourceSpaceId);
            const targetSpace = prev.spaces.find(space => space.id === targetSpaceId);
            if (!sourceSpace || !targetSpace || containsDockItem(targetSpace.apps, itemId)) {
                return prev;
            }

            const result = extractDockItem(sourceSpace.apps, itemId);
            if (!result.extractedItem) return prev;

            return {
                ...prev,
                spaces: prev.spaces.map(space => {
                    if (space.id === sourceSpaceId) {
                        return { ...space, apps: result.items };
                    }
                    if (space.id === targetSpaceId) {
                        return { ...space, apps: [...space.apps, result.extractedItem!] };
                    }
                    return space;
                }),
            };
        });
    }, []);

    // ============================================================================
    // Context Values (分离数据和操作，减少重渲染)
    // ============================================================================

    const dataValue = useMemo<SpacesDataContextType>(() => ({
        spaces,
        activeSpaceId,
        isSwitching,
        currentSpace,
        currentIndex,
    }), [spaces, activeSpaceId, isSwitching, currentSpace, currentIndex]);

    const actionsValue = useMemo<SpacesActionsContextType>(() => ({
        switchToNextSpace,
        switchToSpace,
        addSpace,
        deleteSpace,
        renameSpace,
        updateCurrentSpaceApps,
        updateSpaceApps,
        moveItemToSpace,
        importSpace,
        importMultipleSpaces,
        pinSpace,
        setIsSwitching,
    }), [
        switchToNextSpace,
        switchToSpace,
        addSpace,
        deleteSpace,
        renameSpace,
        updateCurrentSpaceApps,
        updateSpaceApps,
        moveItemToSpace,
        importSpace,
        importMultipleSpaces,
        pinSpace,
    ]);

    return (
        <SpacesDataContext.Provider value={dataValue}>
            <SpacesActionsContext.Provider value={actionsValue}>
                {children}
            </SpacesActionsContext.Provider>
        </SpacesDataContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取 Spaces 数据状态 (低频变化)
 * 用于需要访问 spaces、currentSpace 等数据的组件
 */
export function useSpacesData(): SpacesDataContextType {
    const context = useContext(SpacesDataContext);
    if (!context) {
        throw new Error('useSpacesData must be used within a SpacesProvider');
    }
    return context;
}

/**
 * 获取 Spaces 操作方法 (几乎不变)
 * 用于只需要调用操作方法的组件
 */
export function useSpacesActions(): SpacesActionsContextType {
    const context = useContext(SpacesActionsContext);
    if (!context) {
        throw new Error('useSpacesActions must be used within a SpacesProvider');
    }
    return context;
}

/**
 * 获取完整的 Spaces Context (兼容层)
 * 组合 SpacesDataContext 和 SpacesActionsContext
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useSpacesData 或 useSpacesActions
 */
export function useSpaces(): SpacesContextType {
    const dataContext = useContext(SpacesDataContext);
    const actionsContext = useContext(SpacesActionsContext);

    if (!dataContext || !actionsContext) {
        throw new Error('useSpaces must be used within a SpacesProvider');
    }

    return { ...dataContext, ...actionsContext };
}

/**
 * 仅获取当前空间数据（性能优化用）
 */
export function useCurrentSpace(): Space {
    const { currentSpace } = useSpacesData();
    return currentSpace;
}

/**
 * 仅获取空间切换状态（性能优化用）
 */
export function useSpaceSwitching(): {
    isSwitching: boolean;
    setIsSwitching: (value: boolean) => void;
} {
    const { isSwitching } = useSpacesData();
    const { setIsSwitching } = useSpacesActions();
    return { isSwitching, setIsSwitching };
}
