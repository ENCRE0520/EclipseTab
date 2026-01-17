import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sticker, IMAGE_MAX_WIDTH } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import styles from './ZenShelf.module.css';

// ============================================================================
// UI Boundary Constants - Areas where stickers should not be placed
// ============================================================================
const UI_ZONES = {
    // Bottom area (Dock + Searcher) - approximate height
    BOTTOM_MARGIN: 200,
    // Top-left settings area
    TOP_LEFT: { width: 48, height: 48 },
    // Top-right editor area
    TOP_RIGHT: { width: 48, height: 48 },
    // Minimum margin from edges
    EDGE_MARGIN: 20,
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
    isEditMode?: boolean;
    viewportScale: number;
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
    viewportScale,
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
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
            // 将屏幕像素位移转换为原始坐标系
            pendingPosition = {
                x: dragStartRef.current.stickerX + dx / viewportScale,
                y: dragStartRef.current.stickerY + dy / viewportScale,
            };

            if (positionRafId === null) {
                positionRafId = requestAnimationFrame(() => {
                    positionRafId = null;
                    if (pendingPosition && elementRef.current) {
                        elementRef.current.style.left = `${pendingPosition.x * viewportScale}px`;
                        elementRef.current.style.top = `${pendingPosition.y * viewportScale}px`;
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
            }

            // Get sticker element bounds for overlap detection
            const stickerEl = elementRef.current;
            if (!stickerEl) {
                setIsDragging(false);
                isDraggingRef.current = false;
                dragStartRef.current = null;
                return;
            }

            // Calculate final position from pending or current
            let finalX = pendingPosition?.x ?? sticker.x;
            let finalY = pendingPosition?.y ?? sticker.y;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            let needsAdjustment = false;

            // Get sticker dimensions (approximate from current element)
            const stickerRect = stickerEl.getBoundingClientRect();
            const stickerWidth = stickerRect.width;
            const stickerHeight = stickerRect.height;

            // Calculate sticker screen bounds
            const screenX = finalX * viewportScale;
            const screenY = finalY * viewportScale;
            const stickerScreenRect = {
                left: screenX,
                top: screenY,
                right: screenX + stickerWidth,
                bottom: screenY + stickerHeight,
            };

            // Helper function to check rectangle overlap
            const rectsOverlap = (r1: typeof stickerScreenRect, r2: DOMRect) => {
                return !(r1.right < r2.left || r1.left > r2.right ||
                    r1.bottom < r2.top || r1.top > r2.bottom);
            };

            // Check overlap with bottom zone (Searcher + Dock container)
            const bottomZone = document.querySelector('[data-ui-zone="bottom"]');
            if (bottomZone) {
                const bottomRect = bottomZone.getBoundingClientRect();
                if (rectsOverlap(stickerScreenRect, bottomRect)) {
                    // Calculate minimum escape distances for each direction
                    const escapeUp = stickerScreenRect.bottom - bottomRect.top + UI_ZONES.EDGE_MARGIN;
                    const escapeLeft = stickerScreenRect.right - bottomRect.left + UI_ZONES.EDGE_MARGIN;
                    const escapeRight = bottomRect.right - stickerScreenRect.left + UI_ZONES.EDGE_MARGIN;

                    // Check if escaping left/right is valid (sticker won't go off screen)
                    const canEscapeLeft = (stickerScreenRect.left - escapeLeft) >= UI_ZONES.EDGE_MARGIN;
                    const canEscapeRight = (stickerScreenRect.right + escapeRight) <= (windowWidth - UI_ZONES.EDGE_MARGIN);

                    // Find minimum valid escape distance
                    let minEscape = escapeUp;
                    let escapeDirection: 'up' | 'left' | 'right' = 'up';

                    if (canEscapeLeft && escapeLeft < minEscape) {
                        minEscape = escapeLeft;
                        escapeDirection = 'left';
                    }
                    if (canEscapeRight && escapeRight < minEscape) {
                        minEscape = escapeRight;
                        escapeDirection = 'right';
                    }

                    // Apply escape based on direction
                    switch (escapeDirection) {
                        case 'up':
                            finalY = (bottomRect.top - stickerHeight - UI_ZONES.EDGE_MARGIN) / viewportScale;
                            break;
                        case 'left':
                            finalX = (bottomRect.left - stickerWidth - UI_ZONES.EDGE_MARGIN) / viewportScale;
                            break;
                        case 'right':
                            finalX = (bottomRect.right + UI_ZONES.EDGE_MARGIN) / viewportScale;
                            break;
                    }
                    needsAdjustment = true;
                }
            }

            // Note: Top-left and top-right zones no longer trigger bounce-away
            // Stickers can now be placed in these areas freely

            // Ensure sticker stays within screen bounds
            // Convert sticker dimensions to original coordinate system for proper boundary calculation
            const stickerWidthOriginal = stickerWidth / viewportScale;
            const stickerHeightOriginal = stickerHeight / viewportScale;
            const maxX = (windowWidth / viewportScale) - stickerWidthOriginal - (UI_ZONES.EDGE_MARGIN / viewportScale);
            const maxY = (windowHeight / viewportScale) - stickerHeightOriginal - (UI_ZONES.EDGE_MARGIN / viewportScale);
            const minX = UI_ZONES.EDGE_MARGIN / viewportScale;
            const minY = UI_ZONES.EDGE_MARGIN / viewportScale;

            // Check if position needs clamping (will trigger bounce)
            let clampedX = finalX;
            if (maxX < minX) {
                // Sticker wider than screen: allow panning but keep sticker covering the screen (or at least bounded)
                clampedX = Math.max(maxX, Math.min(minX, finalX));
            } else {
                // Sticker narrower than screen: keep within screen bounds
                clampedX = Math.max(minX, Math.min(maxX, finalX));
            }

            let clampedY = finalY;
            if (maxY < minY) {
                // Sticker taller than screen
                clampedY = Math.max(maxY, Math.min(minY, finalY));
            } else {
                // Sticker shorter than screen
                clampedY = Math.max(minY, Math.min(maxY, finalY));
            }

            // Mark as needing adjustment if position was clamped
            if (Math.abs(clampedX - finalX) > 0.1 || Math.abs(clampedY - finalY) > 0.1) {
                needsAdjustment = true;
            }


            finalX = clampedX;
            finalY = clampedY;

            // Apply bounce animation if adjustment needed (from Dock/Searcher overlap OR edge clamping)
            if (needsAdjustment) {
                // Manually trigger animation start to handle cases where React prop doesn't change
                // (e.g. dragging away and bouncing back to same spot)
                if (elementRef.current) {
                    elementRef.current.classList.add(styles.bounceBack);
                    elementRef.current.style.left = `${finalX * viewportScale}px`;
                    elementRef.current.style.top = `${finalY * viewportScale}px`;
                }

                setIsBouncing(true);
                // Remove bounce class after animation completes
                setTimeout(() => setIsBouncing(false), 350);
            }

            // Apply final position (with adjustment if needed)
            if (needsAdjustment || pendingPosition) {
                onPositionChange(finalX, finalY);
            }

            setIsDragging(false);
            isDraggingRef.current = false;
            dragStartRef.current = null;

            // Reset target to 0 to animate back
            physicsRef.current.targetRotation = 0;
        };

        // Use capture phase to ensure drag events work through all UI layers
        document.addEventListener('mousemove', handleMouseMove, { capture: true });
        // Use capture phase for mouseup to ensure we get the event even when
        // mouse is released over Searcher/Dock which might stop propagation
        document.addEventListener('mouseup', handleMouseUp, { capture: true });

        return () => {
            document.removeEventListener('mousemove', handleMouseMove, { capture: true });
            document.removeEventListener('mouseup', handleMouseUp, { capture: true });
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
        isBouncing && styles.bounceBack,
        isSelected && styles.selected,
        isCreativeMode && styles.creativeHover,
    ].filter(Boolean).join(' ');

    // Calculate actual image width based on scale and viewport scale
    const imageWidth = sticker.type === 'image'
        ? Math.min(imageNaturalWidth, IMAGE_MAX_WIDTH) * (sticker.scale || 1) * viewportScale
        : undefined;

    // Calculate scaled font size for text stickers
    const scaledFontSize = (sticker.style?.fontSize || 40) * viewportScale;

    return (
        <>
            <div
                ref={elementRef}
                className={classNames}
                style={{
                    left: sticker.x * viewportScale,
                    top: sticker.y * viewportScale,
                    // Elevate z-index during drag to stay above UI elements
                    zIndex: isDragging ? 3000 : (sticker.zIndex || 1),
                }}
                data-sticker-id={sticker.id}
                onMouseDown={handleMouseDown}
            >
                {sticker.type === 'text' ? (
                    <div
                        className={[
                            styles.textSticker,
                            isDragging && styles.dragging,
                            isCreativeMode && styles.creativeHover,
                        ].filter(Boolean).join(' ')}
                        style={{
                            color: sticker.style?.color || '#1C1C1E',
                            textAlign: sticker.style?.textAlign || 'left',
                            fontSize: scaledFontSize,
                        }}
                    >
                        {sticker.content}
                    </div>
                ) : (
                    <div className={styles.imageContainer}>
                        <img
                            src={sticker.content}
                            alt="sticker"
                            className={[
                                styles.imageSticker,
                                isDragging && styles.dragging,
                                isCreativeMode && styles.creativeHover,
                            ].filter(Boolean).join(' ')}
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
        prev.isEditMode === next.isEditMode &&
        prev.viewportScale === next.viewportScale
    );
};

export const StickerItem = React.memo(StickerItemComponent, arePropsEqual);
