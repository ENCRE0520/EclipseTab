import React from 'react';
import styles from './AddIcon.module.css';

interface AddIconProps {
  onClick: (rect?: DOMRect) => void;
}

export const AddIcon: React.FC<AddIconProps> = ({ onClick }) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // @ts-ignore - The parent expects a function that might take a rect, but the interface definition in this file was just () => void.
    // We need to update the interface too, but let's check if we can just pass it.
    // Actually, let's update the interface first to be safe.
    onClick(rect as any);
  };

  return (
    <div className={styles.addIcon} onClick={handleClick} data-add-icon>
      <div className={styles.icon}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

