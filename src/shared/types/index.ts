/**
 * 类型定义导出入口
 * 
 * 为保持向后兼容，从这里统一导出所有类型
 */

// Dock 相关类型
export type { DockItem, SearchEngine, AppState, DockActions, FolderViewActions } from '@/features/dock/types/dock';

// 拖拽相关类型
export type {
  Position,
  TargetAction,
  DragState,
  PlaceholderState,
  MergeTargetState,
  UseDragAndDropOptions,
  UseFolderDragAndDropOptions
} from '@/features/dock/types/drag';

// Space 相关类型
export type { Space, SpacesState } from '@/features/spaces/types/space';
export { createDefaultSpace, createDefaultSpacesState } from '@/features/spaces/types/space';

// Zen Shelf 贴纸相关类型
export type { Sticker, StickerInput, TextStickerStyle } from '@/features/shelf/types/sticker';
export { DEFAULT_TEXT_STYLE, IMAGE_MAX_WIDTH } from '@/features/shelf/types/sticker';
