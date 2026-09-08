import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Theme, useTheme, Texture } from '@/features/theme/context/ThemeContext';
import { useSystemTheme } from '@/features/theme/hooks/useSystemTheme';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import { CLOCK_WIDGET_SIZE, ClockWidget } from '@/features/shelf/components/ZenShelf/ClockWidget';
import { ANALOG_CLOCK_WIDGET_SIZE, AnalogClockWidget } from '@/features/shelf/components/ZenShelf/AnalogClockWidget';
import { WIDGET_SIZE } from '@/features/shelf/components/ZenShelf/widgets/WidgetFrame';
import { CalendarWidget } from '@/features/shelf/components/ZenShelf/widgets/CalendarWidget';
import { FocusWidget } from '@/features/shelf/components/ZenShelf/widgets/FocusWidget';
import { CountdownWidget } from '@/features/shelf/components/ZenShelf/widgets/CountdownWidget';
import { GRADIENT_PRESETS } from '@/features/theme/constants/gradients';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import styles from './SettingsModal.module.css';
import { TEXTURE_PATTERNS } from '@/features/theme/constants/textures';
import defaultIcon from '@/assets/icons/star3.svg';
import lightIcon from '@/assets/icons/sun.svg';
import darkIcon from '@/assets/icons/moon.svg';
import autoIcon from '@/assets/icons/monitor.svg';
import slashIcon from '@/assets/icons/slash.svg';
import asteriskIcon from '@/assets/icons/asterisk.svg';
import circleIcon from '@/assets/icons/texture background/circle-preview.svg';
import crossIcon from '@/assets/icons/texture background/cross-preview.svg';
import { WallpaperGallery } from '@/features/theme/components/WallpaperGallery/WallpaperGallery';
import { testConnection, uploadToCloud, fullSyncFromCloud, isAutoSyncEnabled, setAutoSyncEnabled } from '@/features/sync/services/syncManager';
import { getLastSyncTimeLabel } from '@/features/sync/services/syncData';
import { exportFullBackup, importFullBackup } from '@/shared/utils/backup';
import syncStyles from '@/features/sync/components/Modal/SyncModal.module.css';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSection?: SettingsSection;
}

type SettingsSection = 'appearance' | 'behavior' | 'data' | 'widgets';

const SETTINGS_SECTION_HEIGHT = 42;
const SETTINGS_PANEL_CORNER_RADIUS = 32;
const SETTINGS_CONNECTOR_RADIUS = 8;
const SETTINGS_CORNER_MORPH_DISTANCE = SETTINGS_PANEL_CORNER_RADIUS + SETTINGS_CONNECTOR_RADIUS;
const WIDGET_PREVIEW_SCALE = 0.36;

const setSurfaceGeometry = (surface: HTMLDivElement, offset: number) => {
    // When both vertical radii no longer fit in the available distance, shrink
    // only their Y axes. X stays fixed, preserving the width of each curve.
    const distanceProgress = Math.min(1, Math.max(0, offset / SETTINGS_CORNER_MORPH_DISTANCE));
    // Morph toward a normal ellipse only while the two corners are constrained.
    // At a settled lower tab there is enough room, so the panel remains a squircle.
    const shapeProgress = distanceProgress * distanceProgress * (3 - 2 * distanceProgress);

    surface.style.setProperty('--sidebar-highlight-offset', `${offset}px`);
    surface.style.setProperty('--settings-panel-radius-y', `${SETTINGS_PANEL_CORNER_RADIUS * distanceProgress}px`);
    surface.style.setProperty('--settings-connector-radius-y', `${SETTINGS_CONNECTOR_RADIUS * distanceProgress}px`);
    surface.style.setProperty('--settings-join-superellipse', `${1 + shapeProgress}`);
};

// 简单的权限切换组件
const PermissionToggle: React.FC = () => {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    // 一致地定义所有必需的源域
    const REQUIRED_ORIGINS = [
        'https://suggestqueries.google.com/*',
        'https://www.google.com/*',
        'https://suggestion.baidu.com/*'
    ];

    useEffect(() => {
        // 检查初始权限状态
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            chrome.permissions.contains({
                origins: REQUIRED_ORIGINS
            }, (result) => {
                setEnabled(result);
            });
        } else {
            // 开发模式回退 - 检查本地存储
            const savedState = localStorage.getItem('search_suggestions_enabled');
            setEnabled(savedState === 'true');
        }
    }, []);

    const handleToggle = () => {
        if (loading || enabled === null) return;
        setLoading(true);

        // 开发模式回退：如果缺少 chrome API，模拟切换并保存到本地存储
        if (typeof chrome === 'undefined' || !chrome.permissions) {
            setTimeout(() => {
                const newState = !enabled;
                setEnabled(newState);
                localStorage.setItem('search_suggestions_enabled', String(newState));
                setLoading(false);
            }, 300);
            return;
        }

        if (enabled) {
            // 移除权限
            chrome.permissions.remove({ origins: REQUIRED_ORIGINS }, (removed) => {
                if (removed) {
                    setEnabled(false);
                }
                setLoading(false);
            });
        } else {
            // 请求权限
            chrome.permissions.request({ origins: REQUIRED_ORIGINS }, (granted) => {
                if (granted) {
                    setEnabled(true);
                }
                setLoading(false);
            });
        }
    };

    return (
        <div className={styles.layoutToggleGroup}>
            {enabled !== null && (
                <div
                    className={styles.layoutHighlight}
                    style={{
                        transform: `translateX(${enabled ? 0 : 100}%)`,
                    }}
                />
            )}
            <button
                className={styles.layoutToggleOption}
                onClick={enabled === true ? undefined : handleToggle}
                title={t.settings.on}
            >
                {t.settings.on}
            </button>
            <button
                className={styles.layoutToggleOption}
                onClick={enabled === false ? undefined : handleToggle}
                title={t.settings.off}
            >
                {t.settings.off}
            </button>
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialSection = 'appearance' }) => {
    const {
        theme,
        setTheme,
        followSystem,
        setFollowSystem,
        wallpaper,
        setWallpaper,
        wallpaperId,
        setWallpaperId,
        uploadWallpaper,
        gradientId,
        setGradientId,
        solidId,
        setSolidId,
        texture,
        setTexture,
        dockPosition,
        setDockPosition,
        iconSize,
        setIconSize,
        openInNewTab,
        setOpenInNewTab,
    } = useTheme();

    const { language, setLanguage, t } = useLanguage();
    const { addSticker } = useZenShelf();

    const systemTheme = useSystemTheme();
    const [isVisible, setIsVisible] = useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);
    const surfaceShapeRef = useRef<HTMLDivElement>(null);
    const surfaceAnimationFrameRef = useRef<number | null>(null);
    const surfaceOffsetRef = useRef(0);
    const surfaceVelocityRef = useRef(0);
    const isClosingRef = useRef(false);
    const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
    const activeSectionIndex = ['appearance', 'behavior', 'data', 'widgets'].indexOf(activeSection);

    // 云同步状态沿用原同步弹窗的本地配置与交互逻辑
    const [serverUrl, setServerUrl] = useState(localStorage.getItem('EclipseTab_webdav_url') || '');
    const [username, setUsername] = useState(localStorage.getItem('EclipseTab_webdav_user') || '');
    const [password, setPassword] = useState(localStorage.getItem('EclipseTab_webdav_pass') || '');
    const [status, setStatus] = useState<'untested' | 'success' | 'failed'>('untested');
    const [statusMsg, setStatusMsg] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [syncWallpaper, setSyncWallpaper] = useState(() => localStorage.getItem('EclipseTab_syncWallpaper') === 'true');
    const [syncStickers, setSyncStickers] = useState(() => localStorage.getItem('EclipseTab_syncStickers') === 'true');
    const [autoSync, setAutoSync] = useState(() => isAutoSyncEnabled());
    const [isBackupBusy, setIsBackupBusy] = useState(false);
    const backupInputRef = useRef<HTMLInputElement>(null);

    // 确定我们是处于“默认”模式还是“浅色/深色”模式的逻辑
    const isDefaultTheme = theme === 'default' && !followSystem;

    // 注意：纹理仅在非默认主题中显示（在 ThemeContext 中处理）
    // 我们不再在切换到默认主题时重置纹理，这样它就可以被记住

    // 动画效果 - 打开
    useEffect(() => {
        if (isOpen) {
            isClosingRef.current = false;
            setIsVisible(true);
            setActiveSection(initialSection);
        }
    }, [isOpen, initialSection]);

    useEffect(() => {
        if (isOpen && isVisible && modalRef.current) {
            scaleFadeIn(modalRef.current);
        }
    }, [isOpen, isVisible]);

    // 动画效果 - 关闭（由父组件设置 isOpen=false 触发）
    useEffect(() => {
        if (!isOpen && isVisible && !isClosingRef.current) {
            isClosingRef.current = true;
            if (modalRef.current) {
                scaleFadeOut(modalRef.current, 300, () => setIsVisible(false));
            } else {
                setIsVisible(false);
            }
        }
    }, [isOpen, isVisible]);

    const handleThemeSelect = useCallback((selectedTheme: Theme) => {
        setTheme(selectedTheme);
        // 不再需要在 handleThemeSelect 中重置 gradientId，因为它现在是独立的
        if (followSystem) {
            setFollowSystem(false);
        }
    }, [setTheme, followSystem, setFollowSystem]);

    const handleToggleFollowSystem = useCallback(() => {
        setFollowSystem(!followSystem);
    }, [followSystem, setFollowSystem]);

    const handleGradientSelect = useCallback((id: string) => {
        // 如果有壁纸，只需清除它
        if (wallpaper) {
            setWallpaper(null);
        }

        // 根据当前是否为默认主题，决定更新哪一个 ID
        if (isDefaultTheme) {
            if (gradientId === id) {
                // 强制更新逻辑
                setGradientId('theme-default');
                requestAnimationFrame(() => setGradientId(id));
            } else {
                setGradientId(id);
            }
        } else {
            setSolidId(id);
        }
    }, [wallpaper, setWallpaper, gradientId, setGradientId, setSolidId, isDefaultTheme]);

    const handleTextureSelect = useCallback((selectedTexture: Texture) => {
        setTexture(selectedTexture);
    }, [setTexture]);

    const saveToStorage = useCallback((key: string, value: string) => {
        localStorage.setItem(key, value);
        setStatus('untested');
        setStatusMsg('');
    }, []);

    const handleTestConnection = useCallback(async () => {
        if (isTesting) return;
        setIsTesting(true);
        setStatus('untested');
        setStatusMsg('');

        const result = await testConnection();
        setStatus(result.ok ? 'success' : 'failed');
        setStatusMsg(result.message);
        setIsTesting(false);
    }, [isTesting]);

    const handleUpload = useCallback(async () => {
        if (isUploading) return;
        setIsUploading(true);
        setStatusMsg('');

        const result = await uploadToCloud();
        setStatus(result.ok ? 'success' : 'failed');
        setStatusMsg(result.message);
        setIsUploading(false);
    }, [isUploading]);

    const handleDownload = useCallback(async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        setStatusMsg('');

        const result = await fullSyncFromCloud();
        if (!result.ok && result.hasConflict) {
            const force = window.confirm(result.message);
            if (force) {
                const forceResult = await fullSyncFromCloud(true);
                setStatus(forceResult.ok ? 'success' : 'failed');
                setStatusMsg(forceResult.message);
            } else {
                setStatusMsg('Download cancelled');
            }
        } else {
            setStatus(result.ok ? 'success' : 'failed');
            setStatusMsg(result.message);
        }
        setIsDownloading(false);
    }, [isDownloading]);

    const handleExportBackup = async () => {
        if (isBackupBusy) return;
        setIsBackupBusy(true);
        try {
            await exportFullBackup();
        } catch (error) {
            console.error('Backup failed:', error);
            window.alert(t.settings.backupFailed);
        } finally {
            setIsBackupBusy(false);
        }
    };

    const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!window.confirm(t.settings.importBackupConfirm)) return;

        setIsBackupBusy(true);
        try {
            await importFullBackup(file);
            window.location.reload();
        } catch (error) {
            console.error('Restore failed:', error);
            window.alert(t.settings.restoreFailed);
        } finally {
            setIsBackupBusy(false);
        }
    };

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (modalRef.current) {
            scaleFadeOut(modalRef.current, 300, () => {
                setIsVisible(false);
                onClose();
            });
        } else {
            setIsVisible(false);
            onClose();
        }
    }, [onClose]);

    const handleAddProductivityWidget = (widgetType: 'calendar' | 'focus' | 'countdown') => {
        const referenceScale = window.innerWidth / 1920;
        addSticker({ type: 'widget', widgetType, content: widgetType,
            x: Math.max(20, (window.innerWidth - WIDGET_SIZE) / 2) / referenceScale,
            y: Math.max(60, (window.innerHeight - WIDGET_SIZE) / 2) / referenceScale,
            scale: 1 });
        handleClose();
    };

    const handleAddClockWidget = useCallback(() => {
        const referenceScale = window.innerWidth / 1920;
        const x = (window.innerWidth / referenceScale - CLOCK_WIDGET_SIZE) / 2;
        const y = (window.innerHeight / referenceScale - CLOCK_WIDGET_SIZE) / 2;

        addSticker({
            type: 'widget',
            widgetType: 'clock',
            content: 'clock',
            x,
            y,
            scale: 1,
        });
        handleClose();
    }, [addSticker, handleClose]);

    const handleAddAnalogClockWidget = useCallback(() => {
        const referenceScale = window.innerWidth / 1920;
        const x = (window.innerWidth / referenceScale - ANALOG_CLOCK_WIDGET_SIZE) / 2;
        const y = (window.innerHeight / referenceScale - ANALOG_CLOCK_WIDGET_SIZE) / 2;

        addSticker({
            type: 'widget',
            widgetType: 'analogClock',
            content: 'analog-clock',
            x,
            y,
            scale: 1,
        });
        handleClose();
    }, [addSticker, handleClose]);

    const handleAddRoundedAnalogClockWidget = useCallback(() => {
        const referenceScale = window.innerWidth / 1920;
        const x = (window.innerWidth / referenceScale - ANALOG_CLOCK_WIDGET_SIZE) / 2;
        const y = (window.innerHeight / referenceScale - ANALOG_CLOCK_WIDGET_SIZE) / 2;

        addSticker({
            type: 'widget',
            widgetType: 'roundedAnalogClock',
            content: 'rounded-analog-clock',
            x,
            y,
            scale: 1,
        });
        handleClose();
    }, [addSticker, handleClose]);

    useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, handleClose]);

    useEffect(() => {
        const surface = surfaceShapeRef.current;
        if (!surface || !isVisible) return;

        const targetOffset = activeSectionIndex * SETTINGS_SECTION_HEIGHT;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (surfaceAnimationFrameRef.current !== null) {
            cancelAnimationFrame(surfaceAnimationFrameRef.current);
            surfaceAnimationFrameRef.current = null;
        }

        if (reducedMotion) {
            surfaceOffsetRef.current = targetOffset;
            surfaceVelocityRef.current = 0;
            setSurfaceGeometry(surface, targetOffset);
            return;
        }

        let previousTime = performance.now();
        const stiffness = 420;
        const damping = 42;

        const animateSurface = (currentTime: number) => {
            const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 1 / 30);
            previousTime = currentTime;

            const displacement = targetOffset - surfaceOffsetRef.current;
            const acceleration = stiffness * displacement - damping * surfaceVelocityRef.current;
            surfaceVelocityRef.current += acceleration * deltaSeconds;
            surfaceOffsetRef.current += surfaceVelocityRef.current * deltaSeconds;

            const isSettled = Math.abs(displacement) < 0.02 && Math.abs(surfaceVelocityRef.current) < 0.02;
            if (isSettled) {
                surfaceOffsetRef.current = targetOffset;
                surfaceVelocityRef.current = 0;
                setSurfaceGeometry(surface, targetOffset);
                surfaceAnimationFrameRef.current = null;
                return;
            }

            setSurfaceGeometry(surface, surfaceOffsetRef.current);
            surfaceAnimationFrameRef.current = requestAnimationFrame(animateSurface);
        };

        setSurfaceGeometry(surface, surfaceOffsetRef.current);
        surfaceAnimationFrameRef.current = requestAnimationFrame(animateSurface);

        return () => {
            if (surfaceAnimationFrameRef.current !== null) {
                cancelAnimationFrame(surfaceAnimationFrameRef.current);
                surfaceAnimationFrameRef.current = null;
            }
        };
    }, [activeSectionIndex, isVisible]);

    if (!isVisible) return null;

    // 高亮索引：0 = 自动, 1 = 浅色, 2 = 深色
    let activeIndex = -1;
    if (followSystem) {
        activeIndex = 0;
    } else if (theme === 'light') {
        activeIndex = 1;
    } else if (theme === 'dark') {
        activeIndex = 2;
    }

    const highlightStyle: React.CSSProperties = {
        transform: activeIndex >= 0 ? `translateX(${activeIndex * 100}%)` : 'scale(0)',
        opacity: activeIndex >= 0 ? 1 : 0,
    };

    const sectionItems: Array<{ id: SettingsSection; label: string }> = [
        { id: 'appearance', label: t.settings.appearance },
        { id: 'behavior', label: t.settings.behavior },
        { id: 'data', label: t.settings.data },
        { id: 'widgets', label: t.settings.widgets },
    ];
    const lastSyncLabel = getLastSyncTimeLabel();

    return (
        <>
            <div className={styles.backdrop} onClick={handleClose} onDoubleClick={(e) => e.stopPropagation()} />
            <div className={styles.modalPositioner}>
                <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-label={t.settings.title} onDoubleClick={(e) => e.stopPropagation()}>
                    <div className={styles.innerContainer}>
                        <div className={styles.modalBody}>
                            <div
                                ref={surfaceShapeRef}
                                className={styles.surfaceShape}
                                aria-hidden="true"
                            >
                                <span className={styles.surfaceConnectors} aria-hidden="true" />
                            </div>
                            <nav className={styles.sidebar} aria-label={t.settings.title}>
                                <div className={styles.sidebarNav}>
                                    {sectionItems.map((section) => (
                                        <button
                                            key={section.id}
                                            className={`${styles.sidebarItem} ${activeSection === section.id ? styles.sidebarItemActive : ''}`}
                                            onClick={() => setActiveSection(section.id)}
                                            aria-current={activeSection === section.id ? 'page' : undefined}
                                        >
                                            {section.label}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.sidebarFooter}>
                                    <a href="https://github.com/ENCRE0520/EclipseTab" target="_blank" rel="noopener noreferrer" className={styles.githubLink} title="View on GitHub">
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </nav>

                            <main className={styles.sectionContent}>
                                {activeSection === 'appearance' && (
                                    <>
                                        <div className={styles.sectionHeading}>
                                            <h2>{t.settings.appearance}</h2>
                                            <p>{t.settings.appearanceDescription}</p>
                                        </div>

                                        <div className={styles.iconContainer}>
                                            <div className={styles.themeGroupContainer}>
                                                <div className={styles.highlightBackground} style={highlightStyle} />
                                                <button className={styles.themeGroupOption} onClick={handleToggleFollowSystem} title={t.settings.followSystem}>
                                                    <img src={autoIcon} alt={t.settings.followSystem} width={24} height={24} />
                                                </button>
                                                <button className={styles.themeGroupOption} onClick={() => handleThemeSelect('light')} title={t.settings.lightTheme}>
                                                    <img src={lightIcon} alt={t.settings.lightTheme} width={24} height={24} />
                                                </button>
                                                <button className={styles.themeGroupOption} onClick={() => handleThemeSelect('dark')} title={t.settings.darkTheme}>
                                                    <img src={darkIcon} alt={t.settings.darkTheme} width={24} height={24} />
                                                </button>
                                            </div>
                                            <button
                                                className={`${styles.defaultTheme} ${isDefaultTheme ? styles.defaultThemeActive : ''}`}
                                                onClick={() => handleThemeSelect('default')}
                                                title={t.settings.defaultTheme}
                                            >
                                                <img src={defaultIcon} alt={t.settings.defaultTheme} width={24} height={24} />
                                            </button>
                                        </div>

                                        <div className={`${styles.textureSectionWrapper} ${!isDefaultTheme && !wallpaper ? styles.textureSectionWrapperOpen : ''}`}>
                                            <div className={styles.textureSection}>
                                                <button
                                                    className={`${styles.textureOption} ${texture === 'none' ? styles.textureOptionActive : ''}`}
                                                    onClick={() => handleTextureSelect('none')}
                                                    title={t.settings.noTexture}
                                                >
                                                    <div className={styles.texturePreviewNone}>
                                                        <img src={slashIcon} alt={t.settings.noTexture} width={24} height={24} />
                                                    </div>
                                                </button>
                                                {(['point', 'cross'] as const).map(textureId => {
                                                    const pattern = TEXTURE_PATTERNS[textureId];
                                                    const Icon = textureId === 'point' ? circleIcon : crossIcon;
                                                    return (
                                                        <button
                                                            key={textureId}
                                                            className={`${styles.textureOption} ${texture === textureId ? styles.textureOptionActive : ''}`}
                                                            onClick={() => handleTextureSelect(textureId)}
                                                            title={language === 'zh' ? pattern.nameZh : pattern.name}
                                                        >
                                                            <div className={styles.texturePreviewNone}>
                                                                <img src={Icon} alt={pattern.name} width={24} height={24} />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className={styles.colorOptionsContainer}>
                                            {GRADIENT_PRESETS.map(preset => {
                                                let displayColor = '';
                                                const isThemeDefault = preset.id === 'theme-default';
                                                if (isThemeDefault) {
                                                    displayColor = 'var(--color-bg-secondary)';
                                                } else if (isDefaultTheme) {
                                                    displayColor = preset.gradient;
                                                } else {
                                                    const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
                                                    displayColor = isDarkTheme && 'solidDark' in preset ? preset.solidDark : preset.solid;
                                                }

                                                const currentActiveId = isDefaultTheme ? gradientId : (solidId || gradientId);
                                                const isActive = !wallpaper && currentActiveId === preset.id;
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        className={`${styles.colorOption} ${isActive ? styles.colorOptionActive : ''}`}
                                                        onClick={() => handleGradientSelect(preset.id)}
                                                        title={language === 'en' ? preset.nameEn : preset.name}
                                                        style={{ background: displayColor }}
                                                    >
                                                        {isThemeDefault && (
                                                            <img
                                                                src={asteriskIcon}
                                                                alt={t.settings.defaultTheme}
                                                                width={24}
                                                                height={24}
                                                                style={{ filter: (theme === 'dark' || (followSystem && systemTheme === 'dark')) ? 'invert(1)' : 'none' }}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className={styles.wallpaperSection}>
                                            <WallpaperGallery
                                                wallpaperId={wallpaperId}
                                                onWallpaperIdChange={setWallpaperId}
                                                onWallpaperClear={() => setWallpaper(null)}
                                                onWallpaperUpload={uploadWallpaper}
                                            />
                                        </div>
                                    </>
                                )}

                                {activeSection === 'behavior' && (
                                    <>
                                        <div className={styles.sectionHeading}>
                                            <h2>{t.settings.behavior}</h2>
                                            <p>{t.settings.behaviorDescription}</p>
                                        </div>
                                        <div className={styles.layoutSection}>
                                            <div className={styles.layoutRow}>
                                                <span className={styles.layoutLabel}>{t.settings.language}</span>
                                                <div className={styles.layoutToggleGroup}>
                                                    <div className={styles.layoutHighlight} style={{ transform: `translateX(${language === 'zh' ? 0 : 100}%)` }} />
                                                    <button className={styles.layoutToggleOption} onClick={() => setLanguage('zh')} title="中文">中文</button>
                                                    <button className={styles.layoutToggleOption} onClick={() => setLanguage('en')} title="EN">EN</button>
                                                </div>
                                            </div>
                                            <div className={styles.layoutRow}>
                                                <span className={styles.layoutLabel}>{t.settings.position}</span>
                                                <div className={styles.layoutToggleGroup}>
                                                    <div className={styles.layoutHighlight} style={{ transform: `translateX(${dockPosition === 'bottom' ? 0 : 100}%)` }} />
                                                    <button className={styles.layoutToggleOption} onClick={() => setDockPosition('bottom')} title={t.settings.bottom}>{t.settings.bottom}</button>
                                                    <button className={styles.layoutToggleOption} onClick={() => setDockPosition('center')} title={t.settings.center}>{t.settings.center}</button>
                                                </div>
                                            </div>
                                            <div className={styles.layoutRow}>
                                                <span className={styles.layoutLabel}>{t.settings.iconSize}</span>
                                                <div className={styles.layoutToggleGroup}>
                                                    <div className={styles.layoutHighlight} style={{ transform: `translateX(${iconSize === 'large' ? 0 : 100}%)` }} />
                                                    <button className={styles.layoutToggleOption} onClick={() => setIconSize('large')} title={t.settings.large}>{t.settings.large}</button>
                                                    <button className={styles.layoutToggleOption} onClick={() => setIconSize('small')} title={t.settings.small}>{t.settings.small}</button>
                                                </div>
                                            </div>
                                            <div className={styles.layoutRow}>
                                                <span className={styles.layoutLabel}>{t.settings.tabOpeningBehavior}</span>
                                                <div className={styles.layoutToggleGroup}>
                                                    <div className={styles.layoutHighlight} style={{ transform: `translateX(${openInNewTab ? 0 : 100}%)` }} />
                                                    <button className={styles.layoutToggleOption} onClick={() => setOpenInNewTab(true)} title={t.settings.openInNewTab}>{t.settings.openInNewTab}</button>
                                                    <button className={styles.layoutToggleOption} onClick={() => setOpenInNewTab(false)} title={t.settings.openInCurrentTab}>{t.settings.openInCurrentTab}</button>
                                                </div>
                                            </div>
                                            <div className={styles.layoutRow}>
                                                <span className={styles.layoutLabel}>{t.settings.suggestions}</span>
                                                <PermissionToggle />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeSection === 'data' && (
                                    <>
                                        <div className={styles.sectionHeading}>
                                            <h2>{t.settings.data}</h2>
                                            <p>{t.settings.dataDescription}</p>
                                        </div>
                                        <div className={syncStyles.headerSection}>
                                            <div className={syncStyles.iconWrapper}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    <path d="M6 16.5C4.067 16.5 2.5 14.933 2.5 13C2.5 11.2336 3.82137 9.77196 5.53982 9.53587C6.01258 6.84074 8.2435 4.80005 11 4.80005C13.9142 4.80005 16.3262 6.95315 16.8924 9.74204C17.1517 9.68452 17.4243 9.65342 17.7059 9.65342C20.3547 9.65342 22.5019 11.8006 22.5019 14.4495C22.5019 17.0983 20.3547 19.2455 17.7059 19.2455L6 19.2455" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                            <div className={syncStyles.headerText}>
                                                <span className={syncStyles.titleText}>{t.sync.title}</span>
                                                <span className={syncStyles.lastSyncText}>{lastSyncLabel ? `${t.sync.lastSync}: ${lastSyncLabel}` : t.sync.neverSynced}</span>
                                            </div>
                                        </div>

                                        <div className={syncStyles.cardSection}>
                                            <div className={syncStyles.inputRow}>
                                                <span className={syncStyles.inputLabel}>{t.sync.serverUrl}</span>
                                                <input type="text" className={syncStyles.inputField} value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} onBlur={(e) => saveToStorage('EclipseTab_webdav_url', e.target.value)} placeholder="https://dav.jianguoyun.com/dav/" />
                                            </div>
                                            <div className={syncStyles.inputRow}>
                                                <span className={syncStyles.inputLabel}>{t.sync.username}</span>
                                                <input type="text" className={syncStyles.inputField} value={username} onChange={(e) => setUsername(e.target.value)} onBlur={(e) => saveToStorage('EclipseTab_webdav_user', e.target.value)} placeholder="user@example.com" />
                                            </div>
                                            <div className={syncStyles.inputRow}>
                                                <span className={syncStyles.inputLabel}>{t.sync.password}</span>
                                                <input type="password" className={syncStyles.inputField} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={(e) => saveToStorage('EclipseTab_webdav_pass', e.target.value)} placeholder={t.sync.password} />
                                            </div>
                                        </div>

                                        <div className={syncStyles.cardSection}>
                                            <div className={syncStyles.testRow}>
                                                <div className={syncStyles.testLeft}>
                                                    <div className={`${syncStyles.statusDot} ${status === 'success' ? syncStyles.statusDotSuccess : status === 'failed' ? syncStyles.statusDotFailed : syncStyles.statusDotUntested}`} />
                                                    <span className={syncStyles.statusLabel}>{t.sync.statusLabel}</span>
                                                    <span className={`${syncStyles.statusValue} ${status === 'success' ? syncStyles.statusSuccess : status === 'failed' ? syncStyles.statusFailed : ''}`}>
                                                        {status === 'success' ? t.sync.statusSuccess : status === 'failed' ? t.sync.statusFailed : t.sync.statusUntested}
                                                    </span>
                                                </div>
                                                <button className={`${syncStyles.btnBase} ${syncStyles.btnCompact}`} onClick={handleTestConnection} disabled={isTesting}>{isTesting ? 'Testing...' : t.sync.testConnection}</button>
                                            </div>
                                            {statusMsg && <div className={syncStyles.statusMsg}>{statusMsg}</div>}
                                        </div>

                                        <div className={syncStyles.cardSection}>
                                            <div className={syncStyles.optionRow}>
                                                <span className={syncStyles.optionLabel}>{t.sync.autoSyncTitle}</span>
                                                <button className={`${syncStyles.toggle} ${autoSync ? syncStyles.toggleActive : ''}`} onClick={() => { const next = !autoSync; setAutoSync(next); setAutoSyncEnabled(next); }} aria-pressed={autoSync}><div className={syncStyles.toggleKnob} /></button>
                                            </div>
                                            <div className={syncStyles.optionRow}>
                                                <span className={syncStyles.optionLabel}>{t.sync.syncWallpaper}</span>
                                                <button className={`${syncStyles.toggle} ${syncWallpaper ? syncStyles.toggleActive : ''}`} onClick={() => { const next = !syncWallpaper; setSyncWallpaper(next); localStorage.setItem('EclipseTab_syncWallpaper', String(next)); }} aria-pressed={syncWallpaper}><div className={syncStyles.toggleKnob} /></button>
                                            </div>
                                            <div className={syncStyles.optionRow}>
                                                <span className={syncStyles.optionLabel}>{t.sync.syncStickers}</span>
                                                <button className={`${syncStyles.toggle} ${syncStickers ? syncStyles.toggleActive : ''}`} onClick={() => { const next = !syncStickers; setSyncStickers(next); localStorage.setItem('EclipseTab_syncStickers', String(next)); }} aria-pressed={syncStickers}><div className={syncStyles.toggleKnob} /></button>
                                            </div>
                                        </div>

                                        <div className={syncStyles.cardSection}>
                                            <div className={syncStyles.buttonRow}>
                                                <button className={`${syncStyles.btnBase} ${syncStyles.btnFull}`} onClick={handleDownload} disabled={isDownloading}>{isDownloading ? 'Downloading...' : t.sync.downloadFromCloud}</button>
                                                <button className={`${syncStyles.btnBase} ${syncStyles.btnFull} ${syncStyles.btnPrimary}`} onClick={handleUpload} disabled={isUploading}>{isUploading ? 'Uploading...' : t.sync.uploadToCloud}</button>
                                            </div>
                                        </div>

                                        <div className={syncStyles.cardSection}>
                                            <div className={syncStyles.sectionHeader}><span className={syncStyles.sectionTitle}>{t.sync.localBackup}</span></div>
                                            <div className={syncStyles.buttonRow}>
                                                <button className={`${syncStyles.btnBase} ${syncStyles.btnFull}`} onClick={handleExportBackup} disabled={isBackupBusy}>{isBackupBusy ? '...' : t.settings.exportBackup}</button>
                                                <button className={`${syncStyles.btnBase} ${syncStyles.btnFull}`} onClick={() => backupInputRef.current?.click()} disabled={isBackupBusy}>{t.settings.importBackup}</button>
                                            </div>
                                            <input ref={backupInputRef} type="file" accept=".zip,application/zip" onChange={handleImportBackup} style={{ display: 'none' }} />
                                        </div>
                                    </>
                                )}

                                {activeSection === 'widgets' && (
                                    <>
                                        <div className={styles.sectionHeading}>
                                            <h2>{t.settings.widgets}</h2>
                                            <p>{t.settings.widgetsDescription}</p>
                                        </div>
                                        <div className={styles.widgetList}>
                                            <div className={`${styles.widgetCard} ${styles.productivityCard}`}>
                                                <span className={styles.widgetPreview} aria-hidden="true"><CalendarWidget preview scale={0.27} /></span>
                                                <span className={styles.widgetCardType}>{t.settings.calendarWidget}</span>
                                                <span className={styles.widgetCardName}>{t.settings.calendarWidgetDescription}</span>
                                                <button type="button" className={styles.widgetAddOverlay} onClick={() => handleAddProductivityWidget('calendar')} aria-label={t.settings.addCalendarWidget} />
                                            </div>
                                            <div className={`${styles.widgetCard} ${styles.productivityCard}`}>
                                                <span className={styles.widgetPreview} aria-hidden="true"><FocusWidget preview scale={0.27} /></span>
                                                <span className={styles.widgetCardType}>{t.settings.focusWidget}</span>
                                                <span className={styles.widgetCardName}>{t.settings.focusWidgetDescription}</span>
                                                <button type="button" className={styles.widgetAddOverlay} onClick={() => handleAddProductivityWidget('focus')} aria-label={t.settings.addFocusWidget} />
                                            </div>
                                            <div className={`${styles.widgetCard} ${styles.productivityCard}`}>
                                                <span className={styles.widgetPreview} aria-hidden="true"><CountdownWidget preview scale={0.27} /></span>
                                                <span className={styles.widgetCardType}>{t.settings.countdownWidget}</span>
                                                <span className={styles.widgetCardName}>{t.settings.countdownWidgetDescription}</span>
                                                <button type="button" className={styles.widgetAddOverlay} onClick={() => handleAddProductivityWidget('countdown')} aria-label={t.settings.addCountdownWidget} />
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.widgetCard}
                                                onClick={handleAddClockWidget}
                                                aria-label={t.settings.addClockWidget}
                                            >
                                                <span className={styles.widgetPreview} aria-hidden="true">
                                                    <ClockWidget scale={WIDGET_PREVIEW_SCALE} />
                                                </span>
                                                <span className={styles.widgetCardType}>{t.settings.widgetTypeDigital}</span>
                                                <span className={styles.widgetCardName}>{t.settings.clockWidget}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.widgetCard}
                                                onClick={handleAddAnalogClockWidget}
                                                aria-label={t.settings.addAnalogClockWidget}
                                            >
                                                <span className={styles.widgetPreview} aria-hidden="true">
                                                    <AnalogClockWidget scale={WIDGET_PREVIEW_SCALE} />
                                                </span>
                                                <span className={styles.widgetCardType}>{t.settings.widgetTypeAnalog}</span>
                                                <span className={styles.widgetCardName}>{t.settings.analogClockWidget}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.widgetCard}
                                                onClick={handleAddRoundedAnalogClockWidget}
                                                aria-label={t.settings.addRoundedAnalogClockWidget}
                                            >
                                                <span className={styles.widgetPreview} aria-hidden="true">
                                                    <AnalogClockWidget scale={WIDGET_PREVIEW_SCALE} shape="roundedSquare" />
                                                </span>
                                                <span className={styles.widgetCardType}>{t.settings.widgetTypeAnalog}</span>
                                                <span className={styles.widgetCardName}>{t.settings.roundedAnalogClockWidget}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </main>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};
