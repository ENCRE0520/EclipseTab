import React, { useEffect, useRef, useState } from 'react';
import { Theme, useTheme, Texture } from '../../context/ThemeContext';
import { useSystemTheme } from '../../hooks/useSystemTheme';
import { useLanguage } from '../../context/LanguageContext';
import { GRADIENT_PRESETS } from '../../constants/gradients';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './SettingsModal.module.css';
import { TEXTURE_PATTERNS } from '../../constants/textures';
import defaultIcon from '../../assets/icons/star3.svg';
import lightIcon from '../../assets/icons/sun.svg';
import darkIcon from '../../assets/icons/moon.svg';
import autoIcon from '../../assets/icons/monitor.svg';
import slashIcon from '../../assets/icons/slash.svg';
import asteriskIcon from '../../assets/icons/asterisk.svg';
import circleIcon from '../../assets/icons/texture background/circle-preview.svg';
import crossIcon from '../../assets/icons/texture background/cross-preview.svg';
import { WallpaperGallery } from '../WallpaperGallery/WallpaperGallery';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    anchorPosition: { x: number; y: number };
}

// Simple permission toggle component
const PermissionToggle: React.FC = () => {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    // Define all required origins consistently
    const REQUIRED_ORIGINS = [
        'https://suggestqueries.google.com/*',
        'https://www.google.com/*',
        'https://suggestion.baidu.com/*'
    ];

    useEffect(() => {
        // Check initial permission status
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            chrome.permissions.contains({
                origins: REQUIRED_ORIGINS
            }, (result) => {
                setEnabled(result);
            });
        } else {
            // Dev mode fallback - check local storage
            const savedState = localStorage.getItem('search_suggestions_enabled');
            setEnabled(savedState === 'true');
        }
    }, []);

    const handleToggle = () => {
        if (loading || enabled === null) return;
        setLoading(true);

        // Dev mode fallback: if chrome API is missing, simulate toggle and save to local storage
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
            // Remove permission
            chrome.permissions.remove({ origins: REQUIRED_ORIGINS }, (removed) => {
                if (removed) {
                    setEnabled(false);
                }
                setLoading(false);
            });
        } else {
            // Request permission
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, anchorPosition }) => {
    const {
        theme,
        setTheme,
        followSystem,
        setFollowSystem,
        wallpaper,
        setWallpaper,
        gradientId,
        setGradientId,
        texture,
        setTexture,
        dockPosition,
        setDockPosition,
        iconSize,
        setIconSize,
    } = useTheme();

    const { language, setLanguage, t } = useLanguage();

    const systemTheme = useSystemTheme();
    const [isVisible, setIsVisible] = useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);

    // Logic to determine if we are in "Default" mode or "Light/Dark" mode
    const isDefaultTheme = theme === 'default' && !followSystem;

    // Note: Texture is only displayed when not in default theme (handled in ThemeContext)
    // We no longer reset texture when switching to default theme so it's remembered

    // Animation effects - open
    useEffect(() => {
        if (isOpen) {
            isClosingRef.current = false;
            setIsVisible(true);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isVisible && modalRef.current) {
            scaleFadeIn(modalRef.current);
        }
    }, [isOpen, isVisible]);

    // Animation effects - close (triggered by parent setting isOpen=false)
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

    if (!isVisible) return null;

    const handleThemeSelect = (selectedTheme: Theme) => {
        setTheme(selectedTheme);
        // Reset gradientId to theme-default when selecting default theme
        if (selectedTheme === 'default') {
            setGradientId('theme-default');
        }
        if (followSystem) {
            setFollowSystem(false);
        }
    };

    const handleToggleFollowSystem = () => {
        setFollowSystem(!followSystem);
    };

    const handleGradientSelect = (id: string) => {
        // If there's a wallpaper, just clear it and set the gradient directly
        // No special handling needed because the visual change is from wallpaper to color
        if (wallpaper) {
            setWallpaper(null);
            setGradientId(id);
            return;
        }

        // If clicking the same gradient (and no wallpaper), we need to force React to update
        // by using a temporary different value first
        if (gradientId === id) {
            const tempId = id === 'theme-default' ? 'gradient-1' : 'theme-default';
            setGradientId(tempId);
            // Force a synchronous update by using requestAnimationFrame
            requestAnimationFrame(() => {
                setGradientId(id);
            });
        } else {
            setGradientId(id);
        }
    };

    const handleTextureSelect = (selectedTexture: Texture) => {
        setTexture(selectedTexture);
    };

    const modalStyle: React.CSSProperties = {
        left: `${anchorPosition.x}px`,
        top: `${anchorPosition.y + 60}px`,
    };

    // Highlight index: 0 = auto, 1 = light, 2 = dark
    let activeIndex = -1;
    if (followSystem) {
        activeIndex = 0;
    } else if (theme === 'light') {
        activeIndex = 1;
    } else if (theme === 'dark') {
        activeIndex = 2;
    }

    const highlightStyle: React.CSSProperties = {
        transform: activeIndex >= 0 ? `translateX(${activeIndex * 56}px)` : 'scale(0)',
        opacity: activeIndex >= 0 ? 1 : 0,
    };

    // Handle close with animation
    const handleClose = () => {
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
    };

    return (
        <>
            <div className={styles.backdrop} onClick={handleClose} />
            <div ref={modalRef} className={styles.modal} style={modalStyle}>
                <div className={styles.innerContainer}>
                    {/* Theme Section */}
                    <div className={styles.iconContainer}>
                        {/* Theme Group (Auto / Light / Dark) */}
                        <div className={styles.themeGroupContainer}>
                            <div className={styles.highlightBackground} style={highlightStyle} />
                            <button
                                className={styles.themeGroupOption}
                                onClick={handleToggleFollowSystem}
                                title={t.settings.followSystem}
                            >
                                <img src={autoIcon} alt="Follow System" width={24} height={24} />
                            </button>
                            <button
                                className={styles.themeGroupOption}
                                onClick={() => handleThemeSelect('light')}
                                title={t.settings.lightTheme}
                            >
                                <img src={lightIcon} alt="Light Theme" width={24} height={24} />
                            </button>
                            <button
                                className={styles.themeGroupOption}
                                onClick={() => handleThemeSelect('dark')}
                                title={t.settings.darkTheme}
                            >
                                <img src={darkIcon} alt="Dark Theme" width={24} height={24} />
                            </button>
                        </div>
                        {/* Default Theme Button */}
                        <button
                            className={`${styles.defaultTheme} ${isDefaultTheme ? styles.defaultThemeActive : ''}`}
                            onClick={() => handleThemeSelect('default')}
                            title={t.settings.defaultTheme}
                        >
                            <img src={defaultIcon} alt="Default Theme" width={24} height={24} />
                        </button>
                    </div>

                    {/* Texture Section - Animated Wrapper */}
                    <div
                        className={`${styles.textureSectionWrapper} ${!isDefaultTheme && !wallpaper ? styles.textureSectionWrapperOpen : ''}`}
                    >
                        <div className={styles.textureSection}>
                            {/* None */}
                            <button
                                className={`${styles.textureOption} ${texture === 'none' ? styles.textureOptionActive : ''}`}
                                onClick={() => handleTextureSelect('none')}
                                title={t.settings.noTexture}
                            >
                                <div className={styles.texturePreviewNone}>
                                    <img src={slashIcon} alt="No Texture" width={24} height={24} />
                                </div>
                            </button>
                            {/* Dynamic Texture Options */}
                            {(['point', 'cross'] as const).map(textureId => {
                                const pattern = TEXTURE_PATTERNS[textureId];
                                const Icon = textureId === 'point' ? circleIcon : crossIcon;
                                return (
                                    <button
                                        key={textureId}
                                        className={`${styles.textureOption} ${texture === textureId ? styles.textureOptionActive : ''}`}
                                        onClick={() => handleTextureSelect(textureId)}
                                        title={pattern.name}
                                    >
                                        <div className={styles.texturePreviewNone}>
                                            <img
                                                src={Icon}
                                                alt={pattern.name}
                                                width={24}
                                                height={24}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Options Section - Moved above Wallpaper */}
                    <div className={styles.colorOptionsContainer}>
                        {GRADIENT_PRESETS.map(preset => {
                            // For theme-default preset, use dynamic color based on active theme
                            let displayColor = '';
                            const isThemeDefault = preset.id === 'theme-default';

                            if (isThemeDefault) {
                                displayColor = 'var(--color-bg-secondary)';
                            } else if (isDefaultTheme) {
                                displayColor = preset.gradient;
                            } else {
                                // 对于非默认主题，根据是否为深色模式选择solid或solidDark
                                const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
                                displayColor = isDarkTheme && 'solidDark' in preset ? preset.solidDark : preset.solid;
                            }

                            // 当使用壁纸时，不显示颜色选项的选中状态
                            const isActive = !wallpaper && gradientId === preset.id;

                            return (
                                <button
                                    key={preset.id}
                                    className={`${styles.colorOption} ${isActive ? styles.colorOptionActive : ''}`}
                                    onClick={() => handleGradientSelect(preset.id)}
                                    title={preset.name}
                                    style={{
                                        background: displayColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isThemeDefault && (
                                        <img
                                            src={asteriskIcon}
                                            alt="Default"
                                            width={24}
                                            height={24}
                                            style={{
                                                filter: (theme === 'dark' || (followSystem && systemTheme === 'dark')) ? 'invert(1)' : 'none'
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Wallpaper Section - Moved to bottom */}
                    <div className={styles.wallpaperSection}>
                        <WallpaperGallery />
                    </div>

                    {/* Layout Settings Section */}
                    <div className={styles.layoutSection}>
                        {/* Language Setting */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.language}</span>
                            <div className={styles.layoutToggleGroup}>
                                <div
                                    className={styles.layoutHighlight}
                                    style={{
                                        transform: `translateX(${language === 'zh' ? 0 : 100}%)`,
                                    }}
                                />
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setLanguage('zh')}
                                    title="中文"
                                >
                                    中文
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setLanguage('en')}
                                    title="EN"
                                >
                                    EN
                                </button>
                            </div>
                        </div>

                        {/* Dock Position */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.position}</span>
                            <div className={styles.layoutToggleGroup}>
                                <div
                                    className={styles.layoutHighlight}
                                    style={{
                                        transform: `translateX(${dockPosition === 'bottom' ? 0 : 100}%)`,
                                    }}
                                />
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setDockPosition('bottom')}
                                    title={t.settings.bottom}
                                >
                                    {t.settings.bottom}
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setDockPosition('center')}
                                    title={t.settings.center}
                                >
                                    {t.settings.center}
                                </button>
                            </div>
                        </div>
                        {/* Icon Size */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.iconSize}</span>
                            <div className={styles.layoutToggleGroup}>
                                <div
                                    className={styles.layoutHighlight}
                                    style={{
                                        transform: `translateX(${iconSize === 'large' ? 0 : 100}%)`,
                                    }}
                                />
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setIconSize('large')}
                                    title={t.settings.large}
                                >
                                    {t.settings.large}
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setIconSize('small')}
                                    title={t.settings.small}
                                >
                                    {t.settings.small}
                                </button>
                            </div>
                        </div>

                        {/* Search Suggestions (Optional Permission) */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.suggestions}</span>
                            <PermissionToggle />
                        </div>
                    </div>


                    {/* Footer - GitHub Link */}
                    <div className={styles.footer}>
                        <a
                            href="https://github.com/ENCRE0520/EclipseTab"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.githubLink}
                            title="View on GitHub"
                        >
                            <span>GitHub</span>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};
