/**
 * 拖拽相关类型定义
 */

import { DockItem } from './dock';

export interface Position {
    x: number;
    y: number;
}

export type TargetAction = 'reorder' | 'dropToFolder' | 'mergeFolder' | 'dragToOpenFolder' | null;

export interface DragState {
    isDragging: boolean;
    item: DockItem | null;
    originalIndex: number;
    currentPosition: Position;
    startPosition: Position;
    offset: Position;
    isAnimatingReturn: boolean;
    targetPosition: Position | null;
    targetAction: TargetAction;
    targetActionData: unknown;
}

export interface PlaceholderState {
    index: number;
    visible: boolean;
}

export interface MergeTargetState {
    index: number;
    item: DockItem | null;
}

/**
 * 拖拽 Hook 配置选项
 */
export interface UseDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onDropToFolder?: (dragItem: DockItem, targetFolder: DockItem) => void;
    onMergeFolder?: (dragItem: DockItem, targetItem: DockItem) => void;
    onDragToOpenFolder?: (dragItem: DockItem) => void;
    onHoverOpenFolder?: (dragItem: DockItem, targetFolder: DockItem) => void;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    externalDragItem?: DockItem | null;
}

/**
 * 文件夹内拖拽 Hook 配置选项
 */
export interface UseFolderDragAndDropOptions {
    items: DockItem[];
    isEditMode: boolean;
    onReorder: (items: DockItem[]) => void;
    onItemDragOut?: (item: DockItem, mousePosition: Position) => void;
    onDragStart?: (item: DockItem) => void;
    onDragEnd?: () => void;
    externalDragItem?: DockItem | null;
}
