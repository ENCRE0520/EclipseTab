import React, { useEffect, useRef, useState } from 'react';
import { Theme, useTheme, Texture } from '../../context/ThemeContext';
import { useSystemTheme } from '../../hooks/useSystemTheme';
import { GRADIENT_PRESETS } from '../../constants/gradients';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './SettingsModal.module.css';
import { TEXTURE_PATTERNS, generateTextureDataUrl } from '../../constants/textures';
import defaultIcon from '../../assets/icons/star3.svg';
import lightIcon from '../../assets/icons/sun.svg';
import darkIcon from '../../assets/icons/moon.svg';
import autoIcon from '../../assets/icons/monitor.svg';
import slashIcon from '../../assets/icons/slash.svg';
import asteriskIcon from '../../assets/icons/asterisk.svg';
import { WallpaperGallery } from '../WallpaperGallery/WallpaperGallery';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    anchorPosition: { x: number; y: number };
}

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

    // Highlight index: 0 = light, 1 = dark, 2 = auto
    let activeIndex = -1;
    if (followSystem) {
        activeIndex = 2;
    } else if (theme === 'light') {
        activeIndex = 0;
    } else if (theme === 'dark') {
        activeIndex = 1;
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
                        {/* Default Theme Button */}
                        <button
                            className={`${styles.defaultTheme} ${isDefaultTheme ? styles.defaultThemeActive : ''}`}
                            onClick={() => handleThemeSelect('default')}
                            title="Default Theme"
                        >
                            <img src={defaultIcon} alt="Default Theme" width={24} height={24} />
                        </button>
                        {/* Theme Group (Light / Dark / Auto) */}
                        <div className={styles.themeGroupContainer}>
                            <div className={styles.highlightBackground} style={highlightStyle} />
                            <button
                                className={styles.themeGroupOption}
                                onClick={() => handleThemeSelect('light')}
                                title="Light Theme"
                            >
                                <img src={lightIcon} alt="Light Theme" width={24} height={24} />
                            </button>
                            <button
                                className={styles.themeGroupOption}
                                onClick={() => handleThemeSelect('dark')}
                                title="Dark Theme"
                            >
                                <img src={darkIcon} alt="Dark Theme" width={24} height={24} />
                            </button>
                            <button
                                className={styles.themeGroupOption}
                                onClick={handleToggleFollowSystem}
                                title="Follow System"
                            >
                                <img src={autoIcon} alt="Follow System" width={24} height={24} />
                            </button>
                        </div>
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
                                title="No Texture"
                            >
                                <div className={styles.texturePreviewNone}>
                                    <img src={slashIcon} alt="No Texture" width={24} height={24} />
                                </div>
                            </button>
                            {/* Dynamic Texture Options */}
                            {(['point', 'x'] as const).map(textureId => {
                                const pattern = TEXTURE_PATTERNS[textureId];
                                const previewDataUrl = generateTextureDataUrl(textureId, 'rgba(128, 128, 128, 0.4)');
                                return (
                                    <button
                                        key={textureId}
                                        className={`${styles.textureOption} ${texture === textureId ? styles.textureOptionActive : ''}`}
                                        onClick={() => handleTextureSelect(textureId)}
                                        title={pattern.nameZh}
                                    >
                                        <div
                                            className={styles.texturePreviewPattern}
                                            style={{
                                                backgroundImage: `url("${previewDataUrl}")`,
                                                backgroundSize: `${pattern.size / 2}px ${pattern.size / 2}px`,
                                                backgroundRepeat: 'repeat',
                                            }}
                                        />
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
                        {/* Dock Position */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>Position</span>
                            <div className={styles.layoutToggleGroup}>
                                <div
                                    className={styles.layoutHighlight}
                                    style={{
                                        transform: `translateX(${dockPosition === 'center' ? 0 : 100}%)`,
                                    }}
                                />
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setDockPosition('center')}
                                    title="Center"
                                >
                                    Center
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setDockPosition('bottom')}
                                    title="Bottom"
                                >
                                    Bottom
                                </button>
                            </div>
                        </div>
                        {/* Icon Size */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>Icon Size</span>
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
                                    title="Large"
                                >
                                    Large
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setIconSize('small')}
                                    title="Small"
                                >
                                    Small
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};
