import packageInfo from '../../../package.json';
import { FAVICON_PREFIX, getDomainFromRef } from '@/features/dock/utils/iconCache';
import { DockItem, Sticker } from '@/shared/types';
import { db, FaviconItem, WallpaperItem } from './db';
import { storage } from './storage';

export type SnapshotOptions = {
  includeWallpaper?: boolean;
  includeStickers?: boolean;
  includeFavicons?: boolean;
};

type AssetRef = {
  path: string;
  type: string;
};

export type FaviconAssetRef = AssetRef & {
  domain: string;
  isFallback: boolean;
  iconSmall?: boolean;
  lastUpdated?: number;
};

export type StickerImageAssetRef = AssetRef & {
  id: string;
};

export type WallpaperAssetRef = AssetRef & {
  id: string;
  createdAt: number;
  wallpaperType?: 'image' | 'video';
  thumbnailPath?: string;
  thumbnailType?: string;
};

export type SnapshotManifest = {
  type: 'eclipse-tab-snapshot';
  version: 2;
  appVersion: string;
  exportedAt: string;
  lastUpdated: number;
  deviceName: string;
  assets: {
    favicons: FaviconAssetRef[];
    stickerImages: StickerImageAssetRef[];
    wallpapers: WallpaperAssetRef[];
  };
};

export type SnapshotData = {
  spaces: ReturnType<typeof storage.getSpaces>;
  config: ReturnType<typeof storage.getConfig>;
  searchEngine: ReturnType<typeof storage.getSearchEngine>;
  wallpaperId: string | null;
  language: string | null;
  stickers: Sticker[];
  deletedStickers: Sticker[];
  stickerImagesMigrated: boolean;
};

export type SnapshotPackage = {
  manifest: SnapshotManifest;
  data: SnapshotData;
  assets: { path: string; blob: Blob }[];
};

type LegacySyncData = {
  version: number;
  lastUpdated: number;
  deviceName?: string;
  assets?: {
    wallpapers?: string[];
    stickers?: string[];
  };
  data: {
    config: ReturnType<typeof storage.getConfig>;
    dockItems?: DockItem[];
    searchEngine: ReturnType<typeof storage.getSearchEngine>;
    spaces: ReturnType<typeof storage.getSpaces>;
    stickers: Sticker[];
    deletedStickers: Sticker[];
    wallpaperId: string | null;
  };
};

const extensionFromType = (type: string, fallback = 'bin'): string => {
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('webm')) return 'webm';
  if (type.includes('icon')) return 'ico';
  return fallback;
};

const safeName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

function getDeviceName(): string {
  try {
    const saved = localStorage.getItem('EclipseTab_deviceName');
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 'Unknown Device';
}

const collectFaviconDomains = (items: DockItem[], domains = new Set<string>()): Set<string> => {
  for (const item of items) {
    if (item.icon?.startsWith(FAVICON_PREFIX)) domains.add(getDomainFromRef(item.icon));
    if (item.type === 'folder' && item.items) collectFaviconDomains(item.items, domains);
  }
  return domains;
};

const collectStickerImageIds = (stickers: Sticker[], ids = new Set<string>()): Set<string> => {
  for (const sticker of stickers) {
    if (sticker.type === 'image' && sticker.content && !sticker.content.startsWith('data:')) {
      ids.add(sticker.content);
    }
  }
  return ids;
};

export async function createSnapshot(options: SnapshotOptions = {}): Promise<SnapshotPackage> {
  const includeWallpaper = options.includeWallpaper ?? true;
  const includeStickers = options.includeStickers ?? true;
  const includeFavicons = options.includeFavicons ?? true;
  const spaces = storage.getSpaces();
  const stickers = storage.getStickers();
  const deletedStickers = storage.getDeletedStickers();
  const assets: SnapshotPackage['assets'] = [];
  const faviconAssets: FaviconAssetRef[] = [];
  const stickerImageAssets: StickerImageAssetRef[] = [];
  const wallpaperAssets: WallpaperAssetRef[] = [];

  if (includeFavicons) {
    const domains = new Set<string>();
    for (const space of spaces.spaces) collectFaviconDomains(space.apps, domains);
    for (const domain of domains) {
      const item = await db.getFavicon(domain);
      if (!item?.data) continue;
      const path = `assets/favicons/${safeName(domain)}.${extensionFromType(item.data.type, 'ico')}`;
      assets.push({ path, blob: item.data });
      faviconAssets.push({
        path,
        domain,
        type: item.data.type || 'image/png',
        isFallback: item.isFallback,
        iconSmall: item.iconSmall,
        lastUpdated: item.lastUpdated,
      });
    }
  }

  if (includeStickers) {
    const ids = collectStickerImageIds(stickers);
    collectStickerImageIds(deletedStickers, ids);
    for (const id of ids) {
      const item = await db.getStickerImage(id);
      if (!item?.data) continue;
      const path = `assets/stickers/${safeName(id)}.${extensionFromType(item.data.type, 'png')}`;
      assets.push({ path, blob: item.data });
      stickerImageAssets.push({ path, id, type: item.data.type || 'image/png' });
    }
  }

  if (includeWallpaper) {
    for (const item of await db.getAll()) {
      if (!item.data) continue;
      const path = `assets/wallpapers/${safeName(item.id)}.${extensionFromType(item.data.type, item.type === 'video' ? 'mp4' : 'png')}`;
      assets.push({ path, blob: item.data });
      let thumbnailPath: string | undefined;
      let thumbnailType: string | undefined;
      if (item.thumbnail) {
        thumbnailType = item.thumbnail.type || 'image/png';
        thumbnailPath = `assets/wallpapers/${safeName(item.id)}-thumb.${extensionFromType(thumbnailType, 'png')}`;
        assets.push({ path: thumbnailPath, blob: item.thumbnail });
      }
      wallpaperAssets.push({
        path,
        id: item.id,
        type: item.data.type || 'application/octet-stream',
        createdAt: item.createdAt,
        wallpaperType: item.type,
        thumbnailPath,
        thumbnailType,
      });
    }
  }

  const lastUpdated = Date.now();
  return {
    manifest: {
      type: 'eclipse-tab-snapshot',
      version: 2,
      appVersion: packageInfo.version,
      exportedAt: new Date(lastUpdated).toISOString(),
      lastUpdated,
      deviceName: getDeviceName(),
      assets: {
        favicons: faviconAssets,
        stickerImages: stickerImageAssets,
        wallpapers: wallpaperAssets,
      },
    },
    data: {
      spaces,
      config: storage.getConfig(),
      searchEngine: storage.getSearchEngine(),
      wallpaperId: storage.getWallpaperId(),
      language: localStorage.getItem('app_language'),
      stickers,
      deletedStickers,
      stickerImagesMigrated: storage.isStickerImagesMigrated(),
    },
    assets,
  };
}

export async function applySnapshot(snapshot: SnapshotPackage, clearAssets = true): Promise<void> {
  if (snapshot.manifest.type !== 'eclipse-tab-snapshot' || snapshot.manifest.version !== 2) {
    throw new Error('Unsupported snapshot');
  }
  if (!snapshot.data.spaces?.spaces || !Array.isArray(snapshot.data.spaces.spaces)) {
    throw new Error('Invalid snapshot data');
  }

  const blobs = new Map(snapshot.assets.map(asset => [asset.path, asset.blob]));

  if (clearAssets) {
    await db.clearAllFavicons();
    await db.clearAllStickerImages();
    const oldWallpapers = await db.getAll();
    if (oldWallpapers.length > 0) await db.removeMultiple(oldWallpapers.map(item => item.id));
  }

  for (const asset of snapshot.manifest.assets.favicons || []) {
    const blob = blobs.get(asset.path);
    if (!blob) continue;
    const item: FaviconItem = {
      domain: asset.domain,
      data: blob,
      isFallback: asset.isFallback,
      iconSmall: asset.iconSmall,
      lastUpdated: asset.lastUpdated,
    };
    await db.saveFavicon(item);
  }

  for (const asset of snapshot.manifest.assets.stickerImages || []) {
    const blob = blobs.get(asset.path);
    if (blob) await db.saveStickerImage({ id: asset.id, data: blob });
  }

  for (const asset of snapshot.manifest.assets.wallpapers || []) {
    const blob = blobs.get(asset.path);
    if (!blob) continue;
    const thumbnail = asset.thumbnailPath ? blobs.get(asset.thumbnailPath) : undefined;
    const item: WallpaperItem = {
      id: asset.id,
      data: blob,
      thumbnail,
      createdAt: asset.createdAt || Date.now(),
      type: asset.wallpaperType,
    };
    await db.save(item);
  }

  storage.saveSpaces(snapshot.data.spaces);
  storage.saveConfig(snapshot.data.config);
  storage.saveWallpaperId(snapshot.data.wallpaperId || null);
  storage.saveStickers(snapshot.data.stickers || []);
  storage.saveDeletedStickers(snapshot.data.deletedStickers || []);

  if (snapshot.data.searchEngine) storage.saveSearchEngine(snapshot.data.searchEngine);
  else localStorage.removeItem('EclipseTab_searchEngine');

  if (snapshot.data.language === 'en' || snapshot.data.language === 'zh') {
    localStorage.setItem('app_language', snapshot.data.language);
  }
  if (snapshot.data.stickerImagesMigrated) storage.markStickerImagesMigrated();
}

export function snapshotFromLegacySync(syncData: LegacySyncData): SnapshotPackage {
  const wallpaperAssets = (syncData.assets?.wallpapers || []).map(id => ({
    id,
    path: `assets/wallpapers/${safeName(id)}`,
    type: 'application/octet-stream',
    createdAt: Date.now(),
  }));
  const stickerImageAssets = (syncData.assets?.stickers || []).map(id => ({
    id,
    path: `assets/stickers/${safeName(id)}`,
    type: 'image/png',
  }));

  return {
    manifest: {
      type: 'eclipse-tab-snapshot',
      version: 2,
      appVersion: packageInfo.version,
      exportedAt: new Date(syncData.lastUpdated || Date.now()).toISOString(),
      lastUpdated: syncData.lastUpdated || Date.now(),
      deviceName: syncData.deviceName || 'Unknown Device',
      assets: {
        favicons: [],
        stickerImages: stickerImageAssets,
        wallpapers: wallpaperAssets,
      },
    },
    data: {
      spaces: syncData.data.spaces,
      config: syncData.data.config,
      searchEngine: syncData.data.searchEngine,
      wallpaperId: syncData.data.wallpaperId,
      language: null,
      stickers: syncData.data.stickers || [],
      deletedStickers: syncData.data.deletedStickers || [],
      stickerImagesMigrated: false,
    },
    assets: [],
  };
}

export function isSnapshotManifest(value: unknown): value is SnapshotManifest {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as SnapshotManifest).type === 'eclipse-tab-snapshot' &&
    (value as SnapshotManifest).version === 2
  );
}

export function getSnapshotAssetRefs(manifest: SnapshotManifest): { path: string; type: string }[] {
  return [
    ...manifest.assets.favicons,
    ...manifest.assets.stickerImages,
    ...manifest.assets.wallpapers,
    ...manifest.assets.wallpapers
      .filter(asset => asset.thumbnailPath)
      .map(asset => ({ path: asset.thumbnailPath!, type: asset.thumbnailType || 'image/png' })),
  ];
}
