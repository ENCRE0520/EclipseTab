/**
 * 拖拽检测工具函数
 * 从 useDragAndDrop.ts 提取的纯函数，可在 Dock 和 FolderView 中复用
 */

import { DockItem } from '../types';
import { LayoutItem, Position } from '../utils/dragUtils';
import { isMouseOverFolderView } from '../utils/dragDetection';

// ============================================================================
// 类型定义
// ============================================================================

export type DragRegion =
    | { type: 'folder' }
    | { type: 'dock'; rect: DOMRect }
    | { type: 'outside' };

export interface MergeTarget {
    id: string;
    type: 'folder' | 'app';
}

// ============================================================================
// 区域检测
// ============================================================================

/**
 * 检测鼠标当前所在的拖拽区域
 * 
 * @param mouseX - 鼠标 X 坐标
 * @param mouseY - 鼠标 Y 坐标
 * @param dockRect - Dock 容器的边界矩形（缓存值）
 * @param activeItemIsFolder - 当前拖拽的是否是文件夹
 * @param buffer - Dock 区域外延距离（默认 100px）
 * @returns 当前所在区域
 */
export function detectDragRegion(
    mouseX: number,
    mouseY: number,
    dockRect: DOMRect | null,
    activeItemIsFolder: boolean,
    buffer: number = 100
): DragRegion {
    // 1. 检查是否在文件夹视图内（文件夹不能拖入另一个文件夹）
    if (!activeItemIsFolder && isMouseOverFolderView(mouseX, mouseY)) {
        return { type: 'folder' };
    }

    // 2. 检查是否在 Dock 区域内（包含缓冲区）
    if (dockRect) {
        if (
            mouseX >= dockRect.left - buffer &&
            mouseX <= dockRect.right + buffer &&
            mouseY >= dockRect.top - buffer &&
            mouseY <= dockRect.bottom + buffer
        ) {
            return { type: 'dock', rect: dockRect };
        }
    }

    return { type: 'outside' };
}

// ============================================================================
// 合并目标检测
// ============================================================================

/**
 * 检测当前拖拽位置是否接近某个可合并的目标
 * 
 * @param draggedCenter - 被拖拽项目的中心点位置
 * @param layoutSnapshot - 布局快照（所有项目的位置信息）
 * @param activeItemId - 当前拖拽项目的 ID
 * @param items - 当前项目列表
 * @param threshold - 合并触发的距离阈值（默认 25px）
 * @returns 找到的合并目标，或 null
 */
export function detectMergeTarget(
    draggedCenter: Position,
    layoutSnapshot: LayoutItem[],
    activeItemId: string,
    items: DockItem[],
    threshold: number = 25
): MergeTarget | null {
    for (const layoutItem of layoutSnapshot) {
        const dist = Math.hypot(
            draggedCenter.x - layoutItem.centerX,
            draggedCenter.y - layoutItem.centerY
        );

        if (dist < threshold) {
            const targetItem = items.find(i => i.id === layoutItem.id);
            if (targetItem && targetItem.id !== activeItemId) {
                return { id: targetItem.id, type: targetItem.type };
            }
        }
    }
    return null;
}

/**
 * 根据拖拽状态计算被拖拽元素的中心点
 * 
 * @param mouseX - 鼠标 X 坐标
 * @param mouseY - 鼠标 Y 坐标
 * @param offset - 拖拽偏移量
 * @param isDragging - 是否正在拖拽
 * @param itemSize - 项目尺寸（默认 64px）
 * @returns 计算后的中心点位置
 */
export function calculateDraggedCenter(
    mouseX: number,
    mouseY: number,
    offset: Position,
    isDragging: boolean,
    itemSize: number = 64
): Position {
    if (isDragging) {
        return {
            x: (mouseX - offset.x) + itemSize / 2,
            y: (mouseY - offset.y) + itemSize / 2,
        };
    }
    return { x: mouseX, y: mouseY };
}

// ============================================================================
// 重排序索引计算
// ============================================================================

/**
 * 计算重排序的目标索引（水平布局）
 * 
 * @param mouseX - 鼠标 X 坐标
 * @param snapshot - 布局快照
 * @param itemCount - 项目总数
 * @returns 目标插入索引
 */
export function calculateHorizontalReorderIndex(
    mouseX: number,
    snapshot: LayoutItem[],
    itemCount: number
): number {
    if (itemCount === 0) return 0;

    for (let i = 0; i < snapshot.length; i++) {
        if (mouseX < snapshot[i].centerX) {
            return i;
        }
    }
    return itemCount;
}

/**
 * 计算重排序的目标索引（网格布局）
 * 
 * @param mouseX - 鼠标 X 坐标
 * @param mouseY - 鼠标 Y 坐标
 * @param snapshot - 布局快照
 * @param containerRect - 容器边界矩形
 * @param columns - 列数
 * @param cellSize - 单元格尺寸
 * @param itemCount - 项目总数
 * @returns 目标插入索引
 */
export function calculateGridReorderIndex(
    mouseX: number,
    mouseY: number,
    snapshot: LayoutItem[],
    containerRect: DOMRect | null,
    columns: number,
    cellSize: number,
    itemCount: number
): number {
    if (!containerRect || snapshot.length === 0) {
        return itemCount;
    }

    const relativeX = mouseX - containerRect.left;
    const relativeY = mouseY - containerRect.top;

    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);

    const index = row * columns + col;

    return Math.max(0, Math.min(index, itemCount));
}
