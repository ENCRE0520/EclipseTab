import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sticker, IMAGE_MAX_WIDTH } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import { useThemeData } from '../../context/ThemeContext';
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
// UI 边界常量 - 贴纸不应放置的区域
// ============================================================================
const UI_ZONES = {
    // 底部区域 (Dock + Searcher) - 大约高度
    BOTTOM_MARGIN: 200,
    // 左上角设置区域
    TOP_LEFT: { width: 48, height: 48 },
    // 右上角编辑器区域
    TOP_RIGHT: { width: 48, height: 48 },
    // 距离边缘的最小边距
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
    onDoubleClick?: () => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
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
    onDoubleClick,
    onDragStart,
    onDragEnd,
}) => {
    const { theme } = useThemeData();
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [stickerRect, setStickerRect] = useState<DOMRect | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; stickerX: number; stickerY: number } | null>(null);
    const resizeStartRef = useRef<{ x: number; y: number; startScale: number } | null>(null);
    const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(300);

    // 物理效果 Refs
    const physicsRef = useRef({
        rotation: 0,
        targetRotation: 0,
        lastX: 0,
    });
    const isDraggingRef = useRef(false);
    const rafRef = useRef<number>();
    const cleaningTimerRef = useRef<NodeJS.Timeout>();

    // 选中时更新矩形
    useEffect(() => {
        if (isSelected && elementRef.current) {
            setStickerRect(elementRef.current.getBoundingClientRect());
        } else {
            setStickerRect(null);
        }
    }, [isSelected, sticker.x, sticker.y]);

    // 物理动画循环
    const updatePhysics = useCallback(() => {
        const { rotation, targetRotation } = physicsRef.current;

        // 平滑插值旋转（弹簧效果）
        const diff = targetRotation - rotation;
        const nextRotation = rotation + diff * 0.15;

        physicsRef.current.rotation = nextRotation;

        if (elementRef.current) {
            elementRef.current.style.transform = `rotate(${nextRotation.toFixed(2)}deg)`;
        }

        // 如果正在拖拽或旋转尚未稳定，则继续循环
        if (isDraggingRef.current || Math.abs(diff) > 0.05 || Math.abs(nextRotation) > 0.05) {
            rafRef.current = requestAnimationFrame(updatePhysics);
        } else {
            // 稳定在精确的 0
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

        // 在创意模式（Creative Mode）下，贴纸不应该是可选的（弹出窗口/轮廓），
        // 但它们仍然应该是可拖拽的。
        if (isCreativeMode && !isEditMode) {
            onSelect();
        }

        // 点击/按下时置顶
        onBringToTop();

        // 开始拖拽
        setIsDragging(true);
        isDraggingRef.current = true;
        onDragStart?.();

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            stickerX: sticker.x,
            stickerY: sticker.y,
        };

        // 重置物理效果
        physicsRef.current.lastX = e.clientX;
        physicsRef.current.targetRotation = 0;

        // 开始动画循环
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updatePhysics);

        e.preventDefault();
        e.stopPropagation();
    };

    // 具有 RAF 节流的拖拽效果
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

            // 物理计算（立即执行，不影响物理动画流畅度）
            const moveDx = e.clientX - physicsRef.current.lastX;
            physicsRef.current.lastX = e.clientX;

            // 根据移动速度计算目标旋转角度
            const SENSITIVITY = 0.4;
            const MAX_ROTATION = 12;
            let target = -moveDx * SENSITIVITY;
            target = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, target));
            physicsRef.current.targetRotation = target;
            // Check for collision with Recycle Bin for visual feedback
            const recycleBin = document.getElementById('sticker-recycle-bin');
            if (recycleBin && pendingPosition) {
                const binRect = recycleBin.getBoundingClientRect();
                const stickerRect = elementRef.current?.getBoundingClientRect();

                if (stickerRect) {
                    // We need to check overlap based on current mouse position or pending position
                    // stickerRect might be lagging due to RAF, but good enough for visual feedback

                    // Simple overlap check
                    const isOverBin = !(stickerRect.right < binRect.left ||
                        stickerRect.left > binRect.right ||
                        stickerRect.bottom < binRect.top ||
                        stickerRect.top > binRect.bottom);

                    if (isOverBin) {
                        recycleBin.classList.add(styles.dragOver);
                        if (elementRef.current) {
                            elementRef.current.classList.add(styles.deleting);
                            elementRef.current.classList.remove(styles.returningFromDelete);
                            if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
                        }
                    } else {
                        // 如果之前是 deleting 状态，则添加返回动画 class
                        if (elementRef.current && elementRef.current.classList.contains(styles.deleting)) {
                            elementRef.current.classList.remove(styles.deleting);
                            elementRef.current.classList.add(styles.returningFromDelete);

                            if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
                            cleaningTimerRef.current = setTimeout(() => {
                                if (elementRef.current) {
                                    elementRef.current.classList.remove(styles.returningFromDelete);
                                }
                            }, 300);
                        }

                        recycleBin.classList.remove(styles.dragOver);
                    }
                }
            }

        };

        const handleMouseUp = () => {
            // 确保最终位置被更新
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
            }

            // 获取贴纸元素边界以便进行重叠检测
            const stickerEl = elementRef.current;
            if (!stickerEl) {
                setIsDragging(false);
                isDraggingRef.current = false;
                dragStartRef.current = null;
                onDragEnd?.();
                return;
            }

            // 检查与垃圾桶的碰撞
            const recycleBin = document.getElementById('sticker-recycle-bin');
            if (recycleBin) {
                const binRect = recycleBin.getBoundingClientRect();
                const stickerRect = stickerEl.getBoundingClientRect();

                // 简单的重叠检查
                const isOverBin = !(stickerRect.right < binRect.left ||
                    stickerRect.left > binRect.right ||
                    stickerRect.bottom < binRect.top ||
                    stickerRect.top > binRect.bottom);

                if (isOverBin) {
                    onDelete();
                    setIsDragging(false);
                    isDraggingRef.current = false;
                    dragStartRef.current = null;
                    onDragEnd?.();
                    return;
                }
            }

            // 从待处理或当前位置计算最终位置
            let finalX = pendingPosition?.x ?? sticker.x;
            let finalY = pendingPosition?.y ?? sticker.y;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            let needsAdjustment = false;

            // 获取贴纸尺寸（从当前元素近似得出）
            const stickerRect = stickerEl.getBoundingClientRect();
            const stickerWidth = stickerRect.width;
            const stickerHeight = stickerRect.height;

            // 计算贴纸屏幕边界
            const screenX = finalX * viewportScale;
            const screenY = finalY * viewportScale;
            const stickerScreenRect = {
                left: screenX,
                top: screenY,
                right: screenX + stickerWidth,
                bottom: screenY + stickerHeight,
            };

            // 检查矩形重叠的辅助函数
            const rectsOverlap = (r1: typeof stickerScreenRect, r2: DOMRect) => {
                return !(r1.right < r2.left || r1.left > r2.right ||
                    r1.bottom < r2.top || r1.top > r2.bottom);
            };

            // 检查与底部区域（Searcher + Dock 容器）的重叠
            const bottomZone = document.querySelector('[data-ui-zone="bottom"]');
            if (bottomZone) {
                const bottomRect = bottomZone.getBoundingClientRect();
                if (rectsOverlap(stickerScreenRect, bottomRect)) {
                    // 计算每个方向的最小逃逸距离
                    const escapeUp = stickerScreenRect.bottom - bottomRect.top + UI_ZONES.EDGE_MARGIN;
                    const escapeLeft = stickerScreenRect.right - bottomRect.left + UI_ZONES.EDGE_MARGIN;
                    const escapeRight = bottomRect.right - stickerScreenRect.left + UI_ZONES.EDGE_MARGIN;

                    // 检查向左/向右逃逸是否有效（贴纸不会超出屏幕）
                    const canEscapeLeft = (stickerScreenRect.left - escapeLeft) >= UI_ZONES.EDGE_MARGIN;
                    const canEscapeRight = (stickerScreenRect.right + escapeRight) <= (windowWidth - UI_ZONES.EDGE_MARGIN);

                    // 找到最小的有效逃逸距离
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

                    // 根据方向应用逃逸位移
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




            // 注意：左上角和右上角区域不再触发弹回效果
            // 贴纸现在可以自由放置在这些区域

            // 确保贴纸保持在屏幕边界内
            // 将贴纸尺寸转换为原始坐标系以实现正确的边界计算
            const stickerWidthOriginal = stickerWidth / viewportScale;
            const stickerHeightOriginal = stickerHeight / viewportScale;
            const maxX = (windowWidth / viewportScale) - stickerWidthOriginal - (UI_ZONES.EDGE_MARGIN / viewportScale);
            const maxY = (windowHeight / viewportScale) - stickerHeightOriginal - (UI_ZONES.EDGE_MARGIN / viewportScale);
            const minX = UI_ZONES.EDGE_MARGIN / viewportScale;
            const minY = UI_ZONES.EDGE_MARGIN / viewportScale;

            // 检查位置是否需要限制（将触发弹回动画）
            let clampedX = finalX;
            if (maxX < minX) {
                // 贴纸比屏幕宽：允许平移，但保持贴纸覆盖屏幕（或至少在边界内）
                clampedX = Math.max(maxX, Math.min(minX, finalX));
            } else {
                // 贴纸比屏幕窄：保持在屏幕边界内
                clampedX = Math.max(minX, Math.min(maxX, finalX));
            }

            let clampedY = finalY;
            if (maxY < minY) {
                // 贴纸比屏幕高
                clampedY = Math.max(maxY, Math.min(minY, finalY));
            } else {
                // 贴纸比屏幕矮
                clampedY = Math.max(minY, Math.min(maxY, finalY));
            }

            // 如果位置被限制，则标记为需要调整
            if (Math.abs(clampedX - finalX) > 0.1 || Math.abs(clampedY - finalY) > 0.1) {
                needsAdjustment = true;
            }


            finalX = clampedX;
            finalY = clampedY;

            // 如果需要调整（由于 Dock/Searcher 重叠或边缘限制），则应用弹回动画
            if (needsAdjustment) {
                // 手动触发动画开始，以处理 React 属性未更改的情况
                // （例如，拖走后又弹回同一位置）
                if (elementRef.current) {
                    elementRef.current.classList.add(styles.bounceBack);
                    elementRef.current.style.left = `${finalX * viewportScale}px`;
                    elementRef.current.style.top = `${finalY * viewportScale}px`;
                }

                setIsBouncing(true);
                // 动画完成后移除 bounce 类
                setTimeout(() => setIsBouncing(false), 350);
            }

            if (needsAdjustment || pendingPosition) {
                onPositionChange(finalX, finalY);
            }

            setIsDragging(false);
            isDraggingRef.current = false;
            dragStartRef.current = null;
            onDragEnd?.();

            // Clear dragOver state
            const cleanupRecycleBin = document.getElementById('sticker-recycle-bin');
            if (cleanupRecycleBin) {
                cleanupRecycleBin.classList.remove(styles.dragOver);
            }
            if (elementRef.current) {
                elementRef.current.classList.remove(styles.deleting);
                elementRef.current.classList.remove(styles.returningFromDelete);
                if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
            }

            // 将目标旋转重置为 0 以便动画返回
            physicsRef.current.targetRotation = 0;
        };

        // 使用捕获阶段确保拖拽事件通过所有 UI 层正常工作
        document.addEventListener('mousemove', handleMouseMove, { capture: true });
        // 使用捕获阶段进行 mouseup，以确保即使鼠标在可能停止传播的 Searcher/Dock 上方松开时，我们也能收到事件
        document.addEventListener('mouseup', handleMouseUp, { capture: true });

        return () => {
            document.removeEventListener('mousemove', handleMouseMove, { capture: true });
            document.removeEventListener('mouseup', handleMouseUp, { capture: true });
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
            }
        };
    }, [isDragging, onPositionChange, updatePhysics]);

    // 卸载时清理 RAF
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
        };
    }, []);

    // 调整大小控制柄开始
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

    // 具有 RAF 节流的调整大小效果
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

    // 获取图片原始宽度以进行缩放计算
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setImageNaturalWidth(e.currentTarget.naturalWidth);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDoubleClick?.();
    };

    const classNames = [
        styles.sticker,
        sticker.type === 'text' && styles.stickerText,
        isDragging && styles.dragging,
        isBouncing && styles.bounceBack,
        isSelected && styles.selected,
        isCreativeMode && styles.creativeHover,
    ].filter(Boolean).join(' ');

    // 根据缩放比例和视口缩放比例计算实际图片宽度
    const imageWidth = sticker.type === 'image'
        ? Math.min(imageNaturalWidth, IMAGE_MAX_WIDTH) * (sticker.scale || 1) * viewportScale
        : undefined;

    // 为文字贴纸计算缩放后的字体大小
    const scaledFontSize = (sticker.style?.fontSize || 40) * viewportScale;

    return (
        <>
            <div
                ref={elementRef}
                className={classNames}
                style={{
                    left: sticker.x * viewportScale,
                    top: sticker.y * viewportScale,
                    // 拖拽期间提升 z-index 以保持在 UI 元素之上
                    zIndex: isDragging ? 3000 : (sticker.zIndex || 1),
                }}
                data-sticker-id={sticker.id}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                {sticker.type === 'text' ? (
                    <div
                        className={[
                            styles.textSticker,
                            isDragging && styles.dragging,
                            isCreativeMode && styles.creativeHover,
                        ].filter(Boolean).join(' ')}
                        style={{
                            color: getThemeAwareColor(sticker.style?.color || '#1C1C1E', theme),
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
                        {/* 调整大小控制柄 - 仅在悬停时可见 */}
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={handleResizeStart}
                        />
                    </div>
                )}

                {/* 删除按钮 - 在创意模式下悬停时可见 */}
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

            {/* 用于选中文字贴纸的悬浮工具栏 */}
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
// 具有自定义比较的 React.memo
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
