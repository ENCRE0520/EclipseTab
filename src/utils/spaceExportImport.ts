/**
 * Space 导入/导出工具函数
 * 处理空间的 JSON 导出和导入功能
 */

import { Space, DockItem } from '../types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导出文件的 JSON 结构
 */
export interface SpaceExportData {
    version: string;
    type: 'eclipse-space-export';
    data: {
        name: string;
        iconType: Space['iconType'];
        iconValue?: string;
        apps: ExportedDockItem[];
    };
}

/**
 * 导出的 DockItem 结构 (不含 id，导入时重新生成)
 */
interface ExportedDockItem {
    title: string;
    url?: string;
    icon?: string;
    type: 'app' | 'folder';
    children?: ExportedDockItem[];
}

// ============================================================================
// 导出功能
// ============================================================================

/**
 * 将 DockItem 转换为导出格式
 */
function convertToExportItem(item: DockItem): ExportedDockItem {
    const exported: ExportedDockItem = {
        title: item.name,
        type: item.type,
    };

    if (item.url) {
        exported.url = item.url;
    }

    if (item.icon) {
        exported.icon = item.icon;
    }

    if (item.type === 'folder' && item.items) {
        exported.children = item.items.map(convertToExportItem);
    }

    return exported;
}

/**
 * 导出空间到 JSON 文件并触发下载
 */
export function exportSpaceToFile(space: Space): void {
    // 构建导出数据
    const exportData: SpaceExportData = {
        version: '1.0',
        type: 'eclipse-space-export',
        data: {
            name: space.name,
            iconType: space.iconType,
            iconValue: space.iconValue,
            apps: space.apps.map(convertToExportItem),
        },
    };

    // 序列化为 JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 生成文件名: eclipse-space-{name}-{date}.json
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = space.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `eclipse-space-${safeName}-${date}.json`;

    // 触发下载
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// 导入功能
// ============================================================================

/**
 * 校验导出文件格式
 */
function validateExportData(data: unknown): data is SpaceExportData {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const obj = data as Record<string, unknown>;

    // 检查必要字段
    if (obj.type !== 'eclipse-space-export') {
        return false;
    }

    if (!obj.data || typeof obj.data !== 'object') {
        return false;
    }

    const spaceData = obj.data as Record<string, unknown>;

    if (typeof spaceData.name !== 'string' || !spaceData.name) {
        return false;
    }

    if (!Array.isArray(spaceData.apps)) {
        return false;
    }

    return true;
}

/**
 * 解析并验证导入文件
 */
export async function parseAndValidateSpaceFile(file: File): Promise<SpaceExportData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                if (!validateExportData(data)) {
                    reject(new Error('Invalid file format: missing required fields'));
                    return;
                }

                resolve(data);
            } catch {
                reject(new Error('Invalid JSON file'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * 将导出的 DockItem 转换回内部格式，生成新 ID
 */
function convertFromExportItem(item: ExportedDockItem): DockItem {
    const dockItem: DockItem = {
        id: crypto.randomUUID(),
        name: item.title,
        type: item.type,
    };

    if (item.url) {
        dockItem.url = item.url;
    }

    if (item.icon) {
        dockItem.icon = item.icon;
    }

    if (item.type === 'folder' && item.children) {
        dockItem.items = item.children.map(convertFromExportItem);
    }

    return dockItem;
}

/**
 * 生成不重复的空间名称
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
    if (!existingNames.includes(baseName)) {
        return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;

    while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }

    return newName;
}

/**
 * 从导入数据创建新的 Space 对象
 */
export function createSpaceFromImport(
    data: SpaceExportData,
    existingSpaces: Space[]
): Space {
    const existingNames = existingSpaces.map(s => s.name);
    const uniqueName = generateUniqueName(data.data.name, existingNames);

    return {
        id: crypto.randomUUID(),
        name: uniqueName,
        iconType: data.data.iconType || 'text',
        iconValue: data.data.iconValue,
        apps: data.data.apps.map(convertFromExportItem),
        createdAt: Date.now(),
    };
}
