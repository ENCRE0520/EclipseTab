import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  // 当提供此属性时，模态框的行为类似于锚定到此矩形的弹出框（无遮罩层/中心布局）
  anchorRect?: DOMRect | null;
  offset?: number;
  hideHeader?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  anchorRect,
  hideHeader,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  // 处理打开
  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setIsVisible(true);
    }
  }, [isOpen]);

  // 入场动画 - 使用 useLayoutEffect 以确保它在绘制前同步运行
  useLayoutEffect(() => {
    if (isOpen && isVisible && containerRef.current && !isClosingRef.current) {
      scaleFadeIn(containerRef.current);
    }
  }, [isOpen, isVisible]);

  // 处理关闭动作的提取，以便在多个地方可以重用
  const triggerCloseAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (containerRef.current) {
      scaleFadeOut(containerRef.current, 300, () => {
        setIsVisible(false);
      });
    } else {
      setIsVisible(false);
    }
  }, []);

  // 出场动画 - 由父组件设置 isOpen=false 触发
  useEffect(() => {
    // 只有当内部状态可见，且外部要求关闭时，才播放退出动画
    if (!isOpen && isVisible && !isClosingRef.current) {
      triggerCloseAnimation();
    }
  }, [isOpen, isVisible, triggerCloseAnimation]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 用户主动点击关闭（例如点击遮罩层或关闭按钮）
  // 这种情况下，我们需要先触发 onClose() 通知父组件更改状态，然后由上面的 useEffect 来处理动画
  // 或者是先播放动画，动画结束后触发 onClose()
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (containerRef.current) {
      scaleFadeOut(containerRef.current, 300, () => {
        setIsVisible(false);
        onClose(); // 动画播放完毕后再通知父组件关闭
      });
    } else {
      setIsVisible(false);
      onClose(); // 无需动画直接关闭
    }
  }, [onClose]);

  if (!isVisible) return null;

  // 弹出框模式
  if (anchorRect) {
    return createPortal(
      <>
        <div
          data-modal="true"
          style={{
            position: 'fixed',
            left: `${Math.min(Math.max(Math.round(anchorRect.left + anchorRect.width / 2), 160), window.innerWidth - 160)}px`,
            top: `${Math.round(anchorRect.top - 24)}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 2001, // 高于遮罩层
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={containerRef}
            className={`${styles.container} ${styles.popover} ${className || ''}`}
            style={{
              minWidth: 'auto',
            }}
          >
            {!hideHeader && title && (
              <div className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
              </div>
            )}
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </div>
        </div>
        {/* 全局外部点击捕获器 */}
        <div
          className={styles.clickAway}
          onClick={handleClose}
          style={{ zIndex: 2000 }}
        />
      </>,
      document.body
    );
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={containerRef}
        data-modal="true"
        className={`${styles.container} ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeButton} onClick={handleClose}>
              ×
            </button>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};

