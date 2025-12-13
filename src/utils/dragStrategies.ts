/**
 * 拖拽策略模式 - 处理 Dock 和 Folder 的差异化逻辑
 */

import { Position, LayoutItem, calculateFolderDropIndex } from './dragUtils';
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

                // 关键修复：当目标槽位就是当前位置或紧邻右侧时，不需要位移
                // targetSlot === originalIndex: 放回原位
                // targetSlot === originalIndex + 1: 占位符在当前项右侧，视觉上是同一位置
                if (targetSlot === originalIndex || targetSlot === originalIndex + 1) {
                    return { x: 0, y: 0 };
                }

                if (originalIndex < targetSlot) {
                    // 向右拖: 中间项向左移 (originalIndex+1 到 targetSlot-1 范围的项)
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

        calculatePlaceholder: (mouseX, mouseY, snapshot, itemCount, containerRect) => {
            // 使用 dragUtils 中更健壮的计算逻辑 (包含追加检测和最近邻检测)
            return calculateFolderDropIndex(
                mouseX,
                mouseY,
                snapshot,
                itemCount,
                containerRect || null
            );
        },

        calculateTransform: (index, targetSlot, originalIndex, isDragging) => {
            if (targetSlot === null) return { x: 0, y: 0 };

            // Z字形位移计算辅助函数
            const calculateZShapedOffset = (origIdx: number, visIdx: number): Position => {
                if (origIdx === visIdx) return { x: 0, y: 0 };
                const curCol = origIdx % columns;
                const curRow = Math.floor(origIdx / columns);
                const tgtCol = visIdx % columns;
                const tgtRow = Math.floor(visIdx / columns);
                return {
                    x: (tgtCol - curCol) * cellSize,
                    y: (tgtRow - curRow) * cellSize
                };
            };

            // 外部拖入
            if (originalIndex === -1) {
                if (index >= targetSlot) {
                    return calculateZShapedOffset(index, index + 1);
                }
                return { x: 0, y: 0 };
            }

            // 内部拖拽
            // isDragging 包含了 isAnimatingReturn 的情况 (由调用方控制传入)
            if (isDragging && originalIndex !== -1) {
                if (index === originalIndex) return { x: 0, y: 0 };

                // 向前拖 (Drag Backwards): [target, source) -> index + 1
                if (originalIndex > targetSlot) {
                    if (index >= targetSlot && index < originalIndex) {
                        return calculateZShapedOffset(index, index + 1);
                    }
                }
                // 向后拖 (Drag Forwards): (source, target] -> index - 1
                else if (originalIndex < targetSlot) {
                    if (index > originalIndex && index <= targetSlot) {
                        return calculateZShapedOffset(index, index - 1);
                    }
                }
            }

            return { x: 0, y: 0 };
        },

        isOutsideContainer: (mouseX, mouseY, containerRect) => {
            const buffer = 10;
            return !isMouseOverRect(mouseX, mouseY, containerRect, buffer);
        },
    };
};

/**
 * Helper to check if mouse is over rect (duplicated from detection to keep strategy independent if needed, 
 * but we can also import. For now, inline simple check or import.)
 * Actually we can just import from dragDetection if we want, or implementing simple logic here.
 */
const isMouseOverRect = (x: number, y: number, rect: DOMRect, buffer: number = 0) => {
    return (
        x >= rect.left - buffer &&
        x <= rect.right + buffer &&
        y >= rect.top - buffer &&
        y <= rect.bottom + buffer
    );
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
