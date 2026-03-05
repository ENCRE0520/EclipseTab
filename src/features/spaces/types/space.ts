/**
 * Space 相关类型定义
 * Focus Spaces 多空间系统的核心数据模型
 */

import { DockItem } from '@/features/dock/types/dock';

/**
 * 单个空间定义
 */
export interface Space {
    /** 唯一标识符 (UUID) */
    id: string;

    /** 显示名称，建议大写英文如 WORK, LIFE, GAME */
    name: string;

    /** 图标类型: 纯文本取首字母 | emoji | 自定义图标 */
    iconType: 'text' | 'emoji' | 'icon';

    /** 图标值: emoji 字符或图标名称 (iconType 为 text 时可选) */
    iconValue?: string;

    /** 该空间下的应用/文件夹列表 */
    apps: DockItem[];

    /** 创建时间戳 (ms) */
    createdAt: number;
}

/**
 * 空间持久化状态
 */
export interface SpacesState {
    /** 空间列表 */
    spaces: Space[];

    /** 当前激活空间 ID */
    activeSpaceId: string;

    /** 数据版本号，用于迁移 */
    version: number;
}

/**
 * 创建默认空间
 */
export function createDefaultSpace(name: string = 'Main', apps: DockItem[] = []): Space {
    return {
        id: crypto.randomUUID(),
        name,
        iconType: 'text',
        apps,
        createdAt: Date.now(),
    };
}

/**
 * 创建默认空间状态
 * Main 空间初始为空（DockContext 会填充默认应用并自动获取图标）
 * Google 空间包含 6 个常用 Google 服务
 */
export function createDefaultSpacesState(initialApps: DockItem[] = []): SpacesState {
    // Create Main space (apps will be filled by DockContext if empty)
    const defaultSpace = createDefaultSpace('Main', initialApps);
    // Create Google space with 6 popular Google services
    const googleSpace = createDefaultSpace('Google', createGoogleApps());

    return {
        spaces: [defaultSpace, googleSpace],
        activeSpaceId: defaultSpace.id,
        version: 1,
    };
}

/**
 * 创建 Google 空间的默认应用列表
 */
function createGoogleApps(): DockItem[] {
    return [
        {
            id: crypto.randomUUID(),
            name: 'Gmail',
            url: 'https://mail.google.com',
            icon: 'https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png',
            type: 'app',
        },
        {
            id: crypto.randomUUID(),
            name: 'Drive',
            url: 'https://drive.google.com',
            icon: 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
            type: 'app',
        },
        {
            id: crypto.randomUUID(),
            name: 'Calendar',
            url: 'https://calendar.google.com',
            icon: 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png',
            type: 'app',
        },
        {
            id: crypto.randomUUID(),
            name: 'Maps',
            url: 'https://maps.google.com',
            icon: 'https://www.google.com/images/branding/product/2x/maps_96dp.png',
            type: 'app',
        },
        {
            id: crypto.randomUUID(),
            name: 'YouTube',
            url: 'https://www.youtube.com',
            icon: 'https://www.youtube.com/s/desktop/f506bd45/img/favicon_144x144.png',
            type: 'app',
        },
        {
            id: crypto.randomUUID(),
            name: 'Photos',
            url: 'https://photos.google.com',
            icon: 'https://ssl.gstatic.com/social/photosui/images/logo/favicon_96.png',
            type: 'app',
        },
    ];
}
