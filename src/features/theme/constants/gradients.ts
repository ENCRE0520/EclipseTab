export const GRADIENT_PRESETS = [
    {
        id: 'theme-default',
        name: '默认',
        nameEn: 'Default',
        gradient: '#F3F3F3', // 浅色主题默认值
        solid: '#F3F3F3',    // 在组件逻辑中将针对深色主题重写为 #404040
    },
    {
        id: 'gradient-1',
        name: '粉',
        nameEn: 'Pink',
        gradient: 'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
        solid: '#FFF5F7',
        solidDark: '#5C444C',
    },
    {
        id: 'gradient-2',
        name: '蓝',
        nameEn: 'Blue',
        gradient: 'linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)',
        solid: '#F5F9FF',
        solidDark: '#374151',
    },
    {
        id: 'gradient-3',
        name: '绿',
        nameEn: 'Green',
        gradient: 'linear-gradient(to top, #b8cf81ff 0%, #014108ff 100%)',
        solid: '#F1F6EF',
        solidDark: '#354F3F',
    },
    {
        id: 'gradient-4',
        name: '灰',
        nameEn: 'Grey',
        gradient: 'linear-gradient(to top, #6a85b6 0%, #bac8e0 100%)',
        solid: '#F8FAFC',
        solidDark: '#4B5563',
    },
    {
        id: 'gradient-5',
        name: '紫',
        nameEn: 'Purple',
        gradient: 'linear-gradient(to top, #505285 0%, #585e92 12%, #65689f 25%, #7474b0 37%, #7e7ebb 50%, #8389c7 62%, #9795d4 75%, #a2a1dc 87%, #b5aee4 100%)',
        solid: '#F9F5FF',
        solidDark: '#4C3E5C',
    },
    {
        id: 'gradient-6',
        name: '褐',
        nameEn: 'Brown',
        gradient: 'linear-gradient(to top, #bdc2e8 0%, #bdc2e8 1%, #e6dee9 100%)',
        solid: '#EAE6DB',
        solidDark: '#5C4D44',
    },
    {
        id: 'gradient-7',
        name: '橙',
        nameEn: 'Orange',
        gradient: 'linear-gradient(to bottom, #323232 0%, #3F3F3F 40%, #1C1C1C 150%), linear-gradient(to top, rgba(255,255,255,0.40) 0%, rgba(0,0,0,0.25) 200%)',
        solid: '#F2E8DF',
        solidDark: '#5C493D',
    },
    {
        id: 'gradient-8',
        name: '靛',
        nameEn: 'Indigo',
        gradient: 'linear-gradient(to top, #0c3483 0%, #a2b6df 100%, #6b8cce 100%, #a2b6df 100%)',
        solid: '#F5F7FF',
        solidDark: '#3F3F7F',
    },
    {
        id: 'gradient-9',
        name: '黑',
        nameEn: 'Black',
        gradient: 'linear-gradient(-225deg, #473B7B 0%, #3584A7 51%, #30D2BE 100%)',
        solid: '#323232',
        solidDark: '#121212',
    },
] as const;

export interface GradientPreset {
    readonly id: string;
    readonly name: string;
    readonly nameEn: string;
    readonly gradient: string;
    readonly solid: string;
    readonly solidDark?: string;
    readonly blendMode?: string;
}

export type GradientPresetType = typeof GRADIENT_PRESETS[number];
