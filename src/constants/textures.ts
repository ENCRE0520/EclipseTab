/**
 * Texture Pattern System
 * 
 * This module defines small, repeatable SVG patterns for background textures.
 * Each pattern is a tiny SVG (typically 40x40px) that gets tiled via CSS background-repeat.
 * 
 * Benefits:
 * - Tiny file size (<1KB per pattern vs 217KB for old approach)
 * - Excellent performance (browser-optimized background tiling)
 * - Easy to add new patterns
 * - Supports dynamic coloring via currentColor
 */

export type TextureId = 'none' | 'point' | 'x' | 'heart' | 'cross';

export interface TexturePattern {
    id: TextureId;
    name: string;
    nameZh: string;
    svg: string; // SVG markup for the pattern unit (single line, no extra whitespace)
    size: number; // Pattern repeat size in pixels
    supportsColor: boolean; // Whether it supports dynamic coloring
}

/**
 * Available texture patterns
 * Each SVG uses 'currentColor' for fill, allowing dynamic theming
 * IMPORTANT: SVGs must be single-line with no extra whitespace for proper encoding
 */
export const TEXTURE_PATTERNS: Record<Exclude<TextureId, 'none'>, TexturePattern> = {
    point: {
        id: 'point',
        name: 'Dots',
        nameZh: '圆点',
        svg: '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>',
        size: 40,
        supportsColor: true,
    },

    x: {
        id: 'x',
        name: 'X Pattern',
        nameZh: 'X 图案',
        svg: '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M15,15 L25,25 M25,15 L15,25" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
        size: 40,
        supportsColor: true,
    },

    heart: {
        id: 'heart',
        name: 'Hearts',
        nameZh: '爱心',
        svg: '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M20,28 C20,28 12,22 12,17 C12,14 14,12 16.5,12 C18,12 19.5,13 20,14.5 C20.5,13 22,12 23.5,12 C26,12 28,14 28,17 C28,22 20,28 20,28 Z" fill="currentColor"/></svg>',
        size: 40,
        supportsColor: true,
    },

    cross: {
        id: 'cross',
        name: 'Plus',
        nameZh: '十字',
        svg: '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M18,15 L22,15 L22,18 L25,18 L25,22 L22,22 L22,25 L18,25 L18,22 L15,22 L15,18 L18,18 Z" fill="currentColor"/></svg>',
        size: 40,
        supportsColor: true,
    },
};

/**
 * Generate a data URL for a texture pattern with specified color
 * @param textureId - The texture pattern to use
 * @param color - CSS color value (e.g., 'rgba(128, 128, 128, 0.15)')
 * @returns Data URL for use in CSS background-image
 */
export function generateTextureDataUrl(textureId: Exclude<TextureId, 'none'>, color: string = 'rgba(128, 128, 128, 0.15)'): string {
    const pattern = TEXTURE_PATTERNS[textureId];
    if (!pattern) {
        console.warn(`Texture pattern "${textureId}" not found`);
        return '';
    }

    // Replace currentColor with the actual color
    const coloredSvg = pattern.svg.replace(/currentColor/g, color);

    // Encode SVG for data URL using base64 for better compatibility
    const base64Svg = btoa(coloredSvg);
    return `data:image/svg+xml;base64,${base64Svg}`;
}

/**
 * Get the background-size value for a texture pattern
 * @param textureId - The texture pattern
 * @returns CSS background-size value
 */
export function getTextureSize(textureId: Exclude<TextureId, 'none'> | 'none'): string {
    if (textureId === 'none') {
        return 'cover';
    }
    const pattern = TEXTURE_PATTERNS[textureId];
    return pattern ? `${pattern.size}px ${pattern.size}px` : '40px 40px';
}
