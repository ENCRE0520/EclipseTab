import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import { useThemeData } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import alignLeftIcon from '../../assets/icons/align-left.svg';
import alignCenterIcon from '../../assets/icons/align-center.svg';
import alignRightIcon from '../../assets/icons/align-right.svg';
import { TEXT_COLORS } from './FloatingToolbar';
import styles from './ZenShelf.module.css';

// ============================================================================
// Theme-aware color inversion for text stickers
// ============================================================================
const BLACK_COLOR = '#1C1C1E';
const WHITE_COLOR = '#FFFFFF';

/**
 * Inverts black/white colors in dark theme for better readability
 */
const getThemeAwareColor = (color: string, theme: string): string => {
    if (theme !== 'dark') return color;

    const upperColor = color.toUpperCase();
    if (upperColor === BLACK_COLOR.toUpperCase() || upperColor === '#1C1C1E') {
        return WHITE_COLOR;
    }
    if (upperColor === WHITE_COLOR.toUpperCase() || upperColor === '#FFF') {
        return BLACK_COLOR;
    }
    return color;
};

// ============================================================================
// TextInput Component - Enhanced popup with style options
// ============================================================================

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
    const { t } = useLanguage();
    const { theme } = useThemeData();
    const inputRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState(initialText);
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(initialStyle?.textAlign || 'left');
    const [textColor, setTextColor] = useState(initialStyle?.color || TEXT_COLORS[0]);
    const [fontSize, setFontSize] = useState<number>(
        (initialStyle?.fontSize as number) || 40
    );
    const [isExiting, setIsExiting] = useState(false);

    // Font size options with translated labels
    const fontSizes = [
        { label: t.textInput.s, value: 24 },
        { label: t.textInput.m, value: 32 },
        { label: t.textInput.l, value: 40 },
    ];

    // Focus on mount and play enter animation for toolbar only
    useEffect(() => {
        if (toolbarRef.current) {
            scaleFadeIn(toolbarRef.current, 200);
        }
        if (inputWrapperRef.current) {
            scaleFadeIn(inputWrapperRef.current, 200);
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

    // Update font size when it changes
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.fontSize = `${fontSize * viewportScale}px`;
        }
    }, [fontSize, viewportScale]);

    // Trigger exit animation for toolbar and input
    const triggerExit = useCallback((callback: () => void, animateInput: boolean = true) => {
        if (isExiting) return;
        setIsExiting(true);

        if (animateInput && inputWrapperRef.current) {
            scaleFadeOut(inputWrapperRef.current, 150);
        }

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
                // Don't animate input out if submitting content
                triggerExit(() => onSubmit(text, { color: textColor, textAlign, fontSize }), false);
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

    // Handle paste - ensure only plain text is pasted to avoid formatting issues
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        handleInput();
    };

    const handleSubmit = () => {
        const trimmed = inputRef.current?.innerText?.trim() || '';
        if (trimmed) {
            // Don't animate input out if submitting content
            triggerExit(() => onSubmit(trimmed, { color: textColor, textAlign, fontSize }), false);
        } else {
            handleCancel();
        }
    };

    const handleCancel = () => {
        triggerExit(onCancel);
    };

    // Get font size index for highlight position
    const fontSizeIndex = fontSizes.findIndex(fs => fs.value === fontSize);

    return createPortal(
        <div
            ref={containerRef}
            className={`${styles.stickerPreviewContainer} ${isExiting ? styles.exiting : ''}`}
            style={{ left: x, top: y }}
        >
            {/* 实时预览贴纸 - 直接在背景上显示 */}
            <div ref={inputWrapperRef}>
                <div
                    ref={inputRef}
                    className={styles.stickerPreviewInput}
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                        color: getThemeAwareColor(textColor, theme),
                        textAlign: textAlign,
                        fontSize: `${fontSize * viewportScale}px`,
                    }}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onClick={(e) => e.stopPropagation()}
                    data-placeholder={t.textInput.placeholder}
                />
            </div>

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
                        title="Align Left"
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${alignLeftIcon})`, maskImage: `url(${alignLeftIcon})` }} />
                    </button>
                    <button
                        className={styles.toolbarAlignBtn}
                        onClick={() => setTextAlign('center')}
                        title="Center"
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${alignCenterIcon})`, maskImage: `url(${alignCenterIcon})` }} />
                    </button>
                    <button
                        className={styles.toolbarAlignBtn}
                        onClick={() => setTextAlign('right')}
                        title="Align Right"
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
                    {fontSizes.map((fs) => (
                        <button
                            key={fs.value}
                            className={styles.toolbarAlignBtn}
                            onClick={() => setFontSize(fs.value)}
                            title={`Font Size: ${fs.value}px`}
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
                    {t.textInput.cancel}
                </button>
                <button
                    className={styles.toolbarConfirmBtn}
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                >
                    {t.textInput.confirm}
                </button>
            </div>
        </div>,
        document.body
    );
};

