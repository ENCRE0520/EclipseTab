import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { useWallpaperStorage } from '../hooks/useWallpaperStorage';
import { GRADIENT_PRESETS } from '../constants/gradients';
import { generateTextureDataUrl, getTextureSize, type TextureId } from '../constants/textures';
import { getTextureColorFromBackground } from '../utils/colorUtils';

export type Theme = 'default' | 'light' | 'dark';
export type Texture = TextureId;
export type DockPosition = 'center' | 'bottom';
export type IconSize = 'large' | 'small';

export const DEFAULT_THEME_COLORS = {
    light: '#f1f1f1',
    dark: '#2C2C2E',
};

// ============================================================================
// 数据层 Context (变化时需要重渲染)
// ============================================================================
interface ThemeDataContextType {
    theme: Theme;
    followSystem: boolean;
    wallpaper: string | null;
    lastWallpaper: string | null;
    gradientId: string | null;
    texture: Texture;
    wallpaperId: string | null;
    backgroundValue: string;
    backgroundBaseValue: string;
    backgroundTextureValue: string | null;
    backgroundTextureTileSize: string;
    backgroundBlendMode: string;
    dockPosition: DockPosition;
    iconSize: IconSize;
}

const ThemeDataContext = createContext<ThemeDataContextType | undefined>(undefined);

// ============================================================================
// 操作层 Context (几乎不变)
// ============================================================================
interface ThemeActionsContextType {
    setTheme: (theme: Theme) => void;
    setFollowSystem: (follow: boolean) => void;
    setWallpaper: (wallpaper: string | null) => void;
    uploadWallpaper: (file: File) => Promise<void>;
    setGradientId: (gradientId: string | null) => void;
    setTexture: (texture: Texture) => void;
    setWallpaperId: (id: string) => Promise<void>;
    setDockPosition: (position: DockPosition) => void;
    setIconSize: (size: IconSize) => void;
}

const ThemeActionsContext = createContext<ThemeActionsContextType | undefined>(undefined);

// ============================================================================
// 兼容层 (组合类型)
// ============================================================================
type ThemeContextType = ThemeDataContextType & ThemeActionsContextType;

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

    // Extract all colors from the string
    const colors: string[] = [];
    const hexRegex = /#[0-9A-Fa-f]{6}/g;
    const rgbRegex = /rgba?\([^)]+\)/g;

    const hexMatches = backgroundValue.match(hexRegex);
    if (hexMatches) colors.push(...hexMatches);

    const rgbMatches = backgroundValue.match(rgbRegex);
    if (rgbMatches) colors.push(...rgbMatches);

    if (colors.length === 0) return false;

    // Calculate luminance for each color
    let totalLuminance = 0;
    let maxLuminance = 0;

    colors.forEach(color => {
        let r = 0, g = 0, b = 0;

        if (color.startsWith('#')) {
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                r = parseInt(match[0]);
                g = parseInt(match[1]);
                b = parseInt(match[2]);
            }
        }

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        totalLuminance += luminance;
        if (luminance > maxLuminance) {
            maxLuminance = luminance;
        }
    });

    const averageLuminance = totalLuminance / colors.length;

    // Use a combined score: average (overall brightness) + max (brightest spot)
    // This helps detect gradients that fade to light, ensuring readability on the light parts
    const score = (averageLuminance + maxLuminance) / 2;

    return score > 0.4;
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

    // Dock layout settings
    const [dockPosition, setDockPositionState] = useState<DockPosition>(() => {
        return storage.getDockPosition();
    });

    const [iconSize, setIconSizeState] = useState<IconSize>(() => {
        return storage.getIconSize();
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

    // Update dock position
    const setDockPosition = useCallback((position: DockPosition) => {
        setDockPositionState(position);
        storage.saveDockPosition(position);
    }, []);

    // Update icon size
    const setIconSize = useCallback((size: IconSize) => {
        setIconSizeState(size);
        storage.saveIconSize(size);
    }, []);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Apply wallpaper or gradient/solid/texture to body background
    // Compute background value and blend mode
    // Apply wallpaper or gradient/solid/texture to body background
    // Compute background value and blend mode
    const { backgroundValue, backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode } = React.useMemo(() => {
        let fullBgValue = '';
        let baseValue = '';
        let textureValue: string | null = null;
        let textureTileSize = 'cover';
        let blendMode = 'normal';

        if (wallpaper) {
            baseValue = `url(${wallpaper})`;
            fullBgValue = baseValue;
        } else {
            if (gradientId) {
                const preset = GRADIENT_PRESETS.find(g => g.id === gradientId);
                if (preset) {
                    if (preset.id === 'theme-default') {
                        if (isDefaultTheme) {
                            baseValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #7e9ecb 100%)';
                        } else {
                            const isDarkTheme = theme === 'dark';
                            baseValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                        }
                    } else if (isDefaultTheme) {
                        baseValue = preset.gradient;
                    } else {
                        baseValue = preset.solid;
                    }

                    if ('blendMode' in preset && preset.blendMode) {
                        blendMode = preset.blendMode;
                    }
                }
            } else {
                if (isDefaultTheme) {
                    baseValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #7e9ecb 100%)';
                } else {
                    const isDarkTheme = theme === 'dark';
                    baseValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                }
            }

            fullBgValue = baseValue;

            // Apply texture pattern if enabled (not in default theme and not 'none')
            if (!isDefaultTheme && texture !== 'none') {
                // Calculate dynamic color from the base background
                const textureColor = getTextureColorFromBackground(baseValue);

                const textureDataUrl = generateTextureDataUrl(texture, textureColor);
                textureValue = `url("${textureDataUrl}")`;
                textureTileSize = getTextureSize(texture);
                fullBgValue = `${textureValue}, ${baseValue}`;
            }
        }

        return {
            backgroundValue: fullBgValue,
            backgroundBaseValue: baseValue,
            backgroundTextureValue: textureValue,
            backgroundTextureTileSize: textureTileSize,
            backgroundBlendMode: blendMode
        };
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

        // Configure background sizing and positioning
        const hasTexture = !isDefaultTheme && texture !== 'none' && !wallpaper;
        if (hasTexture) {
            // Texture pattern layer + solid/gradient layer
            const textureSize = getTextureSize(texture);
            root.style.setProperty('--background-size', `${textureSize}, cover`);
            root.style.setProperty('--background-position', '0 0, center');
            root.style.setProperty('--background-repeat', 'repeat, no-repeat');
        } else {
            // Single layer (wallpaper or solid/gradient)
            root.style.setProperty('--background-size', 'cover');
            root.style.setProperty('--background-position', 'center');
            root.style.setProperty('--background-repeat', 'no-repeat');
        }

        if (backgroundBlendMode !== 'normal') {
            root.style.setProperty('--background-blend-mode', backgroundBlendMode);
        } else {
            root.style.removeProperty('--background-blend-mode');
        }

        // Set icon size CSS variable
        root.style.setProperty('--icon-size', iconSize === 'small' ? '52px' : '64px');
    }, [backgroundValue, backgroundBlendMode, isDefaultTheme, iconSize, texture, wallpaper]);

    // ========================================================================
    // 性能优化: 分离 data 和 actions context values
    // ========================================================================
    const dataValue: ThemeDataContextType = useMemo(() => ({
        theme,
        followSystem,
        wallpaper,
        lastWallpaper,
        gradientId,
        texture,
        wallpaperId,
        backgroundValue,
        backgroundBaseValue,
        backgroundTextureValue,
        backgroundTextureTileSize,
        backgroundBlendMode,
        dockPosition,
        iconSize,
    }), [theme, followSystem, wallpaper, lastWallpaper, gradientId, texture, wallpaperId, backgroundValue, backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode, dockPosition, iconSize]);

    const actionsValue: ThemeActionsContextType = useMemo(() => ({
        setTheme,
        setFollowSystem,
        setWallpaper,
        uploadWallpaper,
        setGradientId,
        setTexture,
        setWallpaperId,
        setDockPosition,
        setIconSize,
    }), [setTheme, setFollowSystem, setWallpaper, uploadWallpaper, setGradientId, setTexture, setWallpaperId, setDockPosition, setIconSize]);

    return (
        <ThemeDataContext.Provider value={dataValue}>
            <ThemeActionsContext.Provider value={actionsValue}>
                {children}
            </ThemeActionsContext.Provider>
        </ThemeDataContext.Provider>
    );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取主题数据状态 (变化时触发重渲染)
 * 用于需要读取 theme、wallpaper 等数据的组件
 */
export const useThemeData = (): ThemeDataContextType => {
    const context = useContext(ThemeDataContext);
    if (context === undefined) {
        throw new Error('useThemeData must be used within a ThemeProvider');
    }
    return context;
};

/**
 * 获取主题操作方法 (几乎不变)
 * 用于只需要调用 setTheme、setWallpaper 等操作的组件
 */
export const useThemeActions = (): ThemeActionsContextType => {
    const context = useContext(ThemeActionsContext);
    if (context === undefined) {
        throw new Error('useThemeActions must be used within a ThemeProvider');
    }
    return context;
};

/**
 * 获取完整的 Theme Context (兼容层)
 * 组合 ThemeDataContext 和 ThemeActionsContext
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useThemeData 或 useThemeActions
 */
export const useTheme = (): ThemeContextType => {
    const data = useThemeData();
    const actions = useThemeActions();
    return { ...data, ...actions };
};
