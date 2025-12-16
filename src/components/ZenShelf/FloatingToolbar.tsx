import React from 'react';
import { Sticker } from '../../types';
import styles from './ZenShelf.module.css';

// ============================================================================
// Color Palette for Text Stickers
// ============================================================================

export const TEXT_COLORS = [
    '#1C1C1E', // Dark gray (default)
    '#FF3B30', // Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FFFFFF', // White
];

// ============================================================================
// FloatingToolbar Component - 浮动样式工具栏
// ============================================================================

interface FloatingToolbarProps {
    sticker: Sticker;
    stickerRect: DOMRect;
    onStyleChange: (updates: Partial<Sticker['style']>) => void;
}

const FloatingToolbarComponent: React.FC<FloatingToolbarProps> = ({ sticker, stickerRect, onStyleChange }) => {
    const currentAlign = sticker.style?.textAlign || 'left';
    const currentColor = sticker.style?.color || TEXT_COLORS[0];

    // Position toolbar above the sticker
    const toolbarStyle: React.CSSProperties = {
        left: stickerRect.left + stickerRect.width / 2,
        top: stickerRect.top - 50,
        transform: 'translateX(-50%)',
    };

    return (
        <div className={styles.floatingToolbar} style={toolbarStyle}>
            {/* Alignment buttons */}
            <button
                className={`${styles.alignButton} ${currentAlign === 'left' ? styles.active : ''}`}
                onClick={() => onStyleChange({ textAlign: 'left' })}
                title="左对齐"
            >
                ☰
            </button>
            <button
                className={`${styles.alignButton} ${currentAlign === 'center' ? styles.active : ''}`}
                onClick={() => onStyleChange({ textAlign: 'center' })}
                title="居中"
            >
                ≡
            </button>
            <button
                className={`${styles.alignButton} ${currentAlign === 'right' ? styles.active : ''}`}
                onClick={() => onStyleChange({ textAlign: 'right' })}
                title="右对齐"
            >
                ≡
            </button>

            <div className={styles.toolbarDivider} />

            {/* Color buttons */}
            {TEXT_COLORS.map((color) => (
                <button
                    key={color}
                    className={`${styles.colorButton} ${currentColor === color ? styles.active : ''}`}
                    style={{ background: color }}
                    onClick={() => onStyleChange({ color })}
                    title={color}
                />
            ))}
        </div>
    );
};

// ============================================================================
// React.memo with custom comparison
// ============================================================================

const arePropsEqual = (prev: FloatingToolbarProps, next: FloatingToolbarProps) => {
    return (
        prev.sticker.id === next.sticker.id &&
        prev.sticker.style?.color === next.sticker.style?.color &&
        prev.sticker.style?.textAlign === next.sticker.style?.textAlign &&
        prev.stickerRect.left === next.stickerRect.left &&
        prev.stickerRect.top === next.stickerRect.top &&
        prev.stickerRect.width === next.stickerRect.width
    );
};

export const FloatingToolbar = React.memo(FloatingToolbarComponent, arePropsEqual);
