/**
 * 动画工具函数 - 共享的动画完成处理逻辑
 */

import { RETURN_ANIMATION_DURATION } from '../constants/layout';

/**
 * 监听归位动画完成
 * 统一 transitionend + setTimeout 兜底模式
 * 
 * @param element - 动画元素 (ghost element)
 * @param callback - 动画完成回调
 * @param fallbackMs - 兜底超时时间 (默认使用布局常量 + 50ms buffer)
 */
export const onReturnAnimationComplete = (
    element: HTMLElement | null,
    callback: () => void,
    fallbackMs: number = RETURN_ANIMATION_DURATION + 70
): void => {
    if (!element) {
        // 无元素时直接使用 setTimeout
        setTimeout(callback, RETURN_ANIMATION_DURATION);
        return;
    }

    let completed = false;

    const handleComplete = () => {
        if (completed) return;
        completed = true;
        element.removeEventListener('transitionend', onTransitionEnd);
        callback();
    };

    const onTransitionEnd = (e: TransitionEvent) => {
        // 只监听 left/top 属性的 transition 结束
        if (e.propertyName === 'left' || e.propertyName === 'top') {
            handleComplete();
        }
    };

    element.addEventListener('transitionend', onTransitionEnd);

    // Fallback: 如果 transitionend 没有触发，使用 setTimeout 兜底
    setTimeout(handleComplete, fallbackMs);
};
