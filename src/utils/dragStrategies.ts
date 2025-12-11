/**
 * 拖拽策略模式 - 处理 Dock 和 Folder 的差异化逻辑
 */

import { Position } from './dragUtils';
import { LayoutItem } from '../hooks/useDragBase';
import { DockItem } from '../types';

/**
 * 布局配置
 */
export interface LayoutConfig {
    type: 'horizontal' | 'grid';
    columns?: number;  // 仅 grid 需要
    cellSize: number;  // 单元格大小 (itemSize + gap)
    padding?: number;
    hysteresisThreshold?: number;
}

/**
 * 特殊交互结果
 */
export interface SpecialInteraction {
    type: 'merge' | 'dropToFolder' | 'hoverOpenFolder' | 'dragOut' | 'dragToOpenFolder';
    targetId?: string;
    targetItem?: DockItem;
    data?: unknown;
}

/**
 * 拖拽策略接口
 */
export interface DragStrategy {
    /** 布局配置 */
    layoutConfig: LayoutConfig;

    /** 
     * 计算占位符索引
     * @param mouseX 鼠标X坐标
     * @param mouseY 鼠标Y坐标
     * @param snapshot 布局快照
     * @param itemCount 项目数量
     * @param containerRect 容器矩形 (可选)
     */
    calculatePlaceholder: (
        mouseX: number,
        mouseY: number,
        snapshot: LayoutItem[],
        itemCount: number,
        containerRect?: DOMRect
    ) => number;

    /**
     * 计算项目动画偏移
     * @param index 项目索引
     * @param targetSlot 目标槽位
     * @param originalIndex 原始索引 (-1 表示外部拖入)
     * @param isDragging 是否正在拖拽
     */
    calculateTransform: (
        index: number,
        targetSlot: number | null,
        originalIndex: number,
        isDragging: boolean
    ) => Position;

    /**
     * 判断是否在容器外
     */
    isOutsideContainer?: (mouseX: number, mouseY: number, containerRect: DOMRect) => boolean;
}

// ============ 水平布局策略 (Dock) ============

export const createHorizontalStrategy = (): DragStrategy => {
    const cellSize = 72; // 64 + 8 gap

    return {
        layoutConfig: {
            type: 'horizontal',
            cellSize,
            hysteresisThreshold: 10,
        },

        calculatePlaceholder: (mouseX, _mouseY, snapshot, itemCount) => {
            // 基于 X 轴查找插入位置
            for (let i = 0; i < snapshot.length; i++) {
                if (mouseX < snapshot[i].centerX) {
                    return i;
                }
            }
            return itemCount;
        },

        calculateTransform: (index, targetSlot, originalIndex, isDragging) => {
            if (targetSlot === null) return { x: 0, y: 0 };

            // 内部拖拽
            if (isDragging && originalIndex !== -1) {
                if (index === originalIndex) return { x: 0, y: 0 };

                if (originalIndex < targetSlot) {
                    // 向右拖: 中间项向左移
                    if (index > originalIndex && index < targetSlot) {
                        return { x: -cellSize, y: 0 };
                    }
                } else if (originalIndex > targetSlot) {
                    // 向左拖: 中间项向右移
                    if (index >= targetSlot && index < originalIndex) {
                        return { x: cellSize, y: 0 };
                    }
                }
            }
            // 外部拖入
            else if (originalIndex === -1 && index >= targetSlot) {
                return { x: cellSize, y: 0 };
            }

            return { x: 0, y: 0 };
        },
    };
};

// ============ 网格布局策略 (Folder) ============

export const createGridStrategy = (columns: number = 4): DragStrategy => {
    const itemSize = 64;
    const gap = 8;
    const cellSize = itemSize + gap;
    const padding = 8;


    return {
        layoutConfig: {
            type: 'grid',
            columns,
            cellSize,
            padding,
            hysteresisThreshold: 15,
        },

        calculatePlaceholder: (mouseX, mouseY, _snapshot, itemCount, containerRect) => {
            if (!containerRect) return 0;

            // 计算相对位置
            const relX = mouseX - containerRect.left - padding;
            const relY = mouseY - containerRect.top - padding;

            // 使用中点判断
            const col = Math.floor(relX / cellSize + 0.5);
            const row = Math.floor(relY / cellSize + 0.5);

            const safeCol = Math.max(0, Math.min(col, columns));
            const safeRow = Math.max(0, row);

            const index = safeRow * columns + safeCol;
            return Math.min(index, itemCount);
        },

        calculateTransform: (index, targetSlot, originalIndex, isDragging) => {
            if (targetSlot === null) return { x: 0, y: 0 };

            // 内部拖拽：被拖拽元素保持64px隐藏空间，不需要额外位移
            // 因为隐藏的元素已经提供了1格的空位
            if (isDragging && originalIndex !== -1) {
                // 所有元素保持原位，不需要移动
                // 被拖拽元素的64px隐藏空间就是视觉上的gap
                return { x: 0, y: 0 };
            }
            // 外部拖入：容器已扩展一格空间，只需让目标位置及右侧的项向右移一格
            else if (originalIndex === -1) {
                if (index >= targetSlot) {
                    return { x: cellSize, y: 0 };
                }
                return { x: 0, y: 0 };
            }

            return { x: 0, y: 0 };
        },

        isOutsideContainer: (mouseX, mouseY, containerRect) => {
            const buffer = 10;
            return (
                mouseX < containerRect.left - buffer ||
                mouseX > containerRect.right + buffer ||
                mouseY < containerRect.top - buffer ||
                mouseY > containerRect.bottom + buffer
            );
        },
    };
};

/**
 * 重排序项目数组 - 基于ID过滤后直接插入
 */
export const reorderItems = <T extends { id: string }>(
    items: T[],
    draggedItem: T,
    targetIndex: number
): T[] => {
    const filteredItems = items.filter(item => item.id !== draggedItem.id);
    const insertAt = Math.min(targetIndex, filteredItems.length);
    return [
        ...filteredItems.slice(0, insertAt),
        draggedItem,
        ...filteredItems.slice(insertAt)
    ];
};

/**
 * 应用滞后机制
 */
export const applyHysteresis = (
    newIndex: number,
    lastIndex: number | null,
    mouseX: number,
    mouseY: number,
    getSlotCenter: (index: number) => Position,
    threshold: number
): { shouldUpdate: boolean; newIndex: number } => {
    if (lastIndex === null || lastIndex === newIndex) {
        return { shouldUpdate: true, newIndex };
    }

    const currentCenter = getSlotCenter(lastIndex);
    const newCenter = getSlotCenter(newIndex);

    const distFromCurrent = Math.hypot(mouseX - currentCenter.x, mouseY - currentCenter.y);
    const distToNew = Math.hypot(mouseX - newCenter.x, mouseY - newCenter.y);

    // 只有明显更接近新位置时才更新
    if (distFromCurrent < threshold || distFromCurrent < distToNew * 0.8) {
        return { shouldUpdate: false, newIndex: lastIndex };
    }

    return { shouldUpdate: true, newIndex };
};
