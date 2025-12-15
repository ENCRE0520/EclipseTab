import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useZenShelf } from '../../context/ZenShelfContext';
import { Sticker, IMAGE_MAX_WIDTH } from '../../types';
import styles from './ZenShelf.module.css';
import plusIcon from '../../assets/icons/plus.svg';
import writeIcon from '../../assets/icons/write.svg';
import trashIcon from '../../assets/icons/trash.svg';
import uploadIcon from '../../assets/icons/upload.svg';
import editIcon from '../../assets/icons/edit.svg';

// ============================================================================
// Color Palette for Text Stickers
// ============================================================================

const TEXT_COLORS = [
    '#1C1C1E', // Dark gray (default)
    '#FF3B30', // Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FFFFFF', // White
];

// ============================================================================
// TextInput Component - Enhanced popup with style options
// ============================================================================

interface TextInputProps {
    x: number;
    y: number;
    onSubmit: (content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right' }) => void;
    onCancel: () => void;
}

const TextInput: React.FC<TextInputProps> = ({ x, y, onSubmit, onCancel }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState('');
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
    const [textColor, setTextColor] = useState(TEXT_COLORS[0]);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                handleCancel();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
        // Shift+Enter allows newline (default behavior)
    };

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed) {
            onSubmit(trimmed, { color: textColor, textAlign });
        } else {
            onCancel();
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    return (
        <div
            ref={popupRef}
            className={styles.textInputPopup}
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.textInputInner}>
                <div className={styles.textInputLabel}>Add Sticker</div>

                <textarea
                    ref={textareaRef}
                    className={styles.textInput}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type text or paste an image (Ctrl+V)..."
                />

                {/* Style Options */}
                <div className={styles.styleOptionsSection}>
                    {/* Alignment */}
                    <div className={styles.alignmentGroup}>
                        <button
                            className={`${styles.alignmentButton} ${textAlign === 'left' ? styles.active : ''}`}
                            onClick={() => setTextAlign('left')}
                            title="Align Left"
                        >
                            ←
                        </button>
                        <button
                            className={`${styles.alignmentButton} ${textAlign === 'center' ? styles.active : ''}`}
                            onClick={() => setTextAlign('center')}
                            title="Align Center"
                        >
                            ↔
                        </button>
                        <button
                            className={`${styles.alignmentButton} ${textAlign === 'right' ? styles.active : ''}`}
                            onClick={() => setTextAlign('right')}
                            title="Align Right"
                        >
                            →
                        </button>
                    </div>

                    {/* Colors */}
                    <div className={styles.colorOptionsGrid}>
                        {TEXT_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`${styles.colorOptionBtn} ${textColor === color ? styles.active : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setTextColor(color)}
                                title={color}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.textInputActions}>
                    <button className={styles.textInputCancel} onClick={handleCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles.textInputConfirm}
                        onClick={handleSubmit}
                        disabled={!value.trim()}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// ContextMenu Component - Right-click context menu
// ============================================================================

interface ContextMenuProps {
    x: number;
    y: number;
    type: 'background' | 'sticker';
    stickerId?: string;
    onClose: () => void;
    onAddSticker: () => void;
    onUploadImage: () => void;
    onToggleEditMode: () => void;
    onEditSticker?: () => void;
    onDeleteSticker?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    type,
    onClose,
    onAddSticker,
    onUploadImage,
    onToggleEditMode,
    onEditSticker,
    onDeleteSticker,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Prevent default context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    return (
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.menuLabel}>EclipseTab</div>
            <div className={styles.menuDivider} />
            <div className={styles.menuOptions}>
                {type === 'background' ? (
                    <>
                        <button className={styles.menuItem} onClick={() => { onAddSticker(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                            <span>Add Sticker</span>
                        </button>
                        <button className={styles.menuItem} onClick={() => { onUploadImage(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                            <span>Upload Image</span>
                        </button>
                        <button className={styles.menuItem} onClick={() => { onToggleEditMode(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                            <span>Edit Mode</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button className={styles.menuItem} onClick={() => { onEditSticker?.(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                            <span>Edit Sticker</span>
                        </button>
                        <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDeleteSticker?.(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                            <span>Delete Sticker</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
// ============================================================================
// FloatingToolbar Component - 浮动样式工具栏
// ============================================================================

interface FloatingToolbarProps {
    sticker: Sticker;
    stickerRect: DOMRect;
    onStyleChange: (updates: Partial<Sticker['style']>) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ sticker, stickerRect, onStyleChange }) => {
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
// StickerItem Component - 单个贴纸渲染
// ============================================================================

interface StickerItemProps {
    sticker: Sticker;
    isSelected: boolean;
    isCreativeMode: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onPositionChange: (x: number, y: number) => void;
    onStyleChange: (updates: Partial<Sticker['style']>) => void;
    onBringToTop: () => void;
    onScaleChange: (scale: number) => void;
}

const StickerItem: React.FC<StickerItemProps> = ({
    sticker,
    isSelected,
    isCreativeMode,
    onSelect,
    onDelete,
    onPositionChange,
    onStyleChange,
    onBringToTop,
    onScaleChange,
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [stickerRect, setStickerRect] = useState<DOMRect | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; stickerX: number; stickerY: number } | null>(null);
    const resizeStartRef = useRef<{ x: number; y: number; startScale: number } | null>(null);
    const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(300);

    // Update rect when selected
    useEffect(() => {
        if (isSelected && elementRef.current) {
            setStickerRect(elementRef.current.getBoundingClientRect());
        } else {
            setStickerRect(null);
        }
    }, [isSelected, sticker.x, sticker.y]);

    // Double-click to bring to top
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onBringToTop();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent if clicking delete button or resize handle
        if ((e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
            return;
        }
        if ((e.target as HTMLElement).closest(`.${styles.resizeHandle}`)) {
            return;
        }

        if (isCreativeMode) {
            onSelect();
        }

        // Start drag
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            stickerX: sticker.x,
            stickerY: sticker.y,
        };

        e.preventDefault();
        e.stopPropagation();
    };

    // Drag effect
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            onPositionChange(
                dragStartRef.current.stickerX + dx,
                dragStartRef.current.stickerY + dy
            );
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onPositionChange]);

    // Resize handle start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            startScale: sticker.scale || 1,
        };
    };

    // Resize effect
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;

            // Calculate distance moved (diagonal)
            const dx = e.clientX - resizeStartRef.current.x;
            const dy = e.clientY - resizeStartRef.current.y;
            const delta = (dx + dy) / 2; // Average of x and y movement

            // Scale factor: 2px movement = 1% scale change
            const scaleDelta = delta / 200;
            const newScale = Math.max(0.2, Math.min(3, resizeStartRef.current.startScale + scaleDelta));

            onScaleChange(newScale);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            resizeStartRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, onScaleChange]);

    // Get image natural width for scale calculation
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setImageNaturalWidth(e.currentTarget.naturalWidth);
    };

    const classNames = [
        styles.sticker,
        isDragging && styles.dragging,
        isSelected && styles.selected,
        isCreativeMode && styles.creativeHover,
    ].filter(Boolean).join(' ');

    // Calculate actual image width based on scale
    const imageWidth = sticker.type === 'image'
        ? Math.min(imageNaturalWidth, IMAGE_MAX_WIDTH) * (sticker.scale || 1)
        : undefined;

    return (
        <>
            <div
                ref={elementRef}
                className={classNames}
                style={{
                    left: sticker.x,
                    top: sticker.y,
                    zIndex: sticker.zIndex || 1,
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                {sticker.type === 'text' ? (
                    <div
                        className={styles.textSticker}
                        style={{
                            color: sticker.style?.color || '#1C1C1E',
                            textAlign: sticker.style?.textAlign || 'left',
                            fontSize: sticker.style?.fontSize || 48,
                        }}
                    >
                        {sticker.content}
                    </div>
                ) : (
                    <div className={styles.imageContainer}>
                        <img
                            src={sticker.content}
                            alt="sticker"
                            className={styles.imageSticker}
                            style={{ width: imageWidth }}
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                        {/* Resize handle - always visible on hover */}
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={handleResizeStart}
                        />
                    </div>
                )}

                {/* Delete button - visible in creative mode on hover */}
                {isCreativeMode && (
                    <button
                        className={styles.deleteButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Floating toolbar for selected text stickers */}
            {isSelected && sticker.type === 'text' && stickerRect && (
                <FloatingToolbar
                    sticker={sticker}
                    stickerRect={stickerRect}
                    onStyleChange={onStyleChange}
                />
            )}
        </>
    );
};

// ============================================================================
// ZenShelf Main Component
// ============================================================================

export const ZenShelf: React.FC = () => {
    const {
        stickers,
        isCreativeMode,
        selectedStickerId,
        addSticker,
        updateSticker,
        deleteSticker,
        selectSticker,
        setCreativeMode,
    } = useZenShelf();

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'background' | 'sticker';
        stickerId?: string;
    } | null>(null);
    const [_editingSticker, setEditingSticker] = useState<Sticker | null>(null);
    void _editingSticker; // Reserved for future edit sticker feature

    // UI 元素选择器 - 右键这些区域不会触发上下文菜单
    const UI_SELECTORS = [
        '[data-dock-container]',
        '.dock',
        'header',
        '[class*="Searcher"]',
        '[class*="Modal"]',
        '[class*="Settings"]',
        '[class*="Editor"]',
        '[class*="FolderView"]',
        '[class*="textInputPopup"]',
        '[class*="contextMenu"]',
    ].join(', ');

    // Global right-click handler for context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Don't show on UI elements
            if (target.closest(UI_SELECTORS)) {
                return;
            }

            // Check if right-clicking on a sticker
            const stickerEl = target.closest(`.${styles.sticker}`) as HTMLElement;
            if (stickerEl) {
                e.preventDefault();
                // Find sticker ID from the sticker's position
                const sticker = stickers.find(s =>
                    Math.abs(s.x - parseInt(stickerEl.style.left)) < 10 &&
                    Math.abs(s.y - parseInt(stickerEl.style.top)) < 10
                );
                if (sticker) {
                    setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'sticker',
                        stickerId: sticker.id,
                    });
                }
                return;
            }

            // Right-click on background
            e.preventDefault();
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'background',
            });
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [stickers]);

    // Handle image file selection
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const img = new Image();
            img.onload = () => {
                const x = window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2;
                const y = window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2;
                addSticker({
                    type: 'image',
                    content: base64,
                    x,
                    y,
                });
            };
            img.src = base64;
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [addSticker]);

    // Handle text input submit
    const handleTextSubmit = useCallback((content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right' }) => {
        if (textInputPos) {
            addSticker({
                type: 'text',
                content,
                x: textInputPos.x,
                y: textInputPos.y,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: 48,
                } : undefined,
            });
        }
        setTextInputPos(null);
    }, [textInputPos, addSticker]);

    const handleTextCancel = useCallback(() => {
        setTextInputPos(null);
    }, []);

    // Handle paste - add image sticker
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!isCreativeMode) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    // Convert to base64
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result as string;

                        // Create image to get dimensions and check size
                        const img = new Image();
                        img.onload = () => {
                            // Center of viewport
                            const x = window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2;
                            const y = window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2;

                            addSticker({
                                type: 'image',
                                content: base64,
                                x,
                                y,
                            });
                        };
                        img.src = base64;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isCreativeMode, addSticker]);

    return (
        <div
            ref={canvasRef}
            className={`${styles.canvas} ${isCreativeMode ? styles.creativeMode : ''}`}
        >
            {stickers.map((sticker) => (
                <StickerItem
                    key={sticker.id}
                    sticker={sticker}
                    isSelected={selectedStickerId === sticker.id}
                    isCreativeMode={isCreativeMode}
                    onSelect={() => selectSticker(sticker.id)}
                    onDelete={() => deleteSticker(sticker.id)}
                    onPositionChange={(x, y) => updateSticker(sticker.id, { x, y })}
                    onStyleChange={(updates) => {
                        if (sticker.style) {
                            updateSticker(sticker.id, { style: { ...sticker.style, ...updates } });
                        }
                    }}
                    onBringToTop={() => {
                        // Find max zIndex and set this sticker to max + 1
                        const maxZ = Math.max(...stickers.map(s => s.zIndex || 1), 0);
                        updateSticker(sticker.id, { zIndex: maxZ + 1 });
                    }}
                    onScaleChange={(scale) => {
                        updateSticker(sticker.id, { scale });
                    }}
                />
            ))}

            {textInputPos && (
                <TextInput
                    x={textInputPos.x}
                    y={textInputPos.y}
                    onSubmit={handleTextSubmit}
                    onCancel={handleTextCancel}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    stickerId={contextMenu.stickerId}
                    onClose={() => setContextMenu(null)}
                    onAddSticker={() => {
                        setTextInputPos({ x: contextMenu.x, y: contextMenu.y });
                    }}
                    onUploadImage={() => {
                        fileInputRef.current?.click();
                    }}
                    onToggleEditMode={() => {
                        setCreativeMode(!isCreativeMode);
                    }}
                    onEditSticker={() => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        if (sticker) {
                            setEditingSticker(sticker);
                            setTextInputPos({ x: sticker.x, y: sticker.y });
                        }
                    }}
                    onDeleteSticker={() => {
                        if (contextMenu.stickerId) {
                            deleteSticker(contextMenu.stickerId);
                        }
                    }}
                />
            )}

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
};
