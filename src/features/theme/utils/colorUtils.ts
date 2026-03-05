import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import mixPlugin from 'colord/plugins/mix';

extend([namesPlugin, mixPlugin]);

/**
 * Extracts a representative color from a background string (solid or gradient)
 * and generates a texture color that is slightly more saturated and darker.
 */
export function getTextureColorFromBackground(background: string): string {
    // 1. Try to extract hex colors
    const startHex = background.match(/#[a-fA-F0-9]{6}/);
    let baseColor = '#808080'; // Default gray

    if (startHex) {
        baseColor = startHex[0];
    } else {
        // Handle rgba or other formats if needed, or fallback
        const rgba = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (rgba) {
            baseColor = `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
        }
    }

    // 2. Generate texture color using colord
    // Slightly more saturated and darker
    const textureColor = colord(baseColor)
        .saturate(0.1)  // Increase saturation by 10%
        .darken(0.2)    // Decrease lightness by 20%
        .alpha(0.4)     // Set transparency for overlay
        .toRgbString();

    return textureColor;
}
