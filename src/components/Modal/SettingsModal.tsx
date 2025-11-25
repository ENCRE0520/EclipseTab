import React from 'react';
import { Theme, useTheme, Texture } from '../../context/ThemeContext';
import { GRADIENT_PRESETS } from '../../constants/gradients';
import styles from './SettingsModal.module.css';
import pointTexturePreview from '../../assets/Point Texture Preview.svg';
import xTexturePreview from '../../assets/X Texture Preview.svg';
import defaultIcon from '../../assets/icons/star3.svg';
import lightIcon from '../../assets/icons/sun.svg';
import darkIcon from '../../assets/icons/moon.svg';
import autoIcon from '../../assets/icons/monitor.svg';
import wallpaperIcon from '../../assets/icons/wallpaper.svg';

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
        gradientId,
        setGradientId,
        texture,
        setTexture,
    } = useTheme();

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = React.useState<string | null>(null);

    if (!isOpen) return null;

    const handleThemeSelect = (selectedTheme: Theme) => {
        setTheme(selectedTheme);
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
            if (gradientId) setGradientId(null);
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

    const isSolidColorMode = !wallpaper && !gradientId;
    const isCustomTheme = theme === 'default' && !followSystem;

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal} style={modalStyle}>
                <div className={styles.innerContainer}>
                    {/* Theme Section */}
                    <div className={styles.iconContainer}>
                        {/* Default Theme Button */}
                        <button
                            className={`${styles.defaultTheme} ${theme === 'default' && !followSystem ? styles.defaultThemeActive : ''}`}
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
                    {/* Texture Section */}
                    <div className={`${styles.textureSection} ${(isCustomTheme || wallpaper) ? styles.disabled : ''}`}>
                        {/* None */}
                        <button
                            className={`${styles.textureOption} ${texture === 'none' ? styles.textureOptionActive : ''}`}
                            onClick={() => handleTextureSelect('none')}
                            disabled={isCustomTheme || !!wallpaper}
                            title="No Texture"
                        >
                            <div className={styles.texturePreviewNone} />
                        </button>
                        {/* Point Texture */}
                        <button
                            className={`${styles.textureOption} ${texture === 'point' ? styles.textureOptionActive : ''}`}
                            onClick={() => handleTextureSelect('point')}
                            disabled={isCustomTheme || !!wallpaper}
                            title="Point Texture"
                        >
                            <img src={pointTexturePreview} alt="Point Texture" className={styles.texturePreviewImage} />
                        </button>
                        {/* X Texture */}
                        <button
                            className={`${styles.textureOption} ${texture === 'x' ? styles.textureOptionActive : ''}`}
                            onClick={() => handleTextureSelect('x')}
                            disabled={isCustomTheme || !!wallpaper}
                            title="X Texture"
                        >
                            <img src={xTexturePreview} alt="X Texture" className={styles.texturePreviewImage} />
                        </button>
                    </div>
                    {/* Wallpaper / Gradient Section */}
                    <div className={styles.wallpaperSection}>
                        {/* Upload Wallpaper Button */}
                        <div className={styles.wallpaperUploadBtn} onClick={handleWallpaperClick} title="Upload Wallpaper">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {wallpaper ? (
                                <div className={styles.wallpaperPreview}>
                                    <img src={wallpaper} alt="Current wallpaper" className={styles.wallpaperImage} />
                                    <button className={styles.removeWallpaperBtn} onClick={handleRemoveWallpaper}>×</button>
                                </div>
                            ) : (
                                <img src={wallpaperIcon} alt="Upload Wallpaper" width={24} height={24} />
                            )}
                        </div>
                        {/* Color Options */}
                        <div className={`${styles.colorOptionsContainer} ${!isCustomTheme ? styles.disabled : ''}`}>
                            {GRADIENT_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    className={`${styles.colorOption} ${gradientId === preset.id ? styles.colorOptionActive : ''}`}
                                    onClick={() => handleGradientSelect(preset.id)}
                                    title={preset.name}
                                    style={{ background: preset.gradient }}
                                />
                            ))}
                        </div>
                    </div>
                    {uploadError && <div className={styles.error}>{uploadError}</div>}
                </div>
            </div>
        </>
    );
};
