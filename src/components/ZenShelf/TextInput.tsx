import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import { useThemeData } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import plusIcon from '../../assets/icons/plus.svg';
import minusIcon from '../../assets/icons/minus.svg';
import { TEXT_COLORS } from './FloatingToolbar';
import styles from './ZenShelf.module.css';

// ============================================================================
// 文字贴纸的主题感知颜色反转
// ============================================================================
const BLACK_COLOR = '#1C1C1E';
const WHITE_COLOR = '#FFFFFF';

/**
 * 在深色主题下反转黑/白颜色，以获得更好的可读性
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
// TextInput 组件 - 带有样式选项的增强弹出窗口
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
    // 始终使用左对齐
    const textAlign = 'left' as const;
    const [textColor, setTextColor] = useState(initialStyle?.color || TEXT_COLORS[0]);
    const [fontSize, setFontSize] = useState<number>(
        (initialStyle?.fontSize as number) || 40
    );
    const [isExiting, setIsExiting] = useState(false);

    // 挂载时聚焦并仅对工具栏播放入场动画
    useEffect(() => {
        if (toolbarRef.current) {
            scaleFadeIn(toolbarRef.current, 200);
        }
        if (inputWrapperRef.current) {
            // 仅在添加新文本（初始 text 为空）时播放输入框入场动画
            // 如果是编辑，文本已经显示在画布上，因此输入框本身不需要入场动画。
            if (!initialText) {
                scaleFadeIn(inputWrapperRef.current, 200);
            }
        }
        if (inputRef.current) {
            inputRef.current.focus();
            // 如果是编辑，设置初始文本
            if (initialText) {
                inputRef.current.innerText = initialText;
                // 将光标移动到末尾
                const range = document.createRange();
                range.selectNodeContents(inputRef.current);
                range.collapse(false);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }
    }, [initialText]);

    // 字体大小更改时更新它
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.fontSize = `${fontSize * viewportScale}px`;
        }
    }, [fontSize, viewportScale]);

    // 触发工具栏和输入框的出场动画
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

    // 点击外部关闭（仅当点击空白背景时）
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isExiting) return;
            const target = e.target as HTMLElement;
            // 检查是否点击了输入框或工具栏
            if (inputRef.current?.contains(target) || toolbarRef.current?.contains(target)) {
                return;
            }
            // 如果有内容则提交，否则取消
            const text = inputRef.current?.innerText?.trim() || '';
            if (text) {
                // 如果提交内容，则不播放输入框出场动画
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
    }, [textColor, fontSize, onSubmit, onCancel, isExiting, triggerExit]);

    // 字体大小调整常量
    const FONT_SIZE_STEP = 2; // 每次调整的步长（px）
    const FONT_SIZE_STEP_LARGE = 12; // 按住 Shift 时的大步长（px）
    const MIN_FONT_SIZE = 12; // 最小字体大小（px）
    const MAX_FONT_SIZE = 120; // 最大字体大小（px）

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === '+' || e.key === '=') {
            // 按 + 或 = 键增大字体（Shift 加大步长）
            e.preventDefault();
            const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
            setFontSize(prev => Math.min(prev + step, MAX_FONT_SIZE));
        } else if (e.key === '-' || e.key === '_') {
            // 按 - 或 _ 键减小字体（Shift 加大步长）
            e.preventDefault();
            const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
            setFontSize(prev => Math.max(prev - step, MIN_FONT_SIZE));
        }
        // Shift+Enter 允许换行（默认行为）
    };

    const handleInput = () => {
        if (inputRef.current) {
            setValue(inputRef.current.innerText);
        }
    };

    // 处理粘贴 - 确保仅粘贴纯文本以避免格式问题
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        handleInput();
    };

    const handleSubmit = () => {
        const trimmed = inputRef.current?.innerText?.trim() || '';
        if (trimmed) {
            // 如果提交内容，则不播放输入框出场动画
            triggerExit(() => onSubmit(trimmed, { color: textColor, textAlign, fontSize }), false);
        } else {
            handleCancel();
        }
    };

    const handleCancel = () => {
        triggerExit(onCancel);
    };

    const [localFontSize, setLocalFontSize] = useState<string>(fontSize.toString());

    // 当 fontSize 外部变更（例如快捷键）时同步更新输入框
    useEffect(() => {
        setLocalFontSize(fontSize.toString());
    }, [fontSize]);

    const commitFontSize = (val: string) => {
        let num = parseInt(val, 10);
        if (isNaN(num)) {
            num = fontSize; // 恢复旧值
        } else {
            // 范围限制
            if (num < MIN_FONT_SIZE) num = MIN_FONT_SIZE;
            if (num > MAX_FONT_SIZE) num = MAX_FONT_SIZE;
        }
        setFontSize(num);
        setLocalFontSize(num.toString());
    };

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
                {/* 字体大小控制 */}
                <div className={styles.toolbarFontSizeControl}>
                    <button
                        className={styles.toolbarFontSizeBtn}
                        onClick={(e) => {
                            const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                            setFontSize(prev => Math.max(prev - step, MIN_FONT_SIZE));
                        }}
                        title={t.textInput.fontSizeDecrease}
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${minusIcon})`, maskImage: `url(${minusIcon})` }} />
                    </button>
                    <input
                        className={styles.toolbarFontSizeInput}
                        value={localFontSize}
                        onChange={(e) => {
                            const val = e.target.value;
                            // 仅允许输入数字
                            if (val === '' || /^\d*$/.test(val)) {
                                setLocalFontSize(val);
                            }
                        }}
                        onBlur={() => commitFontSize(localFontSize)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                commitFontSize(localFontSize);
                                (e.target as HTMLInputElement).blur();
                                // 将焦点还给文本编辑器
                                inputRef.current?.focus();
                            }
                        }}
                        // 防止事件冒泡导致贴纸提交
                        onClick={(e) => e.stopPropagation()}
                        title={t.textInput.fontSizeIncrease}
                    />
                    <button
                        className={styles.toolbarFontSizeBtn}
                        onClick={(e) => {
                            const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                            setFontSize(prev => Math.min(prev + step, MAX_FONT_SIZE));
                        }}
                        title={t.textInput.fontSizeIncrease}
                    >
                        <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                    </button>
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

