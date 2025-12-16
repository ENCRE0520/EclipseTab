import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDockUI } from '../../context/DockContext';
import { useZenShelf } from '../../context/ZenShelfContext';
import { Sticker, IMAGE_MAX_WIDTH } from '../../types';
import { compressStickerImage } from '../../utils/imageCompression';
import { copyBlobToClipboard, createImageStickerImage, createTextStickerImage, downloadBlob, imageToBlob } from '../../utils/canvasUtils';
import { StickerItem } from './StickerItem';
import { TextInput } from './TextInput';
import { ContextMenu } from './ContextMenu';
import styles from './ZenShelf.module.css';

// ============================================================================
// ZenShelf Main Component
// ============================================================================

export const ZenShelf: React.FC = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { stickers, selectedStickerId, addSticker, updateSticker, deleteSticker, selectSticker, layoutStickers } = useZenShelf();
    const { isEditMode, setIsEditMode } = useDockUI();
    const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'background' | 'sticker';
        stickerId?: string;
    } | null>(null);

    // Refs for tracking window size for responsive layout
    const prevWidthRef = useRef(window.innerWidth);
    const prevHeightRef = useRef(window.innerHeight);

    // Handle window resize for responsive sticker layout
    useEffect(() => {
        const handleResize = () => {
            const currentWidth = window.innerWidth;
            const currentHeight = window.innerHeight;

            const prevWidth = prevWidthRef.current;
            const prevHeight = prevHeightRef.current;

            // Calculate scale factors
            if (prevWidth > 0 && prevHeight > 0) {
                const scaleX = currentWidth / prevWidth;
                const scaleY = currentHeight / prevHeight;

                if (scaleX !== 1 || scaleY !== 1) {
                    layoutStickers(scaleX, scaleY);
                }
            }

            prevWidthRef.current = currentWidth;
            prevHeightRef.current = currentHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [layoutStickers]);

    const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);

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

    // Double-click on background to quickly add sticker
    useEffect(() => {
        const handleDoubleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            if (target.closest(UI_SELECTORS)) {
                return;
            }

            if (target.closest(`.${styles.sticker}`)) {
                return;
            }

            if (textInputPos) {
                return;
            }

            setTextInputPos({ x: e.clientX, y: e.clientY });
        };

        document.addEventListener('dblclick', handleDoubleClick);
        return () => document.removeEventListener('dblclick', handleDoubleClick);
    }, [textInputPos]);

    // Hotkey: Delete to remove sticker
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedStickerId) {
                    deleteSticker(selectedStickerId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedStickerId, deleteSticker]);

    // Handle image file selection
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const compressed = await compressStickerImage(base64);
            const img = new Image();
            img.onload = () => {
                const x = window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2;
                const y = window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2;
                addSticker({
                    type: 'image',
                    content: compressed,
                    x,
                    y,
                });
            };
            img.src = compressed;
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [addSticker]);

    // Handle text input submit
    const handleTextSubmit = useCallback((content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right' }) => {
        if (editingSticker) {
            updateSticker(editingSticker.id, {
                content,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: editingSticker.style?.fontSize || 48,
                } : editingSticker.style,
            });
        } else if (textInputPos) {
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
        setEditingSticker(null);
    }, [textInputPos, editingSticker, addSticker, updateSticker]);

    const handleTextCancel = useCallback(() => {
        setTextInputPos(null);
        setEditingSticker(null);
    }, []);

    // Handle paste - add image sticker
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
                if (activeElement.closest('[class*="Searcher"]') || activeElement.closest('[class*="textInputPopup"]')) {
                    return;
                }
            }

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    const reader = new FileReader();
                    reader.onload = async () => {
                        const base64 = reader.result as string;
                        const compressed = await compressStickerImage(base64);
                        const img = new Image();
                        img.onload = () => {
                            const x = window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2;
                            const y = window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2;
                            addSticker({
                                type: 'image',
                                content: compressed,
                                x,
                                y,
                            });
                        };
                        img.src = compressed;
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addSticker]);

    return (
        <div
            ref={canvasRef}
            className={`${styles.canvas} ${isEditMode ? styles.creativeMode : ''}`}
        >
            {stickers
                .filter((sticker) => !editingSticker || sticker.id !== editingSticker.id)
                .map((sticker) => (
                    <StickerItem
                        key={sticker.id}
                        sticker={sticker}
                        isSelected={selectedStickerId === sticker.id}
                        isCreativeMode={isEditMode}
                        onSelect={() => selectSticker(sticker.id)}
                        onDelete={() => deleteSticker(sticker.id)}
                        onPositionChange={(x, y) => updateSticker(sticker.id, { x, y })}
                        onStyleChange={(updates) => {
                            if (sticker.style) {
                                updateSticker(sticker.id, { style: { ...sticker.style, ...updates } });
                            }
                        }}
                        onBringToTop={() => {
                            const maxZ = Math.max(...stickers.map(s => s.zIndex || 1), 0);
                            updateSticker(sticker.id, { zIndex: maxZ + 1 });
                        }}
                        onScaleChange={(scale) => {
                            updateSticker(sticker.id, { scale });
                        }}
                        isEditMode={isEditMode}
                    />
                ))}

            {textInputPos && (
                <TextInput
                    x={textInputPos.x}
                    y={textInputPos.y}
                    initialText={editingSticker?.content || ''}
                    initialStyle={editingSticker?.style}
                    onSubmit={handleTextSubmit}
                    onCancel={handleTextCancel}
                    onImagePaste={(base64) => {
                        const img = new Image();
                        img.onload = () => {
                            addSticker({
                                type: 'image',
                                content: base64,
                                x: textInputPos.x,
                                y: textInputPos.y,
                            });
                        };
                        img.src = base64;
                    }}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    stickerId={contextMenu.stickerId}
                    isImageSticker={(() => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        return sticker?.type === 'image';
                    })()}
                    onClose={() => setContextMenu(null)}
                    onAddSticker={() => {
                        setTextInputPos({ x: contextMenu.x, y: contextMenu.y });
                    }}
                    onUploadImage={() => {
                        fileInputRef.current?.click();
                    }}
                    onToggleEditMode={() => {
                        setIsEditMode(!isEditMode);
                    }}
                    isEditMode={isEditMode}
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
                    onCopyImage={async () => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        if (sticker && sticker.type === 'image') {
                            try {
                                const img = new Image();
                                img.onload = async () => {
                                    const blob = await imageToBlob(img);
                                    if (blob) {
                                        await copyBlobToClipboard(blob);
                                    }
                                };
                                img.src = sticker.content;
                            } catch (error) {
                                console.error('Failed to copy image:', error);
                            }
                        }
                    }}
                    onExportImage={async () => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        if (sticker && sticker.type === 'text') {
                            try {
                                const blob = await createTextStickerImage(sticker);
                                if (blob) {
                                    downloadBlob(blob, `sticker-${Date.now()}.png`);
                                }
                            } catch (error) {
                                console.error('Failed to export sticker:', error);
                            }
                        }
                    }}
                    onCopyText={() => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        if (sticker && sticker.type === 'text') {
                            navigator.clipboard.writeText(sticker.content);
                        }
                    }}
                    onExportImageSticker={async () => {
                        const sticker = stickers.find(s => s.id === contextMenu.stickerId);
                        if (sticker && sticker.type === 'image') {
                            try {
                                const blob = await createImageStickerImage(sticker);
                                if (blob) {
                                    downloadBlob(blob, `sticker-${Date.now()}.png`);
                                }
                            } catch (error) {
                                console.error('Failed to export image sticker:', error);
                            }
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
