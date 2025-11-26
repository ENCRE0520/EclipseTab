import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { GRADIENT_PRESETS } from '../constants/gradients';
import pointTextureBg from '../assets/PointTextureBG.svg';
import xTextureBg from '../assets/XTextureBG.svg';

export type Theme = 'default' | 'light' | 'dark';
export type Texture = 'none' | 'point' | 'x';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    followSystem: boolean;
    setFollowSystem: (follow: boolean) => void;
    wallpaper: string | null;
    setWallpaper: (wallpaper: string | null) => void;
    uploadWallpaper: (file: File) => Promise<void>;
    gradientId: string | null;
    setGradientId: (gradientId: string | null) => void;
    texture: Texture;
    setTexture: (texture: Texture) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MAX_WALLPAPER_SIZE = 2 * 1024 * 1024; // 2MB limit

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
                            backgroundValue = isDarkTheme ? '#404040' : '#F3F3F3';
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
