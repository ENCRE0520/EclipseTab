import { createZip, readJsonEntry, readZip, textEntry } from './zip';
import { applySnapshot, createSnapshot, isSnapshotManifest, SnapshotData, SnapshotManifest, SnapshotPackage } from './snapshot';

type LegacyBackupManifest = {
  type: 'eclipse-tab-backup';
  version: 1;
  appVersion: string;
  exportedAt: string;
};

type LegacyBackupData = SnapshotData & {
  assets?: {
    favicons?: Array<SnapshotManifest['assets']['favicons'][number]>;
    stickerImages?: Array<SnapshotManifest['assets']['stickerImages'][number]>;
    wallpaper?: SnapshotManifest['assets']['wallpapers'][number] | null;
  };
};

const blobToBytes = async (blob: Blob): Promise<Uint8Array> => new Uint8Array(await blob.arrayBuffer());

const bytesToBlob = (bytes: Uint8Array, type = 'application/octet-stream'): Blob => {
  const part = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([part], { type });
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function allAssetRefs(manifest: SnapshotManifest) {
  return [
    ...manifest.assets.favicons,
    ...manifest.assets.stickerImages,
    ...manifest.assets.wallpapers,
    ...manifest.assets.wallpapers
      .filter(asset => asset.thumbnailPath)
      .map(asset => ({ path: asset.thumbnailPath!, type: asset.thumbnailType || 'image/png' })),
  ];
}

export async function exportFullBackup(): Promise<void> {
  const snapshot = await createSnapshot();
  const zip = createZip([
    textEntry('manifest.json', snapshot.manifest),
    textEntry('data.json', snapshot.data),
    ...await Promise.all(snapshot.assets.map(async asset => ({
      path: asset.path,
      data: await blobToBytes(asset.blob),
    }))),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(zip, `eclipse-tab-backup-${date}.zip`);
}

export async function importFullBackup(file: File): Promise<void> {
  const entries = await readZip(file);
  const manifest = readJsonEntry<SnapshotManifest | LegacyBackupManifest>(entries, 'manifest.json');

  if (isSnapshotManifest(manifest)) {
    const data = readJsonEntry<SnapshotData>(entries, 'data.json');
    const assets = allAssetRefs(manifest)
      .map(asset => {
        const bytes = entries.get(asset.path);
        return bytes ? { path: asset.path, blob: bytesToBlob(bytes, asset.type) } : null;
      })
      .filter(Boolean) as SnapshotPackage['assets'];

    await applySnapshot({ manifest, data, assets });
    return;
  }

  if (manifest.type !== 'eclipse-tab-backup' || manifest.version !== 1) {
    throw new Error('Unsupported backup file');
  }

  const data = readJsonEntry<LegacyBackupData>(entries, 'data.json');
  const wallpaper = data.assets?.wallpaper || null;
  const snapshot: SnapshotPackage = {
    manifest: {
      type: 'eclipse-tab-snapshot',
      version: 2,
      appVersion: manifest.appVersion,
      exportedAt: manifest.exportedAt,
      lastUpdated: Date.parse(manifest.exportedAt) || Date.now(),
      deviceName: 'Unknown Device',
      assets: {
        favicons: data.assets?.favicons || [],
        stickerImages: data.assets?.stickerImages || [],
        wallpapers: wallpaper ? [wallpaper] : [],
      },
    },
    data: {
      spaces: data.spaces,
      config: data.config,
      searchEngine: data.searchEngine,
      wallpaperId: data.wallpaperId,
      language: data.language,
      stickers: data.stickers || [],
      deletedStickers: data.deletedStickers || [],
      stickerImagesMigrated: data.stickerImagesMigrated,
    },
    assets: [],
  };

  snapshot.assets = allAssetRefs(snapshot.manifest)
    .map(asset => {
      const bytes = entries.get(asset.path);
      return bytes ? { path: asset.path, blob: bytesToBlob(bytes, asset.type) } : null;
    })
    .filter(Boolean) as SnapshotPackage['assets'];

  await applySnapshot(snapshot);
}
