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
        openInNewTab,
        setOpenInNewTab,
    } = useTheme();

    const { language, setLanguage, t } = useLanguage();

    const systemTheme = useSystemTheme();
    const [isVisible, setIsVisible] = useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);

    // 确定我们是处于“默认”模式还是“浅色/深色”模式的逻辑
    const isDefaultTheme = theme === 'default' && !followSystem;

    // 注意：纹理仅在非默认主题中显示（在 ThemeContext 中处理）
    // 我们不再在切换到默认主题时重置纹理，这样它就可以被记住

    // 动画效果 - 打开
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

    if (!isVisible) return null;

    const handleThemeSelect = (selectedTheme: Theme) => {
        setTheme(selectedTheme);
        // 选择默认主题时，将 gradientId 重置为主题默认值
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
        // 如果有壁纸，只需清除它并直接设置渐变
        // 不需要特殊处理，因为视觉上的变化是从壁纸到颜色的
        if (wallpaper) {
            setWallpaper(null);
            setGradientId(id);
            return;
        }

        // 如果点击相同的渐变（且没有壁纸），我们需要通过首先使用一个临时的不同值来强制 React 更新
        if (gradientId === id) {
            const tempId = id === 'theme-default' ? 'gradient-1' : 'theme-default';
            setGradientId(tempId);
            // 通过使用 requestAnimationFrame 强制进行同步更新
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
        top: `${anchorPosition.y}px`,
    };

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
        transform: activeIndex >= 0 ? `translateX(${activeIndex * 56}px)` : 'scale(0)',
        opacity: activeIndex >= 0 ? 1 : 0,
    };

    // 处理带有动画的关闭
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
                    {/* 主题部分 */}
                    <div className={styles.iconContainer}>
                        {/* 主题组 (自动 / 浅色 / 深色) */}
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
                        {/* 默认主题按钮 */}
                        <button
                            className={`${styles.defaultTheme} ${isDefaultTheme ? styles.defaultThemeActive : ''}`}
                            onClick={() => handleThemeSelect('default')}
                            title={t.settings.defaultTheme}
                        >
                            <img src={defaultIcon} alt="Default Theme" width={24} height={24} />
                        </button>
                    </div>

                    {/* 纹理部分 - 带有动画的包装器 */}
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

                    {/* 颜色选项部分 - 已移动到壁纸上方 */}
                    <div className={styles.colorOptionsContainer}>
                        {GRADIENT_PRESETS.map(preset => {
                            // 对于 theme-default 预设，根据活动主题使用动态颜色
                            let displayColor = '';
                            const isThemeDefault = preset.id === 'theme-default';

                            if (isThemeDefault) {
                                displayColor = 'var(--color-bg-secondary)';
                            } else if (isDefaultTheme) {
                                displayColor = preset.gradient;
                            } else {
                                // 对于非默认主题，根据是否为深色模式选择 solid 或 solidDark
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

                    {/* 壁纸部分 - 已移动到底部 */}
                    <div className={styles.wallpaperSection}>
                        <WallpaperGallery />
                    </div>

                    {/* 布局设置部分 */}
                    <div className={styles.layoutSection}>
                        {/* 语言设置 */}
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

                        {/* Dock 位置 */}
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
                        {/* 图标大小 */}
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

                        {/* 标签页打开方式 */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.tabOpeningBehavior}</span>
                            <div className={styles.layoutToggleGroup}>
                                <div
                                    className={styles.layoutHighlight}
                                    style={{
                                        transform: `translateX(${openInNewTab ? 0 : 100}%)`,
                                    }}
                                />
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setOpenInNewTab(true)}
                                    title={t.settings.openInNewTab}
                                >
                                    {t.settings.openInNewTab}
                                </button>
                                <button
                                    className={styles.layoutToggleOption}
                                    onClick={() => setOpenInNewTab(false)}
                                    title={t.settings.openInCurrentTab}
                                >
                                    {t.settings.openInCurrentTab}
                                </button>
                            </div>
                        </div>

                        {/* 搜索建议 (可选权限) */}
                        <div className={styles.layoutRow}>
                            <span className={styles.layoutLabel}>{t.settings.suggestions}</span>
                            <PermissionToggle />
                        </div>


                    </div>


                    {/* 页脚 - GitHub 链接 */}
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
