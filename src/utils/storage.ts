import { DockItem, SearchEngine } from '../types';

const STORAGE_KEYS = {
  DOCK_ITEMS: 'EclipseTab_dockItems',
  SEARCH_ENGINE: 'EclipseTab_searchEngine',
  THEME: 'EclipseTab_theme',
  FOLLOW_SYSTEM: 'EclipseTab_followSystem',
  WALLPAPER: 'EclipseTab_wallpaper',
  LAST_WALLPAPER: 'EclipseTab_lastWallpaper',
  GRADIENT: 'EclipseTab_gradient',
  TEXTURE: 'EclipseTab_texture',
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
};
