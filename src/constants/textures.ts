/**
 * Texture Pattern System
 * 
 * This module defines SVG patterns for background textures.
 * Patterns are imported from SVG files and support dynamic coloring and sizing.
 * 
 * Configuration:
 * - iconSize: The display size of each texture icon in pixels
 * - tileSize: The repeat tile size (controls density - larger = more spacing)
 */

import circleSvgRaw from '../assets/icons/texture background/Circle.svg?raw';
import crossSvgRaw from '../assets/icons/texture background/Cross.svg?raw';

export type TextureId = 'none' | 'point' | 'cross';

export interface TexturePattern {
    id: TextureId;
    name: string;
    nameZh: string;
    svgRaw: string;      // Raw SVG markup from file
    iconSize: number;    // Display size of the icon in pixels (scales the SVG)
    tileSize: number;    // Repeat tile size in pixels (controls density/spacing)
    supportsColor: boolean;
}

/**
 * Prepare raw SVG for use as texture
 * - Removes newlines for proper encoding
 * - Ensures currentColor is used (SVG files should already have this)
 */
function prepareSvg(raw: string): string {
    return raw.replace(/\r?\n/g, '').trim();
}

/**
 * Available texture patterns
 * 
 * Adjust these values to control appearance:
 * - iconSize: Size of each icon (e.g., 8 = small icons, 16 = larger icons)
 * - tileSize: Spacing between icons (e.g., 32 = dense, 64 = sparse)
 * 
 * The original SVG viewBox is 24x24, so iconSize controls scaling
 */
export const TEXTURE_PATTERNS: Record<Exclude<TextureId, 'none'>, TexturePattern> = {
    point: {
        id: 'point',
        name: 'Circle',
        nameZh: 'Circle',
        svgRaw: prepareSvg(circleSvgRaw),
        iconSize: 16,
        tileSize: 36,
        supportsColor: true,
    },

    cross: {
        id: 'cross',
        name: 'Cross',
        nameZh: 'Cross',
        svgRaw: prepareSvg(crossSvgRaw),
        iconSize: 16,
        tileSize: 48,
        supportsColor: true,
    },
};

/**
 * Generate a data URL for a texture pattern with specified color
 * 
 * The SVG is transformed to:
 * 1. Use the specified color instead of currentColor
 * 2. Scale to the configured iconSize
 * 3. Tile at the configured tileSize
 * 
 * @param textureId - The texture pattern to use
 * @param color - CSS color value (e.g., 'rgba(128, 128, 128, 0.1)')
 * @returns Data URL for use in CSS background-image
 */
export function generateTextureDataUrl(textureId: Exclude<TextureId, 'none'>, color: string = 'rgba(128, 128, 128, 0.1)'): string {
    const pattern = TEXTURE_PATTERNS[textureId];
    if (!pattern) {
        console.warn(`Texture pattern "${textureId}" not found`);
        return '';
    }

    const { svgRaw, iconSize, tileSize } = pattern;

    // Calculate offset to center the icon in the tile
    const offset = (tileSize - iconSize) / 2;

    // Extract just the inner content (path elements) from the raw SVG
    const innerContent = svgRaw
        .replace(/<svg[^>]*>/, '')  // Remove opening <svg> tag
        .replace(/<\/svg>/, '')      // Remove closing </svg> tag
        .replace(/currentColor/g, color);  // Replace all currentColor with actual color

    // Create a new SVG that:
    // 1. Has the tile size as its dimensions
    // 2. Contains the original icon scaled and centered
    const tiledSvg = `<svg width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" xmlns="http://www.w3.org/2000/svg">` +
        `<svg x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">` +
        innerContent +
        `</svg></svg>`;

    // Encode SVG for data URL using base64 for better compatibility
    const base64Svg = btoa(tiledSvg);
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
    return pattern ? `${pattern.tileSize}px ${pattern.tileSize}px` : '48px 48px';
}
