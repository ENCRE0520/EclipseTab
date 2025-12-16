import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import alignLeftIcon from '../../assets/icons/align-left.svg';
import alignCenterIcon from '../../assets/icons/align-center.svg';
import alignRightIcon from '../../assets/icons/align-right.svg';
import { TEXT_COLORS } from './FloatingToolbar';
import styles from './ZenShelf.module.css';

// ============================================================================
// TextInput Component - Enhanced popup with style options
// ============================================================================

// Font size options: small, medium, large
const FONT_SIZES = [
    { label: '小', value: 24 },
    { label: '中', value: 32 },
    { label: '大', value: 40 },
] as const;

type FontSizeValue = typeof FONT_SIZES[number]['value'];

interface TextInputProps {
    x: number;
    y: number;
    initialText?: string;
    initialStyle?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize?: number };
    onSubmit: (content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize: number }) => void;
    onCancel: () => void;
    viewportScale: number;
}

export const TextInput: React.FC<TextInputProps> = ({ x, y, initialText = '', initialStyle, onSubmit, onCancel, viewportScale }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState(initialText);
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(initialStyle?.textAlign || 'left');
    const [textColor, setTextColor] = useState(initialStyle?.color || TEXT_COLORS[0]);
    const [fontSize, setFontSize] = useState<FontSizeValue>(
        (initialStyle?.fontSize as FontSizeValue) || 40
    );
    const [isExiting, setIsExiting] = useState(false);

    // Focus on mount and play enter animation for toolbar only
    useEffect(() => {
        if (toolbarRef.current) {
            scaleFadeIn(toolbarRef.current, 200);
        }
        if (inputRef.current) {
            inputRef.current.focus();
            // Set initial text if editing
            if (initialText) {
                inputRef.current.innerText = initialText;
                // Move cursor to end
                const range = document.createRange();
                range.selectNodeContents(inputRef.current);
                range.collapse(false);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }
    }, [initialText]);

    // Trigger exit animation for toolbar only
    const triggerExit = useCallback((callback: () => void) => {
        if (isExiting) return;
        setIsExiting(true);
        if (toolbarRef.current) {
            scaleFadeOut(toolbarRef.current, 150, callback);
        } else {
            callback();
        }
    }, [isExiting]);

    // Click outside to close (only if clicking on empty background)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isExiting) return;
            const target = e.target as HTMLElement;
            // Check if clicking on the input or toolbar
            if (inputRef.current?.contains(target) || toolbarRef.current?.contains(target)) {
                return;
            }
            // Submit if has content, otherwise cancel
            const text = inputRef.current?.innerText?.trim() || '';
            if (text) {
                triggerExit(() => onSubmit(text, { color: textColor, textAlign, fontSize }));
            } else {
                triggerExit(onCancel);
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [textColor, textAlign, fontSize, onSubmit, onCancel, isExiting, triggerExit]);



    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
        // Shift+Enter allows newline (default behavior)
    };

    const handleInput = () => {
        if (inputRef.current) {
            setValue(inputRef.current.innerText);
        }
    };

    const handleSubmit = () => {
        const trimmed = inputRef.current?.innerText?.trim() || '';
        if (trimmed) {
            triggerExit(() => onSubmit(trimmed, { color: textColor, textAlign, fontSize }));
        } else {
            handleCancel();
        }
    };

    const handleCancel = () => {
        triggerExit(onCancel);
    };

    // Get font size index for highlight position
    const fontSizeIndex = FONT_SIZES.findIndex(fs => fs.value === fontSize);

    return createPortal(
        <div
            ref={containerRef}
            className={`${styles.stickerPreviewContainer} ${isExiting ? styles.exiting : ''}`}
            style={{ left: x, top: y }}
        >
            {/* 实时预览贴纸 - 直接在背景上显示 */}
            <div
                ref={inputRef}
                className={styles.stickerPreviewInput}
                contentEditable
                suppressContentEditableWarning
                style={{
                    color: textColor,
                    textAlign: textAlign,
                    fontSize: `${fontSize * viewportScale}px`,
                }}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                data-placeholder="Enter text..."
            />

            {/* 工具栏 - 跟随在输入区域下方 */}
            <div
                ref={toolbarRef}
                className={styles.stickerToolbar}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 对齐选项 */}
                <div className={styles.toolbarAlignGroup}>
                    <div
                        className={styles.toolbarHighlight}
                        style={{
                            transform: `translateX(${['left', 'center', 'right'].indexOf(textAlign) * 100}%)`,
                        }}
                    />
                    <button
                        className={styles.toolbarAlignBtn}
                        onClick={() => setTextAlign('left')}
                        title="左对齐"
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${alignLeftIcon})`, maskImage: `url(${alignLeftIcon})` }} />
                    </button>
                    <button
                        className={styles.toolbarAlignBtn}
                        onClick={() => setTextAlign('center')}
                        title="居中"
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${alignCenterIcon})`, maskImage: `url(${alignCenterIcon})` }} />
                    </button>
                    <button
                        className={styles.toolbarAlignBtn}
                        onClick={() => setTextAlign('right')}
                        title="右对齐"
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${alignRightIcon})`, maskImage: `url(${alignRightIcon})` }} />
                    </button>
                </div>

                <div className={styles.toolbarDivider} />

                {/* 字体大小选项 */}
                <div className={styles.toolbarAlignGroup}>
                    <div
                        className={styles.toolbarHighlight}
                        style={{
                            transform: `translateX(${fontSizeIndex * 100}%)`,
                        }}
                    />
                    {FONT_SIZES.map((fs) => (
                        <button
                            key={fs.value}
                            className={styles.toolbarAlignBtn}
                            onClick={() => setFontSize(fs.value)}
                            title={`字体大小: ${fs.value}px`}
                        >
                            {fs.label}
                        </button>
                    ))}
                </div>

                <div className={styles.toolbarDivider} />

                {/* 颜色选项 */}
                <div className={styles.toolbarColorGroup}>
                    {TEXT_COLORS.map((color) => (
                        <button
                            key={color}
                            className={`${styles.toolbarColorBtn} ${textColor === color ? styles.active : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setTextColor(color)}
                            title={color}
                        />
                    ))}
                </div>

                <div className={styles.toolbarDivider} />

                {/* 操作按钮 */}
                <button className={styles.toolbarCancelBtn} onClick={handleCancel}>
                    Cancel
                </button>
                <button
                    className={styles.toolbarConfirmBtn}
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                >
                    Confirm
                </button>
            </div>
        </div>,
        document.body
    );
};

