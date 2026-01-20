import React from 'react';
import { useThemeData } from '../../context/ThemeContext';
import styles from './Background.module.css';

// Helper function to extract URL from background value
// Only returns URL if the background is purely a wallpaper image (no texture overlay)
const extractWallpaperUrl = (bgValue: string): string | null => {
    // If the background contains a comma, it has multiple layers (e.g., texture + color)
    // In this case, we should render as a div with background style, not as an img
    if (bgValue.includes(',')) {
        return null;
    }
    // Only match if the entire value is a single url() that's NOT a data URL (data URLs are textures)
    const match = bgValue.match(/^url\(['"]?([^'"]+)['"]?\)$/);
    if (match && !match[1].startsWith('data:')) {
        return match[1];
    }
    return null;
};

export const Background: React.FC = () => {
    const { backgroundValue, backgroundBlendMode } = useThemeData();
    const [layers, setLayers] = React.useState<Array<{
        id: number;
        value: string;
        blendMode: string;
        wallpaperUrl: string | null;
        visible: boolean;
    }>>([]);

    // Initialize/Update layers when background changes
    React.useEffect(() => {
        const timestamp = Date.now();
        const wallpaperUrl = extractWallpaperUrl(backgroundValue);

        const newLayer = {
            id: timestamp,
            value: backgroundValue,
            blendMode: backgroundBlendMode,
            wallpaperUrl,
            visible: false
        };

        setLayers(prev => {
            // Keep at most one previous layer to avoid stack buildup
            const activeLayers = prev.slice(-1);
            return [...activeLayers, newLayer];
        });

        // Trigger fade-in after a brief delay to ensure initial render (opacity: 0) is applied
        const animId = setTimeout(() => {
            setLayers(prev => prev.map(l =>
                l.id === timestamp ? { ...l, visible: true } : l
            ));
        }, 50);

        // Cleanup old layers after transition
        const cleanupId = setTimeout(() => {
            setLayers(prev => prev.filter(l => l.id === timestamp));
        }, 300); // 300ms > 250ms transition

        return () => {
            clearTimeout(animId);
            clearTimeout(cleanupId);
        };
    }, [backgroundValue, backgroundBlendMode]);

    return (
        <div className={styles.container}>
            {layers.map((layer) => (
                <div key={layer.id} className={styles.layerWrapper}>
                    {layer.wallpaperUrl ? (
                        <img
                            src={layer.wallpaperUrl}
                            alt=""
                            className={styles.layer}
                            style={{
                                mixBlendMode: layer.blendMode as any,
                                opacity: layer.visible ? 1 : 0,
                                zIndex: layer.id, // Ensure newer layers are on top
                            }}
                        />
                    ) : (
                        <div
                            className={styles.layer}
                            style={{
                                background: layer.value,
                                backgroundBlendMode: layer.blendMode,
                                backgroundSize: 'var(--background-size)',
                                backgroundPosition: 'var(--background-position)',
                                backgroundRepeat: 'var(--background-repeat)',
                                opacity: layer.visible ? 1 : 0,
                                zIndex: layer.id,
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};
