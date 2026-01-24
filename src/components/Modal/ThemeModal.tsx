import React, { useEffect, useRef, useState } from 'react';
import { Theme } from '../../context/ThemeContext';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './ThemeModal.module.css';

interface ThemeModalProps {
    isOpen: boolean;
    currentTheme: Theme;
    onSelect: (theme: Theme) => void;
    onClose: () => void;
    anchorRect: DOMRect | null;
}

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
    { value: 'default', label: 'Default', description: 'Classic Gradient' },
    { value: 'light', label: 'Light', description: 'Bright & Fresh' },
    { value: 'dark', label: 'Dark', description: 'Deep & Elegant' },
];

export const ThemeModal: React.FC<ThemeModalProps> = ({
    isOpen,
    currentTheme,
    onSelect,
    onClose,
    anchorRect,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle visibility and animations
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        }
    }, [isOpen]);

    // Run enter animation when modal becomes visible
    useEffect(() => {
        if (isOpen && isVisible && modalRef.current) {
            scaleFadeIn(modalRef.current);
        }
    }, [isOpen, isVisible]);

    const handleClose = () => {
        if (modalRef.current) {
            scaleFadeOut(modalRef.current, 200, () => {
                setIsVisible(false);
                onClose();
            });
        } else {
            setIsVisible(false);
            onClose();
        }
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

    if (!isVisible) return null;

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
        <div ref={modalRef} className={styles.modal} style={modalStyle}>
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
