/**
 * FLIP 动画工具函数
 * FLIP: First, Last, Invert, Play
 */

export const flip = (
  element: HTMLElement,
  first: DOMRect,
  last: DOMRect,
  onComplete?: () => void
) => {
  // Calculate the difference
  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  const deltaW = first.width / last.width;
  const deltaH = first.height / last.height;

  // Apply the transform
  element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
  element.style.transition = 'none';

  // Force a reflow
  element.offsetHeight;

  // Play the animation
  requestAnimationFrame(() => {
    element.style.transition = 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)';
    element.style.transform = '';

    if (onComplete) {
      setTimeout(onComplete, 300);
    }
  });
};

/**
 * 淡入动画
 */
export const fadeIn = (element: HTMLElement, duration = 300) => {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;

  requestAnimationFrame(() => {
    element.style.opacity = '1';
  });
};

/**
 * 淡出动画
 */
export const fadeOut = (element: HTMLElement, duration = 300, onComplete?: () => void) => {
  element.style.opacity = '1';
  element.style.transition = `opacity ${duration}ms cubic-bezier(0.755, 0.05, 0.855, 0.06)`;

  requestAnimationFrame(() => {
    element.style.opacity = '0';

    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  });
};

/**
 * 缩放淡入动画（用于模态框）
 * 使用双重 RAF 和强制 reflow 确保 Firefox 兼容性
 */
export const scaleFadeIn = (element: HTMLElement, duration = 300) => {
  // 设置初始状态（无过渡）
  element.style.transition = 'none';
  element.style.opacity = '0';
  element.style.transform = 'scale(0.9)';
  element.style.filter = 'blur(5px)';

  // 强制 reflow - Firefox 需要这一步来"看到"初始状态
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  element.offsetHeight;

  // 使用双重 RAF 确保浏览器已经渲染了初始状态
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 现在设置过渡和目标状态
      element.style.transition = `opacity ${duration}ms cubic-bezier(0.23, 1, 0.32, 1), transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1), filter ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
      element.style.filter = 'blur(0)';

      // 动画结束后清除内联样式，避免影响子元素定位
      setTimeout(() => {
        element.style.transform = '';
        element.style.filter = '';
        element.style.transition = '';
      }, duration);
    });
  });
};

/**
 * 缩放淡出动画（用于模态框）
 * 使用双重 RAF 和强制 reflow 确保 Firefox 兼容性
 */
export const scaleFadeOut = (element: HTMLElement, duration = 300, onComplete?: () => void) => {
  // 设置初始状态（无过渡）
  element.style.transition = 'none';
  element.style.opacity = '1';
  element.style.transform = 'scale(1)';
  element.style.filter = 'blur(0)';

  // 强制 reflow - Firefox 需要这一步来"看到"初始状态
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  element.offsetHeight;

  // 使用双重 RAF 确保浏览器已经渲染了初始状态
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 现在设置过渡和目标状态
      element.style.transition = `opacity ${duration}ms cubic-bezier(0.755, 0.05, 0.855, 0.06), transform ${duration}ms cubic-bezier(0.755, 0.05, 0.855, 0.06), filter ${duration}ms cubic-bezier(0.755, 0.05, 0.855, 0.06)`;
      element.style.opacity = '0';
      element.style.transform = 'scale(0.9)';
      element.style.filter = 'blur(5px)';

      if (onComplete) {
        setTimeout(onComplete, duration);
      }
    });
  });
};

