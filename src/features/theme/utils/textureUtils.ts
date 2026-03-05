/**
 * Fetches an SVG from a URL and replaces its fill color.
 * Returns a Blob URL for the modified SVG.
 * 
 * @param svgUrl The URL of the original SVG
 * @param color The new fill color (hex or rgba)
 * @returns Promise resolving to a blob: URL string
 */
export async function createDynamicTextureUrl(svgUrl: string, color: string): Promise<string> {
    try {
        const response = await fetch(svgUrl);
        let svgText = await response.text();

        // Replace the fill color. The original SVGs use #80808026.
        // We act aggressively and replace any fill="..." or style="fill:..." if we want,
        // but looking at the SVGs, they consistently use fill attribute.
        // To be safe and generic for these specific textures, we'll replace the known hardcoded color
        // OR simply replace all fill attributes if they are defining the shape color.

        // Strategy: Replace specific known fill or all fills if generic.
        // Given the artifacts analysis: fill="#80808026"
        // Let's simple regex replace it.

        // Note: Using a regex to replace the fill value.
        // We'll replace fill="#80808026" or similar. 
        // Actually, to be robust, we can parse it, but regex is faster and sufficient here.

        // Replace generic fill attributes
        // Case 1: fill="#..."
        svgText = svgText.replace(/fill="[^"]*"/g, `fill="${color}"`);

        // Case 2: Ensure we don't break 'none' fills if they exist (unlikely in these textures but possible)
        // If we want to be more specific to the background texture implementation:
        // The textures provided have a single color.

        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Failed to create dynamic texture:', error);
        return svgUrl; // Fallback to original
    }
}
