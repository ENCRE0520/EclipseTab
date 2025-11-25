export const GRADIENT_PRESETS = [
    {
        id: 'default',
        name: '默认蓝色',
        gradient: 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #8BA9D4 100%)',
    },
    {
        id: 'sunset',
        name: '日落橙',
        gradient: 'linear-gradient(180deg, #1a0505 0%, #4a1a0a 25%, #d4682c 65%, #f4a460 100%)',
    },
    {
        id: 'forest',
        name: '森林绿',
        gradient: 'linear-gradient(180deg, #0a1a0a 0%, #1a3a1a 25%, #2d6e4a 65%, #5a9e7a 100%)',
    },
    {
        id: 'purple',
        name: '紫罗兰',
        gradient: 'linear-gradient(180deg, #1a0a1a 0%, #3a1a3a 25%, #6a4a8a 65%, #9a7aba 100%)',
    },
    {
        id: 'ocean',
        name: '海洋蓝',
        gradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a2a4a 25%, #2a5a8a 65%, #5a8aba 100%)',
    },
    {
        id: 'rose',
        name: '玫瑰粉',
        gradient: 'linear-gradient(180deg, #1a0510 0%, #3a1a2a 25%, #8a4a6a 65%, #ba7a9a 100%)',
    },
] as const;

export type GradientPreset = typeof GRADIENT_PRESETS[number];
