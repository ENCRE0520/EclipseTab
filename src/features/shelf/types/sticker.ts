/**
 * Zen Shelf 贴纸相关类型定义
 */

/**
 * 文字贴纸的样式配置
 */
export interface TextStickerStyle {
    color: string;                           // 字体颜色
    textAlign: 'left' | 'center' | 'right';  // 文字对齐
    fontSize: number;                        // 字号大小 (px)
    maxWidth?: number;                       // 最大宽度限制 (px)
}

export interface LinkCardMetadata {
    url: string;             // 跳转地址
    title: string;           // 卡片主标题
    subtitle: string;        // 卡片副标题
    imageUrl?: string;       // 预览图地址
    siteName?: string;       // 站点名称
}

/**
 * 贴纸数据结构
 */
export interface Sticker {
    id: string;              // UUID 唯一标识
    type: 'text' | 'image' | 'widget';  // 贴纸类型
    content: string;         // 文字内容 或 图片Base64/URL
    x: number;               // 屏幕 X 坐标 (px)
    y: number;               // 屏幕 Y 坐标 (px)
    zIndex?: number;         // 层级顺序（双击置顶）
    scale?: number;          // 图片缩放比例（仅图片贴纸）
    isPinned?: boolean;      // 是否固定在原处不可移动
    style?: TextStickerStyle; // 仅针对文字贴纸的样式
    hasCheckbox?: boolean;   // 是否带有复选框 (仅文字贴纸)
    isChecked?: boolean;     // 复选框是否已勾选
    linkCard?: LinkCardMetadata; // 链接卡片元数据（仅文字贴纸）
    widgetType?: 'clock' | 'analogClock' | 'roundedAnalogClock' | 'calendar' | 'focus' | 'countdown';
    focus?: {
        mode: 'focus' | 'break';
        duration: number; // seconds
        remaining: number; // paused seconds
        endsAt: number | null; // absolute timestamp; survives reload and sleep
    };
    countdown?: { title: string; date: string }; // local calendar date, YYYY-MM-DD
}

/**
 * 创建贴纸时的输入类型（不需要 id，由系统生成）
 */
export type StickerInput = Omit<Sticker, 'id'>;

/**
 * 默认的文字贴纸样式
 */
export const DEFAULT_TEXT_STYLE: TextStickerStyle = {
    color: '#1C1C1E',        // 深色文字
    textAlign: 'left',
    fontSize: 40,
};

/**
 * 图片贴纸的最大宽度限制
 */
export const IMAGE_MAX_WIDTH = 400;
