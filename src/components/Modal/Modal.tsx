import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  // When provided, the modal behaves like a popover anchored to this rect (no backdrop/centered layout)
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

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isVisible && containerRef.current) {
      scaleFadeIn(containerRef.current);
    }
  }, [isOpen, isVisible]);

  useEffect(() => {
    if (!isOpen && isVisible) {
      if (containerRef.current) {
        scaleFadeOut(containerRef.current, 300, () => setIsVisible(false));
      } else {
        setIsVisible(false);
      }
    }
  }, [isOpen, isVisible]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isVisible) return null;

  // Popover mode
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
            zIndex: 2001, // Higher than backdrop
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
        {/* global outside click catcher */}
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

