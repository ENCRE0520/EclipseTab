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
} as const;

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
      return value === 'true';
    } catch {
      return false;
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
      return localStorage.getItem(STORAGE_KEYS.TEXTURE);
    } catch {
      return null;
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
      const spacesJson = localStorage.getItem(STORAGE_KEYS.SPACES);
      if (spacesJson) {
        const parsed = JSON.parse(spacesJson);
        // 确保数据有效
        if (parsed && parsed.spaces && parsed.spaces.length > 0) {
          return parsed;
        }
      }

      // 尝试从旧版数据迁移
      const legacyItems = this.getDockItems();
      if (legacyItems.length > 0) {
        console.log('[Storage] Migrating legacy dockItems to Spaces...');
        const migratedState = createDefaultSpacesState(legacyItems);
        this.saveSpaces(migratedState);
        return migratedState;
      }

      // 创建默认状态并立即保存
      console.log('[Storage] Creating default spaces state...');
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
      localStorage.setItem(STORAGE_KEYS.SPACES, JSON.stringify(state));
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
};
