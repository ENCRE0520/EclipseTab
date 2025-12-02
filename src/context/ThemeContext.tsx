import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { useWallpaperStorage } from '../hooks/useWallpaperStorage';
import { GRADIENT_PRESETS } from '../constants/gradients';
import pointTextureBg from '../assets/PointTextureBG.svg';
import xTextureBg from '../assets/XTextureBG.svg';

export type Theme = 'default' | 'light' | 'dark';
export type Texture = 'none' | 'point' | 'x';

export const DEFAULT_THEME_COLORS = {
    light: '#f1f1f1',
    dark: '#2C2C2E',
};

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    followSystem: boolean;
    setFollowSystem: (follow: boolean) => void;
    wallpaper: string | null;
    setWallpaper: (wallpaper: string | null) => void;
    uploadWallpaper: (file: File) => Promise<void>;
    lastWallpaper: string | null;
    gradientId: string | null;
    setGradientId: (gradientId: string | null) => void;
    texture: Texture;
    setTexture: (texture: Texture) => void;
    wallpaperId: string | null;
    setWallpaperId: (id: string) => Promise<void>;
    backgroundValue: string;
    backgroundBlendMode: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MAX_WALLPAPER_SIZE = 20 * 1024 * 1024; // 20MB limit

/**
 * Determines if a background color/gradient is light or dark
 * Returns true if the background is light (needs dark text)
 */
const isBackgroundLight = (backgroundValue: string): boolean => {
    // If it's a wallpaper URL, assume light background (can't analyze image)
    if (backgroundValue.startsWith('url(')) {
        return true;
    }

    // Extract color from gradient or solid color
    let color = '';

    // For gradients, extract the first color
    if (backgroundValue.includes('gradient')) {
        const colorMatch = backgroundValue.match(/#[0-9A-Fa-f]{6}|rgba?\([^)]+\)/);
        if (colorMatch) {
            color = colorMatch[0];
        }
    } else {
        // Solid color
        color = backgroundValue;
    }

    if (!color) return false;

    // Convert color to RGB values
    let r = 0, g = 0, b = 0;

    if (color.startsWith('#')) {
        // Hex color
        const hex = color.substring(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
        // RGB/RGBA color
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        }
    }

    // Calculate relative luminance using sRGB formula
    // https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // If luminance > 0.5, it's a light background
    return luminance > 0.5;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemTheme = useSystemTheme();

    // Wallpaper storage hook
    const { saveWallpaper: saveToDb, getWallpaper: getFromDb, createWallpaperUrl } = useWallpaperStorage();

    // Core theme state
    const [manualTheme, setManualTheme] = useState<Theme>(() => {
        const saved = storage.getTheme();
        return (saved as Theme) || 'default';
    });

    const [followSystem, setFollowSystemState] = useState<boolean>(() => {
        return storage.getFollowSystem();
    });

    // Current wallpaper URL (blob URL or base64)
    const [wallpaper, setWallpaperState] = useState<string | null>(() => {
        return storage.getWallpaper();
    });

    // Current wallpaper ID (for IndexedDB)
    const [wallpaperId, setWallpaperIdState] = useState<string | null>(() => {
        return storage.getWallpaperId();
    });

    const [lastWallpaper] = useState<string | null>(() => {
        return storage.getLastWallpaper();
    });

    const [gradientId, setGradientIdState] = useState<string | null>(() => {
        return storage.getGradient();
    });

    const [texture, setTextureState] = useState<Texture>(() => {
        return (storage.getTexture() as Texture) || 'none';
    });

    // Computed theme: use system theme if followSystem is enabled
    const theme = followSystem ? systemTheme : manualTheme;
    const isDefaultTheme = manualTheme === 'default' && !followSystem;

    // Load wallpaper from DB if ID exists
    useEffect(() => {
        if (wallpaperId) {
            getFromDb(wallpaperId).then(blob => {
                if (blob) {
                    const url = createWallpaperUrl(blob);
                    setWallpaperState(url);
                }
            });
        }
    }, [wallpaperId, getFromDb, createWallpaperUrl]);

    // Update manual theme
    const setTheme = useCallback((newTheme: Theme) => {
        setManualTheme(newTheme);
        storage.saveTheme(newTheme);
        // When manually setting theme, disable follow system
        if (followSystem) {
            setFollowSystemState(false);
            storage.saveFollowSystem(false);
        }
    }, [followSystem]);

    // Update follow system setting
    const setFollowSystem = useCallback((follow: boolean) => {
        setFollowSystemState(follow);
        storage.saveFollowSystem(follow);
    }, []);

    // Update wallpaper
    const setWallpaper = useCallback((wp: string | null) => {
        setWallpaperState(wp);
        storage.saveWallpaper(wp);
        if (!wp) {
            setWallpaperIdState(null);
            storage.saveWallpaperId(null);
        }
    }, []);

    // Set wallpaper by ID (from gallery)
    const setWallpaperId = useCallback(async (id: string) => {
        setWallpaperIdState(id);
        storage.saveWallpaperId(id);
        const blob = await getFromDb(id);
        if (blob) {
            const url = createWallpaperUrl(blob);
            setWallpaperState(url);
            storage.saveWallpaper(null); // Clear legacy base64 storage
        }
    }, [getFromDb, createWallpaperUrl]);

    // Upload wallpaper file
    const uploadWallpaper = useCallback(async (file: File) => {
        // Validate file size
        if (file.size > MAX_WALLPAPER_SIZE) {
            throw new Error(`图片大小不能超过 ${MAX_WALLPAPER_SIZE / 1024 / 1024}MB`);
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('请选择图片文件');
        }

        try {
            const id = await saveToDb(file);
            await setWallpaperId(id);
        } catch (error) {
            console.error('Failed to upload wallpaper:', error);
            throw error;
        }
    }, [saveToDb, setWallpaperId]);

    // Update gradient
    const setGradientId = useCallback((id: string | null) => {
        setGradientIdState(id);
        storage.saveGradient(id);
        // We don't necessarily reset texture here anymore, as texture can coexist with solid color
    }, []);

    const setTexture = useCallback((newTexture: Texture) => {
        setTextureState(newTexture);
        storage.saveTexture(newTexture);
        // If texture is set, we might want to clear wallpaper if it exists?
        // But let's leave that to the UI handler or user choice.
    }, []);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Apply wallpaper or gradient/solid/texture to body background
    // Compute background value and blend mode
    const { backgroundValue, backgroundBlendMode } = React.useMemo(() => {
        let bgValue = '';
        let blendMode = 'normal';

        if (wallpaper) {
            bgValue = `url(${wallpaper})`;
        } else {
            if (gradientId) {
                const preset = GRADIENT_PRESETS.find(g => g.id === gradientId);
                if (preset) {
                    if (preset.id === 'theme-default') {
                        if (isDefaultTheme) {
                            bgValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #8BA9D4 100%)';
                        } else {
                            const isDarkTheme = theme === 'dark';
                            bgValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                        }
                    } else if (isDefaultTheme) {
                        bgValue = preset.gradient;
                    } else {
                        bgValue = preset.solid;
                    }

                    if ('blendMode' in preset && preset.blendMode) {
                        blendMode = preset.blendMode;
                    }
                }
            } else {
                if (isDefaultTheme) {
                    bgValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #8BA9D4 100%)';
                } else {
                    const isDarkTheme = theme === 'dark';
                    bgValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                }
            }

            if (!isDefaultTheme && texture !== 'none') {
                const textureUrl = texture === 'point' ? pointTextureBg : xTextureBg;
                bgValue = `url(${textureUrl}), ${bgValue}`;
            }
        }

        return { backgroundValue: bgValue, backgroundBlendMode: blendMode };
    }, [wallpaper, gradientId, texture, isDefaultTheme, theme]);

    // Apply theme to document and set CSS variables for backward compatibility
    useEffect(() => {
        const root = document.documentElement;

        // Remove data-texture attribute
        root.removeAttribute('data-texture');

        // Detect background brightness for default theme only
        if (isDefaultTheme && backgroundValue) {
            const isLight = isBackgroundLight(backgroundValue);
            root.setAttribute('data-background-brightness', isLight ? 'light' : 'dark');
        } else {
            root.removeAttribute('data-background-brightness');
        }

        // Set CSS variables
        root.style.setProperty('--background-custom', backgroundValue);
        root.style.setProperty('--background-size', 'cover');
        root.style.setProperty('--background-position', 'center');

        if (backgroundBlendMode !== 'normal') {
            root.style.setProperty('--background-blend-mode', backgroundBlendMode);
        } else {
            root.style.removeProperty('--background-blend-mode');
        }
    }, [backgroundValue, backgroundBlendMode, isDefaultTheme]);

    return (
        <ThemeContext.Provider value={{
            theme,
            setTheme,
            followSystem,
            setFollowSystem,
            wallpaper,
            setWallpaper,
            uploadWallpaper,
            lastWallpaper,
            gradientId,
            setGradientId,
            texture,
            setTexture,
            wallpaperId,
            setWallpaperId,
            backgroundValue,
            backgroundBlendMode,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
