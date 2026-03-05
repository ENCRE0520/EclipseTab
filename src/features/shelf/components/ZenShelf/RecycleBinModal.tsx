import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import { db } from '@/shared/utils/db';
import styles from './ZenShelf.module.css';
import { useLanguage } from '@/shared/context/LanguageContext';
import TrashIcon from '@/assets/icons/trash.svg';
import CancelIcon from '@/assets/icons/cancel.svg';
import TrashCanEmpty from '@/assets/icons/TrashCan-empty.svg';

interface RecycleBinModalProps {
    isOpen: boolean;
    onClose: () => void;
}
import { useThemeData } from '@/features/theme/context/ThemeContext';

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

// 橡皮筋效果计算 - 超过最大值后阻力逐渐增加
const rubberBand = (offset: number, maxOffset: number = 200): number => {
    const absOffset = Math.abs(offset);
    if (absOffset <= maxOffset) {
        return offset;
    }
    // 超过 maxOffset 后，使用对数衰减
    const sign = offset > 0 ? 1 : -1;
    const overflow = absOffset - maxOffset;
    const dampedOverflow = maxOffset + overflow * 0.3; // 30% 阻力
    return sign * dampedOverflow;
};

// Sub-component for individual swipeable items
const RecycleBinItem: React.FC<{
    sticker: any;
    onRestore: (sticker: any) => void;
    onDelete: (item: any) => void;
    t: any;
    index: number;
}> = ({ sticker, onRestore, onDelete, t, index }) => {
    const { theme } = useThemeData();
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isSpringBack, setIsSpringBack] = useState(false);
    const [animationState, setAnimationState] = useState<'idle' | 'restoring' | 'deleting'>('idle');
    const [isCollapsing, setIsCollapsing] = useState(false);
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);
    const isHorizontalSwipe = useRef<boolean | null>(null);
    const offsetXRef = useRef(0);
    const itemRef = useRef<HTMLDivElement>(null);
    const THRESHOLD = 200;
    const MAX_OFFSET = 300;
    const DIRECTION_THRESHOLD = 10;

    // 解析图片贴纸的 Blob URL
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (sticker.type !== 'image') return;
        if (sticker.content.startsWith('data:')) {
            setResolvedImageUrl(sticker.content);
            return;
        }

        let url: string | null = null;
        let cancelled = false;

        db.getStickerImage(sticker.content).then(item => {
            if (cancelled) return;
            if (item) {
                url = URL.createObjectURL(item.data);
                setResolvedImageUrl(url);
            }
        });

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [sticker.type, sticker.content]);

    // 是否达到阈值
    const isThresholdReached = Math.abs(offsetX) >= THRESHOLD;

    const handleStart = useCallback((clientX: number, clientY: number) => {
        setIsDragging(true);
        setIsSpringBack(false);
        startX.current = clientX;
        startY.current = clientY;
        isHorizontalSwipe.current = null;
    }, []);

    const handleMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging || startX.current === null || startY.current === null) return;

        const deltaX = clientX - startX.current;
        const deltaY = clientY - startY.current;

        if (isHorizontalSwipe.current === null) {
            if (Math.abs(deltaX) > DIRECTION_THRESHOLD || Math.abs(deltaY) > DIRECTION_THRESHOLD) {
                isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
            }
        }

        if (isHorizontalSwipe.current === true) {
            const dampedDelta = rubberBand(deltaX, MAX_OFFSET);
            setOffsetX(dampedDelta);
            offsetXRef.current = dampedDelta;
        }
    }, [isDragging]);

    const handleEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        startX.current = null;
        startY.current = null;

        const currentOffset = offsetXRef.current;
        const wasHorizontal = isHorizontalSwipe.current === true;
        isHorizontalSwipe.current = null;

        if (!wasHorizontal) {
            setOffsetX(0);
            offsetXRef.current = 0;
            return;
        }

        if (currentOffset > THRESHOLD) {
            setAnimationState('deleting');
            // 设置目标位置，让 transition 从当前位置动画到目标
            setOffsetX(400); // 向右飞出

            // Step 1: Fly out (Wait 400ms)
            setTimeout(() => {
                // Step 2: Collapse height (Wait 300ms)
                setIsCollapsing(true);
                setTimeout(() => {
                    // Step 3: Unmount (Total 700ms)
                    onDelete(sticker);
                }, 300);
            }, 400);
        } else if (currentOffset < -THRESHOLD) {
            setAnimationState('restoring');
            // 设置目标位置，让 transition 从当前位置动画到目标
            setOffsetX(-400); // 向左飞出

            // Step 1: Fly out (Wait 400ms)
            setTimeout(() => {
                // Step 2: Collapse height (Wait 300ms)
                setIsCollapsing(true);
                setTimeout(() => {
                    // Step 3: Unmount (Total 700ms)
                    onRestore(sticker);
                }, 300);
            }, 400);
        } else {
            setIsSpringBack(true);
            setOffsetX(0);
            offsetXRef.current = 0;
            setTimeout(() => setIsSpringBack(false), 400);
        }
    }, [isDragging, onDelete, onRestore, sticker]);

    useEffect(() => {
        if (!isDragging) return;

        const handleDocumentMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
            if (isHorizontalSwipe.current === true) {
                e.preventDefault();
            }
        };

        const handleDocumentMouseUp = () => {
            handleEnd();
        };

        document.addEventListener('mousemove', handleDocumentMouseMove, { passive: false });
        document.addEventListener('mouseup', handleDocumentMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
        };
    }, [isDragging, handleMove, handleEnd]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    }, [handleStart]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }, [handleStart]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, [handleMove]);

    const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

    // 防止图片被拖动
    const preventDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    // 计算 item 的 className
    const itemClassName = [
        styles.recycleBinItem,
        isSpringBack ? styles.springBack : '',
        animationState === 'restoring' ? styles.restoring : '',
        animationState === 'deleting' ? styles.permanentlyDeleting : '',
        isThresholdReached ? styles.thresholdReached : '',
    ].filter(Boolean).join(' ');

    // 计算背景的 className - Remove threshold check for immediate feedback
    const bgClassName = [
        styles.swipeBackground,
        offsetX > 0 ? styles.delete : offsetX < 0 ? styles.restore : '',
        isThresholdReached ? styles.threshold : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={styles.recycleBinItemWrapper}
            style={{
                animationDelay: `${index * 0.05}s`,
                maxHeight: isCollapsing ? 0 : '400px', // Assuming max height of sticker, or plenty of space
                marginBottom: isCollapsing ? 0 : '24px',
                opacity: isCollapsing ? 0 : undefined, // Fade out wrapper for good measure
                overflow: isCollapsing ? 'hidden' : undefined, // Clip content during collapse
                // Only apply transition during collapse to avoid fighting with entrance animation
                transition: isCollapsing ? 'all 0.3s cubic-bezier(0.34, 1.25, 0.64, 1)' : undefined
            }}
        >
            {/* Background Layer */}
            <div
                className={bgClassName}
                style={{ opacity: Math.min(Math.abs(offsetX) / 100, 1) }}
            >
                {/* Left side content (Visible when dragging Right -> Delete) */}
                <div className={styles.swipeActionContent} style={{ opacity: offsetX > 0 ? Math.min(offsetX / 50, 1) : 0 }}>
                    <img src={TrashIcon} alt="delete" className={styles.swipeActionIcon} />
                    <span>
                        {isThresholdReached
                            ? (t.space?.releaseToDelete || "Release to delete")
                            : (t.contextMenu?.delete || "Delete")}
                    </span>
                </div>

                {/* Right side content (Visible when dragging Left -> Restore) */}
                <div className={styles.swipeActionContent} style={{ opacity: offsetX < 0 ? Math.min(Math.abs(offsetX) / 50, 1) : 0, marginLeft: 'auto' }}>
                    <span>
                        {isThresholdReached
                            ? (t.space?.releaseToRestore || "Release to restore")
                            : (t.contextMenu?.restore || "Restore")}
                    </span>
                    <img src={CancelIcon} alt="restore" className={styles.swipeActionIcon} />
                </div>
            </div>

            {/* Foreground Item */}
            <div
                ref={itemRef}
                className={itemClassName}
                style={{
                    transform: `translateX(${offsetX}px)`,
                    transition: isDragging ? 'none' : undefined,
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onDoubleClick={(e) => { e.stopPropagation(); onRestore(sticker); }}
            >
                {sticker.type === 'text' ? (
                    <div className={styles.stickerText}>
                        <div
                            className={styles.textSticker}
                            style={{
                                color: getThemeAwareColor(sticker.style?.color || '#1C1C1E', theme),
                                fontSize: sticker.style?.fontSize || 40,
                                textAlign: sticker.style?.textAlign || 'left',
                            }}
                        >
                            {sticker.content}
                        </div>
                    </div>
                ) : (
                    <img
                        src={resolvedImageUrl || ''}
                        alt="sticker"
                        className={styles.recycleItemPreview}
                        draggable={false}
                        onDragStart={preventDrag}
                    />
                )}
            </div>
        </div>
    );
};



export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({ isOpen, onClose }) => {
    const { deletedStickers, restoreSticker, permanentlyDeleteSticker } = useZenShelf();
    const { t } = useLanguage();
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        // 等待动画完成后真正关闭
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250); // 匹配 recycleBinPopOut 动画时长
    }, [onClose]);

    // 右滑删除不需要确认，直接删除
    const handlePermanentDelete = useCallback((sticker: any) => {
        permanentlyDeleteSticker(sticker.id);
    }, [permanentlyDeleteSticker]);

    // 重置关闭状态
    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalClassName = [
        styles.recycleBinModal,
        isOpen ? styles.open : '',
        isClosing ? styles.closing : '',
    ].filter(Boolean).join(' ');

    return ReactDOM.createPortal(
        <div
            className={modalClassName}
            onClick={handleClose}
        >
            <div
                className={styles.recycleBinContent}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.recycleBinHeader}>
                    <div className={styles.headerTextWrapper}>
                        <h2 className={styles.recycleBinTitle}>{t.space.recycleBin || "Recycle Bin"}</h2>
                        <span className={styles.recycleBinSubtitle}>{t.space.restoreHint || "Swipe left to restore, swipe right to delete"} · {t.space.recycleBinLimitHint}</span>
                    </div>
                    <button className={styles.recycleBinCloseWrapper} onClick={handleClose}>
                        <div className={styles.recycleBinCloseInner}>
                            <svg className={styles.recycleBinCloseIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </button>
                </div>

                <div className={styles.recycleBinGrid}>
                    {deletedStickers.length > 0 ? (
                        deletedStickers.map((sticker, index) => (
                            <RecycleBinItem
                                key={sticker.id}
                                sticker={sticker}
                                onRestore={restoreSticker}
                                onDelete={handlePermanentDelete}
                                t={t}
                                index={index}
                            />
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <img src={TrashCanEmpty} alt="Empty Recycle Bin" className={styles.emptyStateIcon} />
                            <span className={styles.emptyStateText}>
                                {t.space?.emptyRecycleBin || "No deleted items"}
                            </span>
                            <span className={styles.emptyStateHint}>
                                {t.space?.emptyRecycleBinHint || "Deleted stickers will appear here"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
