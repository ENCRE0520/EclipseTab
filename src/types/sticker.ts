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

/**
 * 贴纸数据结构
 */
export interface Sticker {
    id: string;              // UUID 唯一标识
    type: 'text' | 'image';  // 贴纸类型
    content: string;         // 文字内容 或 图片Base64/URL
    x: number;               // 屏幕 X 坐标 (px)
    y: number;               // 屏幕 Y 坐标 (px)
    zIndex?: number;         // 层级顺序（双击置顶）
    scale?: number;          // 图片缩放比例（仅图片贴纸）
    style?: TextStickerStyle; // 仅针对文字贴纸的样式
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
