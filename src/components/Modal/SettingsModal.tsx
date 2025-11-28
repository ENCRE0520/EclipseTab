import React, { useEffect, useRef, useState } from 'react';
import { Theme, useTheme, Texture, DEFAULT_THEME_COLORS } from '../../context/ThemeContext';
import { useSystemTheme } from '../../hooks/useSystemTheme';
import { GRADIENT_PRESETS } from '../../constants/gradients';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './SettingsModal.module.css';
import pointTexturePreview from '../../assets/Point Texture Preview.svg';
import xTexturePreview from '../../assets/X Texture Preview.svg';
import defaultIcon from '../../assets/icons/star3.svg';
import lightIcon from '../../assets/icons/sun.svg';
import darkIcon from '../../assets/icons/moon.svg';
import autoIcon from '../../assets/icons/monitor.svg';
import wallpaperIcon from '../../assets/icons/wallpaper.svg';
import slashIcon from '../../assets/icons/slash.svg';
import closeIcon from '../../assets/icons/close.svg';
import asteriskIcon from '../../assets/icons/asterisk.svg';

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
        uploadWallpaper,
        lastWallpaper,
        gradientId,
        setGradientId,
        texture,
        setTexture,
    } = useTheme();

    const systemTheme = useSystemTheme();

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = React.useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);

    // Logic to determine if we are in "Default" mode or "Light/Dark" mode
    const isDefaultTheme = theme === 'default' && !followSystem;

    // Reset texture if switching to Default theme
    useEffect(() => {
        if (isDefaultTheme && texture !== 'none') {
            setTexture('none');
        }
    }, [isDefaultTheme, texture, setTexture]);

    // Animation effects
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isVisible && modalRef.current) {
            scaleFadeIn(modalRef.current);
        }
    }, [isOpen, isVisible]);

    useEffect(() => {
        if (!isOpen && isVisible) {
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

    const handleWallpaperClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        try {
            await uploadWallpaper(file);
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : '上传失败');
        }
        e.target.value = '';
    };

    const handleRemoveWallpaper = (e: React.MouseEvent) => {
        e.stopPropagation();
        setWallpaper(null);
        setUploadError(null);
    };

    const handleGradientSelect = (id: string) => {
        setGradientId(id);
        if (wallpaper) setWallpaper(null);
    };

    const handleTextureSelect = (selectedTexture: Texture) => {
        setTexture(selectedTexture);
    };

    const handleWallpaperPreviewClick = () => {
        // If there's a last wallpaper and no current wallpaper, reuse the last one
        if (lastWallpaper && !wallpaper) {
            setWallpaper(lastWallpaper);
        }
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

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
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
                        className={`${styles.textureSectionWrapper} ${!isDefaultTheme ? styles.textureSectionWrapperOpen : ''}`}
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
                            {/* Point Texture */}
                            <button
                                className={`${styles.textureOption} ${texture === 'point' ? styles.textureOptionActive : ''}`}
                                onClick={() => handleTextureSelect('point')}
                                title="Point Texture"
                            >
                                <img src={pointTexturePreview} alt="Point Texture" className={styles.texturePreviewImage} />
                            </button>
                            {/* X Texture */}
                            <button
                                className={`${styles.textureOption} ${texture === 'x' ? styles.textureOptionActive : ''}`}
                                onClick={() => handleTextureSelect('x')}
                                title="X Texture"
                            >
                                <img src={xTexturePreview} alt="X Texture" className={styles.texturePreviewImage} />
                            </button>
                        </div>
                    </div>

                    {/* Color Options Section - Moved above Wallpaper */}
                    <div className={styles.colorOptionsContainer}>
                        {GRADIENT_PRESETS.map(preset => {
                            // For theme-default preset, use dynamic color based on active theme
                            let displayColor = '';
                            const isThemeDefault = preset.id === 'theme-default';

                            if (isThemeDefault) {
                                // Use #404040 for dark theme, #F3F3F3 for light theme
                                const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
                                displayColor = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                            } else {
                                displayColor = isDefaultTheme ? preset.gradient : preset.solid;
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
                        {/* Upload Wallpaper Button */}
                        <div
                            className={`${styles.wallpaperUploadBtn} ${wallpaper ? styles.wallpaperUploadBtnActive : ''}`}
                            onClick={handleWallpaperClick}
                            title="Upload Wallpaper"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <img src={wallpaperIcon} alt="Upload Wallpaper" width={24} height={24} />
                        </div>

                        {/* Wallpaper Preview Area - Always render */}
                        <div
                            className={`${styles.wallpaperPreviewContainer} ${lastWallpaper && !wallpaper ? styles.wallpaperPreviewClickable : ''
                                }`}
                            onClick={lastWallpaper && !wallpaper ? handleWallpaperPreviewClick : undefined}
                            title={lastWallpaper && !wallpaper ? 'Click to use this wallpaper' : undefined}
                        >
                            {wallpaper ? (
                                <>
                                    <img src={wallpaper} alt="Current wallpaper" className={styles.wallpaperImage} />
                                    <button className={styles.removeWallpaperBtn} onClick={handleRemoveWallpaper}>
                                        <img src={closeIcon} alt="Remove" width={12} height={12} />
                                    </button>
                                </>
                            ) : lastWallpaper ? (
                                <img
                                    src={lastWallpaper}
                                    alt="Last used wallpaper"
                                    className={`${styles.wallpaperImage} ${styles.wallpaperImageInactive}`}
                                />
                            ) : null}
                        </div>
                    </div>

                    {uploadError && <div className={styles.error}>{uploadError}</div>}
                </div>
            </div>
        </>
    );
};
