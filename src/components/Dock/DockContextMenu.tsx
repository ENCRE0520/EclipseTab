import React, { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DockItem as DockItemType } from '../../types';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './DockContextMenu.module.css';
import writeIcon from '../../assets/icons/write.svg';
import editIcon from '../../assets/icons/edit.svg';
import trashIcon from '../../assets/icons/trash.svg';
import { useLanguage } from '../../context/LanguageContext';

// ============================================================================
// DockContextMenu - Right-click context menu for Dock items
// ============================================================================

interface DockContextMenuProps {
    x: number;
    y: number;
    item: DockItemType;
    isEditMode: boolean;
    onClose: () => void;
    onEdit: () => void;
    onToggleEditMode: () => void;
    onDelete: () => void;
}

export const DockContextMenu: React.FC<DockContextMenuProps> = ({
    x,
    y,
    item,
    isEditMode,
    onClose,
    onEdit,
    onToggleEditMode,
    onDelete,
}) => {
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);

    // Close with animation
    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (menuRef.current) {
            scaleFadeOut(menuRef.current, 200, () => {
                onClose();
            });
        } else {
            onClose();
        }
    }, [onClose]);

    // Animation on mount
    useEffect(() => {
        isClosingRef.current = false;
        if (menuRef.current) {
            scaleFadeIn(menuRef.current);
        }
    }, [x, y]);

    // Click outside to close (ignore right-clicks to prevent race condition with new context menu)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Ignore right-clicks - they will trigger a new context menu via contextmenu event
            if (e.button === 2) return;

            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClose]);

    // Prevent default context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // Adjust position to stay within viewport
    const menuWidth = 180;
    const menuHeight = 160;
    const padding = 10;

    // Calculate adjusted position, ensuring menu stays within viewport on all edges
    let adjustedX = x;
    let adjustedY = y;

    // Right edge
    if (x + menuWidth + padding > window.innerWidth) {
        adjustedX = window.innerWidth - menuWidth - padding;
    }
    // Left edge
    if (adjustedX < padding) {
        adjustedX = padding;
    }
    // Bottom edge  
    if (y + menuHeight + padding > window.innerHeight) {
        adjustedY = window.innerHeight - menuHeight - padding;
    }
    // Top edge
    if (adjustedY < padding) {
        adjustedY = padding;
    }

    return createPortal(
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: adjustedX, top: adjustedY }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.menuLabel}>{item.name}</div>
            <div className={styles.menuDivider} />
            <div className={styles.menuOptions}>
                {/* Edit Icon - only for non-folder items */}
                {item.type !== 'folder' && (
                    <button className={styles.menuItem} onClick={() => { onEdit(); handleClose(); }}>
                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                        <span>{t.contextMenu.edit}</span>
                    </button>
                )}
                {/* Toggle Edit Mode */}
                <button className={styles.menuItem} onClick={() => { onToggleEditMode(); handleClose(); }}>
                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                    <span>{isEditMode ? t.contextMenu.exitEditMode : t.contextMenu.editMode}</span>
                </button>
                {/* Delete */}
                <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDelete(); handleClose(); }}>
                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                    <span>{t.contextMenu.delete}</span>
                </button>
            </div>
        </div>,
        document.body
    );
};
