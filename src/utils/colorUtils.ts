import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import mixPlugin from 'colord/plugins/mix';

extend([namesPlugin, mixPlugin]);

// ... (keep existing hexToHsl methods for other usages if needed, or replace them if you prefer. I will append new logic)

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

    // 2. Generate texture color: Saturation +10%, Lightness -10% (relative or absolute)
    // Using colord for robust manipulation
    const color = colord(baseColor);

    // We want the texture to be subtle but visible.
    // "Slightly more saturated and darker"
    const textureColor = color
        .saturate(0.1)  // Increase saturation by 10%
        .darken(0.2)    // Decrease lightness by 20%
        .alpha(0.4)     // Set transparency for overlay
        .toRgbString();

    return textureColor;
}

/**
 * Converts a Hex color to HSL
 * @param hex Hex color string (e.g. #RRGGBB)
 * @returns [h, s, l] tuple where h is 0-360, s is 0-100, l is 0-100
 */
export function hexToHsl(hex: string): [number, number, number] {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt('0x' + hex[1] + hex[1]);
        g = parseInt('0x' + hex[2] + hex[2]);
        b = parseInt('0x' + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt('0x' + hex[1] + hex[2]);
        g = parseInt('0x' + hex[3] + hex[4]);
        b = parseInt('0x' + hex[5] + hex[6]);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;

    let h = 0;
    let s = 0;
    let l = 0;

    if (delta === 0)
        h = 0;
    else if (cmax === r)
        h = ((g - b) / delta) % 6;
    else if (cmax === g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [h, s, l];
}

/**
 * Converts HSL to Hex color
 * @param h Hue 0-360
 * @param s Saturation 0-100
 * @param l Lightness 0-100
 * @returns Hex color string (e.g. #RRGGBB)
 */
export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const toHex = (n: number) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Adjusts a hex color's saturation and lightness
 * @param hex The hex color to adjust
 * @param options.saturationMultiplier Multiplier for saturation (e.g. 1.2 for 20% increase)
 * @param options.lightnessMultiplier Multiplier for lightness (e.g. 0.8 for 20% decrease)
 * @returns The adjusted hex color
 */
export function adjustColor(hex: string, options: { saturationMultiplier: number, lightnessMultiplier: number }): string {
    const [h, s, l] = hexToHsl(hex);

    let newS = s * options.saturationMultiplier;
    let newL = l * options.lightnessMultiplier;

    // Clamp values
    newS = Math.max(0, Math.min(100, newS));
    newL = Math.max(0, Math.min(100, newL));

    return hslToHex(h, newS, newL);
}
