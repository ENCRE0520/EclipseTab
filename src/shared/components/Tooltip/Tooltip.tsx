import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

interface TooltipProps {
    text: string;
    targetRef: React.RefObject<HTMLElement>;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, targetRef }) => {
    const [position, setPosition] = useState<{ bottom: number; left: number } | null>(null);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        const updatePosition = () => {
            if (targetRef.current) {
                const rect = targetRef.current.getBoundingClientRect();
                const bottom = window.innerHeight - rect.top + 8;

                setPosition({
                    bottom: bottom,
                    left: rect.left + rect.width / 2,
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [targetRef]);

    // Handle fade-out animation before unmounting
    useEffect(() => {
        return () => {
            setIsFadingOut(true);
        };
    }, []);

    if (!position) return null;

    const style: React.CSSProperties = {
        left: position.left,
        bottom: position.bottom,
        transform: 'translateX(-50%)', // Center horizontally
    };

    return createPortal(
        <div
            className={`${styles.tooltipContainer} ${isFadingOut ? styles.fadeOut : ''}`}
            style={style}
        >
            {text}
        </div>,
        document.body
    );
};
