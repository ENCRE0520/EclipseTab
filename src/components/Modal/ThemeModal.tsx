import React, { useEffect, useState } from 'react';
import { Theme } from '../../context/ThemeContext';
import styles from './ThemeModal.module.css';

interface ThemeModalProps {
    isOpen: boolean;
    currentTheme: Theme;
    onSelect: (theme: Theme) => void;
    onClose: () => void;
    anchorRect: DOMRect | null;
}

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
    { value: 'default', label: '默认主题', description: '经典渐变背景' },
    { value: 'light', label: '浅色主题', description: '明亮清新风格' },
    { value: 'dark', label: '深色主题', description: '深邃优雅风格' },
];

export const ThemeModal: React.FC<ThemeModalProps> = ({
    isOpen,
    currentTheme,
    onSelect,
    onClose,
    anchorRect,
}) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 200);
    };

    const handleSelect = (theme: Theme) => {
        onSelect(theme);
        handleClose();
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isOpen && !target.closest(`.${styles.modal}`)) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    // Calculate position
    const modalStyle: React.CSSProperties = {};
    if (anchorRect) {
        const modalWidth = 280;
        const modalHeight = 240;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const gap = 12;

        // Position below the anchor on left side
        let left = anchorRect.left;
        let top = anchorRect.bottom + gap;

        // Ensure modal stays within viewport horizontally
        if (left + modalWidth > viewportWidth) {
            left = viewportWidth - modalWidth - 20;
        }
        if (left < 20) {
            left = 20;
        }

        // Ensure modal stays within viewport vertically
        if (top + modalHeight > viewportHeight) {
            top = anchorRect.top - modalHeight - gap;
        }
        if (top < 20) {
            top = 20;
        }

        modalStyle.left = `${left}px`;
        modalStyle.top = `${top}px`;
    }

    return (
        <div className={`${styles.modal} ${isClosing ? styles.closing : ''}`} style={modalStyle}>
            <div className={styles.content}>
                {THEME_OPTIONS.map((option) => (
                    <div
                        key={option.value}
                        className={`${styles.themeOption} ${currentTheme === option.value ? styles.selected : ''}`}
                        onClick={() => handleSelect(option.value)}
                    >
                        <div className={styles.themeInfo}>
                            <div className={styles.themeLabel}>{option.label}</div>
                            <div className={styles.themeDescription}>{option.description}</div>
                        </div>
                        {currentTheme === option.value && (
                            <div className={styles.checkmark}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.6663 5L7.49967 14.1667L3.33301 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
