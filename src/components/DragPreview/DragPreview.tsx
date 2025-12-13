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
        return 'scale(1.0)';
    };

    // 计算 transition
    const getTransition = (): string => {
        if (isAnimatingReturn) {
            // 归位动画：使用 iOS 风格阻尼曲线
            return `left ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, top ${RETURN_ANIMATION_DURATION}ms ${EASE_SPRING}, transform ${SQUEEZE_ANIMATION_DURATION}ms ease-out`;
        }
        return `transform ${FADE_DURATION}ms ${EASE_SMOOTH}`;
    };

    const handleTransitionEnd = (e: React.TransitionEvent) => {
        // 只在归位动画的 left/top 过渡完成时触发回调
        if (isAnimatingReturn && (e.propertyName === 'left' || e.propertyName === 'top')) {
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
                zIndex: 9999,
                transform: getScale(),
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
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
