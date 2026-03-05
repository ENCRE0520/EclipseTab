/**
 * URL 处理工具函数
 */

/**
 * 规范化 URL
 * 如果 URL 缺少协议，默认添加 https://
 * 如果已有协议，保持不变
 */
export const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // 如果以 http://, https://, 或 // 开头，则按原样返回
    if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
    // 否则假设为 https://
    return `https://${trimmed}`;
};

/**
 * 检查字符串是否为有效 URL
 */
export const isValidUrl = (input: string): boolean => {
    try {
        new URL(normalizeUrl(input));
        return true;
    } catch {
        return false;
    }
};

/**
 * 从 URL 中提取域名
 */
export const getDomainFromUrl = (input: string): string => {
    try {
        const url = new URL(normalizeUrl(input));
        return url.hostname;
    } catch {
        return '';
    }
};
