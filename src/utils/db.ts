export const DB_NAME = 'EclipseTabDB';
export const STORE_NAME = 'wallpapers';
export const STICKER_IMAGES_STORE = 'sticker_images';
const DB_VERSION = 2;

export interface WallpaperItem {
    id: string;
    data: Blob;
    thumbnail?: Blob;
    createdAt: number;
}

export interface StickerImageItem {
    id: string;
    data: Blob;
}

interface DBWrapper {
    // 壁纸操作
    save: (item: WallpaperItem) => Promise<string>;
    saveMultiple: (items: WallpaperItem[]) => Promise<string[]>;
    get: (id: string) => Promise<WallpaperItem | null>;
    remove: (id: string) => Promise<void>;
    removeMultiple: (ids: string[]) => Promise<void>;
    getAll: () => Promise<WallpaperItem[]>;
    // 贴纸图片操作
    saveStickerImage: (item: StickerImageItem) => Promise<string>;
    getStickerImage: (id: string) => Promise<StickerImageItem | null>;
    removeStickerImage: (id: string) => Promise<void>;
    removeStickerImages: (ids: string[]) => Promise<void>;
}

class IndexedDBWrapper implements DBWrapper {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                if (typeof window === 'undefined' || !window.indexedDB) {
                    reject(new Error('IndexedDB is not supported'));
                    return;
                }

                try {
                    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                    request.onerror = (event) => {
                        this.dbPromise = null;
                        // Handle privacy mode restrictions (SecurityError)
                        const error = (event.target as IDBOpenDBRequest).error;
                        console.error('IndexedDB open error:', error);
                        reject(error || new Error('Failed to open IndexedDB'));
                    };

                    request.onsuccess = () => resolve(request.result);

                    request.onupgradeneeded = (event) => {
                        const db = (event.target as IDBOpenDBRequest).result;
                        // v1: 创建 wallpapers store
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        }
                        // v2: 创建 sticker_images store
                        if (!db.objectStoreNames.contains(STICKER_IMAGES_STORE)) {
                            db.createObjectStore(STICKER_IMAGES_STORE, { keyPath: 'id' });
                        }
                    };
                } catch (e) {
                    this.dbPromise = null;
                    reject(e);
                }
            });
        }
        return this.dbPromise;
    }

    // ========================================================================
    // 壁纸操作
    // ========================================================================

    async save(item: WallpaperItem): Promise<string> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(item);

                request.onsuccess = () => resolve(item.id);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB Save Error:', error);
            throw error;
        }
    }

    // ========================================================================
    // 性能优化: 批量操作使用单个事务，减少事务开销
    // ========================================================================

    async saveMultiple(items: WallpaperItem[]): Promise<string[]> {
        if (items.length === 0) return [];

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const ids: string[] = [];

                // 在单个事务中执行所有写入操作
                items.forEach(item => {
                    store.put(item);
                    ids.push(item.id);
                });

                transaction.oncomplete = () => resolve(ids);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('DB SaveMultiple Error:', error);
            throw error;
        }
    }

    async get(id: string): Promise<WallpaperItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB Get Error:', error);
            return null;
        }
    }

    async remove(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB Remove Error:', error);
            throw error;
        }
    }

    async removeMultiple(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                // 在单个事务中执行所有删除操作
                ids.forEach(id => {
                    store.delete(id);
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('DB RemoveMultiple Error:', error);
            throw error;
        }
    }

    async getAll(): Promise<WallpaperItem[]> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetAll Error:', error);
            return [];
        }
    }

    // ========================================================================
    // 贴纸图片操作
    // ========================================================================

    async saveStickerImage(item: StickerImageItem): Promise<string> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.put(item);

                request.onsuccess = () => resolve(item.id);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB SaveStickerImage Error:', error);
            throw error;
        }
    }

    async getStickerImage(id: string): Promise<StickerImageItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readonly');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetStickerImage Error:', error);
            return null;
        }
    }

    async removeStickerImage(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB RemoveStickerImage Error:', error);
            throw error;
        }
    }

    async removeStickerImages(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);

                ids.forEach(id => {
                    store.delete(id);
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('DB RemoveStickerImages Error:', error);
            throw error;
        }
    }
}

export const db = new IndexedDBWrapper();
