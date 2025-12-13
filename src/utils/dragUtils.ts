/**
 * 拖拽工具函数 - 共享逻辑抽取
 */

import { DockItem } from '../types';
import { MOVE_THRESHOLD } from '../constants/layout';

/**
 * 位置接口
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * 基础拖拽状态接口
 */
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

/**
 * 创建初始拖拽状态
 */
export const createInitialDragState = <T extends BaseDragState>(
    additional: Omit<T, keyof BaseDragState>
): T => {
    return {
        isDragging: false,
        item: null,
        originalIndex: -1,
        currentPosition: { x: 0, y: 0 },
        startPosition: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        isAnimatingReturn: false,
        targetPosition: null,
        ...additional,
    } as T;
};

/**
 * 布局快照项
 */
export interface LayoutItem {
    id: string;
    index: number;
    rect: DOMRect;
    centerX: number;
    centerY: number;
}



/**
 * 重置拖拽状态
 */
export const resetDragState = <T extends BaseDragState>(
    additional: Omit<T, keyof BaseDragState>
): T => {
    return createInitialDragState(additional);
};

/**
 * 计算两点之间的距离
 */
export const calculateDistance = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number => {
    return Math.hypot(x2 - x1, y2 - y1);
};

/**
 * 计算鼠标到元素中心的距离
 */
export const calculateDistanceToCenter = (
    mouseX: number,
    mouseY: number,
    rect: DOMRect
): number => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return calculateDistance(mouseX, mouseY, centerX, centerY);
};

/**
 * 检查点是否在矩形区域内（带可选缓冲区）
 */
export const isPointInRect = (
    x: number,
    y: number,
    rect: DOMRect,
    buffer: number = 0
): boolean => {
    return (
        x >= rect.left - buffer &&
        x <= rect.right + buffer &&
        y >= rect.top - buffer &&
        y <= rect.bottom + buffer
    );
};

/**
 * 查找鼠标位置最近的元素索引
 */
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

/**
 * 根据鼠标X位置计算插入索引
 */
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

            if (mouseX < centerX) {
                return i;
            }
        }
    }
    return itemCount;
};

/**
 * 切换 body 的拖拽 class
 */
export const toggleDraggingClass = (isDragging: boolean): void => {
    if (isDragging) {
        document.body.classList.add('is-dragging');
    } else {
        document.body.classList.remove('is-dragging');
    }
};

/**
 * mousedown 事件处理器配置
 */
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

/**
 * 创建通用的 mousedown 处理逻辑
 * 返回需要在组件中注册的清理函数引用
 */
export const createMouseDownHandler = <T extends BaseDragState>(
    options: MouseDownHandlerOptions<T>,
    hasMovedRef: React.MutableRefObject<boolean>,
    thresholdListenerRef: React.MutableRefObject<((e: MouseEvent) => void) | null>
): void => {
    const {
        isEditMode,
        item,
        index,
        event,
        setDragState,
        handleMouseMove,
        handleMouseUp,
        createDragState,
    } = options;

    if (!isEditMode) return;

    event.preventDefault();
    hasMovedRef.current = false;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };

    const startX = event.clientX;
    const startY = event.clientY;

    let dragDataSet = false;

    const moveThresholdCheck = (moveEvent: MouseEvent) => {
        const dist = calculateDistance(moveEvent.clientX, moveEvent.clientY, startX, startY);
        if (dist > MOVE_THRESHOLD) {
            hasMovedRef.current = true;

            if (!dragDataSet) {
                dragDataSet = true;
                const newState = createDragState(item, index, rect, startX, startY, offset);
                setDragState(newState);

                // 调用 onDragStart 回调 (触发 captureLayoutSnapshot)
                if (options.onDragStart) {
                    options.onDragStart(item);
                }
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

        if (!dragDataSet) {
            return;
        }

        handleMouseUp();
    };

    thresholdListenerRef.current = moveThresholdCheck;
    window.addEventListener('mousemove', moveThresholdCheck);
    window.addEventListener('mouseup', cleanupMouseUp);
};


/**
 * 计算文件夹内的落点索引 (Geometry-based)
 */
export const calculateFolderDropIndex = (
    mouseX: number,
    mouseY: number,
    layoutSnapshot: LayoutItem[],
    itemCount: number,
    containerRect?: DOMRect | null
): number => {
    // 0. 空文件夹处理
    if (layoutSnapshot.length === 0) {
        return 0;
    }

    // 1. 尾部追加检测 (Append Handling)
    // 如果有容器区域，且鼠标位于最后一个元素下方一定距离，或者是容器底部空白区域
    if (containerRect) {
        // 获取最后一个元素
        const lastItem = layoutSnapshot[layoutSnapshot.length - 1];
        // 判定：鼠标Y > 最后元素底部 (宽松判定)
        // 或者 鼠标Y > 容器底部 - 底部Padding区域 (比如最后 40px)
        // 这里简单判定：如果 Y 大于最后一个元素的 bottom，大致就是追加
        if (mouseY > lastItem.rect.bottom) {
            return itemCount;
        }
    }

    // 2. 最近邻检测 (Nearest Neighbor)
    let closestItem: LayoutItem | null = null;
    let minDistance = Infinity;

    for (const item of layoutSnapshot) {
        // 简单欧几里得距离
        const dist = Math.hypot(mouseX - item.centerX, mouseY - item.centerY);
        if (dist < minDistance) {
            minDistance = dist;
            closestItem = item;
        }
    }

    // Fallback
    if (!closestItem) {
        return itemCount;
    }

    // 3. 插入方向判定 (Insertion Direction)
    // 阈值：10px
    const THRESHOLD = 10;
    const { centerX, index } = closestItem;

    // 逻辑：
    // 左侧/上方 -> Target Index
    // 右侧/下方 -> Target Index + 1
    // 这里主要基于 X 轴流动方向判定，辅以阈值防抖
    if (mouseX < centerX + THRESHOLD) {
        return index;
    } else {
        return index + 1;
    }
};

/**
 * 简单的数组重排辅助函数
 */
export const reorderList = <T>(list: T[], startIndex: number, endIndex: number): T[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

