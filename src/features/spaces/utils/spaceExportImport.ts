/**
 * Space 导入/导出工具函数
 * 处理空间的 JSON 导出和导入功能
 */

import { Space, DockItem } from '@/shared/types';
import { compressIcon, compressIconsInItems } from '@/features/theme/utils/imageCompression';

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
 * 多空间导出文件的 JSON 结构
 */
export interface MultiSpaceExportData {
    version: string;
    type: 'eclipse-multi-space-export';
    data: {
        spaces: Array<{
            name: string;
            iconType: Space['iconType'];
            iconValue?: string;
            apps: ExportedDockItem[];
        }>;
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
 * 将 DockItem 转换为导出格式（异步版，压缩图标）
 */
async function convertToExportItemAsync(item: DockItem): Promise<ExportedDockItem> {
    const exported: ExportedDockItem = {
        title: item.name,
        type: item.type,
    };

    if (item.url) {
        exported.url = item.url;
    }

    // 压缩图标到 500x500 WebP
    if (item.icon) {
        exported.icon = await compressIcon(item.icon);
    }

    if (item.type === 'folder' && item.items) {
        exported.children = await Promise.all(
            item.items.map(convertToExportItemAsync)
        );
    }

    return exported;
}

/**
 * 导出空间到 JSON 文件并触发下载
 * 导出时会压缩所有图标到 500x500 以减小文件体积
 */
export async function exportSpaceToFile(space: Space): Promise<void> {
    // 压缩并转换所有 apps
    const compressedApps = await Promise.all(
        space.apps.map(convertToExportItemAsync)
    );

    // 构建导出数据
    const exportData: SpaceExportData = {
        version: '1.0',
        type: 'eclipse-space-export',
        data: {
            name: space.name,
            iconType: space.iconType,
            iconValue: space.iconValue,
            apps: compressedApps,
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

/**
 * 导出所有空间到 JSON 文件并触发下载
 * 导出时会压缩所有图标到 500x500 以减小文件体积
 */
export async function exportAllSpacesToFile(spaces: Space[]): Promise<void> {
    // 转换所有空间的 apps
    const spacesData = await Promise.all(
        spaces.map(async (space) => {
            const compressedApps = await Promise.all(
                space.apps.map(convertToExportItemAsync)
            );
            return {
                name: space.name,
                iconType: space.iconType,
                iconValue: space.iconValue,
                apps: compressedApps,
            };
        })
    );

    // 构建导出数据
    const exportData: MultiSpaceExportData = {
        version: '1.0',
        type: 'eclipse-multi-space-export',
        data: {
            spaces: spacesData,
        },
    };

    // 序列化为 JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 生成文件名: eclipse-all-spaces-{date}.json
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `eclipse-all-spaces-${date}.json`;

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
 * 校验多空间导出文件格式
 */
function validateMultiSpaceExportData(data: unknown): data is MultiSpaceExportData {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const obj = data as Record<string, unknown>;

    // 检查必要字段
    if (obj.type !== 'eclipse-multi-space-export') {
        return false;
    }

    if (!obj.data || typeof obj.data !== 'object') {
        return false;
    }

    const multiData = obj.data as Record<string, unknown>;

    if (!Array.isArray(multiData.spaces) || multiData.spaces.length === 0) {
        return false;
    }

    // 验证每个空间的基本结构
    for (const space of multiData.spaces) {
        if (!space || typeof space !== 'object') {
            return false;
        }
        const spaceObj = space as Record<string, unknown>;
        if (typeof spaceObj.name !== 'string' || !spaceObj.name) {
            return false;
        }
        if (!Array.isArray(spaceObj.apps)) {
            return false;
        }
    }

    return true;
}

/**
 * 导入文件的解析结果类型
 */
export type ImportFileResult =
    | { type: 'single'; data: SpaceExportData }
    | { type: 'multi'; data: MultiSpaceExportData };

/**
 * 解析并验证导入文件（支持单空间和多空间格式）
 */
export async function parseAndValidateImportFile(file: File): Promise<ImportFileResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                // 尝试验证多空间格式
                if (validateMultiSpaceExportData(data)) {
                    resolve({ type: 'multi', data });
                    return;
                }

                // 尝试验证单空间格式
                if (validateExportData(data)) {
                    resolve({ type: 'single', data });
                    return;
                }

                reject(new Error('Invalid file format: missing required fields'));
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
 * 导入时会压缩所有图标到 500x500 以减少存储占用
 */
export async function createSpaceFromImport(
    data: SpaceExportData,
    existingSpaces: Space[]
): Promise<Space> {
    const existingNames = existingSpaces.map(s => s.name);
    const uniqueName = generateUniqueName(data.data.name, existingNames);

    // 转换并压缩图标
    const convertedApps = data.data.apps.map(convertFromExportItem);
    const compressedApps = await compressIconsInItems(convertedApps);

    return {
        id: crypto.randomUUID(),
        name: uniqueName,
        iconType: data.data.iconType || 'text',
        iconValue: data.data.iconValue,
        apps: compressedApps,
        createdAt: Date.now(),
    };
}

/**
 * 从多空间导入数据创建多个 Space 对象
 * 导入时会压缩所有图标到 500x500 以减少存储占用
 */
export async function createSpacesFromMultiImport(
    data: MultiSpaceExportData,
    existingSpaces: Space[]
): Promise<Space[]> {
    const existingNames = existingSpaces.map(s => s.name);
    const newSpaces: Space[] = [];

    for (const spaceData of data.data.spaces) {
        // 生成唯一名称（考虑已存在的空间和本次导入中已创建的空间）
        const allExistingNames = [...existingNames, ...newSpaces.map(s => s.name)];
        const uniqueName = generateUniqueName(spaceData.name, allExistingNames);

        // 转换并压缩图标
        const convertedApps = spaceData.apps.map(convertFromExportItem);
        const compressedApps = await compressIconsInItems(convertedApps);

        newSpaces.push({
            id: crypto.randomUUID(),
            name: uniqueName,
            iconType: spaceData.iconType || 'text',
            iconValue: spaceData.iconValue,
            apps: compressedApps,
            createdAt: Date.now(),
        });
    }

    return newSpaces;
}

