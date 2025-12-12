/**
 * 布局常量 - 统一管理 Dock 和 Folder 的尺寸、间距、阈值
 */

// ============================================================================
// Dock 布局
// ============================================================================

/** Dock 图标宽度 (px) */
export const DOCK_ITEM_WIDTH = 64;

/** Dock 图标高度 (px) */
export const DOCK_ITEM_HEIGHT = 64;

/** Dock 图标间距 (px) */
export const DOCK_ITEM_GAP = 8;

/** Dock 单元格尺寸 = 图标 + 间距 */
export const DOCK_CELL_SIZE = DOCK_ITEM_WIDTH + DOCK_ITEM_GAP; // 72

/** Dock 拖拽检测缓冲区 (px) */
export const DOCK_DRAG_BUFFER = 50;

// ============================================================================
// Folder 布局
// ============================================================================

/** Folder 固定列数 */
export const FOLDER_COLUMNS = 4;

/** Folder 图标宽度 (px) */
export const FOLDER_ITEM_WIDTH = 64;

/** Folder 图标高度 (px) */
export const FOLDER_ITEM_HEIGHT = 64;

/** Folder 图标间距 (px) */
export const FOLDER_GAP = 8;

/** Folder 单元格尺寸 = 图标 + 间距 */
export const FOLDER_CELL_SIZE = FOLDER_ITEM_WIDTH + FOLDER_GAP; // 72

/** Folder 拖拽检测缓冲区 (px) */
export const FOLDER_DRAG_BUFFER = 50;

// ============================================================================
// 拖拽阈值
// ============================================================================

/** 拖拽触发阈值 - 鼠标移动超过此距离才开始拖拽 (px) */
export const DRAG_THRESHOLD = 8;

/** 合并/放入文件夹的距离阈值 (px) */
export const MERGE_DISTANCE_THRESHOLD = 30;

/** 悬停打开文件夹延迟 (ms) */
export const HOVER_OPEN_DELAY = 500;

/** 预合并状态激活延迟 (ms) */
export const PRE_MERGE_DELAY = 300;

// ============================================================================
// 动画 - 与 variables.css 保持同步
// ============================================================================

/** 弹性动画曲线 - iOS 风格阻尼，快进慢出无过冲 */
export const EASE_SPRING = 'cubic-bezier(0.25, 1, 0.5, 1)';
/** 向后兼容别名 */
export const SPRING_EASING = EASE_SPRING;

/** Swift 滑动曲线 - 用于挤压动画 */
export const EASE_SWIFT = 'cubic-bezier(0.2, 0, 0, 1)';
/** 向后兼容别名 */
export const SLIDE_EASING = EASE_SWIFT;

/** Smooth 平滑曲线 - Material Design 标准 */
export const EASE_SMOOTH = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** 归位动画时长 (ms) */
export const RETURN_ANIMATION_DURATION = 280;

/** 挤压动画时长 (ms) */
export const SQUEEZE_ANIMATION_DURATION = 200;

/** 淡入淡出时长 (ms) */
export const FADE_DURATION = 150;

