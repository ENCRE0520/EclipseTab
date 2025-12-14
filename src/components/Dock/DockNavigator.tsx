import React from 'react';
import { Space } from '../../types';
import styles from './DockNavigator.module.css';

interface DockNavigatorProps {
    /** 当前空间对象 */
    currentSpace: Space;

    /** 空间总数 */
    totalSpaces: number;

    /** 当前空间在列表中的索引 (用于分页点) */
    currentIndex: number;

    /** 左键点击: 触发切换 */
    onSwitch: () => void;

    /** 右键点击: 打开管理菜单 */
    onContextMenu: (event: React.MouseEvent) => void;

    /** 是否禁用 (动画进行中) */
    disabled?: boolean;
}

/**
 * DockNavigator - 空间导航器
 * 显示当前空间名称，支持单击切换和右键管理
 */
export function DockNavigator({
    currentSpace,
    totalSpaces,
    currentIndex,
    onSwitch,
    onContextMenu,
    disabled = false,
}: DockNavigatorProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && totalSpaces > 1) {
            onSwitch();
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
    };

    return (
        <div
            className={`${styles.navigator} ${disabled ? styles.disabled : ''}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            title={`当前空间: ${currentSpace.name}\n左键: 切换空间\n右键: 管理空间`}
        >
            {/* 空间名称 */}
            <span className={styles.spaceName}>{currentSpace.name}</span>

            {/* 分页指示点 */}
            {totalSpaces > 1 && (
                <div className={styles.dots}>
                    {Array.from({ length: totalSpaces }).map((_, index) => (
                        <span
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
