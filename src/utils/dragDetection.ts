/**
 * 共享的拖拽区域检测工具
 * 确保 Dock 和 Folder 使用完全相同的检测逻辑
 * 
 * 注意：folderPlaceholderActive 状态已迁移到 DockDragContext
 */

/**
 * 检测鼠标是否在打开的文件夹视图内
 * @param mouseX 鼠标 X 坐标
 * @param mouseY 鼠标 Y 坐标
 * @returns 是否在文件夹视图内
 */
export const isMouseOverFolderView = (mouseX: number, mouseY: number): boolean => {
    const folderViewElement = document.querySelector('[data-folder-view="true"]');
    if (!folderViewElement) return false;

    const rect = folderViewElement.getBoundingClientRect();
    return (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
    );
};

/**
 * 检测鼠标是否在 Dock 区域内（包含缓冲区）
 * @param mouseX 鼠标 X 坐标
 * @param mouseY 鼠标 Y 坐标
 * @param buffer 缓冲区大小（默认 50px）
 * @returns 是否在 Dock 区域内
 */
export const isMouseOverDock = (mouseX: number, mouseY: number, buffer: number = 50): boolean => {
    const dockElement = document.querySelector('[data-dock-container="true"]');
    if (!dockElement) return false;

    const rect = dockElement.getBoundingClientRect();
    return (
        mouseX >= rect.left - buffer &&
        mouseX <= rect.right + buffer &&
        mouseY >= rect.top - buffer &&
        mouseY <= rect.bottom + buffer
    );
};

/**
 * 获取文件夹视图的边界矩形
 * @returns DOMRect 或 null
 */
export const getFolderViewRect = (): DOMRect | null => {
    const folderViewElement = document.querySelector('[data-folder-view="true"]');
    return folderViewElement?.getBoundingClientRect() ?? null;
};

/**
 * 检测点是否在矩形内
 */
export const isMouseOverRect = (
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
