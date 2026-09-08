# Eclipse Tab · AI 项目导航

> 这是索引，不是实现文档。先读本文件，再按任务路由读取目标文件；以代码为准，不要扫描整个仓库。

## 项目

- React 18 + TypeScript strict + Vite；浏览器 Manifest V3 新标签页扩展。
- 入口：`index.html` → `src/main.tsx`；别名：`@/*` = `src/*`。
- 无后端；主要数据在 `localStorage`，大文件/缓存放 IndexedDB；WebDAV 是可选同步层。
- 依赖很少：`react`、`react-dom`、`colord`。不要为已有能力新增依赖。

## 运行结构

```text
src/main.tsx
└─ ThemeProvider
   └─ SpacesProvider
      └─ DockProvider
         └─ ZenShelfProvider
            └─ LanguageProvider
               └─ App
```

`src/App.tsx` 只负责页面编排、顶层 UI 状态和 Modal 的打开/关闭；核心业务状态在各 Context。页面主要由：`Background`、`ZenShelf`、`DockLayoutContainer(Searcher + Dock)`、左上 Settings、右上 Editor/Sync，以及懒加载 Modal 组成。

## 任务路由：先读这些文件

| 任务 | 首选文件 | 通常还要看 |
|---|---|---|
| Dock 添加/编辑/删除/点击/文件夹 | `features/dock/context/DockContext.tsx` | `features/dock/components/Dock/*`、`FolderView/*`、`Modal/AddEditModal.tsx`、`types/dock.ts` |
| Dock 拖拽/排序/合并/拖出文件夹 | `features/dock/hooks/useDragAndDrop.ts` | `useDragBase.ts`、`useDragMerge.ts`、`useFolderDragAndDrop.ts`、`shared/utils/dragMath.ts`、`shared/constants/layout.ts` |
| Space 创建/切换/重命名/置顶/删除 | `features/spaces/context/SpacesContext.tsx` | `types/space.ts`、`dock/components/Dock/DockNavigator.tsx`、`SpaceSwitcher.tsx`、`spaces/components/Modal/SpaceManageMenu.tsx` |
| Space 导入/导出 | `features/spaces/utils/spaceExportImport.ts` | `SpaceManageMenu.tsx`、`theme/utils/imageCompression.ts`、`dock/utils/iconCache.ts` |
| Zen Shelf 贴纸/回收站/拖拽 | `features/shelf/context/ZenShelfContext.tsx` | `shelf/components/ZenShelf/ZenShelf.tsx`、`StickerItem.tsx`、`TextInput.tsx`、`types/sticker.ts` |
| 贴纸图片/导出 PNG/剪贴板/链接预览 | `shared/utils/db.ts` | `theme/utils/imageCompression.ts`、`theme/utils/canvasUtils.ts`、`shared/utils/markdownLinks.ts`、`shared/utils/linkPreview.ts` |
| 主题/背景/壁纸/亮暗模式 | `features/theme/context/ThemeContext.tsx` | `theme/components/Background/*`、`settings/components/Modal/SettingsModal.tsx`、`theme/hooks/*`、`shared/utils/storage.ts`、`shared/utils/db.ts` |
| 搜索框/引擎/建议 | `features/search/components/Searcher/Searcher.tsx` | `SuggestionsList.tsx`、`hooks/useSearchSuggestions.ts`、`constants/searchEngines.ts` |
| WebDAV 同步/自动同步 | `features/sync/services/syncManager.ts` | `webdavClient.ts`、`syncData.ts`、`sync/hooks/useAutoSync.ts`、`sync/components/Modal/SyncModal.tsx` |
| 完整备份/恢复 | `shared/utils/backup.ts` | `shared/utils/snapshot.ts`、`zip.ts`、`storage.ts`、`db.ts` |
| favicon/图标获取/权限 | `features/dock/utils/iconFetcher.ts` | `iconCache.ts`、`shared/utils/hostPermission.ts`、`shared/utils/db.ts` |
| 浏览器书签导入 | `features/dock/utils/bookmarks.ts` | `dock/components/BatchImport/*`、`public/manifest.json` |
| 通用弹窗/浮层/提示 | `shared/components/Modal/*` | `PopoverPanel/*`、`Tooltip/*`、`shared/styles/modal.css` |

目录约定：`features/<domain>/{components,context,hooks,services,types,utils}`；组件 CSS 通常与组件同目录；跨领域的状态、持久化、算法和通用 UI 放在 `shared/`。

## 状态与数据源

| 数据 | 唯一权威来源 | 持久化 |
|---|---|---|
| 当前 Dock 项目/文件夹 | `SpacesContext.currentSpace.apps`；`DockContext` 只提供 Dock 操作和 UI 状态 | `storage.getSpaces/saveSpaces()` → `localStorage` 的 `EclipseTab_spaces` |
| Space 列表/当前 Space | `SpacesContext` | 同上；旧 `EclipseTab_dockItems` 仅用于迁移，不是新逻辑主来源 |
| 搜索引擎 | `DockContext` | `EclipseTab_searchEngine` |
| 主题配置、Dock 位置、图标大小 | `ThemeContext` | `storage` 的统一 `EclipseTab_config` |
| 壁纸 | `ThemeContext` / `useWallpaperStorage` | 壁纸 Blob 在 IndexedDB，ID 在 `EclipseTab_wallpaperId` |
| Zen Shelf 贴纸 | `ZenShelfContext` | 贴纸元数据在 localStorage；图片 Blob 在 IndexedDB `sticker_images` |
| favicon | `iconCache` / `iconFetcher` | IndexedDB `favicons`；`DockItem.icon` 可能是 `favicon:<domain>` 引用或 URL |
| 语言 | `LanguageContext` | `app_language` |
| 云端同步 | `syncManager` | WebDAV 上的 snapshot；不是本地状态源 |

## 修改规则

1. 修改状态先找对应 Context，再找它的持久化/迁移路径；不要在组件里另建镜像 state。
2. Dock 数据写入必须经过 `SpacesContext.updateSpaceApps`（通常由 `DockContext` 封装），否则会破坏 Space 隔离。
3. 触及持久化数据、图片、导入导出或同步时，连读 `storage.ts`、`db.ts`、`snapshot.ts` 相关路径。
4. 触及扩展权限、书签或跨域请求时，同时检查 `public/manifest.json` 和 `hostPermission.ts`。
5. 不要手改 `dist/`；它是构建产物。图标资源在 `src/assets/icons/`，全局样式/token 在 `src/shared/styles/`。
6. 保持现有 Context 的 data/actions 拆分和 `@/` 别名；先复用已有工具，不新增抽象或依赖。

## 校验

```bash
npx tsc --noEmit
npm run build
```

没有测试脚本；涉及非平凡逻辑时，至少完成 TypeScript 检查，并按任务手动验证对应交互。
