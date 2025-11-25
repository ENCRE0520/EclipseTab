import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { GRADIENT_PRESETS } from '../constants/gradients';

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
        // Reset texture when gradient is set
        if (id) {
            setTextureState('none');
            storage.saveTexture('none');
        }
    }, []);

    const setTexture = useCallback((newTexture: Texture) => {
        setTextureState(newTexture);
        storage.saveTexture(newTexture);
        // Reset wallpaper and gradient when texture is set (if we want strict exclusivity, 
        // but user requirement says "only applied to solid color background", 
        // so we might just want to ensure they are null if we want to force it, 
        // OR just let the effect handle the precedence. 
        // Let's clear them to be safe and avoid confusion.)
        if (newTexture !== 'none') {
            setWallpaperState(null);
            storage.saveWallpaper(null);
            setGradientIdState(null);
            storage.saveGradient(null);
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Apply wallpaper or gradient to body background
    useEffect(() => {
        const root = document.documentElement;

        // Reset all background properties first
        root.style.removeProperty('--background-custom');
        root.style.removeProperty('--background-size');
        root.style.removeProperty('--background-position');
        root.removeAttribute('data-texture');

        if (wallpaper) {
            // Wallpaper takes precedence
            root.style.setProperty('--background-custom', `url(${wallpaper})`);
            root.style.setProperty('--background-size', 'cover');
            root.style.setProperty('--background-position', 'center');
        } else if (gradientId) {
            // Apply gradient
            const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId);
            if (gradient) {
                root.style.setProperty('--background-custom', gradient.gradient);
            }
        } else {
            // Solid color mode (default background)
            // Apply texture if selected
            if (texture !== 'none') {
                root.setAttribute('data-texture', texture);
            }
        }
    }, [wallpaper, gradientId, texture]);

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
