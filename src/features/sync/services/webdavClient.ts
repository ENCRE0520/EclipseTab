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
const SYNC_FILENAME = 'eclipse_tab_backup.json';
const ASSETS_PREFIX = 'eclipse_tab_assets/';

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

/** 确保资产子目录存在 */
async function ensureAssetsDir(config: WebDAVConfig): Promise<boolean> {
    try {
        await request(config, `${SYNC_DIR}/${ASSETS_PREFIX.replace(/\/$/, '')}`, { method: 'MKCOL' });
        return true;
    } catch {
        return true;
    }
}

export async function uploadSyncData(config: WebDAVConfig, jsonContent: string): Promise<{ ok: boolean; message: string }> {
    try {
        // 首次上传时确保目录存在
        await ensureSyncDir(config);

        const response = await request(config, `${SYNC_DIR}/${SYNC_FILENAME}`, { method: 'PUT', body: jsonContent, headers: { 'Content-Type': 'application/json' } });
        if (response.ok || response.status === 201 || response.status === 204) return { ok: true, message: 'Upload successful' };
        return { ok: false, message: `Upload failed: ${response.status}` };
    } catch (error) {
        return { ok: false, message: `Upload error: ${String(error)}` };
    }
}

export async function downloadSyncData(config: WebDAVConfig): Promise<{ ok: boolean; data?: string; message: string }> {
    try {
        const response = await request(config, `${SYNC_DIR}/${SYNC_FILENAME}`, { method: 'GET' });
        if (response.ok) {
            const text = await response.text();
            return { ok: true, data: text, message: 'Download successful' };
        }
        if (response.status === 404) return { ok: false, message: 'No backup file found on cloud' };
        return { ok: false, message: `Download failed: ${response.status}` };
    } catch (error) {
        return { ok: false, message: `Download error: ${String(error)}` };
    }
}

export async function uploadAsset(config: WebDAVConfig, assetKey: string, blob: Blob): Promise<boolean> {
    try {
        await ensureAssetsDir(config);
        const path = `${SYNC_DIR}/${ASSETS_PREFIX}${assetKey}`;
        const response = await request(config, path, { method: 'PUT', body: blob });
        return response.ok || response.status === 201 || response.status === 204;
    } catch { return false; }
}

export async function downloadAsset(config: WebDAVConfig, assetKey: string): Promise<Blob | null> {
    try {
        const path = `${SYNC_DIR}/${ASSETS_PREFIX}${assetKey}`;
        const response = await request(config, path, { method: 'GET' });
        if (response.ok) return await response.blob();
        return null;
    } catch { return null; }
}

/** 列出云端所有资产文件名 */
export async function listAssetKeys(config: WebDAVConfig): Promise<string[]> {
    try {
        const dirPath = `${SYNC_DIR}/${ASSETS_PREFIX.replace(/\/$/, '')}`;
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
export async function deleteAsset(config: WebDAVConfig, assetKey: string): Promise<boolean> {
    try {
        const path = `${SYNC_DIR}/${ASSETS_PREFIX}${assetKey}`;
        const response = await request(config, path, { method: 'DELETE' });
        return response.ok || response.status === 204 || response.status === 404;
    } catch { return false; }
}
