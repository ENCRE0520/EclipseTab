import { useState, useEffect } from 'react';

/**
 * Hook to detect and listen to system theme preference changes
 * @returns current system theme preference ('light' | 'dark')
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

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            // Legacy browsers
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    return systemTheme;
};
