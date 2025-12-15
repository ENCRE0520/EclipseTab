import React from 'react';
import { useZenShelf } from '../../context/ZenShelfContext';
import styles from './CreativeModeToggle.module.css';

/**
 * 创作模式切换按钮
 * 位于 Dock 左侧，用于切换 Zen Shelf 的创作模式
 */
export const CreativeModeToggle: React.FC = () => {
    const { isCreativeMode, setCreativeMode } = useZenShelf();

    const handleClick = () => {
        setCreativeMode(!isCreativeMode);
    };

    return (
        <button
            className={`${styles.toggle} ${isCreativeMode ? styles.active : ''}`}
            onClick={handleClick}
            title={isCreativeMode ? '退出创作模式' : '进入创作模式'}
            aria-label={isCreativeMode ? '退出创作模式' : '进入创作模式'}
            aria-pressed={isCreativeMode}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {isCreativeMode ? (
                    // Star/Sparkle icon when active
                    <path
                        d="M12 2L14.09 8.26L20 9.27L15.5 13.14L16.82 19.02L12 16.27L7.18 19.02L8.5 13.14L4 9.27L9.91 8.26L12 2Z"
                        fill="currentColor"
                    />
                ) : (
                    // Pin/Thumbtack icon when inactive
                    <path
                        d="M16 4L18 6L13.5 10.5L15 12L16 16L12 20L8 16L9 12L10.5 10.5L6 6L8 4L12 8L16 4Z"
                        fill="currentColor"
                    />
                )}
            </svg>
        </button>
    );
};
