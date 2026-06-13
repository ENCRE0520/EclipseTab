import React, { useEffect, useRef, useState, useCallback } from 'react';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import styles from './PopoverPanel.module.css';

interface PopoverPanelProps {
    isOpen: boolean;
    onClose: () => void;
    anchorPosition: { x: number; y: number };
    children: React.ReactNode;
    width?: number;
}

/**
 * PopoverPanel - 可复用的锚定弹出面板
 * 
 * 提供统一的玻璃态弹出面板：
 * - 入场/出场缩放模糊动画
 * - 玻璃态毛玻璃背景
 * - 自适应最大高度滚动
 * - 点击外部自动关闭
 */
export const PopoverPanel: React.FC<PopoverPanelProps> = ({
    isOpen,
    onClose,
    anchorPosition,
    children,
    width = 264,
}) => {
    const [isVisible, setIsVisible] = useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            isClosingRef.current = false;
            setIsVisible(true);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isVisible && modalRef.current) {
            scaleFadeIn(modalRef.current);
        }
    }, [isOpen, isVisible]);

    useEffect(() => {
        if (!isOpen && isVisible && !isClosingRef.current) {
            isClosingRef.current = true;
            if (modalRef.current) {
                scaleFadeOut(modalRef.current, 300, () => setIsVisible(false));
            } else {
                setIsVisible(false);
            }
        }
    }, [isOpen, isVisible]);

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        if (modalRef.current) {
            scaleFadeOut(modalRef.current, 300, () => {
                setIsVisible(false);
                onClose();
            });
        } else {
            setIsVisible(false);
            onClose();
        }
    }, [onClose]);

    if (!isVisible) return null;

    const modalStyle: React.CSSProperties = {
        left: `${anchorPosition.x}px`,
        top: `${anchorPosition.y}px`,
    };

    const innerStyle: React.CSSProperties = {
        width: `${width}px`,
    };

    return (
        <>
            <div className={styles.backdrop} onClick={handleClose} onDoubleClick={(e) => e.stopPropagation()} />
            <div ref={modalRef} className={styles.modal} style={modalStyle} onDoubleClick={(e) => e.stopPropagation()}>
                <div className={styles.innerContainer} style={innerStyle}>
                    {children}
                </div>
            </div>
        </>
    );
};
