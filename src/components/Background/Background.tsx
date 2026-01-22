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
    const { backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode } = useThemeData();

    // Manage base layers (crossfade)
    const [baseLayers, setBaseLayers] = React.useState<Array<{
        id: number;
        value: string;
        wallpaperUrl: string | null;
        visible: boolean;
    }>>([]);

    // Manage texture layers (sequential: fade out -> wait -> fade in)
    const [textureLayers, setTextureLayers] = React.useState<Array<{
        id: number;
        value: string | null;
        tileSize: string;
        visible: boolean;
    }>>([]);

    // Use refs to track current state for sequential logic
    const textureLayersRef = React.useRef(textureLayers);
    textureLayersRef.current = textureLayers;

    // 1. Handle Base Background Changes (Crossfade)
    React.useEffect(() => {
        const timestamp = Date.now();
        const wallpaperUrl = extractWallpaperUrl(backgroundBaseValue);

        const newLayer = {
            id: timestamp,
            value: backgroundBaseValue,
            wallpaperUrl,
            visible: false
        };

        setBaseLayers(prev => {
            const activeLayers = prev.slice(-1);
            return [...activeLayers, newLayer];
        });

        // Fade in new layer
        const animTimer = setTimeout(() => {
            setBaseLayers(prev => prev.map(l =>
                l.id === timestamp ? { ...l, visible: true } : l
            ));
        }, 50);

        // Cleanup old layers
        const cleanupTimer = setTimeout(() => {
            setBaseLayers(prev => prev.filter(l => l.id === timestamp));
        }, 300);

        return () => {
            clearTimeout(animTimer);
            clearTimeout(cleanupTimer);
        };
    }, [backgroundBaseValue]);

    // 2. Handle Texture Changes (Sequential: Out -> In)
    React.useEffect(() => {
        const timestamp = Date.now();
        // If texture is null/none, we just fade out current texture
        // If texture is new, we fade out old, then fade in new

        const newLayer = {
            id: timestamp,
            value: backgroundTextureValue,
            tileSize: backgroundTextureTileSize,
            visible: false
        };

        // Check if there are ANY layers (even if currently fading out)
        // This enforces strict sequential animation: Old finishes -> New starts
        const hasLayers = textureLayersRef.current.length > 0;

        if (hasLayers) {
            // Fade out current layers
            setTextureLayers(prev => prev.map(l => ({ ...l, visible: false })));

            // Wait, then show new
            const timer = setTimeout(() => {
                // If there is a new texture (not null), add it
                if (backgroundTextureValue) {
                    setTextureLayers([newLayer]);
                    requestAnimationFrame(() => {
                        setTextureLayers(prev => prev.map(l =>
                            l.id === timestamp ? { ...l, visible: true } : l
                        ));
                    });
                } else {
                    // If switching to None, just clear layers
                    setTextureLayers([]);
                }
            }, 300);

            return () => clearTimeout(timer);
        } else {
            // No visible texture, just show new one if exists
            if (backgroundTextureValue) {
                setTextureLayers(prev => [...prev, newLayer]);

                const animTimer = setTimeout(() => {
                    setTextureLayers(prev => prev.map(l =>
                        l.id === timestamp ? { ...l, visible: true } : l
                    ));
                }, 50);

                const cleanupTimer = setTimeout(() => {
                    setTextureLayers(prev => prev.filter(l => l.id === timestamp));
                }, 300);

                return () => {
                    clearTimeout(animTimer);
                    clearTimeout(cleanupTimer);
                };
            } else {
                // Ensure empty if value is null and no visible layers
                setTextureLayers([]);
            }
        }
    }, [backgroundTextureValue, backgroundTextureTileSize]);

    return (
        <div className={styles.container}>
            {/* Base Background Layers */}
            {baseLayers.map((layer) => (
                <div key={`base-${layer.id}`} className={styles.layerWrapper} style={{ zIndex: 0 }}>
                    {layer.wallpaperUrl ? (
                        <img
                            src={layer.wallpaperUrl}
                            alt=""
                            className={styles.layer}
                            style={{
                                opacity: layer.visible ? 1 : 0,
                                zIndex: layer.id,
                            }}
                        />
                    ) : (
                        <div
                            className={styles.layer}
                            style={{
                                background: layer.value,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                opacity: layer.visible ? 1 : 0,
                                zIndex: layer.id,
                            }}
                        />
                    )}
                </div>
            ))}

            {/* Texture Layers (Overlay) */}
            {textureLayers.map((layer) => layer.value ? (
                <div
                    key={`tex-${layer.id}`}
                    className={styles.layerWrapper}
                    style={{ zIndex: 1, mixBlendMode: backgroundBlendMode as any }}
                >
                    <div
                        className={styles.layer}
                        style={{
                            backgroundImage: layer.value,
                            backgroundSize: layer.tileSize || 'var(--background-size)', // Use stored size, fallback to var
                            backgroundPosition: 'center',
                            backgroundRepeat: 'repeat',
                            opacity: layer.visible ? 1 : 0,
                            zIndex: layer.id,
                        }}
                    />
                </div>
            ) : null)}
        </div>
    );
};
