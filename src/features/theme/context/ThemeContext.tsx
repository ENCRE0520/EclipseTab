import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { storage } from '@/shared/utils/storage';
import { useSystemTheme } from '@/features/theme/hooks/useSystemTheme';
import { useWallpaperStorage } from '@/features/theme/hooks/useWallpaperStorage';
import { db } from '@/shared/utils/db';
import { GRADIENT_PRESETS } from '@/features/theme/constants/gradients';
import { generateTextureDataUrl, getTextureSize, type TextureId } from '@/features/theme/constants/textures';
import { getTextureColorFromBackground } from '@/features/theme/utils/colorUtils';

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
    wallpaperType: 'image' | 'video';
    gradientId: string | null;
    solidId: string | null;
    texture: Texture;
    wallpaperId: string | null;
    backgroundValue: string;
    backgroundBaseValue: string;
    backgroundTextureValue: string | null;
    backgroundTextureTileSize: string;
    backgroundBlendMode: string;
    dockPosition: DockPosition;
    iconSize: IconSize;
    openInNewTab: boolean;
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
    setSolidId: (solidId: string | null) => void;
    setTexture: (texture: Texture) => void;
    setWallpaperId: (id: string) => Promise<void>;
    setDockPosition: (position: DockPosition) => void;
    setIconSize: (size: IconSize) => void;
    setOpenInNewTab: (openInNewTab: boolean) => void;
}

const ThemeActionsContext = createContext<ThemeActionsContextType | undefined>(undefined);

// ============================================================================
// 兼容层 (组合类型)
// ============================================================================
type ThemeContextType = ThemeDataContextType & ThemeActionsContextType;

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB 图片限制
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB 视频限制

const lightnessCache = new Map<string, boolean>();

const getLuminance = (r: number, g: number, b: number): number =>
    (0.299 * r + 0.587 * g + 0.114 * b) / 255;

const getImageLuminance = (url: string, type: 'image' | 'video'): Promise<number> =>
    new Promise(resolve => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            resolve(0);
            return;
        }

        const sample = (source: CanvasImageSource) => {
            try {
                context.drawImage(source, 0, 0, canvas.width, canvas.height);
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                let total = 0;
                let max = 0;
                let count = 0;

                for (let index = 0; index < pixels.length; index += 4) {
                    const alpha = pixels[index + 3] / 255;
                    if (alpha === 0) continue;
                    const luminance = getLuminance(pixels[index], pixels[index + 1], pixels[index + 2]);
                    total += luminance * alpha + (1 - alpha);
                    max = Math.max(max, luminance);
                    count += 1;
                }

                resolve(count ? (total / count + max) / 2 : 0);
            } catch {
                // A failed read (for example a browser security restriction) uses the dark-text-safe fallback.
                resolve(1);
            }
        };

        if (type === 'video') {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.src = url;
            video.addEventListener('loadeddata', () => sample(video), { once: true });
            video.addEventListener('error', () => resolve(1), { once: true });
            video.load();
        } else {
            const image = new Image();
            image.addEventListener('load', () => sample(image), { once: true });
            image.addEventListener('error', () => resolve(1), { once: true });
            image.src = url;
        }
    });

/**
 * 判断背景是浅色还是深色。图片和视频使用实际画面采样，避免 blob 壁纸被固定判定为浅色。
 * 返回 true 表示需要深色文字。
 */
const isBackgroundLight = async (backgroundValue: string, wallpaperType: 'image' | 'video'): Promise<boolean> => {
    const cacheKey = `${wallpaperType}:${backgroundValue}`;
    if (lightnessCache.has(cacheKey)) return lightnessCache.get(cacheKey)!;

    const wallpaperMatch = backgroundValue.match(/^url\((['"]?)(.*?)\1\)$/);
    let score: number;

    if (wallpaperMatch) {
        score = await getImageLuminance(wallpaperMatch[2], wallpaperType);
    } else {
        const colors = backgroundValue.match(/#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)/g) ?? [];
        if (colors.length === 0) return false;

        const luminances = colors.map(color => {
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                const normalized = hex.length <= 4
                    ? hex.slice(0, 3).split('').map(value => value + value).join('')
                    : hex.slice(0, 6);
                return getLuminance(
                    parseInt(normalized.slice(0, 2), 16),
                    parseInt(normalized.slice(2, 4), 16),
                    parseInt(normalized.slice(4, 6), 16),
                );
            }

            const values = color.match(/[\d.]+/g);
            return values && values.length >= 3
                ? getLuminance(Number(values[0]), Number(values[1]), Number(values[2]))
                : 0;
        });
        score = (luminances.reduce((sum, value) => sum + value, 0) / luminances.length + Math.max(...luminances)) / 2;
    }

    const result = score > 0.45;
    if (lightnessCache.size > 50) {
        const firstKey = lightnessCache.keys().next().value;
        if (firstKey) lightnessCache.delete(firstKey);
    }
    lightnessCache.set(cacheKey, result);
    return result;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemTheme = useSystemTheme();

    // 壁纸存储钩子
    const { saveWallpaper: saveToDb, createWallpaperUrl } = useWallpaperStorage();

    // 核心主题状态
    const [manualTheme, setManualTheme] = useState<Theme>(() => {
        const saved = storage.getTheme();
        return (saved as Theme) || 'default';
    });

    const [followSystem, setFollowSystemState] = useState<boolean>(() => {
        return storage.getFollowSystem();
    });

    // Current wallpaper URL (blob URL, 仅内存状态)
    const [wallpaper, setWallpaperState] = useState<string | null>(null);

    // Current wallpaper type
    const [wallpaperType, setWallpaperType] = useState<'image' | 'video'>('image');

    // Current wallpaper ID (for IndexedDB)
    const [wallpaperId, setWallpaperIdState] = useState<string | null>(() => {
        return storage.getWallpaperId();
    });

    // 清理旧版壁纸 localStorage 数据
    useEffect(() => {
        storage.cleanupLegacyWallpaper();
    }, []);

    const [gradientId, setGradientIdState] = useState<string | null>(() => {
        return storage.getGradient();
    });

    const [solidId, setSolidIdState] = useState<string | null>(() => {
        return storage.getSolidGradient();
    });

    const [texture, setTextureState] = useState<Texture>(() => {
        return (storage.getTexture() as Texture) || 'none';
    });

    // Dock 布局设置
    const [dockPosition, setDockPositionState] = useState<DockPosition>(() => {
        return storage.getDockPosition();
    });

    const [iconSize, setIconSizeState] = useState<IconSize>(() => {
        return storage.getIconSize();
    });

    const [openInNewTab, setOpenInNewTabState] = useState<boolean>(() => {
        return storage.getOpenInNewTab();
    });

    // 计算主题：如果启用了 followSystem，则使用系统主题
    const theme = followSystem ? systemTheme : manualTheme;
    const isDefaultTheme = manualTheme === 'default' && !followSystem;

    // 如果 ID 存在，从数据库加载壁纸
    useEffect(() => {
        if (wallpaperId) {
            // 需要获取完整的 WallpaperItem 以读取 type
            db.get(wallpaperId).then(item => {
                if (item) {
                    const url = createWallpaperUrl(item.data);
                    setWallpaperState(url);
                    setWallpaperType(item.type || 'image');
                }
            });
        }
    }, [wallpaperId, createWallpaperUrl]);

    // 更新手动主题
    const setTheme = useCallback((newTheme: Theme) => {
        setManualTheme(newTheme);
        storage.saveTheme(newTheme);
        // 手动设置主题时，禁用跟随系统
        if (followSystem) {
            setFollowSystemState(false);
            storage.saveFollowSystem(false);
        }
    }, [followSystem]);

    // 更新跟随系统设置
    const setFollowSystem = useCallback((follow: boolean) => {
        setFollowSystemState(follow);
        storage.saveFollowSystem(follow);
    }, []);

    // 更新壁纸
    const setWallpaper = useCallback((wp: string | null) => {
        setWallpaperState(wp);
        if (!wp) {
            setWallpaperIdState(null);
            storage.saveWallpaperId(null);
        }
    }, []);

    // 通过 ID 设置壁纸 (从画廊)
    const setWallpaperId = useCallback(async (id: string) => {
        setWallpaperIdState(id);
        storage.saveWallpaperId(id);
        // 需要获取完整的 WallpaperItem 以读取 type
        const item = await db.get(id);
        if (item) {
            const url = createWallpaperUrl(item.data);
            setWallpaperState(url);
            setWallpaperType(item.type || 'image');
        }
    }, [createWallpaperUrl]);

    // 上传壁纸文件
    const uploadWallpaper = useCallback(async (file: File) => {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        // 验证文件类型
        if (!isImage && !isVideo) {
            throw new Error('请选择图片或视频文件');
        }

        // 验证文件大小
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
            throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
        }

        try {
            const id = await saveToDb(file);
            await setWallpaperId(id);
        } catch (error) {
            console.error('Failed to upload wallpaper:', error);
            throw error;
        }
    }, [saveToDb, setWallpaperId]);

    // 更新渐变 (Default 模式使用)
    const setGradientId = useCallback((id: string | null) => {
        setGradientIdState(id);
        storage.saveGradient(id);
    }, []);

    // 更新纯色 (非 Default 模式使用)
    const setSolidId = useCallback((id: string | null) => {
        setSolidIdState(id);
        storage.saveSolidGradient(id);
    }, []);

    const setTexture = useCallback((newTexture: Texture) => {
        setTextureState(newTexture);
        storage.saveTexture(newTexture);
        // 如果设置了纹理，我们可能想要清除壁纸（如果存在）？
        // 但让我们把这个交给 UI 处理程序或用户选择。
    }, []);

    // 更新 Dock 位置
    const setDockPosition = useCallback((position: DockPosition) => {
        setDockPositionState(position);
        storage.saveDockPosition(position);
    }, []);

    // 更新图标大小
    const setIconSize = useCallback((size: IconSize) => {
        setIconSizeState(size);
        storage.saveIconSize(size);
    }, []);

    // 更新打开标签页方式
    const setOpenInNewTab = useCallback((open: boolean) => {
        setOpenInNewTabState(open);
        storage.saveOpenInNewTab(open);
    }, []);

    // 将主题应用到文档
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // 将壁纸或渐变/纯色/纹理应用到 body 背景
    // 计算背景值和混合模式
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
            // 根据当前模式选择对应的活动 ID
            const activeId = isDefaultTheme ? gradientId : (solidId || gradientId);

            if (activeId) {
                const preset = GRADIENT_PRESETS.find(g => g.id === activeId);
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
                        const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
                        baseValue = isDarkTheme && 'solidDark' in preset ? preset.solidDark : preset.solid;
                    }

                    if ('blendMode' in preset && (preset as any).blendMode) {
                        blendMode = (preset as any).blendMode;
                    }
                }
            } else {
                // 如果没有显式设置 ID，尝试使用默认逻辑
                if (isDefaultTheme) {
                    baseValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #7e9ecb 100%)';
                } else {
                    const isDarkTheme = theme === 'dark';
                    baseValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                }
            }

            fullBgValue = baseValue;

            // 如果启用，应用纹理图案 (不在默认主题且不为 'none')
            if (!isDefaultTheme && texture !== 'none') {
                // 从基础背景计算动态颜色
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
    }, [wallpaper, gradientId, solidId, texture, isDefaultTheme, theme, followSystem, systemTheme]);

    // 将主题应用到文档，并设置 CSS 变量以保持向后兼容
    useEffect(() => {
        const root = document.documentElement;

        // 移除 data-texture 属性
        root.removeAttribute('data-texture');

        let cancelled = false;

        // 仅对默认主题检测背景亮度
        if (isDefaultTheme && backgroundBaseValue) {
            isBackgroundLight(backgroundBaseValue, wallpaperType).then(isLight => {
                if (!cancelled) {
                    root.setAttribute('data-background-brightness', isLight ? 'light' : 'dark');
                }
            });
        } else {
            root.removeAttribute('data-background-brightness');
        }

        // 设置 CSS 变量
        root.style.setProperty('--background-custom', backgroundValue);

        // 配置背景大小和位置
        const hasTexture = !isDefaultTheme && texture !== 'none' && !wallpaper;
        if (hasTexture) {
            // 纹理图案层 + 纯色/渐变层
            const textureSize = getTextureSize(texture);
            root.style.setProperty('--background-size', `${textureSize}, cover`);
            root.style.setProperty('--background-position', '0 0, center');
            root.style.setProperty('--background-repeat', 'repeat, no-repeat');
        } else {
            // 单层 (壁纸或纯色/渐变)
            root.style.setProperty('--background-size', 'cover');
            root.style.setProperty('--background-position', 'center');
            root.style.setProperty('--background-repeat', 'no-repeat');
        }

        if (backgroundBlendMode !== 'normal') {
            root.style.setProperty('--background-blend-mode', backgroundBlendMode);
        } else {
            root.style.removeProperty('--background-blend-mode');
        }

        // 设置图标大小和圆角 CSS 变量
        root.style.setProperty('--icon-size', iconSize === 'small' ? '52px' : '64px');
        root.style.setProperty(
            '--icon-border-radius',
            iconSize === 'small'
                ? 'var(--radius-default-in)'
                : 'var(--radius-default)'
        );

        return () => {
            cancelled = true;
        };
    }, [backgroundValue, backgroundBaseValue, backgroundBlendMode, isDefaultTheme, iconSize, texture, wallpaper, wallpaperType]);

    // ========================================================================
    // 性能优化: 分离 data 和 actions context values
    // ========================================================================
    const dataValue: ThemeDataContextType = useMemo(() => ({
        theme,
        followSystem,
        wallpaper,
        wallpaperType,
        gradientId,
        solidId,
        texture,
        wallpaperId,
        backgroundValue,
        backgroundBaseValue,
        backgroundTextureValue,
        backgroundTextureTileSize,
        backgroundBlendMode,
        dockPosition,
        iconSize,
        openInNewTab,
    }), [theme, followSystem, wallpaper, wallpaperType, gradientId, solidId, texture, wallpaperId, backgroundValue, backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode, dockPosition, iconSize, openInNewTab]);

    const actionsValue: ThemeActionsContextType = useMemo(() => ({
        setTheme,
        setFollowSystem,
        setWallpaper,
        uploadWallpaper,
        setGradientId,
        setSolidId,
        setTexture,
        setWallpaperId,
        setDockPosition,
        setIconSize,
        setOpenInNewTab,
    }), [setTheme, setFollowSystem, setWallpaper, uploadWallpaper, setGradientId, setSolidId, setTexture, setWallpaperId, setDockPosition, setIconSize, setOpenInNewTab]);

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
