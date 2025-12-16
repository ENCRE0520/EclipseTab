import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sticker, IMAGE_MAX_WIDTH } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import styles from './ZenShelf.module.css';

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
    isEditMode?: boolean;
}

const StickerItemComponent: React.FC<StickerItemProps> = ({
    sticker,
    isSelected,
    isCreativeMode,
    onSelect,
    onDelete,
    onPositionChange,
    onStyleChange,
    onBringToTop,
    onScaleChange,
    isEditMode,
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [stickerRect, setStickerRect] = useState<DOMRect | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; stickerX: number; stickerY: number } | null>(null);
    const resizeStartRef = useRef<{ x: number; y: number; startScale: number } | null>(null);
    const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(300);

    // Physics Refs
    const physicsRef = useRef({
        rotation: 0,
        targetRotation: 0,
        lastX: 0,
    });
    const isDraggingRef = useRef(false);
    const rafRef = useRef<number>();

    // Update rect when selected
    useEffect(() => {
        if (isSelected && elementRef.current) {
            setStickerRect(elementRef.current.getBoundingClientRect());
        } else {
            setStickerRect(null);
        }
    }, [isSelected, sticker.x, sticker.y]);

    // Physics Animation Loop
    const updatePhysics = useCallback(() => {
        const { rotation, targetRotation } = physicsRef.current;

        // Smoothly interpolate rotation (Spring-like effect)
        const diff = targetRotation - rotation;
        const nextRotation = rotation + diff * 0.15;

        physicsRef.current.rotation = nextRotation;

        if (elementRef.current) {
            elementRef.current.style.transform = `rotate(${nextRotation.toFixed(2)}deg)`;
        }

        // Continue loop if dragging or if rotation hasn't settled
        if (isDraggingRef.current || Math.abs(diff) > 0.05 || Math.abs(nextRotation) > 0.05) {
            rafRef.current = requestAnimationFrame(updatePhysics);
        } else {
            // Settle to exact 0
            if (elementRef.current) {
                elementRef.current.style.transform = '';
            }
            physicsRef.current.rotation = 0;
            physicsRef.current.targetRotation = 0;
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent if clicking delete button or resize handle
        if ((e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
            return;
        }
        if ((e.target as HTMLElement).closest(`.${styles.resizeHandle}`)) {
            return;
        }

        // In Edit Mode, stickers should NOT be selectable (popup/outline),
        // BUT they should still be draggable.
        if (isCreativeMode && !isEditMode) {
            onSelect();
        }

        // Bring to top on click/press
        onBringToTop();

        // Start drag
        setIsDragging(true);
        isDraggingRef.current = true;

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            stickerX: sticker.x,
            stickerY: sticker.y,
        };

        // Reset Physics
        physicsRef.current.lastX = e.clientX;
        physicsRef.current.targetRotation = 0;

        // Start animation loop
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updatePhysics);

        e.preventDefault();
        e.stopPropagation();
    };

    // Drag effect with RAF throttling
    useEffect(() => {
        if (!isDragging) return;

        let positionRafId: number | null = null;
        let pendingPosition: { x: number; y: number } | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            // RAF 节流 - 保存待处理的位置更新
            pendingPosition = {
                x: dragStartRef.current.stickerX + dx,
                y: dragStartRef.current.stickerY + dy,
            };

            if (positionRafId === null) {
                positionRafId = requestAnimationFrame(() => {
                    positionRafId = null;
                    if (pendingPosition) {
                        onPositionChange(pendingPosition.x, pendingPosition.y);
                    }
                });
            }

            // Physics Calculation (立即执行，不影响物理动画流畅度)
            const moveDx = e.clientX - physicsRef.current.lastX;
            physicsRef.current.lastX = e.clientX;

            // Calculate target rotation based on movement speed
            const SENSITIVITY = 0.4;
            const MAX_ROTATION = 12;
            let target = -moveDx * SENSITIVITY;
            target = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, target));
            physicsRef.current.targetRotation = target;
        };

        const handleMouseUp = () => {
            // 确保最终位置被更新
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
                if (pendingPosition) {
                    onPositionChange(pendingPosition.x, pendingPosition.y);
                }
            }

            setIsDragging(false);
            isDraggingRef.current = false;
            dragStartRef.current = null;

            // Reset target to 0 to animate back
            physicsRef.current.targetRotation = 0;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
            }
        };
    }, [isDragging, onPositionChange, updatePhysics]);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

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

    // Resize effect with RAF throttling
    useEffect(() => {
        if (!isResizing) return;

        let resizeRafId: number | null = null;
        let pendingScale: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;

            const dx = e.clientX - resizeStartRef.current.x;
            const dy = e.clientY - resizeStartRef.current.y;
            const delta = (dx + dy) / 2;

            const scaleDelta = delta / 200;
            const newScale = Math.max(0.2, Math.min(3, resizeStartRef.current.startScale + scaleDelta));

            // RAF 节流
            pendingScale = newScale;
            if (resizeRafId === null) {
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    if (pendingScale !== null) {
                        onScaleChange(pendingScale);
                    }
                });
            }
        };

        const handleMouseUp = () => {
            // 确保最终缩放值被更新
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
                if (pendingScale !== null) {
                    onScaleChange(pendingScale);
                }
            }
            setIsResizing(false);
            resizeStartRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
            }
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
                {isCreativeMode && !isEditMode && (
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
// React.memo with custom comparison
// ============================================================================

const arePropsEqual = (prev: StickerItemProps, next: StickerItemProps) => {
    return (
        prev.sticker.id === next.sticker.id &&
        prev.sticker.x === next.sticker.x &&
        prev.sticker.y === next.sticker.y &&
        prev.sticker.content === next.sticker.content &&
        prev.sticker.zIndex === next.sticker.zIndex &&
        prev.sticker.scale === next.sticker.scale &&
        prev.sticker.type === next.sticker.type &&
        prev.sticker.style?.color === next.sticker.style?.color &&
        prev.sticker.style?.textAlign === next.sticker.style?.textAlign &&
        prev.sticker.style?.fontSize === next.sticker.style?.fontSize &&
        prev.isSelected === next.isSelected &&
        prev.isCreativeMode === next.isCreativeMode &&
        prev.isEditMode === next.isEditMode
    );
};

export const StickerItem = React.memo(StickerItemComponent, arePropsEqual);
