import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSearchSuggestionsResult {
    suggestions: string[];
    isLoading: boolean;
    error: Error | null;
}

/**
 * 搜索建议 API 配置
 * 使用 fetch 调用（需要浏览器扩展权限）
 */
/**
 * 搜索建议 API 配置
 * 使用 fetch 调用（需要浏览器扩展权限）
 */
const SUGGESTION_API = {
    // Google 搜索建议 API (推荐，响应快)
    google: {
        url: 'https://suggestqueries.google.com/complete/search',
        buildUrl: (query: string) =>
            `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
        parseResponse: (data: unknown): string[] => {
            // Google 返回格式: [query, [suggestions], ...]
            if (Array.isArray(data) && Array.isArray(data[1])) {
                return data[1] as string[];
            }
            return [];
        }
    },
    // 百度搜索建议 API (备选)
    baidu: {
        url: 'https://suggestion.baidu.com/su',
        buildUrl: (query: string) =>
            `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&action=opensearch`,
        parseResponse: (data: unknown): string[] => {
            // 百度 opensearch 格式: [query, [suggestions]]
            if (Array.isArray(data) && Array.isArray(data[1])) {
                return data[1] as string[];
            }
            return [];
        }
    }
};

/**
 * 尝试使用 fetch 获取搜索建议
 * 在浏览器扩展环境下，需检查 optional_host_permissions
 */
async function fetchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    // 检查是否有权限 (Chrome Extension 环境)
    // 使用回调函数以此获得最佳兼容性 (Firefox/Edge/Chrome)
    if (typeof chrome !== 'undefined' && chrome.permissions) {
        try {
            const hasPermission = await new Promise<boolean>((resolve) => {
                chrome.permissions.contains({
                    origins: ['https://suggestqueries.google.com/*']
                }, (result) => {
                    // 检查 Chrome runtime.lastError (良好实践，虽然 contains 通常不需要)
                    if (chrome.runtime && chrome.runtime.lastError) {
                        resolve(false);
                    } else {
                        resolve(!!result);
                    }
                });
            });

            if (!hasPermission) return [];
        } catch (e) {
            // 开发环境或 API 不可用
            console.warn('Failed to check permissions:', e);
            return [];
        }
    } else {
        // 开发环境：如果想在本地调试，可以临时返回 true，或者直接允许
        return [];
    }

    // 优先使用 Google API
    try {
        const response = await fetch(SUGGESTION_API.google.buildUrl(trimmedQuery), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal,
        });

        if (response.ok) {
            const data = await response.json();
            const suggestions = SUGGESTION_API.google.parseResponse(data);
            if (suggestions.length > 0) {
                return suggestions;
            }
        }
    } catch (error) {
        // 静默失败
    }

    // 备选：百度 API
    try {
        const response = await fetch(SUGGESTION_API.baidu.buildUrl(trimmedQuery), {
            method: 'GET',
            signal,
        });

        if (response.ok) {
            const data = await response.json();
            return SUGGESTION_API.baidu.parseResponse(data);
        }
    } catch (error) {
        // 静默失败
    }

    return [];
}

/**
 * 搜索建议 Hook
 * 使用 fetch API 获取搜索建议（需要浏览器扩展权限）
 * 
 * 特性:
 * - 300ms 防抖
 * - 竞态条件处理
 * - Google/百度 API 自动降级
 */
export function useSearchSuggestions(query: string): UseSearchSuggestionsResult {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const latestRequestRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchWithDebounce = useCallback(async (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();

        // 如果查询内容为空，清空建议列表
        if (!trimmedQuery) {
            setSuggestions([]);
            setError(null);
            latestRequestRef.current = `cleared_${Date.now()}`;
            return;
        }

        // 跟踪当前请求以处理竞态条件
        const currentRequestId = `req_${Date.now()}`;
        latestRequestRef.current = currentRequestId;

        // 如果存在之前的请求，则将其取消
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const results = await fetchSuggestions(trimmedQuery, abortControllerRef.current?.signal);

            // 仅当这仍然是最新请求时才更新状态
            if (latestRequestRef.current === currentRequestId) {
                // Limit to 10 suggestions
                setSuggestions(results.slice(0, 10));
            }
        } catch (err) {
            if (latestRequestRef.current === currentRequestId) {
                setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'));
                setSuggestions([]);
            }
        } finally {
            if (latestRequestRef.current === currentRequestId) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        // Debounce: 300ms
        const timerId = setTimeout(() => {
            fetchWithDebounce(query);
        }, 300);

        return () => {
            clearTimeout(timerId);
        };
    }, [query, fetchWithDebounce]);

    // 卸载时清理
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return { suggestions, isLoading, error };
}