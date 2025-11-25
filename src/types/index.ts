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

