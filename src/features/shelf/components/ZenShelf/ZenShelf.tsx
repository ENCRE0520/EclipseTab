import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDockUI } from '@/features/dock/context/DockContext';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import { LinkCardMetadata, Sticker, IMAGE_MAX_WIDTH } from '@/shared/types';
import { compressStickerImageToBlob } from '@/features/theme/utils/imageCompression';
import { copyBlobToClipboard, createImageStickerImage, createTextStickerImage, downloadBlob } from '@/features/theme/utils/canvasUtils';
import { db } from '@/shared/utils/db';
import { useLanguage } from '@/shared/context/LanguageContext';

// 贴纸图片 ID 前缀
const STICKER_IMG_PREFIX = 'stickerimg_';
import { StickerItem } from './StickerItem';
import { TextInput, TextInputHandle } from './TextInput';
import { ContextMenu } from './ContextMenu';
import { RecycleBin } from './RecycleBin';
import { RecycleBinModal } from './RecycleBinModal';
import styles from './ZenShelf.module.css';


// ============================================================================
// ZenShelf 主组件
// ============================================================================

interface ZenShelfProps {
    onOpenSettings?: (position: { x: number; y: number }) => void;
}

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

const STICKER_EDGE_MARGIN = 20;

const clampStickerPositionToViewport = (
    x: number,
    y: number,
    stickerEl: HTMLElement,
    viewportScale: number
) => {
    const rect = stickerEl.getBoundingClientRect();
    const stickerWidth = rect.width / viewportScale;
    const stickerHeight = rect.height / viewportScale;
    const minX = STICKER_EDGE_MARGIN / viewportScale;
    const minY = STICKER_EDGE_MARGIN / viewportScale;
    const maxX = (window.innerWidth / viewportScale) - stickerWidth - minX;
    const maxY = (window.innerHeight / viewportScale) - stickerHeight - minY;

    return {
        x: maxX < minX ? Math.max(maxX, Math.min(minX, x)) : Math.max(minX, Math.min(maxX, x)),
        y: maxY < minY ? Math.max(maxY, Math.min(minY, y)) : Math.max(minY, Math.min(maxY, y)),
    };
};

export const ZenShelf: React.FC<ZenShelfProps> = ({ onOpenSettings }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { stickers, selectedStickerId, addSticker, updateSticker, deleteSticker, selectSticker, bringToTop } = useZenShelf();
    const { isEditMode, setIsEditMode } = useDockUI();
    const { t } = useLanguage();
    const [batchSelectedStickerIds, setBatchSelectedStickerIds] = useState<string[]>([]);
    const batchDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'background' | 'sticker';
        stickerId?: string;
    } | null>(null);

    // 响应式缩放的参考宽度（以 1920px 为基准）
    const REFERENCE_WIDTH = 1920;

    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

    // 用于响应式贴纸尺寸的视口缩放比例
    const [viewportScale, setViewportScale] = useState(() => window.innerWidth / REFERENCE_WIDTH);

    // 处理窗口调整大小以实现响应式贴纸布局
    useEffect(() => {
        const handleResize = () => {
            setViewportScale(window.innerWidth / REFERENCE_WIDTH);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
    const [isAnyDragging, setIsAnyDragging] = useState(false);
    const textInputRef = useRef<TextInputHandle>(null);

    const handleStickerDragStart = useCallback(() => {
        setIsAnyDragging(true);
    }, []);

    const handleStickerDragEnd = useCallback(() => {
        setIsAnyDragging(false);
        batchDragStartRef.current = new Map();
    }, []);

    const toggleBatchSelect = useCallback((sticker: Sticker) => {
        if (sticker.type !== 'text') return;

        setBatchSelectedStickerIds(prev => (
            prev.includes(sticker.id)
                ? prev.filter(id => id !== sticker.id)
                : [...prev, sticker.id]
        ));
        selectSticker(null);
    }, [selectSticker]);

    const ensureBatchDragStart = useCallback(() => {
        if (batchDragStartRef.current.size > 0) return;

        batchDragStartRef.current = new Map(
            stickers
                .filter(sticker => batchSelectedStickerIds.includes(sticker.id))
                .map(sticker => [sticker.id, { x: sticker.x, y: sticker.y }])
        );
    }, [batchSelectedStickerIds, stickers]);

    const previewBatchPosition = useCallback((activeStickerId: string, dx: number, dy: number) => {
        if (!batchSelectedStickerIds.includes(activeStickerId) || batchSelectedStickerIds.length <= 1) return;

        ensureBatchDragStart();
        batchSelectedStickerIds.forEach(id => {
            if (id === activeStickerId) return;

            const startPosition = batchDragStartRef.current.get(id);
            const stickerEl = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
            if (!startPosition || !stickerEl) return;

            stickerEl.style.left = `${(startPosition.x + dx) * viewportScale}px`;
            stickerEl.style.top = `${(startPosition.y + dy) * viewportScale}px`;
        });
    }, [batchSelectedStickerIds, ensureBatchDragStart, viewportScale]);

    const commitBatchPosition = useCallback((activeStickerId: string, dx: number, dy: number) => {
        if (!batchSelectedStickerIds.includes(activeStickerId) || batchSelectedStickerIds.length <= 1) return;

        ensureBatchDragStart();
        batchSelectedStickerIds.forEach(id => {
            if (id === activeStickerId) return;

            const startPosition = batchDragStartRef.current.get(id);
            const stickerEl = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
            if (!startPosition || !stickerEl) return;

            const nextPosition = {
                x: startPosition.x + dx,
                y: startPosition.y + dy,
            };
            const clampedPosition = clampStickerPositionToViewport(
                nextPosition.x,
                nextPosition.y,
                stickerEl,
                viewportScale
            );
            const needsBounce = Math.abs(clampedPosition.x - nextPosition.x) > 0.1 ||
                Math.abs(clampedPosition.y - nextPosition.y) > 0.1;

            updateSticker(id, {
                x: clampedPosition.x,
                y: clampedPosition.y,
            });

            if (needsBounce) {
                stickerEl.classList.add(styles.bounceBack);
                stickerEl.style.left = `${clampedPosition.x * viewportScale}px`;
                stickerEl.style.top = `${clampedPosition.y * viewportScale}px`;
                window.setTimeout(() => {
                    stickerEl.classList.remove(styles.bounceBack);
                }, 350);
            }
        });
        setBatchSelectedStickerIds([]);
        batchDragStartRef.current = new Map();
    }, [batchSelectedStickerIds, ensureBatchDragStart, updateSticker, viewportScale]);

    const deleteBatchSelection = useCallback((activeStickerId: string) => {
        const idsToDelete = batchSelectedStickerIds.includes(activeStickerId)
            ? batchSelectedStickerIds
            : [activeStickerId];

        idsToDelete.forEach(id => deleteSticker(id));
        setBatchSelectedStickerIds([]);
    }, [batchSelectedStickerIds, deleteSticker]);

    const clearAllStickers = useCallback(() => {
        if (stickers.length === 0) return;
        if (!window.confirm(t.contextMenu.clearAllStickersConfirm)) return;

        stickers.forEach(sticker => deleteSticker(sticker.id));
        setBatchSelectedStickerIds([]);
        selectSticker(null);
        setEditingSticker(null);
        setTextInputPos(null);
    }, [deleteSticker, selectSticker, stickers, t.contextMenu.clearAllStickersConfirm]);



    // 上下文菜单的全局右键处理程序
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 不在 UI 元素上显示
            if (target.closest(UI_SELECTORS)) {
                return;
            }

            // 事件委托优化: 使用 data-sticker-id 属性检测贴纸
            const stickerEl = target.closest('[data-sticker-id]') as HTMLElement;
            if (stickerEl) {
                e.preventDefault();
                const stickerId = stickerEl.dataset.stickerId;
                if (stickerId) {
                    setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'sticker',
                        stickerId,
                    });
                }
                return;
            }

            // 在背景上右键单击
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

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (e.shiftKey || target.closest(UI_SELECTORS) || target.closest('[data-sticker-id]')) {
                return;
            }

            setBatchSelectedStickerIds([]);
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, []);

    useEffect(() => {
        const textStickerIds = new Set(stickers.filter(sticker => sticker.type === 'text').map(sticker => sticker.id));
        setBatchSelectedStickerIds(prev => prev.filter(id => textStickerIds.has(id)));
    }, [stickers]);

    // 双击背景以快速添加贴纸
    useEffect(() => {
        const handleDoubleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            if (target.closest(UI_SELECTORS)) {
                return;
            }

            // 事件委托优化: 使用 data-sticker-id 属性检测贴纸
            if (target.closest('[data-sticker-id]')) {
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

    // 热键：Delete 键删除贴纸
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeElement = document.activeElement;
                // Avoid deleting when typing in input
                if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
                    return;
                }

                if (batchSelectedStickerIds.length > 0) {
                    batchSelectedStickerIds.forEach(id => deleteSticker(id));
                    setBatchSelectedStickerIds([]);
                    return;
                }

                if (selectedStickerId) {
                    deleteSticker(selectedStickerId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [batchSelectedStickerIds, selectedStickerId, deleteSticker]);

    // 处理图片文件选择
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // 压缩为 Blob 并存入 IndexedDB
            const compressedBlob = await compressStickerImageToBlob(file);
            const id = `${STICKER_IMG_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await db.saveStickerImage({ id, data: compressedBlob });

            // 使用临时 URL 计算图片尺寸
            const url = URL.createObjectURL(compressedBlob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const x = (window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2) / viewportScale;
                const y = (window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2) / viewportScale;
                addSticker({
                    type: 'image',
                    content: id, // 存储 IndexedDB 引用 ID
                    x,
                    y,
                });
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
        } catch (error) {
            console.error('Failed to save sticker image:', error);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [addSticker, viewportScale]);

    // 处理文本输入提交
    const handleTextSubmit = useCallback((content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize: number }, hasCheckbox?: boolean, linkCard?: LinkCardMetadata, positionOffset = { x: 0, y: 0 }) => {
        if (editingSticker) {
            updateSticker(editingSticker.id, {
                content,
                x: editingSticker.x + positionOffset.x / viewportScale,
                y: editingSticker.y + positionOffset.y / viewportScale,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: style.fontSize,
                } : editingSticker.style,
                hasCheckbox: hasCheckbox !== undefined ? hasCheckbox : editingSticker.hasCheckbox,
                linkCard,
            });
        } else if (textInputPos) {
            addSticker({
                type: 'text',
                content,
                x: (textInputPos.x + positionOffset.x) / viewportScale,
                y: (textInputPos.y + positionOffset.y) / viewportScale,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: style.fontSize,
                } : undefined,
                hasCheckbox,
                isChecked: false,
                linkCard,
            });
        }
        setTextInputPos(null);
        setEditingSticker(null);
    }, [textInputPos, editingSticker, addSticker, updateSticker, viewportScale]);

    const handleTextCancel = useCallback(() => {
        setTextInputPos(null);
        setEditingSticker(null);
    }, []);

    const handleEditSticker = useCallback((sticker: Sticker) => {
        // 如果当前有编辑中的 TextInput，先保存它的内容
        if (textInputRef.current) {
            textInputRef.current.saveNow();
        }
        // 切换到新贴纸的编辑状态
        setEditingSticker(sticker);
        setTextInputPos({ x: sticker.x * viewportScale, y: sticker.y * viewportScale });
    }, [viewportScale]);

    // 处理粘贴 - 添加图片贴纸
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

                    try {
                        // 压缩为 Blob 并存入 IndexedDB
                        const compressedBlob = await compressStickerImageToBlob(blob);
                        const id = `${STICKER_IMG_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                        await db.saveStickerImage({ id, data: compressedBlob });

                        const url = URL.createObjectURL(compressedBlob);
                        const img = new Image();
                        img.onload = () => {
                            URL.revokeObjectURL(url);
                            const x = (window.innerWidth / 2 - Math.min(img.width, IMAGE_MAX_WIDTH) / 2) / viewportScale;
                            const y = (window.innerHeight / 2 - (img.height * Math.min(img.width, IMAGE_MAX_WIDTH) / img.width) / 2) / viewportScale;
                            addSticker({
                                type: 'image',
                                content: id, // 存储 IndexedDB 引用 ID
                                x,
                                y,
                            });
                        };
                        img.onerror = () => URL.revokeObjectURL(url);
                        img.src = url;
                    } catch (error) {
                        console.error('Failed to save pasted sticker image:', error);
                    }
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addSticker, viewportScale]);

    return (
        <div
            className={`${styles.canvas} ${isEditMode ? styles.creativeMode : ''} ${isAnyDragging ? styles.dragging : ''}`}
        >
            {stickers
                .filter((sticker) => !editingSticker || sticker.id !== editingSticker.id)
                .map((sticker) => (
                    <StickerItem
                        key={sticker.id}
                        sticker={sticker}
                        isSelected={selectedStickerId === sticker.id}
                        isBatchSelected={batchSelectedStickerIds.includes(sticker.id)}
                        isCreativeMode={isEditMode}
                        onSelect={() => selectSticker(sticker.id)}
                        onToggleBatchSelect={() => toggleBatchSelect(sticker)}
                        onDelete={() => deleteSticker(sticker.id)}
                        onPositionChange={(x, y) => updateSticker(sticker.id, { x, y })}
                        onBatchPositionPreview={previewBatchPosition}
                        onBatchPositionCommit={commitBatchPosition}
                        onBatchDelete={deleteBatchSelection}
                        onStyleChange={(updates) => {
                            if (sticker.style) {
                                updateSticker(sticker.id, { style: { ...sticker.style, ...updates } });
                            }
                        }}
                        onBringToTop={() => bringToTop(sticker.id)}
                        onScaleChange={(scale) => {
                            updateSticker(sticker.id, { scale });
                        }}
                        onToggleCheckbox={() => {
                            updateSticker(sticker.id, { isChecked: !sticker.isChecked });
                        }}
                        isEditMode={isEditMode}
                        viewportScale={viewportScale}
                        onDoubleClick={() => {
                            if (sticker.type === 'text') {
                                handleEditSticker(sticker);
                            }
                        }}
                        onDragStart={handleStickerDragStart}
                        onDragEnd={handleStickerDragEnd}
                    />
                ))}

            {textInputPos && (
                <TextInput
                    ref={textInputRef}
                    key={editingSticker?.id || 'new'}
                    x={textInputPos.x}
                    y={textInputPos.y}
                    initialText={editingSticker?.content || ''}
                    initialStyle={editingSticker?.style}
                    initialHasCheckbox={editingSticker?.hasCheckbox}
                    initialLinkCard={editingSticker?.linkCard}
                    onSubmit={handleTextSubmit}
                    onCancel={handleTextCancel}
                    viewportScale={viewportScale}
                />
            )}

            <RecycleBin
                isVisible={isAnyDragging}
                onClick={() => setIsRecycleBinOpen(true)}
            />

            <RecycleBinModal
                isOpen={isRecycleBinOpen}
                onClose={() => setIsRecycleBinOpen(false)}
            />

            {/* 上下文菜单 */}
            {contextMenu && (() => {
                const activeContextMenuSticker = contextMenu.stickerId
                    ? stickers.find(s => s.id === contextMenu.stickerId)
                    : null;

                return (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        type={contextMenu.type}
                        stickerId={contextMenu.stickerId}
                        isImageSticker={activeContextMenuSticker?.type === 'image'}
                        isWidgetSticker={activeContextMenuSticker?.type === 'widget'}
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
                            if (activeContextMenuSticker) {
                                handleEditSticker(activeContextMenuSticker);
                            }
                        }}
                        onDeleteSticker={() => {
                            if (contextMenu.stickerId) {
                                deleteSticker(contextMenu.stickerId);
                            }
                        }}
                        onCopyImage={async () => {
                            if (activeContextMenuSticker && activeContextMenuSticker.type === 'image') {
                                try {
                                    // 从 IndexedDB 获取图片 Blob
                                    const item = await db.getStickerImage(activeContextMenuSticker.content);
                                    if (item) {
                                        await copyBlobToClipboard(item.data);
                                    }
                                } catch (error) {
                                    console.error('Failed to copy image:', error);
                                }
                            }
                        }}
                        onExportImage={async () => {
                            if (activeContextMenuSticker && activeContextMenuSticker.type === 'text') {
                                try {
                                    const blob = await createTextStickerImage(activeContextMenuSticker);
                                    if (blob) {
                                        downloadBlob(blob, `sticker-${Date.now()}.png`);
                                    }
                                } catch (error) {
                                    console.error('Failed to export sticker:', error);
                                }
                            }
                        }}
                        onCopyText={() => {
                            if (activeContextMenuSticker && activeContextMenuSticker.type === 'text') {
                                navigator.clipboard.writeText(activeContextMenuSticker.content);
                            }
                        }}
                        onExportImageSticker={async () => {
                            if (activeContextMenuSticker && activeContextMenuSticker.type === 'image') {
                                try {
                                    // 从 IndexedDB 加载图片后导出
                                    const item = await db.getStickerImage(activeContextMenuSticker.content);
                                    if (item) {
                                        const blobUrl = URL.createObjectURL(item.data);
                                        const stickerWithUrl = { ...activeContextMenuSticker, content: blobUrl };
                                        const blob = await createImageStickerImage(stickerWithUrl);
                                        URL.revokeObjectURL(blobUrl);
                                        if (blob) {
                                            downloadBlob(blob, `sticker-${Date.now()}.png`);
                                        }
                                    }
                                } catch (error) {
                                    console.error('Failed to export image sticker:', error);
                                }
                            }
                        }}
                        onOpenSettings={() => {
                            if (contextMenu) {
                                onOpenSettings?.({ x: contextMenu.x, y: contextMenu.y });
                            }
                        }}
                        onClearAllStickers={clearAllStickers}
                        isPinned={activeContextMenuSticker?.isPinned}
                        onTogglePin={() => {
                            if (contextMenu.stickerId && activeContextMenuSticker) {
                                updateSticker(contextMenu.stickerId, { isPinned: !activeContextMenuSticker.isPinned });
                            }
                        }}
                    />
                );
            })()}

            {/* 用于图片上传的隐藏文件输入框 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
};
