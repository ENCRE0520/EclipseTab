/**
 * 共享的拖拽区域检测工具
 * 确保 Dock 和 Folder 使用完全相同的检测逻辑
 */

// 全局状态：文件夹是否有活动的占位符
let folderHasActivePlaceholder = false;

/**
 * 设置文件夹占位符状态（由 useFolderDragAndDrop 调用）
 */
export const setFolderPlaceholderActive = (active: boolean): void => {
    folderHasActivePlaceholder = active;
};

/**
 * 检查文件夹是否有活动占位符（由 useDragAndDrop 调用）
 */
export const hasFolderActivePlaceholder = (): boolean => {
    return folderHasActivePlaceholder;
};

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
