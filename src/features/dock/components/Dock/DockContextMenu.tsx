import React, { useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DockItem as DockItemType } from '@/shared/types';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
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
    const { spaces, currentSpace, moveItemToSpace } = useSpaces();
    const menuRef = useRef<HTMLDivElement>(null);
    const moveMenuButtonRef = useRef<HTMLButtonElement>(null);
    const spaceSubmenuRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);
    const sourceSpaceIdRef = useRef(currentSpace.id);
    const [showSpaceList, setShowSpaceList] = useState(false);
    const [spaceSubmenuPosition, setSpaceSubmenuPosition] = useState<{ left: number; top: number; opensLeft: boolean } | null>(null);
    const targetSpaces = spaces.filter(space => space.id !== sourceSpaceIdRef.current);

    // 带有动画的关闭
    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (spaceSubmenuRef.current) {
            scaleFadeOut(spaceSubmenuRef.current, 150);
        }

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

    useEffect(() => {
        if (showSpaceList && spaceSubmenuRef.current) {
            scaleFadeIn(spaceSubmenuRef.current, 180);
        }
    }, [showSpaceList, spaceSubmenuPosition]);

    // 点击外部关闭（忽略右键单击以防止与新上下文菜单竞争）
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // 忽略右键单击 - 它们将通过 contextmenu 事件触发新的上下文菜单
            if (e.button === 2) return;

            const target = e.target as Node;
            if (
                menuRef.current &&
                !menuRef.current.contains(target) &&
                !spaceSubmenuRef.current?.contains(target)
            ) {
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
    const menuWidth = 210;
    const padding = 10;
    const menuHeight = Math.min(210, window.innerHeight - padding * 2);

    const handleToggleSpaceList = () => {
        if (showSpaceList) {
            setShowSpaceList(false);
            setSpaceSubmenuPosition(null);
            return;
        }

        const anchorRect = moveMenuButtonRef.current?.getBoundingClientRect();
        if (!anchorRect) return;

        const submenuWidth = 210;
        const submenuHeight = Math.min(
            targetSpaces.length * 40 + 16,
            window.innerHeight - padding * 2
        );
        const gap = 8;
        const opensLeft = window.innerWidth - anchorRect.right < submenuWidth + gap;
        const left = opensLeft
            ? Math.max(padding, anchorRect.left - submenuWidth - gap)
            : Math.min(window.innerWidth - submenuWidth - padding, anchorRect.right + gap);
        const top = Math.max(
            padding,
            Math.min(anchorRect.top, window.innerHeight - submenuHeight - padding)
        );

        setSpaceSubmenuPosition({ left, top, opensLeft });
        setShowSpaceList(true);
    };

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
        <>
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
                {targetSpaces.length > 0 && (
                    <>
                        <button
                            ref={moveMenuButtonRef}
                            className={`${styles.menuItem} ${styles.moveMenuItem}`}
                            onClick={handleToggleSpaceList}
                            aria-expanded={showSpaceList}
                        >
                            <svg
                                className={styles.moveMenuIconLegacy}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path d="M19.793 17.5C21.1293 17.5001 21.7984 19.1156 20.8535 20.0605L19.957 20.957C19.5665 21.3476 18.9335 21.3476 18.543 20.957C18.1524 20.5665 18.1524 19.9335 18.543 19.543L18.5859 19.5H14C13.4477 19.5 13 19.0523 13 18.5C13 17.9477 13.4477 17.5 14 17.5H19.793Z" fill="currentColor" />
                                <path d="M16.2002 4C17.0237 4 17.7016 3.99947 18.252 4.04443C18.814 4.09036 19.3306 4.18877 19.8159 4.43604C20.5686 4.81953 21.1805 5.43143 21.564 6.18408C21.8112 6.66937 21.9096 7.18601 21.9556 7.74805C22.0005 8.29843 22 8.97632 22 9.79981V11C22 11.5523 21.5523 12 21 12C20.4477 12 20 11.5523 20 11V9.79981C20 8.94339 19.9992 8.36118 19.9624 7.91113C19.9266 7.47272 19.8619 7.2482 19.7822 7.0918C19.5905 6.71554 19.2845 6.40951 18.9082 6.21777C18.7518 6.13808 18.5273 6.07342 18.0889 6.0376C17.6388 6.00083 17.0566 6 16.2002 6H7.79981C6.94339 6 6.36118 6.00083 5.91113 6.0376C5.47272 6.07342 5.2482 6.13808 5.0918 6.21777C4.71554 6.40951 4.40951 6.71554 4.21777 7.0918C4.13808 7.2482 4.07342 7.47272 4.0376 7.91113C4.00083 8.36118 4 8.94339 4 9.79981V12.2002C4 13.0566 4.00083 13.6388 4.0376 14.0889C4.07342 14.5273 4.13808 14.7518 4.21777 14.9082C4.40951 15.2845 4.71554 15.5905 5.0918 15.7822C5.2482 15.8619 5.47272 15.9266 5.91113 15.9624C6.36118 15.9992 6.94339 16 7.79981 16H10C10.5523 16 11 16.4477 11 17C11 17.5523 10.5523 18 10 18H7.79981C6.97632 18 6.29843 18.0005 5.74805 17.9556C5.18601 17.9096 4.66937 17.8112 4.18408 17.564C3.43143 17.1805 2.81953 16.5686 2.43604 15.8159C2.18877 15.3306 2.09036 14.814 2.04443 14.252C1.99947 13.7016 2 13.0237 2 12.2002V9.79981C2 8.97632 1.99947 8.29843 2.04443 7.74805C2.09036 7.18601 2.18877 6.66937 2.43604 6.18408C2.81953 5.43143 3.43143 4.81953 4.18408 4.43604C4.66937 4.18877 5.18601 4.09036 5.74805 4.04443C6.29843 3.99947 6.97632 4 7.79981 4H16.2002Z" fill="currentColor" />
                                <path d="M14.543 12.793C14.9335 12.4024 15.5665 12.4024 15.957 12.793C16.3476 13.1835 16.3476 13.8165 15.957 14.207L15.9141 14.25H20.5C21.0523 14.25 21.5 14.6977 21.5 15.25C21.5 15.8023 21.0523 16.25 20.5 16.25H14.707C13.3707 16.2499 12.7016 14.6344 13.6465 13.6895L14.543 12.793Z" fill="currentColor" />
                            </svg>
                            <svg
                                className={styles.moveMenuIcon}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path fillRule="evenodd" clipRule="evenodd" d="M16.2002 2C17.0237 2 17.7016 1.99898 18.252 2.04395C18.814 2.08988 19.3311 2.18828 19.8164 2.43555L20.0918 2.58985C20.7183 2.97413 21.2289 3.52513 21.5645 4.1836C21.8117 4.6689 21.9101 5.18599 21.9561 5.74805C22.001 6.29843 22 6.97632 22 7.79981V16.2002C22 17.0237 22.001 17.7016 21.9561 18.252C21.9159 18.7438 21.8356 19.2011 21.6504 19.6328L21.5645 19.8164C21.2289 20.4749 20.7183 21.0259 20.0918 21.4102L19.8164 21.5645C19.3311 21.8117 18.814 21.9101 18.252 21.9561C17.7016 22.001 17.0237 22 16.2002 22H7.79981C6.97632 22 6.29843 22.001 5.74805 21.9561C5.186 21.9101 4.6689 21.8112 4.1836 21.5645C3.52513 21.2289 2.97413 20.7183 2.58985 20.0918L2.43555 19.8164C2.18828 19.3311 2.08988 18.814 2.04395 18.252C1.99898 17.7016 2 17.0237 2 16.2002V7.79981C2 6.97632 1.99898 6.29843 2.04395 5.74805C2.08988 5.186 2.18827 4.6689 2.43555 4.1836C2.81902 3.43109 3.43109 2.81902 4.1836 2.43555C4.6689 2.18827 5.186 2.08988 5.74805 2.04395C6.29843 1.99898 6.97632 2 7.79981 2H16.2002ZM7.79981 4C6.94342 4 6.36117 4.00035 5.91113 4.03711C5.47272 4.07293 5.2482 4.13809 5.0918 4.21778C4.71555 4.40951 4.40951 4.71555 4.21778 5.0918C4.13809 5.2482 4.07293 5.47272 4.03711 5.91113C4.00035 6.36117 4 6.94342 4 7.79981V16.2002C4 17.0566 4.00035 17.6388 4.03711 18.0889C4.07293 18.5273 4.13809 18.7518 4.21778 18.9082L4.29492 19.0459C4.48707 19.3592 4.76257 19.6145 5.0918 19.7822C5.2482 19.8619 5.47272 19.927 5.91113 19.9629C6.36117 19.9997 6.94342 20 7.79981 20H16.2002C17.0566 20 17.6388 19.9997 18.0889 19.9629C18.5273 19.9271 18.7518 19.8619 18.9082 19.7822L19.0459 19.7051C19.3592 19.5129 19.6145 19.2374 19.7822 18.9082L19.8389 18.7754C19.8924 18.6258 19.936 18.4175 19.9629 18.0889C19.9997 17.6388 20 17.0566 20 16.2002V7.79981C20 6.94342 19.9997 6.36118 19.9629 5.91113C19.9271 5.47272 19.8619 5.2482 19.7822 5.0918C19.6145 4.76257 19.3592 4.48707 19.0459 4.29492L18.9082 4.21778C18.7518 4.13809 18.5273 4.07293 18.0889 4.0376C17.6388 4.00083 17.0566 4 16.2002 4H7.79981Z" fill="currentColor" />
                                <path d="M16.9878 11.9995C16.9878 12.2646 16.8822 12.519 16.6948 12.7065L12.6948 16.7065C12.5062 16.8887 12.2539 16.99 11.9917 16.9878C11.7296 16.9855 11.4788 16.8801 11.2935 16.6948C11.1081 16.5095 11.0028 16.2587 11.0005 15.9966C10.9982 15.7344 11.0986 15.4811 11.2808 15.2925L13.5737 12.9995L7.98779 12.9995C7.72265 12.9995 7.46825 12.894 7.28076 12.7065C7.09342 12.519 6.98779 12.2646 6.98779 11.9995C6.9879 11.7344 7.09332 11.4799 7.28076 11.2925C7.46824 11.1051 7.7227 10.9996 7.98779 10.9995L13.5737 10.9995L11.2808 8.70654C11.0988 8.51797 10.9982 8.26547 11.0005 8.00342C11.0028 7.74126 11.1081 7.49056 11.2935 7.30517C11.4789 7.11983 11.7295 7.01448 11.9917 7.01221C12.2537 7.00995 12.5063 7.11053 12.6948 7.29248L16.6948 11.2925C16.8822 11.4799 16.9877 11.7345 16.9878 11.9995Z" fill="currentColor" />
                            </svg>
                            <span className={styles.moveLabel}>{t.contextMenu.moveToSpace}</span>
                            <svg
                                className={styles.chevron}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path
                                    d="M8.293 5.293C8.10553 5.48053 8.00021 5.73484 8.00021 6C8.00021 6.26516 8.10553 6.51947 8.293 6.707L13.586 12L8.293 17.293C8.11084 17.4816 8.01005 17.7342 8.01233 17.9964C8.0146 18.2586 8.11977 18.5094 8.30518 18.6948C8.49059 18.8802 8.7414 18.9854 9.0036 18.9877C9.2658 18.99 9.5184 18.8892 9.707 18.707L15.707 12.707C15.8945 12.5195 15.9998 12.2652 15.9998 12C15.9998 11.7348 15.8945 11.4805 15.707 11.293L9.707 5.293C9.51947 5.10553 9.26516 5.00021 9 5.00021C8.73484 5.00021 8.48053 5.10553 8.293 5.293Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </button>
                    </>
                )}
                    {/* 删除 */}
                    <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDelete(); handleClose(); }}>
                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                        <span>{t.contextMenu.delete}</span>
                    </button>
                </div>
            </div>
            {showSpaceList && spaceSubmenuPosition && (
                <div
                    ref={spaceSubmenuRef}
                    className={styles.spaceSubmenu}
                    style={{
                        left: spaceSubmenuPosition.left,
                        top: spaceSubmenuPosition.top,
                        transformOrigin: spaceSubmenuPosition.opensLeft ? 'right center' : 'left center',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.spaceSubmenuList}>
                        {targetSpaces.map(space => (
                            <button
                                key={space.id}
                                className={styles.spaceItem}
                                onClick={() => {
                                    moveItemToSpace(sourceSpaceIdRef.current, space.id, item.id);
                                    handleClose();
                                }}
                            >
                                <span className={styles.spaceName}>{space.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};
