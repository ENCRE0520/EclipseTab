/**
 * dragMath.ts — 拖拽纯数学/几何工具函数
 *
 * 所有坐标计算、区域碰撞、布局策略等纯函数集中在此文件。
 * Hook 层只负责状态管理和事件绑定，不再包含数学逻辑。
 *
 * 来源合并:
 *   - utils/dragUtils.ts
 *   - utils/dragDetection.ts
 *   - utils/dragStrategies.ts
 *   - hooks/useDragDetection.ts
 */

import { DockItem } from '@/shared/types';
import { MOVE_THRESHOLD } from '@/shared/constants/layout';

// ============================================================================
// 基础类型
// ============================================================================

/** 二维坐标 */
export interface Position {
    x: number;
    y: number;
}

/** 基础拖拽状态 */
export interface BaseDragState {
    isDragging: boolean;
    item: DockItem | null;
    originalIndex: number;
    currentPosition: Position;
    startPosition: Position;
    offset: Position;
    isAnimatingReturn: boolean;
    targetPosition: Position | null;
}

/** 布局快照项 */
export interface LayoutItem {
    id: string;
    index: number;
    rect: DOMRect;
    centerX: number;
    centerY: number;
}

/** 拖拽区域判定结果 */
export type DragRegion =
    | { type: 'folder' }
    | { type: 'dock'; rect: DOMRect }
    | { type: 'outside' };

/** 合并目标 */
export interface MergeTarget {
    id: string;
    type: 'folder' | 'app';
}

/** 布局配置 */
export interface LayoutConfig {
    type: 'horizontal' | 'grid';
    columns?: number;
    cellSize: number;
    padding?: number;
    hysteresisThreshold?: number;
}

/** 特殊交互结果 */
export interface SpecialInteraction {
    type: 'merge' | 'dropToFolder' | 'hoverOpenFolder' | 'dragOut' | 'dragToOpenFolder';
    targetId?: string;
    targetItem?: DockItem;
    data?: unknown;
}

/** 拖拽策略接口 */
export interface DragStrategy {
    layoutConfig: LayoutConfig;
    calculatePlaceholder: (
        mouseX: number,
        mouseY: number,
        snapshot: LayoutItem[],
        itemCount: number,
        containerRect?: DOMRect
    ) => number;
    calculateTransform: (
        index: number,
        targetSlot: number | null,
        originalIndex: number,
        isDragging: boolean
    ) => Position;
    isOutsideContainer?: (mouseX: number, mouseY: number, containerRect: DOMRect) => boolean;
}

/** mousedown 处理器配置 */
export interface MouseDownHandlerOptions<T extends BaseDragState> {
    isEditMode: boolean;
    item: DockItem;
    index: number;
    event: React.MouseEvent;
    setDragState: React.Dispatch<React.SetStateAction<T>>;
    onDragStart?: (item: DockItem) => void;
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: () => void;
    createDragState: (item: DockItem, index: number, rect: DOMRect, startX: number, startY: number, offset: Position) => T;
}

// ============================================================================
// 距离 & 几何
// ============================================================================

/** 计算两点距离 */
export const calculateDistance = (
    x1: number, y1: number, x2: number, y2: number
): number => Math.hypot(x2 - x1, y2 - y1);

/** 计算鼠标到矩形中心的距离 */
export const calculateDistanceToCenter = (
    mouseX: number, mouseY: number, rect: DOMRect
): number => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return calculateDistance(mouseX, mouseY, centerX, centerY);
};

/** 点是否在矩形内 (带可选缓冲区) */
export const isPointInRect = (
    x: number, y: number, rect: DOMRect, buffer: number = 0
): boolean => (
    x >= rect.left - buffer &&
    x <= rect.right + buffer &&
    y >= rect.top - buffer &&
    y <= rect.bottom + buffer
);

/** 点是否在矩形内 — 别名，与旧 dragDetection 兼容 */
export const isMouseOverRect = isPointInRect;

// ============================================================================
// DOM 区域检测
// ============================================================================

/** 检测鼠标是否在打开的文件夹视图内 */
export const isMouseOverFolderView = (mouseX: number, mouseY: number): boolean => {
    const el = document.querySelector('[data-folder-view="true"]');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return isPointInRect(mouseX, mouseY, rect);
};

/** 检测鼠标是否在 Dock 区域内 (含缓冲区) */
export const isMouseOverDock = (mouseX: number, mouseY: number, buffer: number = 50): boolean => {
    const el = document.querySelector('[data-dock-container="true"]');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return isPointInRect(mouseX, mouseY, rect, buffer);
};

/** 获取文件夹视图 DOMRect */
export const getFolderViewRect = (): DOMRect | null => {
    const el = document.querySelector('[data-folder-view="true"]');
    return el?.getBoundingClientRect() ?? null;
};

/** 切换 body 拖拽 class */
export const toggleDraggingClass = (isDragging: boolean): void => {
    if (isDragging) {
        document.body.classList.add('is-dragging');
    } else {
        document.body.classList.remove('is-dragging');
    }
};

// ============================================================================
// 拖拽区域 & 合并目标检测
// ============================================================================

/**
 * 检测鼠标当前所在的拖拽区域
 */
export function detectDragRegion(
    mouseX: number,
    mouseY: number,
    dockRect: DOMRect | null,
    activeItemIsFolder: boolean,
    buffer: number = 100
): DragRegion {
    if (!activeItemIsFolder && isMouseOverFolderView(mouseX, mouseY)) {
        return { type: 'folder' };
    }
    if (dockRect && isPointInRect(mouseX, mouseY, dockRect, buffer)) {
        return { type: 'dock', rect: dockRect };
    }
    return { type: 'outside' };
}

/**
 * 检测当前拖拽位置是否接近某个可合并的目标
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
// 索引计算
// ============================================================================

/** 查找鼠标位置最近的元素索引 */
export const findClosestItemIndex = (
    mouseX: number,
    mouseY: number,
    itemRefs: (HTMLElement | null)[],
    skipIndex?: number
): { index: number; distance: number } => {
    let closestIndex = itemRefs.length;
    let minDistance = Infinity;

    itemRefs.forEach((ref, index) => {
        if (!ref || index === skipIndex) return;
        const rect = ref.getBoundingClientRect();
        const dist = calculateDistanceToCenter(mouseX, mouseY, rect);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });

    return { index: closestIndex, distance: minDistance };
};

/** 根据鼠标 X 计算插入索引 (基于 DOM refs) */
export const calculateInsertIndex = (
    mouseX: number,
    itemRefs: (HTMLElement | null)[],
    itemCount: number
): number => {
    for (let i = 0; i < itemRefs.length; i++) {
        const ref = itemRefs[i];
        if (ref) {
            const rect = ref.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            if (mouseX < centerX) return i;
        }
    }
    return itemCount;
};

/** 计算水平布局重排序索引 (基于 snapshot) */
export function calculateHorizontalReorderIndex(
    mouseX: number,
    snapshot: LayoutItem[],
    itemCount: number
): number {
    if (itemCount === 0) return 0;
    for (let i = 0; i < snapshot.length; i++) {
        if (mouseX < snapshot[i].centerX) return i;
    }
    return itemCount;
}

/** 计算网格布局重排序索引 */
export function calculateGridReorderIndex(
    mouseX: number,
    mouseY: number,
    snapshot: LayoutItem[],
    containerRect: DOMRect | null,
    columns: number,
    cellSize: number,
    itemCount: number
): number {
    if (!containerRect || snapshot.length === 0) return itemCount;
    const relativeX = mouseX - containerRect.left;
    const relativeY = mouseY - containerRect.top;
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);
    const index = row * columns + col;
    return Math.max(0, Math.min(index, itemCount));
}

/** 计算文件夹内的落点索引 (Geometry-based) */
export const calculateFolderDropIndex = (
    mouseX: number,
    mouseY: number,
    layoutSnapshot: LayoutItem[],
    itemCount: number,
    containerRect?: DOMRect | null
): number => {
    if (layoutSnapshot.length === 0) return 0;

    // 尾部追加检测
    if (containerRect) {
        const lastItem = layoutSnapshot[layoutSnapshot.length - 1];
        if (mouseY > lastItem.rect.bottom) return itemCount;
    }

    // 最近邻检测
    let closestItem: LayoutItem | null = null;
    let minDistance = Infinity;
    for (const item of layoutSnapshot) {
        const dist = Math.hypot(mouseX - item.centerX, mouseY - item.centerY);
        if (dist < minDistance) {
            minDistance = dist;
            closestItem = item;
        }
    }
    if (!closestItem) return itemCount;

    // 插入方向判定 (10px 阈值)
    const THRESHOLD = 10;
    if (mouseX < closestItem.centerX + THRESHOLD) {
        return closestItem.index;
    }
    return closestItem.index + 1;
};

// ============================================================================
// 状态工厂
// ============================================================================

/** 创建初始拖拽状态 */
export const createInitialDragState = <T extends BaseDragState>(
    additional: Omit<T, keyof BaseDragState>
): T => ({
    isDragging: false,
    item: null,
    originalIndex: -1,
    currentPosition: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    isAnimatingReturn: false,
    targetPosition: null,
    ...additional,
} as T);

/** 重置拖拽状态 */
export const resetDragState = <T extends BaseDragState>(
    additional: Omit<T, keyof BaseDragState>
): T => createInitialDragState(additional);

// ============================================================================
// 数组工具
// ============================================================================

/** 简单数组重排 (移动 startIndex → endIndex) */
export const reorderList = <T>(list: T[], startIndex: number, endIndex: number): T[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

/** 重排序项目 — 过滤后插入 */
export const reorderItems = <T extends { id: string }>(
    items: T[],
    draggedItem: T,
    targetIndex: number
): T[] => {
    const filtered = items.filter(item => item.id !== draggedItem.id);
    const insertAt = Math.min(targetIndex, filtered.length);
    return [...filtered.slice(0, insertAt), draggedItem, ...filtered.slice(insertAt)];
};

// ============================================================================
// 滞后 & 防抖
// ============================================================================

/** 应用滞后机制 */
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

    if (distFromCurrent < threshold || distFromCurrent < distToNew * 0.8) {
        return { shouldUpdate: false, newIndex: lastIndex };
    }
    return { shouldUpdate: true, newIndex };
};

// ============================================================================
// 布局策略工厂
// ============================================================================

/** 水平布局策略 (Dock) */
export const createHorizontalStrategy = (): DragStrategy => {
    const cellSize = 72; // 64 + 8 gap

    return {
        layoutConfig: { type: 'horizontal', cellSize, hysteresisThreshold: 10 },

        calculatePlaceholder: (mouseX, _mouseY, snapshot, itemCount) => {
            for (let i = 0; i < snapshot.length; i++) {
                if (mouseX < snapshot[i].centerX) return i;
            }
            return itemCount;
        },

        calculateTransform: (index, targetSlot, originalIndex, isDragging) => {
            if (targetSlot === null) return { x: 0, y: 0 };

            if (isDragging && originalIndex !== -1) {
                if (index === originalIndex) return { x: 0, y: 0 };
                if (targetSlot === originalIndex || targetSlot === originalIndex + 1) {
                    return { x: 0, y: 0 };
                }
                if (originalIndex < targetSlot) {
                    if (index > originalIndex && index < targetSlot) return { x: -cellSize, y: 0 };
                } else if (originalIndex > targetSlot) {
                    if (index >= targetSlot && index < originalIndex) return { x: cellSize, y: 0 };
                }
            } else if (originalIndex === -1 && index >= targetSlot) {
                return { x: cellSize, y: 0 };
            }
            return { x: 0, y: 0 };
        },
    };
};

/** 网格布局策略 (Folder) */
export const createGridStrategy = (columns: number = 4): DragStrategy => {
    const itemSize = 64;
    const gap = 8;
    const cellSize = itemSize + gap;
    const padding = 8;

    const calculateZShapedOffset = (origIdx: number, visIdx: number): Position => {
        if (origIdx === visIdx) return { x: 0, y: 0 };
        const curCol = origIdx % columns;
        const curRow = Math.floor(origIdx / columns);
        const tgtCol = visIdx % columns;
        const tgtRow = Math.floor(visIdx / columns);
        return {
            x: (tgtCol - curCol) * cellSize,
            y: (tgtRow - curRow) * cellSize,
        };
    };

    return {
        layoutConfig: { type: 'grid', columns, cellSize, padding, hysteresisThreshold: 15 },

        calculatePlaceholder: (mouseX, mouseY, snapshot, itemCount, containerRect) =>
            calculateFolderDropIndex(mouseX, mouseY, snapshot, itemCount, containerRect || null),

        calculateTransform: (index, targetSlot, originalIndex, isDragging) => {
            if (targetSlot === null) return { x: 0, y: 0 };

            // 外部拖入
            if (originalIndex === -1) {
                if (index >= targetSlot) return calculateZShapedOffset(index, index + 1);
                return { x: 0, y: 0 };
            }

            // 内部拖拽
            if (isDragging && originalIndex !== -1) {
                if (index === originalIndex) return { x: 0, y: 0 };
                if (originalIndex > targetSlot) {
                    if (index >= targetSlot && index < originalIndex) {
                        return calculateZShapedOffset(index, index + 1);
                    }
                } else if (originalIndex < targetSlot) {
                    if (index > originalIndex && index <= targetSlot) {
                        return calculateZShapedOffset(index, index - 1);
                    }
                }
            }
            return { x: 0, y: 0 };
        },

        isOutsideContainer: (mouseX, mouseY, containerRect) => {
            const buffer = 10;
            return !isPointInRect(mouseX, mouseY, containerRect, buffer);
        },
    };
};

// ============================================================================
// mousedown 通用处理
// ============================================================================

/**
 * 创建通用的 mousedown 处理逻辑
 */
export const createMouseDownHandler = <T extends BaseDragState>(
    options: MouseDownHandlerOptions<T>,
    hasMovedRef: React.MutableRefObject<boolean>,
    thresholdListenerRef: React.MutableRefObject<((e: MouseEvent) => void) | null>
): void => {
    const {
        isEditMode, item, index, event,
        setDragState, handleMouseMove, handleMouseUp, createDragState,
    } = options;

    if (!isEditMode) return;

    event.preventDefault();
    hasMovedRef.current = false;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const startX = event.clientX;
    const startY = event.clientY;

    let dragDataSet = false;

    const moveThresholdCheck = (moveEvent: MouseEvent) => {
        const dist = calculateDistance(moveEvent.clientX, moveEvent.clientY, startX, startY);
        if (dist > MOVE_THRESHOLD) {
            hasMovedRef.current = true;
            if (!dragDataSet) {
                dragDataSet = true;
                setDragState(createDragState(item, index, rect, startX, startY, offset));
                if (options.onDragStart) options.onDragStart(item);
            }
            window.removeEventListener('mousemove', moveThresholdCheck);
            thresholdListenerRef.current = null;
            window.addEventListener('mousemove', handleMouseMove);
        }
    };

    const cleanupMouseUp = () => {
        window.removeEventListener('mousemove', moveThresholdCheck);
        window.removeEventListener('mouseup', cleanupMouseUp);
        thresholdListenerRef.current = null;
        hasMovedRef.current = false;
        if (!dragDataSet) return;
        handleMouseUp();
    };

    thresholdListenerRef.current = moveThresholdCheck;
    window.addEventListener('mousemove', moveThresholdCheck);
    window.addEventListener('mouseup', cleanupMouseUp);
};
