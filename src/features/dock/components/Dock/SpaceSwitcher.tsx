import React, { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Space } from '@/shared/types';
import styles from './SpaceSwitcher.module.css';

/**
 * 入场动画：纯 scale，不碰 opacity
 * 避免 opacity:0 导致 backdrop-filter 延迟合成产生透明闪烁
 */
function switcherFadeIn(el: HTMLElement, duration: number) {
    el.style.transition = 'none';
    el.style.transform = 'scale(0)';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 与其他弹窗一致：--ease-out-quint
            el.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
            el.style.transform = 'scale(1)';
            setTimeout(() => {
                el.style.transform = '';
                el.style.transition = '';
            }, duration);
        });
    });
}

/**
 * 退场动画：与其他弹窗一致的缓动曲线
 */
function switcherFadeOut(el: HTMLElement, duration: number, onComplete?: () => void) {
    el.style.transition = 'none';
    el.style.transform = 'scale(1)';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 与其他弹窗一致：--ease-in-quint
            el.style.transition = `transform ${duration}ms cubic-bezier(0.755, 0.05, 0.855, 0.06)`;
            el.style.transform = 'scale(0)';
            if (onComplete) setTimeout(onComplete, duration);
        });
    });
}

interface SpaceSwitcherProps {
    spaces: Space[];
    onSelect: (spaceId: string) => void;
    onClose: () => void;
    anchorRect: DOMRect | null;
}

/** 单个块的动画时长 (ms) */
const ANIMATION_DURATION = 200;

/** 块高度 + 间距 */
const BLOCK_HEIGHT = 64;
const BLOCK_GAP = 6;
const BLOCK_STEP = BLOCK_HEIGHT + BLOCK_GAP;

/** 弧线参数 */
const CURVE_INTENSITY = 0.5;
const CURVE_MAX_OFFSET = 90;
const MAX_ROTATION = 24;
const BASE_ROTATION = 0.15;
const HOVER_SCALE = 1.06;
const LERP_FACTOR = 0.15;

export function SpaceSwitcher({
    spaces,
    onSelect,
    onClose,
    anchorRect,
}: SpaceSwitcherProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hoveredIdRef = useRef<string | null>(null);
    const isClosingRef = useRef(false);

    // 弧线偏移追踪
    const anchorCenterX = anchorRect
        ? anchorRect.left + anchorRect.width / 2
        : window.innerWidth / 2;
    const mouseXRef = useRef(anchorCenterX);
    const currentOffsetRef = useRef(0);
    const rafRef = useRef<number>(0);

    // 缩放插值（用于平滑 hover 缩放）
    const currentScalesRef = useRef<number[]>([]);

    // 更新所有块的位置（弧线 + 旋转 + 悬停缩放 + 背景色）
    const updateBlockPositions = useCallback(() => {
        const blocks = blockRefs.current;
        const n = spaces.length;
        const offset = currentOffsetRef.current;
        const hId = hoveredIdRef.current;

        if (currentScalesRef.current.length !== n) {
            currentScalesRef.current = new Array(n).fill(1);
        }

        for (let i = 0; i < n; i++) {
            const el = blocks[i];
            if (!el) continue;

            const distFromBottom = n - 1 - i;
            const t = n > 1 ? distFromBottom / (n - 1) : 0;

            const y = -(distFromBottom * BLOCK_STEP);
            const curveX = offset * t * t;

            const rotationT = BASE_ROTATION + (1 - BASE_ROTATION) * t;
            const rotation = (offset / CURVE_MAX_OFFSET) * MAX_ROTATION * rotationT;

            const isHovered = spaces[i].id === hId && !isClosingRef.current;
            const targetScale = isHovered ? HOVER_SCALE : 1;
            currentScalesRef.current[i] += (targetScale - currentScalesRef.current[i]) * 0.2;
            const scale = currentScalesRef.current[i];

            el.style.transform = `translate3d(${curveX}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

            if (isHovered) {
                el.style.background = 'var(--color-bg-secondary)';
            } else {
                el.style.background = '';
            }
        }
    }, [spaces]);

    // 入场动画：对外层容器统一执行，从底部中心展开
    useLayoutEffect(() => {
        if (containerRef.current) {
            // 测量第一个块的宽度，计算中心点（块是 right:0 绝对定位，所以中心在 -blockWidth/2）
            const firstBlock = blockRefs.current[blockRefs.current.length - 1];
            if (firstBlock) {
                const blockW = firstBlock.offsetWidth;
                // 容器宽度为 0，块从 right:0 向左延伸，中心点在 x = -blockWidth/2
                containerRef.current.style.transformOrigin = `${-blockW / 2}px bottom`;
            }
            switcherFadeIn(containerRef.current, ANIMATION_DURATION);
        }
    }, []);

    // 动画循环
    useEffect(() => {
        let running = true;
        const loop = () => {
            if (!running) return;
            const targetOffset = Math.max(-CURVE_MAX_OFFSET,
                Math.min(CURVE_MAX_OFFSET,
                    (mouseXRef.current - anchorCenterX) * CURVE_INTENSITY
                ));
            currentOffsetRef.current += (targetOffset - currentOffsetRef.current) * LERP_FACTOR;
            updateBlockPositions();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [anchorCenterX, updateBlockPositions]);

    // 退场动画：对外层容器统一执行退场
    const triggerExit = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (containerRef.current) {
            switcherFadeOut(containerRef.current, ANIMATION_DURATION, onClose);
        } else {
            onClose();
        }
    }, [onClose]);

    // 鼠标移动
    const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (isClosingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        mouseXRef.current = clientX;

        let found: string | null = null;
        for (let i = 0; i < blockRefs.current.length; i++) {
            const el = blockRefs.current[i];
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
                found = spaces[i].id;
                break;
            }
        }
        hoveredIdRef.current = found;
    }, [spaces]);

    // 松手
    const handlePointerUp = useCallback(() => {
        if (isClosingRef.current) return;
        const hId = hoveredIdRef.current;
        if (hId) onSelect(hId);
        triggerExit();
    }, [onSelect, triggerExit]);

    // 绑定全局事件
    useEffect(() => {
        document.addEventListener('mousemove', handlePointerMove);
        document.addEventListener('mouseup', handlePointerUp);
        document.addEventListener('touchmove', handlePointerMove, { passive: true });
        document.addEventListener('touchend', handlePointerUp);
        return () => {
            document.removeEventListener('mousemove', handlePointerMove);
            document.removeEventListener('mouseup', handlePointerUp);
            document.removeEventListener('touchmove', handlePointerMove);
            document.removeEventListener('touchend', handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);

    const wrapperStyle: React.CSSProperties = anchorRect
        ? {
            position: 'fixed',
            bottom: window.innerHeight - anchorRect.top + 8,
            right: window.innerWidth - anchorRect.right,
            zIndex: 'var(--z-space-switcher-content)',
        }
        : { position: 'fixed', bottom: 100, right: 20, zIndex: 'var(--z-space-switcher-content)' };

    if (spaces.length <= 1) {
        onClose();
        return null;
    }

    return createPortal(
        <div className={styles.overlay}>
            <div ref={containerRef} className={styles.blocksWrapper} style={wrapperStyle}>
                {spaces.map((space, index) => (
                    <div
                        key={space.id}
                        ref={(el) => { blockRefs.current[index] = el; }}
                        className={styles.block}
                    >
                        {space.name}
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );
}
