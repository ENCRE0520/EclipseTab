import React, { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DockItem as DockItemType } from '@/shared/types';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import styles from './DockContextMenu.module.css';
import writeIcon from '@/assets/icons/write.svg';
import editIcon from '@/assets/icons/edit.svg';
import trashIcon from '@/assets/icons/trash.svg';
import { useLanguage } from '@/shared/context/LanguageContext';

// ============================================================================
// DockContextMenu - Dock 项目的右键上下文菜单
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

    // 带有动画的关闭
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

    // 挂载时的动画
    useEffect(() => {
        isClosingRef.current = false;
        if (menuRef.current) {
            scaleFadeIn(menuRef.current);
        }
    }, [x, y]);

    // 点击外部关闭（忽略右键单击以防止与新上下文菜单竞争）
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // 忽略右键单击 - 它们将通过 contextmenu 事件触发新的上下文菜单
            if (e.button === 2) return;

            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClose]);

    // 阻止默认上下文菜单
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // 调整位置以保持在视口内
    const menuWidth = 180;
    const menuHeight = 160;
    const padding = 10;

    // 计算调整后的位置，确保菜单各边都保持在视口内
    let adjustedX = x;
    let adjustedY = y;

    // 右边界
    if (x + menuWidth + padding > window.innerWidth) {
        adjustedX = window.innerWidth - menuWidth - padding;
    }
    // 左边界
    if (adjustedX < padding) {
        adjustedX = padding;
    }
    // 底边界  
    if (y + menuHeight + padding > window.innerHeight) {
        adjustedY = window.innerHeight - menuHeight - padding;
    }
    // 顶边界
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
                {/* 编辑图标 - 仅适用于非文件夹项目 */}
                {item.type !== 'folder' && (
                    <button className={styles.menuItem} onClick={() => { onEdit(); handleClose(); }}>
                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                        <span>{t.contextMenu.edit}</span>
                    </button>
                )}
                {/* 切换编辑模式 */}
                <button className={styles.menuItem} onClick={() => { onToggleEditMode(); handleClose(); }}>
                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                    <span>{isEditMode ? t.contextMenu.exitEditMode : t.contextMenu.editMode}</span>
                </button>
                {/* 删除 */}
                <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDelete(); handleClose(); }}>
                    <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                    <span>{t.contextMenu.delete}</span>
                </button>
            </div>
        </div>,
        document.body
    );
};
