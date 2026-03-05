import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './ZenShelf.module.css';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import TrashCanEmpty from '@/assets/icons/TrashCan-empty.svg';
import TrashCanFull from '@/assets/icons/TrashCan-full.svg';
import TrashCanHalf from '@/assets/icons/TrashCan-half.svg';

interface RecycleBinProps {
    isVisible: boolean;
    onClick?: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ isVisible, onClick }) => {
    const [isPeek, setIsPeek] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { deletedStickers } = useZenShelf();

    // Check if mouse is near bottom-right corner to show bin partially
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isVisible) return; // If already visible due to drag, let parent control

            const { innerWidth, innerHeight } = window;
            const threshold = 150; // Trigger peek when close to corner

            const dist = Math.sqrt(
                Math.pow(innerWidth - e.clientX, 2) +
                Math.pow(innerHeight - e.clientY, 2)
            );

            setIsPeek(dist < threshold);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isVisible]);

    const getClassName = () => {
        if (isVisible) return `${styles.recycleBin} ${styles.visible}`;
        // 二段出现逻辑：只有在 peek 状态下悬停才显示完整
        if (isPeek && isHovered) return `${styles.recycleBin} ${styles.active}`;
        if (isPeek) return `${styles.recycleBin} ${styles.peek}`;
        return styles.recycleBin;
    };

    let icon = TrashCanEmpty;
    if (deletedStickers.length >= 30) {
        icon = TrashCanFull;
    } else if (deletedStickers.length > 0) {
        icon = TrashCanHalf;
    }

    return ReactDOM.createPortal(
        <div
            id="sticker-recycle-bin"
            className={getClassName()}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <img src={icon} alt="Trash Can" className={styles.recycleIcon} />
        </div>,
        document.body
    );
};
