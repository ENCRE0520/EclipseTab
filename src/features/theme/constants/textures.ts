/**
 * 纹理图案系统
 * 
 * 此模块定义了背景纹理的 SVG 图案。
 * 图案从 SVG 文件导入，并支持动态着色和尺寸调整。
 * 
 * 配置说明：
 * - iconSize: 每个纹理图标的显示尺寸 (像素)
 * - tileSize: 重复单元格尺寸 (控制密度 - 越大越稀疏)
 */

import circleSvgRaw from '@/assets/icons/texture background/Circle.svg?raw';
import crossSvgRaw from '@/assets/icons/texture background/Cross.svg?raw';

export type TextureId = 'none' | 'point' | 'cross';

export interface TexturePattern {
    id: TextureId;
    name: string;
    nameZh: string;
    svgRaw: string;      // 来自文件的原始 SVG 标记
    iconSize: number;    // 图标的显示尺寸 (像素，缩放 SVG)
    tileSize: number;    // 重复单元格尺寸 (像素，控制密度/间距)
    supportsColor: boolean;
}

/**
 * 准备用于纹理的原始 SVG
 * - 移除换行符以确保正确编码
 * - 确保使用 currentColor (SVG 文件应已包含此内容)
 */
function prepareSvg(raw: string): string {
    return raw.replace(/\r?\n/g, '').trim();
}

/**
 * 可用的纹理图案
 * 
 * 调整这些值来控制外观：
 * - iconSize: 每个图标的大小 (例如：8 = 小图标, 16 = 大图标)
 * - tileSize: 图标之间的间距 (例如：32 = 密集, 64 = 稀疏)
 * 
 * 原始 SVG viewBox 为 24x24，因此 iconSize 控制缩放
 */
export const TEXTURE_PATTERNS: Record<Exclude<TextureId, 'none'>, TexturePattern> = {
    point: {
        id: 'point',
        name: 'Circle',
        nameZh: '圆点',
        svgRaw: prepareSvg(circleSvgRaw),
        iconSize: 20,
        tileSize: 36,
        supportsColor: true,
    },

    cross: {
        id: 'cross',
        name: 'Cross',
        nameZh: '叉号',
        svgRaw: prepareSvg(crossSvgRaw),
        iconSize: 20,
        tileSize: 54,
        supportsColor: true,
    },
};

/**
 * 为指定的纹理图案和颜色生成 Data URL
 * 
 * SVG 将被转换为：
 * 1. 使用指定的颜色代替 currentColor
 * 2. 缩放到配置的 iconSize
 * 3. 以配置的 tileSize 铺贴
 * 
 * @param textureId - 使用的纹理图案
 * @param color - CSS 颜色值 (例如: 'rgba(128, 128, 128, 0.1)')
 * @returns 用于 CSS background-image 的 Data URL
 */
export function generateTextureDataUrl(textureId: Exclude<TextureId, 'none'>, color: string = 'rgba(128, 128, 128, 0.1)'): string {
    const pattern = TEXTURE_PATTERNS[textureId];
    if (!pattern) {
        console.warn(`Texture pattern "${textureId}" not found`);
        return '';
    }

    const { svgRaw, iconSize, tileSize } = pattern;

    // 计算偏移量以使图标在单元格中居中
    const offset = (tileSize - iconSize) / 2;

    // 从原始 SVG 中仅提取内部内容 (路径元素)
    const innerContent = svgRaw
        .replace(/<svg[^>]*>/, '')  // 移除起始 <svg> 标签
        .replace(/<\/svg>/, '')      // 移除闭合 </svg> 标签
        .replace(/currentColor/g, color);  // 将所有 currentColor 替换为实际颜色

    // 创建一个新的 SVG：
    // 1. 使用单元格尺寸作为其维度
    // 2. 包含缩放和居中的原始图标
    const tiledSvg = `<svg width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" xmlns="http://www.w3.org/2000/svg">` +
        `<svg x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">` +
        innerContent +
        `</svg></svg>`;

    // 使用 base64 编码 SVG 以获得更好的兼容性
    const base64Svg = btoa(tiledSvg);
    return `data:image/svg+xml;base64,${base64Svg}`;
}

/**
 * 获取纹理图案的 background-size 值
 * @param textureId - 纹理图案
 * @returns CSS background-size 值
 */
export function getTextureSize(textureId: Exclude<TextureId, 'none'> | 'none'): string {
    if (textureId === 'none') {
        return 'cover';
    }
    const pattern = TEXTURE_PATTERNS[textureId];
    return pattern ? `${pattern.tileSize}px ${pattern.tileSize}px` : '48px 48px';
}
