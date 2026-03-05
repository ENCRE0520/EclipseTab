import { useState, useEffect } from 'react';

/**
 * 检测并监听系统主题偏好设置更改的 Hook
 * @returns 当前系统主题偏好 ('light' | 'dark')
 */
export const useSystemTheme = (): 'light' | 'dark' => {
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        // 现代浏览器
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            // 旧版浏览器
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    return systemTheme;
};
