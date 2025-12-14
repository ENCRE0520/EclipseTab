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

/** Dock 内边距 (px) */
export const DOCK_PADDING = 8;

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

/** Folder 内边距 (px) */
export const FOLDER_PADDING = 8;

// ============================================================================
// 拖拽阈值
// ============================================================================

/** 拖拽触发阈值 - 鼠标移动超过此距离才开始拖拽 (px) */
export const DRAG_THRESHOLD = 8;

/** 移动检测阈值 - 用于判断是否开始移动 (px) */
export const MOVE_THRESHOLD = 3;

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


// ============================================================================
// 交互体验
// ============================================================================

/** 拖拽拾起时的缩放比例 */
export const DRAG_SCALE = 1.05;

/** 拖拽预览层级 */
export const DRAG_Z_INDEX = 9999;

/** 滞后阈值 (px) - 用于防止抖动 */
export const HYSTERESIS_THRESHOLD = 10;

/** 文件夹落点判定阈值 (px) */
export const FOLDER_DROP_THRESHOLD = 10;

/** 拖出容器检测缓冲区 (px) */
export const DRAG_OUT_BUFFER = 10;

/**
 * 震动反馈模式 (毫秒)
 * 仅在支持 navigator.vibrate 的设备上生效
 */
export const HAPTIC_PATTERNS = {
    PICKUP: 10,        // 拖拽开始
    REORDER: 5,        // 重排/吸附
    MERGE: 15,         // 合并/放入文件夹
    DROP: 10,          // 放下
    CANCEL: 20,        // 取消
};

// ============================================================================
// 派生常量
// ============================================================================

/** 图标中心偏移量 = 图标宽度 / 2 (用于居中计算) */
export const ICON_CENTER_OFFSET = DOCK_ITEM_WIDTH / 2; // 32

// ============================================================================
// 占位资源
// ============================================================================

/** 默认占位图标 (透明 64x64 圆角矩形 SVG) */
export const FALLBACK_ICON_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg==';
