import React, { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '../../utils/animations';
import styles from './ZenShelf.module.css';
import plusIcon from '../../assets/icons/plus.svg';
import writeIcon from '../../assets/icons/write.svg';
import trashIcon from '../../assets/icons/trash.svg';
import uploadIcon from '../../assets/icons/upload.svg';
import editIcon from '../../assets/icons/edit.svg';
import exportIcon from '../../assets/icons/export.svg';

// ============================================================================
// ContextMenu Component - Right-click context menu
// ============================================================================

interface ContextMenuProps {
    x: number;
    y: number;
    type: 'background' | 'sticker';
    stickerId?: string;
    isImageSticker?: boolean;
    onClose: () => void;
    onAddSticker: () => void;
    onUploadImage: () => void;
    onToggleEditMode: () => void;
    isEditMode: boolean;
    onEditSticker?: () => void;
    onDeleteSticker?: () => void;
    onCopyImage?: () => void;
    onCopyText?: () => void;
    onExportImage?: () => void;
    onExportImageSticker?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    type,
    isImageSticker,
    onClose,
    onAddSticker,
    onUploadImage,
    onToggleEditMode,
    isEditMode,
    onEditSticker,
    onDeleteSticker,
    onCopyImage,
    onCopyText,
    onExportImage,
    onExportImageSticker,
}) => {
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

    // Animation on mount and when position changes
    useEffect(() => {
        isClosingRef.current = false;
        if (menuRef.current) {
            scaleFadeIn(menuRef.current);
        }
    }, [x, y]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
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

    return createPortal(
        <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.menuLabel}>EclipseTab</div>
            <div className={styles.menuDivider} />
            <div className={styles.menuOptions}>
                {type === 'background' ? (
                    <>
                        <button className={styles.menuItem} onClick={() => { onAddSticker(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                            <span>Add Sticker</span>
                        </button>
                        <button className={styles.menuItem} onClick={() => { onUploadImage(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                            <span>Upload Image</span>
                        </button>
                        <button className={styles.menuItem} onClick={() => { onToggleEditMode(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                            <span>{isEditMode ? 'Quit Edit Mode' : 'Edit Mode'}</span>
                        </button>
                    </>
                ) : (
                    <>
                        {isImageSticker ? (
                            <>
                                <button className={styles.menuItem} onClick={() => { onCopyImage?.(); onClose(); }}>
                                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${exportIcon})`, maskImage: `url(${exportIcon})` }} />
                                    <span>Copy Image</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onExportImageSticker?.(); onClose(); }}>
                                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                                    <span>Export Image</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button className={styles.menuItem} onClick={() => { onCopyText?.(); onClose(); }}>
                                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${exportIcon})`, maskImage: `url(${exportIcon})` }} />
                                    <span>Copy Text</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onEditSticker?.(); onClose(); }}>
                                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                                    <span>Edit Sticker</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onExportImage?.(); onClose(); }}>
                                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                                    <span>Export as Image</span>
                                </button>
                            </>
                        )}
                        <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDeleteSticker?.(); onClose(); }}>
                            <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                            <span>Delete Sticker</span>
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};
