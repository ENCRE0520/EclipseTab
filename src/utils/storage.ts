import { DockItem, SearchEngine, SpacesState, createDefaultSpacesState } from '../types';

const STORAGE_KEYS = {
  DOCK_ITEMS: 'EclipseTab_dockItems',
  SEARCH_ENGINE: 'EclipseTab_searchEngine',
  // Config (Unified settings)
  CONFIG: 'EclipseTab_config',

  // Legacy Keys (kept for reference, strictly used for migration)
  // THEME: 'EclipseTab_theme',
  // FOLLOW_SYSTEM: 'EclipseTab_followSystem',
  // DOCK_POSITION: 'EclipseTab_dockPosition',
  // ICON_SIZE: 'EclipseTab_iconSize',
  // GRADIENT: 'EclipseTab_gradient',
  // TEXTURE: 'EclipseTab_texture',

  WALLPAPER: 'EclipseTab_wallpaper',
  LAST_WALLPAPER: 'EclipseTab_lastWallpaper',
  WALLPAPER_ID: 'EclipseTab_wallpaperId',

  // Focus Spaces
  SPACES: 'EclipseTab_spaces',
  // Zen Shelf Stickers
  STICKERS: 'EclipseTab_stickers',
  // Deleted Stickers (Recycle Bin)
  DELETED_STICKERS: 'EclipseTab_deletedStickers',
} as const;

// Unified Configuration Interface
interface AppConfig {
  theme: string;
  followSystem: boolean;
  dockPosition: 'center' | 'bottom';
  iconSize: 'large' | 'small';
  texture: string;
  gradient: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'light',
  followSystem: true,
  dockPosition: 'bottom',
  iconSize: 'large',
  texture: 'point',
  gradient: null,
};

// ============================================================================
// 性能优化: 内存缓存层，避免重复 JSON.parse
// ============================================================================
interface CacheEntry<T> {
  data: T;
  raw: string; // 用于检测 localStorage 是否被外部修改
}

const memoryCache = {
  spaces: null as CacheEntry<SpacesState> | null,
  stickers: null as CacheEntry<import('../types').Sticker[]> | null,
  deletedStickers: null as CacheEntry<import('../types').Sticker[]> | null,
  config: null as CacheEntry<AppConfig> | null,
};

/**
 * 从缓存获取数据，如果 localStorage 数据未变则返回缓存
 */
function getCached<T>(key: string, cache: CacheEntry<T> | null): T | null {
  if (!cache) return null;
  try {
    const currentRaw = localStorage.getItem(key);
    if (currentRaw === cache.raw) {
      return cache.data;
    }
  } catch {
    // ignore
  }
  return null;
}

export const storage = {
  // ==========================================================================
  // Configuration Management (New Structured Storage)
  // ==========================================================================

  getConfig(): AppConfig {
    try {
      // Check memory cache
      const cached = getCached(STORAGE_KEYS.CONFIG, memoryCache.config);
      if (cached) return cached;

      const json = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (json) {
        const parsed = JSON.parse(json);
        const config = { ...DEFAULT_CONFIG, ...parsed };
        memoryCache.config = { data: config, raw: json };
        return config;
      }

      // Migration: Try to read legacy keys
      const config = { ...DEFAULT_CONFIG };

      const legacyTheme = localStorage.getItem('EclipseTab_theme');
      if (legacyTheme) config.theme = legacyTheme;

      const legacyFollow = localStorage.getItem('EclipseTab_followSystem');
      if (legacyFollow !== null) config.followSystem = legacyFollow === 'true';

      const legacyDockPos = localStorage.getItem('EclipseTab_dockPosition');
      if (legacyDockPos === 'center' || legacyDockPos === 'bottom') config.dockPosition = legacyDockPos;

      const legacyIconSize = localStorage.getItem('EclipseTab_iconSize');
      if (legacyIconSize === 'small' || legacyIconSize === 'large') config.iconSize = legacyIconSize;

      const legacyTexture = localStorage.getItem('EclipseTab_texture');
      if (legacyTexture) config.texture = legacyTexture;

      const legacyGradient = localStorage.getItem('EclipseTab_gradient');
      if (legacyGradient) config.gradient = legacyGradient;

      // Save migrated config
      const newJson = JSON.stringify(config);
      localStorage.setItem(STORAGE_KEYS.CONFIG, newJson);
      memoryCache.config = { data: config, raw: newJson };

      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: AppConfig): void {
    try {
      const json = JSON.stringify(config);
      localStorage.setItem(STORAGE_KEYS.CONFIG, json);
      memoryCache.config = { data: config, raw: json };
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },

  updateConfig(patch: Partial<AppConfig>): void {
    const current = this.getConfig();
    const next = { ...current, ...patch };
    this.saveConfig(next);
  },

  // ==========================================================================
  // Specific Settings Accessors (Adapters using getConfig/saveConfig)
  // ==========================================================================

  getTheme(): string {
    return this.getConfig().theme;
  },

  saveTheme(theme: string): void {
    this.updateConfig({ theme });
  },

  getFollowSystem(): boolean {
    return this.getConfig().followSystem;
  },

  saveFollowSystem(followSystem: boolean): void {
    this.updateConfig({ followSystem });
  },

  getDockPosition(): 'center' | 'bottom' {
    return this.getConfig().dockPosition;
  },

  saveDockPosition(dockPosition: 'center' | 'bottom'): void {
    this.updateConfig({ dockPosition });
  },

  getIconSize(): 'large' | 'small' {
    return this.getConfig().iconSize;
  },

  saveIconSize(iconSize: 'large' | 'small'): void {
    this.updateConfig({ iconSize });
  },

  getTexture(): string {
    return this.getConfig().texture;
  },

  saveTexture(texture: string): void {
    this.updateConfig({ texture });
  },

  getGradient(): string | null {
    return this.getConfig().gradient;
  },

  saveGradient(gradient: string | null): void {
    this.updateConfig({ gradient });
  },

  // ==========================================================================
  // Large Data / Independent Storage
  // ==========================================================================

  getDockItems(): DockItem[] {
    try {
      const items = localStorage.getItem(STORAGE_KEYS.DOCK_ITEMS);
      return items ? JSON.parse(items) : [];
    } catch {
      return [];
    }
  },

  saveDockItems(items: DockItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCK_ITEMS, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save dock items:', error);
    }
  },

  getSearchEngine(): SearchEngine | null {
    try {
      const engine = localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE);
      return engine ? JSON.parse(engine) : null;
    } catch {
      return null;
    }
  },

  saveSearchEngine(engine: SearchEngine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, JSON.stringify(engine));
    } catch (error) {
      console.error('Failed to save search engine:', error);
    }
  },

  getWallpaper(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.WALLPAPER);
    } catch {
      return null;
    }
  },

  saveWallpaper(wallpaper: string | null): void {
    try {
      if (wallpaper) {
        localStorage.setItem(STORAGE_KEYS.WALLPAPER, wallpaper);
        localStorage.setItem(STORAGE_KEYS.LAST_WALLPAPER, wallpaper);
      } else {
        localStorage.removeItem(STORAGE_KEYS.WALLPAPER);
      }
    } catch (error) {
      console.error('Failed to save wallpaper:', error);
    }
  },

  getWallpaperId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.WALLPAPER_ID);
    } catch {
      return null;
    }
  },

  saveWallpaperId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.WALLPAPER_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.WALLPAPER_ID);
      }
    } catch (error) {
      console.error('Failed to save wallpaper ID:', error);
    }
  },

  getLastWallpaper(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_WALLPAPER);
    } catch {
      return null;
    }
  },

  saveLastWallpaper(wallpaper: string | null): void {
    try {
      if (wallpaper) {
        localStorage.setItem(STORAGE_KEYS.LAST_WALLPAPER, wallpaper);
      } else {
        localStorage.removeItem(STORAGE_KEYS.LAST_WALLPAPER);
      }
    } catch (error) {
      console.error('Failed to save last wallpaper:', error);
    }
  },

  // ==========================================================================
  // Focus Spaces
  // ==========================================================================

  getSpaces(): SpacesState {
    try {
      const cached = getCached(STORAGE_KEYS.SPACES, memoryCache.spaces);
      if (cached) return cached;

      const spacesJson = localStorage.getItem(STORAGE_KEYS.SPACES);
      if (spacesJson) {
        const parsed = JSON.parse(spacesJson);
        if (parsed && parsed.spaces && parsed.spaces.length > 0) {
          memoryCache.spaces = { data: parsed, raw: spacesJson };
          return parsed;
        }
      }

      // Migration from legacy dock items
      const legacyItems = this.getDockItems();
      if (legacyItems.length > 0) {
        const migratedState = createDefaultSpacesState(legacyItems);
        this.saveSpaces(migratedState);
        return migratedState;
      }

      const defaultState = createDefaultSpacesState();
      this.saveSpaces(defaultState);
      return defaultState;
    } catch (error) {
      console.error('Failed to get spaces:', error);
      const fallbackState = createDefaultSpacesState();
      this.saveSpaces(fallbackState);
      return fallbackState;
    }
  },

  saveSpaces(state: SpacesState): void {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEYS.SPACES, json);
      memoryCache.spaces = { data: state, raw: json };
    } catch (error) {
      console.error('Failed to save spaces:', error);
    }
  },

  clearSpaces(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SPACES);
    } catch (error) {
      console.error('Failed to clear spaces:', error);
    }
  },

  // ==========================================================================
  // Zen Shelf Stickers
  // ==========================================================================

  getStickers(): import('../types').Sticker[] {
    try {
      const cached = getCached(STORAGE_KEYS.STICKERS, memoryCache.stickers);
      if (cached) return cached;

      const stickersJson = localStorage.getItem(STORAGE_KEYS.STICKERS);
      if (stickersJson) {
        const parsed = JSON.parse(stickersJson);
        memoryCache.stickers = { data: parsed, raw: stickersJson };
        return parsed;
      }
      return [];
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  },

  saveStickers(stickers: import('../types').Sticker[]): void {
    try {
      const json = JSON.stringify(stickers);
      localStorage.setItem(STORAGE_KEYS.STICKERS, json);
      memoryCache.stickers = { data: stickers, raw: json };
    } catch (error) {
      console.error('Failed to save stickers:', error);
    }
  },

  getDeletedStickers(): import('../types').Sticker[] {
    try {
      const cached = getCached(STORAGE_KEYS.DELETED_STICKERS, memoryCache.deletedStickers);
      if (cached) return cached;

      const deletedStickersJson = localStorage.getItem(STORAGE_KEYS.DELETED_STICKERS);
      if (deletedStickersJson) {
        const parsed = JSON.parse(deletedStickersJson);
        memoryCache.deletedStickers = { data: parsed, raw: deletedStickersJson };
        return parsed;
      }
      return [];
    } catch (error) {
      console.error('Failed to get deleted stickers:', error);
      return [];
    }
  },

  saveDeletedStickers(stickers: import('../types').Sticker[]): void {
    try {
      const json = JSON.stringify(stickers);
      localStorage.setItem(STORAGE_KEYS.DELETED_STICKERS, json);
      memoryCache.deletedStickers = { data: stickers, raw: json };
    } catch (error) {
      console.error('Failed to save deleted stickers:', error);
    }
  },
};
