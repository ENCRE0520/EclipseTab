import { DockItem, SearchEngine, SpacesState, createDefaultSpacesState } from '../types';

const STORAGE_KEYS = {
  DOCK_ITEMS: 'EclipseTab_dockItems',
  SEARCH_ENGINE: 'EclipseTab_searchEngine',
  THEME: 'EclipseTab_theme',
  FOLLOW_SYSTEM: 'EclipseTab_followSystem',
  WALLPAPER: 'EclipseTab_wallpaper',
  LAST_WALLPAPER: 'EclipseTab_lastWallpaper',
  GRADIENT: 'EclipseTab_gradient',
  TEXTURE: 'EclipseTab_texture',
  WALLPAPER_ID: 'EclipseTab_wallpaperId',
  // Focus Spaces 新增
  SPACES: 'EclipseTab_spaces',
  // Zen Shelf 贴纸
  STICKERS: 'EclipseTab_stickers',
  // Dock 布局设置
  DOCK_POSITION: 'EclipseTab_dockPosition',
  ICON_SIZE: 'EclipseTab_iconSize',
} as const;

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

  getTheme(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME);
    } catch {
      return null;
    }
  },

  saveTheme(theme: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },

  getFollowSystem(): boolean {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.FOLLOW_SYSTEM);
      // First-time users: default to follow system
      if (value === null) return true;
      return value === 'true';
    } catch {
      return true;
    }
  },

  saveFollowSystem(follow: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FOLLOW_SYSTEM, String(follow));
    } catch (error) {
      console.error('Failed to save follow system setting:', error);
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
        // Also save as last wallpaper when setting a new one
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

  getGradient(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.GRADIENT);
    } catch {
      return null;
    }
  },

  saveGradient(gradientId: string | null): void {
    try {
      if (gradientId) {
        localStorage.setItem(STORAGE_KEYS.GRADIENT, gradientId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.GRADIENT);
      }
    } catch (error) {
      console.error('Failed to save gradient:', error);
    }
  },

  getTexture(): string | null {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.TEXTURE);
      // First-time users: default to 'point' texture
      if (value === null) return 'point';
      return value;
    } catch {
      return 'point';
    }
  },

  saveTexture(texture: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TEXTURE, texture);
    } catch (error) {
      console.error('Failed to save texture:', error);
    }
  },

  // ============================================================================
  // Focus Spaces 存储
  // ============================================================================

  /**
   * 获取空间状态
   * 如果不存在则尝试从旧版 dockItems 迁移，或创建默认状态并保存
   */
  getSpaces(): SpacesState {
    try {
      // 检查内存缓存
      const cached = getCached(STORAGE_KEYS.SPACES, memoryCache.spaces);
      if (cached) return cached;

      const spacesJson = localStorage.getItem(STORAGE_KEYS.SPACES);
      if (spacesJson) {
        const parsed = JSON.parse(spacesJson);
        // 确保数据有效
        if (parsed && parsed.spaces && parsed.spaces.length > 0) {
          // 更新缓存
          memoryCache.spaces = { data: parsed, raw: spacesJson };
          return parsed;
        }
      }

      // 尝试从旧版数据迁移
      const legacyItems = this.getDockItems();
      if (legacyItems.length > 0) {
        const migratedState = createDefaultSpacesState(legacyItems);
        this.saveSpaces(migratedState);
        return migratedState;
      }

      // 创建默认状态并立即保存
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

  /**
   * 保存空间状态
   */
  saveSpaces(state: SpacesState): void {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEYS.SPACES, json);
      // 同步更新缓存
      memoryCache.spaces = { data: state, raw: json };
    } catch (error) {
      console.error('Failed to save spaces:', error);
    }
  },

  /**
   * 清除空间数据（用于调试/重置）
   */
  clearSpaces(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SPACES);
    } catch (error) {
      console.error('Failed to clear spaces:', error);
    }
  },

  // ============================================================================
  // Zen Shelf 贴纸存储
  // ============================================================================

  /**
   * 获取所有贴纸
   */
  getStickers(): import('../types').Sticker[] {
    try {
      // 检查内存缓存
      const cached = getCached(STORAGE_KEYS.STICKERS, memoryCache.stickers);
      if (cached) return cached;

      const stickersJson = localStorage.getItem(STORAGE_KEYS.STICKERS);
      if (stickersJson) {
        const parsed = JSON.parse(stickersJson);
        // 更新缓存
        memoryCache.stickers = { data: parsed, raw: stickersJson };
        return parsed;
      }
      return [];
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  },

  /**
   * 保存贴纸列表
   */
  saveStickers(stickers: import('../types').Sticker[]): void {
    try {
      const json = JSON.stringify(stickers);
      localStorage.setItem(STORAGE_KEYS.STICKERS, json);
      // 同步更新缓存
      memoryCache.stickers = { data: stickers, raw: json };
    } catch (error) {
      console.error('Failed to save stickers:', error);
    }
  },

  // ============================================================================
  // Dock 布局设置
  // ============================================================================

  /**
   * 获取 Dock 位置设置
   */
  getDockPosition(): 'center' | 'bottom' {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.DOCK_POSITION);
      return value === 'center' ? 'center' : 'bottom';
    } catch {
      return 'bottom';
    }
  },

  /**
   * 保存 Dock 位置设置
   */
  saveDockPosition(position: 'center' | 'bottom'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCK_POSITION, position);
    } catch (error) {
      console.error('Failed to save dock position:', error);
    }
  },

  /**
   * 获取图标大小设置
   */
  getIconSize(): 'large' | 'small' {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.ICON_SIZE);
      return value === 'small' ? 'small' : 'large';
    } catch {
      return 'large';
    }
  },

  /**
   * 保存图标大小设置
   */
  saveIconSize(size: 'large' | 'small'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ICON_SIZE, size);
    } catch (error) {
      console.error('Failed to save icon size:', error);
    }
  },
};
