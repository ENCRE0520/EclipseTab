import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { GRADIENT_PRESETS } from '../constants/gradients';
import pointTextureBg from '../assets/PointTextureBG.svg';
import xTextureBg from '../assets/XTextureBG.svg';

export type Theme = 'default' | 'light' | 'dark';
export type Texture = 'none' | 'point' | 'x';

export const DEFAULT_THEME_COLORS = {
    light: '#F3F3F3',
    dark: '#404040',
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MAX_WALLPAPER_SIZE = 2 * 1024 * 1024; // 2MB limit

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

    // Core theme state
    const [manualTheme, setManualTheme] = useState<Theme>(() => {
        const saved = storage.getTheme();
        return (saved as Theme) || 'default';
    });

    const [followSystem, setFollowSystemState] = useState<boolean>(() => {
        return storage.getFollowSystem();
    });

    const [wallpaper, setWallpaperState] = useState<string | null>(() => {
        return storage.getWallpaper();
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
    }, []);

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

        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                setWallpaperState(base64);
                storage.saveWallpaper(base64);
                resolve();
            };

            reader.onerror = () => {
                reject(new Error('图片读取失败'));
            };

            reader.readAsDataURL(file);
        });
    }, []);

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
    useEffect(() => {
        const root = document.documentElement;

        // Reset all background properties first
        root.style.removeProperty('--background-custom');
        root.style.removeProperty('--background-size');
        root.style.removeProperty('--background-position');
        root.style.removeProperty('--background-image');
        root.removeAttribute('data-texture');


        if (wallpaper) {
            // Wallpaper takes precedence - always fill entire page
            root.style.setProperty('--background-custom', `url(${wallpaper})`);

            // For wallpapers, assume light background (can't analyze image brightness)
            // Only apply this for default theme
            if (isDefaultTheme) {
                root.setAttribute('data-background-brightness', 'light');
            } else {
                root.removeAttribute('data-background-brightness');
            }
        } else {
            // Determine background color/gradient
            let backgroundValue = '';

            if (gradientId) {
                const preset = GRADIENT_PRESETS.find(g => g.id === gradientId);
                if (preset) {
                    if (preset.id === 'theme-default') {
                        // Use dynamic color based on current theme
                        if (isDefaultTheme) {
                            // Default theme specific gradient
                            backgroundValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #8BA9D4 100%)';
                        } else {
                            // Light/Dark theme solid colors
                            const isDarkTheme = theme === 'dark';
                            backgroundValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                        }
                    } else if (isDefaultTheme) {
                        backgroundValue = preset.gradient;
                    } else {
                        backgroundValue = preset.solid;
                    }
                }
            }

            if (backgroundValue) {
                root.style.setProperty('--background-custom', backgroundValue);

                // Apply blend mode if present in the selected gradient
                const preset = GRADIENT_PRESETS.find(g => g.id === gradientId);
                if (preset && 'blendMode' in preset && preset.blendMode) {
                    root.style.setProperty('--background-blend-mode', preset.blendMode);
                } else {
                    root.style.removeProperty('--background-blend-mode');
                }
            }

            // Apply texture if enabled and not Default theme
            if (!isDefaultTheme && texture !== 'none') {
                const textureUrl = texture === 'point' ? pointTextureBg : xTextureBg;

                if (backgroundValue) {
                    root.style.setProperty('--background-custom', `url(${textureUrl}), ${backgroundValue}`);
                } else {
                    root.style.setProperty('--background-custom', `url(${textureUrl})`);
                }
            }

            // Detect background brightness for default theme only
            if (isDefaultTheme && backgroundValue) {
                const isLight = isBackgroundLight(backgroundValue);
                root.setAttribute('data-background-brightness', isLight ? 'light' : 'dark');
            } else {
                root.removeAttribute('data-background-brightness');
            }
        }

        // ALWAYS set cover and center for consistent fill behavior across all themes
        root.style.setProperty('--background-size', 'cover');
        root.style.setProperty('--background-position', 'center');
    }, [wallpaper, gradientId, texture, isDefaultTheme, theme]);

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
