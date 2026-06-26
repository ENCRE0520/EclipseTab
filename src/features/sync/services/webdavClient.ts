/**
 * WebDAV 客户端
 * 封装 WebDAV 协议的 HTTP 请求：测试连接、上传、下载
 */

export interface WebDAVConfig {
    url: string;
    username: string;
    password: string;
}

function encodeCredentials(username: string, password: string): string {
    return btoa(`${username}:${password}`);
}

async function request(config: WebDAVConfig, path: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = config.url.replace(/\/+$/, '');
    const targetPath = path.replace(/^\//, '');
    const fullUrl = `${baseUrl}/${targetPath}`;
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Basic ${encodeCredentials(config.username, config.password)}`);
    const response = await fetch(fullUrl, { ...options, headers });
    return response;
}

export async function testWebDAVConnection(config: WebDAVConfig): Promise<{ ok: boolean; message: string }> {
    try {
        const baseUrl = config.url.replace(/\/+$/, '');
        const response = await fetch(baseUrl, {
            method: 'PROPFIND',
            headers: {
                'Authorization': `Basic ${encodeCredentials(config.username, config.password)}`,
                'Depth': '0',
            },
        });
        if (response.status === 207 || response.status === 200) return { ok: true, message: 'Connection successful' };
        if (response.status === 401) return { ok: false, message: 'Authentication failed' };
        if (response.status === 404) return { ok: false, message: 'Server URL not found' };
        return { ok: false, message: `Unexpected response: ${response.status}` };
    } catch (error) {
        const msg = error instanceof TypeError ? 'Cannot reach server - check URL and network' : `Connection failed: ${String(error)}`;
        return { ok: false, message: msg };
    }
}

const SYNC_DIR = 'EclipseTab';
export const LEGACY_SYNC_FILENAME = 'eclipse_tab_backup.json';
export const LEGACY_ASSETS_PREFIX = 'eclipse_tab_assets/';
export const SNAPSHOT_DIR = 'snapshot';

/**
 * 确保同步目录存在（MKCOL），如果已存在则忽略错误
 */
async function ensureSyncDir(config: WebDAVConfig): Promise<boolean> {
    try {
        await request(config, SYNC_DIR, { method: 'MKCOL' });
        return true;
    } catch {
        return true;
    }
}

async function ensureDir(config: WebDAVConfig, dir: string): Promise<void> {
    await ensureSyncDir(config);
    const parts = dir.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    let current = SYNC_DIR;
    for (const part of parts) {
        current = `${current}/${part}`;
        try {
            await request(config, current, { method: 'MKCOL' });
        } catch {
            // ignore
        }
    }
}

export async function uploadFile(config: WebDAVConfig, path: string, body: BodyInit, contentType?: string): Promise<{ ok: boolean; message: string }> {
    try {
        const dir = path.split('/').slice(0, -1).join('/');
        if (dir) await ensureDir(config, dir);
        else await ensureSyncDir(config);

        const headers = contentType ? { 'Content-Type': contentType } : undefined;
        const response = await request(config, `${SYNC_DIR}/${path}`, { method: 'PUT', body, headers });
        if (response.ok || response.status === 201 || response.status === 204) return { ok: true, message: 'Upload successful' };
        return { ok: false, message: `Upload failed: ${response.status}` };
    } catch (error) {
        return { ok: false, message: `Upload error: ${String(error)}` };
    }
}

export async function downloadFile(config: WebDAVConfig, path: string): Promise<{ ok: boolean; blob?: Blob; message: string }> {
    try {
        const response = await request(config, `${SYNC_DIR}/${path}`, { method: 'GET' });
        if (response.ok) {
            return { ok: true, blob: await response.blob(), message: 'Download successful' };
        }
        if (response.status === 404) return { ok: false, message: 'No file found on cloud' };
        return { ok: false, message: `Download failed: ${response.status}` };
    } catch (error) {
        return { ok: false, message: `Download error: ${String(error)}` };
    }
}

export async function downloadText(config: WebDAVConfig, path: string): Promise<{ ok: boolean; data?: string; message: string }> {
    const result = await downloadFile(config, path);
    return result.ok && result.blob
        ? { ok: true, data: await result.blob.text(), message: result.message }
        : { ok: false, message: result.message };
}

export async function uploadText(config: WebDAVConfig, path: string, text: string): Promise<{ ok: boolean; message: string }> {
    return uploadFile(config, path, text, 'application/json');
}

/** 列出云端所有资产文件名 */
export async function listFiles(config: WebDAVConfig, dir: string): Promise<string[]> {
    try {
        const dirPath = `${SYNC_DIR}/${dir.replace(/^\/|\/$/g, '')}`;
        const response = await request(config, dirPath, {
            method: 'PROPFIND',
            headers: { 'Depth': '1' },
        });
        if (response.status !== 207 && response.status !== 200) return [];

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        const hrefs = xml.querySelectorAll('D\\:href, href');
        const files: string[] = [];
        hrefs.forEach(el => {
            const href = el.textContent || '';
            const name = href.split('/').pop() || '';
            if (name && !name.endsWith('/')) files.push(name);
        });
        return files;
    } catch { return []; }
}

/** 删除云端资产文件 */
export async function deleteFile(config: WebDAVConfig, path: string): Promise<boolean> {
    try {
        const response = await request(config, `${SYNC_DIR}/${path}`, { method: 'DELETE' });
        return response.ok || response.status === 204 || response.status === 404;
    } catch { return false; }
}
