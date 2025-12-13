/**
 * DragPreview - 共享拖拽预览组件
 * 统一 Dock 和 FolderView 的拖拽预览 Portal 逻辑
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { DockItem as DockItemType } from '../../types';
import { DockItem } from '../Dock/DockItem';
import {
    EASE_SPRING,
    EASE_SMOOTH,
    SQUEEZE_ANIMATION_DURATION,
    RETURN_ANIMATION_DURATION,
    FADE_DURATION,
    DRAG_SCALE,
    DRAG_Z_INDEX,
} from '../../constants/layout';

interface DragPreviewProps {
    /** 当前是否正在拖拽或播放归位动画 */
    isActive: boolean;
    /** 被拖拽的项目 */
    item: DockItemType | null;
    /** 当前位置 */
    position: { x: number; y: number };
    /** 是否正在播放归位动画 */
    isAnimatingReturn: boolean;
    /** 是否为编辑模式 */
    isEditMode: boolean;
    /** 拖拽元素的 ref */
    dragElementRef: React.MutableRefObject<HTMLElement | null>;
    /** 预合并状态 (Dock 专用 - 拖拽到其他图标上) */
    isPreMerge?: boolean;
    /** 拖出状态 (Folder 专用 - 拖出文件夹区域) */
    isDraggingOut?: boolean;
    /** 归位动画完成回调 */
    onAnimationComplete?: () => void;
}

export const DragPreview: React.FC<DragPreviewProps> = ({
    isActive,
    item,
    position,
    isAnimatingReturn,
    isEditMode,
    dragElementRef,
    isPreMerge = false,
    isDraggingOut = false,
    onAnimationComplete,
}) => {
    if (!isActive || !item) {
        return null;
    }

    // 计算 scale 变换
    const getScale = (): string => {
        if (isPreMerge) return 'scale(0.6)';
        if (isDraggingOut) return 'scale(1.0)';
        // 拖拽过程中默认放大，除非正在归位
        if (!isAnimatingReturn) return `scale(${DRAG_SCALE})`;
        return 'scale(1.0)';
    };

    // 计算 shadow
    const getShadow = (): string => {
        if (isPreMerge) return 'none'; // 合并时不显示阴影
        if (!isAnimatingReturn) return '0 16px 32px rgba(0,0,0,0.3)'; // 拖拽时阴影加深
        return 'none'; // 归位时阴影消失，平滑过渡到静止状态
    };

    // 计算 transition
    const getTransition = (): string => {
        if (isAnimatingReturn) {
            // 归位动画：使用 iOS 风格阻尼曲线
            return `left ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, top ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, transform ${SQUEEZE_ANIMATION_DURATION}ms ease-out, box-shadow ${SQUEEZE_ANIMATION_DURATION}ms ease-out`;
        }
        // 拖拽拾起时，scale 和 box-shadow 需要平滑过渡
        return `transform ${FADE_DURATION}ms ${EASE_SMOOTH}, box-shadow ${FADE_DURATION}ms ${EASE_SMOOTH}`;
    };

    // 防止重复触发回调 (left 和 top 可能同时只有其中之一变化，或者同时完成)
    const hasCalledCompleteRef = React.useRef(false);

    React.useEffect(() => {
        if (isAnimatingReturn) {
            hasCalledCompleteRef.current = false;
        }
    }, [isAnimatingReturn]);

    const handleTransitionEnd = (e: React.TransitionEvent) => {
        // 只在归位动画的 left/top 过渡完成时触发回调
        // 且确保只触发一次
        if (isAnimatingReturn &&
            !hasCalledCompleteRef.current &&
            (e.propertyName === 'left' || e.propertyName === 'top')) {

            hasCalledCompleteRef.current = true;
            onAnimationComplete?.();
        }
    };

    return createPortal(
        <div
            ref={el => {
                if (dragElementRef) {
                    dragElementRef.current = el;
                }
            }}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: 64,
                height: 64,
                pointerEvents: 'none',
                zIndex: DRAG_Z_INDEX,
                transform: getScale(),
                boxShadow: getShadow(),
                borderRadius: '16px', // 确保阴影贴合圆角 (假设图标是圆角矩形)
                transition: getTransition(),
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            <DockItem
                item={item}
                isEditMode={isEditMode}
                onClick={() => { }}
                onEdit={() => { }}
                onDelete={() => { }}
                isDragging={true}
            />
        </div>,
        document.body
    );
};
