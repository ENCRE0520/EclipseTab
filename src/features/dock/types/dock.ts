/**
 * Dock 相关类型定义
 */

export interface DockItem {
    id: string;
    name: string;
    url?: string;
    icon?: string;
    type: 'app' | 'folder';
    items?: DockItem[]; // 仅文件夹包含
}

export interface SearchEngine {
    id: string;
    name: string;
    url: string;
}

export interface AppState {
    dockItems: DockItem[];
    isEditMode: boolean;
    selectedSearchEngine: SearchEngine;
    openFolderId: string | null;
}

/**
 * Dock 操作相关类型
 */
export interface DockActions {
    onItemClick: (item: DockItem, rect?: DOMRect) => void;
    onItemEdit: (item: DockItem, rect?: DOMRect) => void;
    onItemDelete: (item: DockItem) => void;
    onItemAdd: (rect?: DOMRect) => void;
    onItemsReorder: (items: DockItem[]) => void;
    onDropToFolder: (dragItem: DockItem, targetFolder: DockItem) => void;
    onDragToOpenFolder: (dragItem: DockItem) => void;
    onHoverOpenFolder: (item: DockItem, folder: DockItem) => void;
}

/**
 * 文件夹视图操作类型
 */
export interface FolderViewActions {
    onItemClick: (item: DockItem) => void;
    onItemEdit: (item: DockItem, rect?: DOMRect) => void;
    onItemDelete: (item: DockItem) => void;
    onItemsReorder: (items: DockItem[]) => void;
    onItemDragOut: (item: DockItem, mousePosition: { x: number; y: number }) => void;
    onClose: () => void;
}
