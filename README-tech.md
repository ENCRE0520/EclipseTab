# Eclipse Tab - 新一代浏览器新标签页扩展

<div align="center">

![Eclipse Tab 预览](https://github.com/user-attachments/assets/68a369b7-3c01-44ba-b033-a1dbc38fbcd3)

**灵感白板 · 多重空间 · 流畅交互**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)

</div>

> 💡 本项目 90% 使用 AI 辅助编码（VibeCoding）开发

Eclipse Tab 是一款功能强大的浏览器新标签页扩展，以 **Zen Shelf（灵感白板）** 和 **Focus Spaces（多重空间）** 为核心，让你的浏览器成为创意工作站和效率中心。

---

## 📖 目录

- [🎯 核心功能](#-核心功能)
  - [Zen Shelf - 灵感白板](#zen-shelf---灵感白板)
  - [Focus Spaces - 多重空间](#focus-spaces---多重空间)
- [🌟 辅助功能](#-辅助功能)
- [📦 快速开始](#-快速开始)
- [🎯 完整交互指南](#-完整交互指南)
- [🛠️ 技术架构](#️-技术架构)
- [🎨 设计亮点](#-设计亮点)

---

## 🎯 核心功能

### Zen Shelf - 灵感白板

**自由创作的无限画布，随时捕捉灵感**

Zen Shelf 将你的新标签页变成一个自由的创意空间，支持文字和图片贴纸，让灵感随处可贴。

#### ✨ 核心特性

**📝 文字贴纸**
- **快速创建**：双击背景或右键菜单 → 添加文字贴纸
- **富文本样式**：
  - 自定义字体颜色（色板选择）
  - 三种对齐方式（左对齐、居中、右对齐）
  - 可调节字号（滑块控制）
- **智能编辑**：右键贴纸 → 编辑，保留原有样式
- **一键导出**：导出为 PNG 图片，保留样式

**🖼️ 图片贴纸**
- **多种添加方式**：
  - 右键菜单 → 上传图片
  - 直接粘贴剪贴板图片（Ctrl+V）
  - 拖拽图片文件到页面
- **智能压缩**：自动压缩图片，优化存储空间
- **自由缩放**：鼠标滚轮缩放图片大小
- **快速操作**：
  - 复制图片到剪贴板
  - 导出为 PNG 文件

**🎨 交互体验**
- **自由拖拽**：
  - 点击拖动贴纸到任意位置
  - 拖拽时带有轻微旋转物理效果（-3° ~ +3°）
  - 模拟纸张飘动的真实感
  - 使用 RAF（requestAnimationFrame）优化拖拽性能
- **物理动画**：
  - 点击时阴影收缩动画（按压反馈）
  - 拖拽时平滑的阴影过渡
  - 释放时弹性回弹效果
  - 基于速度的旋转角度计算
- **智能边界**：
  - 文字贴纸靠近边缘时自动换行
  - 左右边界均有动态宽度限制
  - 自动检测与 Dock/Searcher 的碰撞
  - 智能选择最短逃逸路径（上/左/右）
- **层级管理**：
  - 点击贴纸自动置顶
  - 拖拽时 z-index 提升至 3000
  - 自动管理贴纸层级关系
- **响应式布局**：
  - 基于 1920px 参考宽度的坐标系统
  - 窗口缩放时贴纸位置自适应
  - viewport scale 动态计算

**🎯 创意模式（Edit Mode）**
- **开启方式**：右键菜单 → Toggle Edit Mode
- **专注创作**：隐藏所有交互提示，纯净画布
- **快速退出**：再次右键切换回正常模式

**⌨️ 快捷操作**
- `双击背景`：快速添加文字贴纸
- `Ctrl+V`：粘贴图片
- `Delete / Backspace`：删除选中的贴纸
- `鼠标滚轮`：缩放图片贴纸
- `右键`：打开上下文菜单

**💾 数据持久化**
- 自动保存到 localStorage
- 防抖保存机制（500ms）
- 刷新页面后完整恢复

---

### Focus Spaces - 多重空间

**场景化工作空间，一键切换专注状态**

Focus Spaces 让你为不同场景（工作、学习、娱乐）创建独立的应用空间，每个空间拥有独立的 Dock 应用列表，实现真正的场景隔离。

#### ✨ 核心特性

**🌐 多空间管理**
- **创建空间**：右键 Navigator → Add space
- **快速切换**：
  - 点击 Navigator 按钮循环切换
  - 平滑动画过渡（200ms 退场 + 交错入场）
- **重命名空间**：右键 → Rename，自定义空间名称
- **删除空间**：右键 → Delete space（保留至少一个空间）
- **置顶空间**：右键 → Pin to top，常用空间置顶

**🔄 空间切换动画**
- **退场动画**：当前空间图标向上滑出并淡出（200ms）
- **入场动画**：新空间图标从下方依次滑入，带交错延迟（stagger）
- **宽度过渡**：Dock 宽度平滑适应不同空间的图标数量（500ms）
- **Navigator 淡化**：切换时 Navigator 按钮淡出，减少视觉干扰

**🎯 Navigator 设计**
- **位置**：固定在 Dock 右侧，向左偏移 8px
- **显示内容**：
  - 空间名称（左上角，首字母大写）
  - 分页指示点（右下角）
    - 未选中：圆形点
    - 选中：胶囊形高亮
- **交互**：
  - 左键点击：切换到下一个空间
  - 长按（200ms）：弹出 SpaceSwitcher 空间快速切换器
  - 右键点击：打开空间管理菜单

**🚀 SpaceSwitcher 快速切换器**
- **触发方式**：长按 Navigator 按钮 200ms
- **交互模式**：按住不松手向上滑动，选择目标空间后松手跳转
- **视觉效果**：
  - 所有其他空间以独立块的形式同时弹出（scale 动画）
  - 块沿弧线排列，跟随鼠标左右摆动（rAF 驱动）
  - 悬停的块有平滑放大和背景色变化反馈
  - 每个块根据弧线位置有不同的旋转角度

**📦 空间导入/导出**
- **导出当前空间**：右键 Navigator → Export current space
  - 导出为 JSON 文件
  - 包含应用列表、图标数据
- **导入空间**：右键 Navigator → Import space
  - 选择 JSON 文件导入
  - 自动生成新 UUID
  - 智能处理重名空间

**🔒 空间独立性**
- **独立应用列表**：每个空间拥有完全独立的 Dock 应用
- **独立配置**：应用、文件夹、排序完全隔离
- **场景化组织**：
  - 工作空间：邮箱、项目管理、开发工具
  - 学习空间：文档、笔记、在线课程
  - 娱乐空间：视频、音乐、社交媒体

**💾 数据持久化**
- 自动保存到 localStorage
- 防抖保存机制（500ms）
- 空间列表、当前空间 ID、每个空间的应用列表全部持久化

---

## 🌟 辅助功能

### 🚀 Dock 应用栏

**macOS 风格的应用管理**

#### 应用管理
- **添加应用**：输入名称和 URL，自动获取网站图标
- **编辑应用**：修改名称、URL 或图标
- **删除应用**：编辑模式下点击删除按钮
- **智能图标**：
  - 自动从网站获取 favicon
  - 支持图标缓存（localStorage）
  - 导入时自动压缩至 192x192px

#### 文件夹组织
- **创建文件夹**：拖拽应用到应用上自动创建
- **文件夹管理**：支持添加、删除、重命名
- **自动解散**：文件夹内应用少于 2 个时自动解散
- **组合图标**：文件夹图标由内部应用图标自动生成

#### 拖拽编辑
- **完整拖放**：支持应用和文件夹的重新排序
- **挤压动画**：拖拽时其他图标平滑让位（macOS 风格）
- **跨区域拖拽**：支持 Dock 与文件夹之间互相拖拽
- **智能合并**：悬停 300ms 自动触发合并或打开文件夹

---

### 🔍 智能搜索

**多引擎支持，实时建议**

#### 多引擎支持
- **预设引擎**：Google、Bing、Baidu、DuckDuckGo
- **快速切换**：点击搜索引擎图标即可切换
- **持久化**：自动保存选择

#### 搜索建议
- **实时建议**：输入时自动显示搜索建议
- **键盘导航**：上下箭头选择，Enter 确认
- **智能降级**：Google API 优先，百度 API 备选

---

### 🎨 主题系统

**四种主题模式，高度可定制**

#### 主题模式
- **Default（默认）**：精美渐变背景，9 种渐变色方案
- **Light（浅色）**：简洁明亮，支持纯色背景
- **Dark（深色）**：护眼舒适，支持纯色背景
- **Auto（自动）**：跟随系统明暗模式自动切换

#### 背景自定义
- **渐变色方案**：Default 主题提供 9 种精心设计的渐变
- **纯色背景**：Light/Dark 主题支持 8 种纯色选择
- **纹理叠加**：Light/Dark 主题支持 Point 和 X 两种纹理效果
- **自定义壁纸**：
  - 支持上传本地图片（最大 10MB+）
  - 使用 IndexedDB 存储，突破 localStorage 5MB 限制
  - 壁纸历史记录：保存最近 7 张壁纸
  - 平滑切换动画：双缓冲淡入淡出效果

#### 智能亮度检测
- 自动根据背景颜色调整文字对比度
- 确保在任何背景下都有良好的可读性



---

## 📦 快速开始

### 开发环境

```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 浏览器扩展安装

1. **构建项目**
   ```bash
   npm run build
   ```

2. **加载扩展**
   - **Chrome/Edge**：
     1. 打开 `chrome://extensions/`
     2. 开启"开发者模式"
     3. 点击"加载已解压的扩展程序"
     4. 选择项目中的 `dist` 文件夹
   
   - **Firefox**：
     1. 打开 `about:addons`
     2. 点击齿轮图标
     3. 选择"调试附加组件"
     4. 点击"临时载入附加组件"
     5. 选择 `dist` 文件夹中的 `manifest.json`

---

## 🎯 完整交互指南

### 1️⃣ Zen Shelf 交互流程

#### 添加文字贴纸

**方式一：双击背景**
1. 双击页面空白区域
2. 弹出文字输入框
3. 输入文字内容
4. 调整样式（颜色、对齐、字号）
5. 点击 ✓ 确认或按 Enter

**方式二：右键菜单**
1. 右键点击背景
2. 选择 "Add sticker"
3. 输入文字并调整样式
4. 确认创建

#### 添加图片贴纸

**方式一：粘贴**
1. 复制图片到剪贴板
2. 在页面按 `Ctrl+V`
3. 图片自动添加到中心位置

**方式二：右键上传**
1. 右键点击背景
2. 选择 "Upload image"
3. 选择本地图片文件
4. 图片自动添加

#### 编辑贴纸

**编辑文字贴纸**
1. 右键点击文字贴纸
2. 选择 "Edit"
3. 修改文字内容或样式
4. 确认保存

**操作图片贴纸**
1. 右键点击图片贴纸
2. 可选操作：
   - Copy image：复制到剪贴板
   - Export as PNG：下载为图片文件
   - Delete：删除贴纸

#### 拖拽与层级

**拖拽贴纸**
- 点击贴纸并拖动到任意位置
- 拖拽时贴纸会轻微旋转（物理效果）
- 文字贴纸靠近边缘会自动换行

**调整层级**
- 双击贴纸：置顶显示
- 自动管理 z-index

**缩放图片**
- 鼠标悬停在图片贴纸上
- 滚动鼠标滚轮缩放大小

#### 创意模式

**开启创意模式**
1. 右键点击背景
2. 选择 "Toggle Edit Mode"
3. 所有 UI 元素隐藏，专注创作

**退出创意模式**
- 再次右键选择 "Toggle Edit Mode"

---

### 2️⃣ Focus Spaces 交互流程

#### 创建和管理空间

**创建新空间**
1. 右键点击 Dock 右侧的 Navigator 按钮
2. 选择 "Add space"
3. 新空间自动创建并切换

**重命名空间**
1. 右键点击 Navigator
2. 选择 "Rename"
3. 输入新名称
4. 确认保存

**删除空间**
1. 右键点击 Navigator
2. 选择 "Delete space"
3. 确认删除（至少保留一个空间）

**置顶空间**
1. 右键点击 Navigator
2. 选择 "Pin to top"
3. 空间移动到列表首位

#### 切换空间

**循环切换**
- 点击 Navigator 按钮
- 自动切换到下一个空间
- 带有平滑动画效果

**长按快速跳转**
- 长按 Navigator 按钮（200ms 触发）
- 弹出所有其他空间的选择块，沿弧线排列
- 按住不松手向上滑动到目标空间
- 松手后直接跳转，无需逐个切换
- 支持按住直接上滑（不需要等弹出完成）

**动画说明**
- 当前空间图标向上滑出并淡出（200ms）
- 新空间图标从下方依次滑入（交错延迟）
- Dock 宽度自动调整

#### 导入导出空间

**导出空间**
1. 右键点击 Navigator
2. 选择 "Export current space"
3. 保存 JSON 文件到本地

**导入空间**
1. 右键点击 Navigator
2. 选择 "Import space"
3. 选择 JSON 文件
4. 新空间自动创建并切换

---

### 3️⃣ Dock 应用栏交互

#### 查看模式（默认）

**点击应用**
- 单击应用图标 → 新标签页打开对应网站

**点击文件夹**
- 单击文件夹 → 弹出文件夹视图
- 位置：文件夹图标上方 24px
- 关闭：点击外部区域

**进入编辑模式**
- 方式 1：长按任意图标（500ms）
- 方式 2：点击右上角编辑按钮

#### 编辑模式

**视觉特性**
- 图标抖动动画（2 秒循环）
- 每个图标右上角显示 × 按钮
- Dock 最左侧显示 + 按钮

**操作流程**
- **添加应用**：点击 + 按钮 → 输入信息 → 保存
- **编辑应用**：点击图标 → 修改信息 → 保存
- **删除应用**：点击 × 按钮 → 确认删除
- **退出编辑**：点击编辑按钮

#### 拖拽与重排序

**拖拽启动**
1. 编辑模式下点击图标
2. 移动超过 8px 触发拖拽
3. 其他图标平滑让位（挤压动画）

**创建文件夹**
1. 拖拽应用到另一个应用上
2. 悬停 300ms
3. 释放鼠标自动创建文件夹

**跨区域拖拽**
- Dock → 文件夹：拖入打开的文件夹
- 文件夹 → Dock：拖出到 Dock
- 文件夹自动解散（少于 2 个应用时）

---

### 4️⃣ 搜索交互流程

**基础搜索**
1. 点击搜索框输入关键词
2. 按 Enter 触发搜索
3. 新标签打开搜索结果

**切换搜索引擎**
1. 点击搜索引擎图标
2. 选择目标引擎
3. 自动保存选择

**搜索建议**
1. 输入文本自动显示建议
2. ↑↓ 键选择建议
3. Enter 确认搜索

---

### 5️⃣ 设置面板交互

**打开设置**
1. 悬停到左上角区域
2. 设置图标渐显
3. 点击图标打开设置面板

**主题选择**
- **Default**：点击星形图标，显示 9 个渐变选项
- **Light/Dark/Auto**：点击对应图标，显示纯色和纹理选项

**背景自定义**
- **选择颜色/渐变**：点击色块立即切换
- **选择纹理**：点击纹理图标（仅 Light/Dark）
- **上传壁纸**：点击上传按钮，选择图片

**关闭设置**
- 点击面板外区域
- 按 `Esc` 键

---

### 6️⃣ 数据持久化

所有用户数据自动保存：

| 数据类型 | 存储方式 | 说明 |
|----------|----------|------|
| **Zen Shelf 贴纸** | localStorage | 文字和图片贴纸数据 |
| **Focus Spaces 数据** | localStorage | 空间列表、当前空间、应用列表 |
| **Dock 应用列表** | localStorage | 实时保存每次增删改 |
| **搜索引擎选择** | localStorage | 自动保存选择 |
| **主题设置** | localStorage | 主题模式、纹理、背景 |
| **壁纸存储** | IndexedDB | 高清壁纸（突破 5MB 限制） |
| **图标缓存** | localStorage | 网站图标缓存 |

---

## 🛠️ 技术架构

### 技术栈

#### 核心框架
- **React 18**：UI 框架
- **TypeScript 5.0**：类型安全
- **Vite 5.0**：构建工具

#### 主要技术特性
- **CSS Modules**：组件样式隔离
- **CSS Variables**：动态主题系统
- **React Context API**：全局状态管理（ThemeContext、DockContext）
- **Custom Hooks**：模块化拖拽系统、系统主题检测、壁纸存储、搜索建议
- **LocalStorage**：轻量数据持久化
- **IndexedDB**：大容量壁纸存储，突破 5MB 限制
- **FileReader API**：壁纸上传与压缩
- **ResizeObserver**：Dock 宽度自适应
- **Favicon API**：自动获取网站图标
- **TypeScript 类型系统**：模块化类型定义，统一导出入口
- **WebDAV Client**：基于 Fetch API 的 WebDAV 同步客户端，支持 MKCOL/PROPFIND/PUT/GET
- **数据指纹检测**：通过哈希比较实现增量同步，有改动才上传
- **Chrome Permissions API**：动态请求 host_permissions，实现 WebDAV 跨域请求

---

### 项目结构

```
src/
├── assets/                 # 静态资源
│   ├── icons/             # 应用图标资源
│   └── textures/          # 背景纹理图片 (Point、X 纹理)
│
├── components/             # React 组件
│   ├── Background/        # 背景组件
│   │   ├── Background.tsx           # 双缓冲背景切换
│   │   └── Background.module.css    # 淡入淡出动画
│   │
│   ├── Dock/              # Dock 应用栏
│   │   ├── Dock.tsx                 # 主容器，集成拖拽、编辑、文件夹逻辑
│   │   ├── DockItem.tsx             # 单个应用/文件夹图标
│   │   ├── DockNavigator.tsx        # 空间导航器（Focus Spaces）
│   │   ├── SpaceSwitcher.tsx        # 长按快速切换器（弧线布局 + rAF 驱动）
│   │   ├── AddIcon.tsx              # 编辑模式下的 + 按钮
│   │   └── *.module.css             # 抖动动画、间隙动画、样式
│   │
│   ├── ZenShelf/          # 灵感白板组件
│   │   ├── ZenShelf.tsx             # 主容器，管理贴纸状态和交互
│   │   ├── StickerItem.tsx          # 单个贴纸渲染和物理动画
│   │   ├── TextInput.tsx            # 文字贴纸输入框
│   │   ├── FloatingToolbar.tsx      # 浮动工具栏（样式编辑）
│   │   ├── ContextMenu.tsx          # 右键菜单
│   │   └── ZenShelf.module.css      # 贴纸样式和动画
│   │
│   ├── DragPreview/       # 拖拽预览组件
│   │   ├── DragPreview.tsx          # 统一的拖拽预览 Portal 组件
│   │   │                            # Dock 和 FolderView 共享预览逻辑
│   │   └── index.ts                 # 导出
│   │
│   ├── Editor/            # 编辑按钮
│   │   ├── Editor.tsx               # 右上角编辑按钮
│   │   └── Editor.module.css        # 悬停显示动画
│   │
│   ├── FolderView/        # 文件夹弹窗
│   │   ├── FolderView.tsx           # 文件夹内容网格布局
│   │   └── FolderView.module.css    # 缩放渐入/渐出动画
│   │
│   ├── Modal/             # 模态框组件
│   │   ├── Modal.tsx                # 通用模态框基础组件
│   │   ├── AddEditModal.tsx         # 添加/编辑应用模态框
│   │   ├── SearchEngineModal.tsx    # 搜索引擎选择器
│   │   ├── SettingsModal.tsx        # 设置面板
│   │   ├── ThemeModal.tsx           # 主题选择子组件
│   │   ├── SpaceManageMenu.tsx      # 空间管理菜单（Focus Spaces）
│   │   └── *.module.css             # 各模态框样式和动画
│   │
│   ├── Searcher/          # 搜索组件
│   │   ├── Searcher.tsx             # 搜索框
│   │   ├── SuggestionsList.tsx      # 搜索建议下拉列表
│   │   └── *.module.css             # 搜索框样式
│   │
│   ├── Settings/          # 设置按钮
│   │   ├── Settings.tsx             # 左上角设置按钮
│   │   └── Settings.module.css      # 悬停动画
│   │
│   ├── Tooltip/           # 工具提示
│   │   ├── Tooltip.tsx              # 通用 Tooltip 组件
│   │   └── Tooltip.module.css       # 淡入动画
│   │
│   └── WallpaperGallery/  # 壁纸历史画廊
│       ├── WallpaperGallery.tsx     # 壁纸历史管理
│       └── WallpaperGallery.module.css  # 网格布局
│
├── Sync/              # 云端同步模块
│   ├── SyncModal.tsx              # 同步设置面板（WebDAV 配置、测试连接、上传/下载）
│   ├── SyncModal.module.css       # 同步面板样式
│   ├── SyncButton.tsx             # 左上角云朵入口按钮
│   ├── SyncButton.module.css      # 按钮样式
│   ├── useAutoSync.ts             # 自动同步 hook（每秒检测 + 5s 防抖上传）
│   ├── webdavClient.ts            # WebDAV HTTP 客户端封装
│   ├── syncData.ts                # 数据打包/解包/指纹检测
│   └── syncManager.ts             # 同步编排/冲突检测/权限管理
│
├── PopoverPanel/          # 可复用弹出面板组件
│   ├── PopoverPanel.tsx           # 统一毛玻璃弹出壳（动画/遮罩/点击关闭）
│   └── PopoverPanel.module.css    # 弹出面板样式
│
├── constants/             # 常量配置
│   ├── gradients.ts       # 9 种渐变色预设
│   ├── layout.ts          # 布局常量和动画参数
│   │                      # - Dock/Folder 尺寸、间距、单元格大小
│   │                      # - 拖拽阈值、合并距离、延迟时间
│   │                      # - 动画曲线 (EASE_SPRING, EASE_SWIFT, EASE_SMOOTH)
│   │                      # - 动画时长 (归位、挤压、淡入淡出)
│   └── searchEngines.ts   # 搜索引擎配置
│
├── context/               # React Context 状态管理
│   ├── SpacesContext.tsx  # Focus Spaces 状态管理
│   │                      # 管理: 空间列表、当前空间、空间切换
│   │                      # 操作: addSpace、deleteSpace、renameSpace
│   │                      # 动画: isSwitching 状态控制
│   │
│   ├── DockContext.tsx    # Dock 状态管理 (三层 Context 架构)
│   │                      # DockDataContext: 低频数据 (dockItems, searchEngine)
│   │                      # DockUIContext: 中频 UI (isEditMode, openFolderId)
│   │                      # DockDragContext: 高频拖拽 (draggingItem, folderPlaceholderActive)
│   │                      # useDock(): 兼容层，组合三个 Context
│   │                      # useDockData(), useDockUI(), useDockDrag(): 专用 Hooks
│   │                      # 注意: DockContext 从 SpacesContext 获取当前空间的 apps
│   │
│   └── ThemeContext.tsx   # 主题全局状态
│
├── hooks/                 # 自定义 Hooks
│   ├── useDragBase.ts     # 共享拖拽基础逻辑
│   │                      # 提供: 状态管理、阈值检测、布局快照
│   │                      # 类型安全: BaseDragState、DockDragState、FolderDragState
│   │
│   ├── useDragAndDrop.ts  # Dock 拖拽逻辑 (基于 useDragBase)
│   │                      # 功能: 重排序、合并文件夹、拖入打开的文件夹
│   │                      # 处理: placeholder 计算、合并检测、归位动画
│   │
│   ├── useFolderDragAndDrop.ts  # 文件夹内拖拽逻辑 (基于 useDragBase)
│   │                            # 功能: 文件夹内重排、拖出到 Dock
│   │                            # 网格布局 placeholder 计算
│   │
│   ├── useSearchSuggestions.ts  # 搜索建议 Hook
│   │                            # 使用 fetch API + Chrome 扩展权限
│   │                            # Google/百度 API 自动降级
│   │
│   ├── useSystemTheme.ts        # 系统主题检测
│   │                            # 监听 prefers-color-scheme 变化
│   │
│   └── useWallpaperStorage.ts   # 壁纸存储管理
│                                # IndexedDB 存储、历史记录、缩略图生成
│
├── types/                 # TypeScript 类型定义
│   ├── space.ts           # Space、SpacesState 等（Focus Spaces）
│   ├── dock.ts            # DockItem、SearchEngine 等
│   ├── drag.ts            # Position、DragState 等
│   ├── index.ts           # 统一导出入口
│   └── css.d.ts           # CSS Modules 类型声明
│
├── utils/                 # 工具函数
│   ├── storage.ts         # localStorage 封装
│   │                      # 管理: dockItems、searchEngine、theme、wallpaper
│   │
│   ├── db.ts              # IndexedDB 封装
│   │                      # 壁纸存储: save、get、remove、getAll
│   │                      # 支持 Blob 存储，突破 5MB 限制
│   │
│   ├── animations.ts      # 动画触发函数
│   │                      # scaleFadeIn、scaleFadeOut 等动画触发
│   │
│   ├── animationUtils.ts  # 动画工具函数
│   │                      # onReturnAnimationComplete: 归位动画监听
│   │                      # transitionend + setTimeout 兜底模式
│   │
│   ├── dragUtils.ts       # 拖拽工具函数
│   │                      # 距离计算、索引计算、mousedown 处理
│   │                      # createMouseDownHandler 统一事件逻辑
│   │
│   ├── dragDetection.ts   # 拖拽区域检测
│   │                      # isMouseOverFolderView: 检测鼠标是否在文件夹内
│   │                      # isMouseOverDock: 检测鼠标是否在 Dock 内
│   │                      # isMouseOverRect: 通用矩形检测
│   │
│   ├── dragStrategies.ts  # 拖拽策略模式
│   │                      # createHorizontalStrategy: Dock 水平布局策略
│   │                      # createGridStrategy: Folder 网格布局策略
│   │                      # applyHysteresis: 滞后机制，防止抖动
│   │                      # reorderItems: 基于 ID 的安全重排序
│   │
│   ├── iconFetcher.ts     # 图标获取
│   │                      # 从 URL 获取 favicon，生成文件夹组合图标
│   │
│   └── jsonp.ts           # JSONP 跨域请求
│                          # 用于搜索建议 API 调用
│
└── styles/                # 全局样式
    └── global.css         # CSS 变量、全局样式、字体
```

---

### 架构亮点

#### 1. 状态管理优化

**三层 Context 架构**：精细化状态管理，减少不必要的重渲染

- **DockDataContext**（低频）：
  - 状态：`dockItems`、`selectedSearchEngine`
  - 更新频率：用户添加/删除应用、切换搜索引擎
  - 使用场景：需要访问应用列表的组件
  - Hook：`useDockData()`

- **DockUIContext**（中频）：
  - 状态：`isEditMode`、`openFolderId`、`folderAnchor`
  - 更新频率：进入/退出编辑模式、打开/关闭文件夹
  - 使用场景：需要访问 UI 状态的组件
  - Hook：`useDockUI()`

- **DockDragContext**（高频）：
  - 状态：`draggingItem`、`folderPlaceholderActive`
  - 更新频率：拖拽过程中频繁更新
  - 使用场景：拖拽相关组件
  - Hook：`useDockDrag()`

- **兼容层**：
  - Hook：`useDock()` 组合三个 Context，提供完整功能
  - 建议：仅在需要多个状态时使用，否则使用专用 Hook

**性能优化**：
- `useMemo` 包装 Context value，避免引用变化
- 高频状态 Ref 化：拖拽坐标、placeholder 索引使用 `useRef`
- 状态隔离：拖拽状态变化不影响数据层组件

#### 2. 模块化拖拽系统

**DragPreview 组件**：统一的拖拽预览组件
- 复用性：Dock 和 FolderView 共享同一个预览组件
- Portal 渲染：使用 `createPortal` 渲染到 body
- 动画管理：统一处理归位动画、缩放动画
- 状态支持：`isPreMerge`（Dock）、`isDraggingOut`（Folder）

**useDragBase**：提取共享拖拽逻辑
- 统一的状态管理：isDragging、currentPosition、targetPosition
- 通用的工具函数：距离计算、阈值检测、状态重置
- 类型安全：BaseDragState、DockDragState、FolderDragState

**dragStrategies**：策略模式封装差异化逻辑
- `createHorizontalStrategy()`：Dock 水平布局策略
- `createGridStrategy(columns)`：Folder 网格布局策略
- `applyHysteresis()`：滞后机制，防止抖动
- `reorderItems()`：基于 ID 的安全重排序

**dragDetection**：统一的区域检测
- `isMouseOverFolderView()`：检测鼠标是否在文件夹内
- `isMouseOverDock()`：检测鼠标是否在 Dock 内（含缓冲区）
- `isMouseOverRect()`：通用矩形检测

**layout.ts**：集中管理布局常量
- Dock/Folder 尺寸、间距
- 拖拽阈值、延迟时间
- 动画曲线和时长
- 与 CSS 变量保持同步

#### 3. 搜索建议 API (Privacy First)
- **可选权限策略**：默认不请求任何敏感权限（符合 Chrome 隐私规范）
- **按需授权**：用户开启功能时动态请求 `optional_host_permissions`
- **双 API 降级**：Google 搜索建议 API 优先，百度 API 作为备选
- **兼容性设计**：使用 Promise 包装的回调函数，同时兼容 Firefox (Gecko) 和 Chrome/Edge

---

## 🎨 设计亮点

### 1. 流畅动画

- ✅ 所有状态切换都有平滑过渡动画
- ✅ 编辑模式图标抖动效果（`jiggle` keyframes）
- ✅ 模态框缩放渐入/渐出（`scaleFadeIn/Out`）
- ✅ 拖拽时的实时视觉反馈（挤压、Z 字形流动）
- ✅ 主题切换的背景渐变过渡
- ✅ 动态纹理适配：基于背景色自动计算高饱和度/低明度纹理色
- ✅ 平滑壁纸切换动画（双缓冲淡入淡出 0.3s）
- ✅ 搜索建议下拉列表缩放渐入/渐出动画

### 2. 响应式设计

- ✅ Dock 宽度自适应内容（ResizeObserver）
- ✅ 搜索框与 Dock 宽度同步
- ✅ 文件夹弹窗自动计算列数和位置
- ✅ 智能边界检测，防止溢出屏幕

### 3. 用户体验优化

- ✅ 长按触发编辑，避免误操作
- ✅ 拖拽时的预览和插入指示器
- ✅ 智能文件夹合并和自动解散
- ✅ 壁纸历史画廊：最多保存 7 张，支持快速切换
- ✅ 编辑模态框位置跟随触发元素
- ✅ 搜索建议实时显示，支持键盘导航
- ✅ 壁纸自动压缩优化，支持 10MB+ 高清图片

### 4. 可访问性

- ✅ 完整的键盘支持（Esc 关闭弹窗，↑↓ 导航）
- ✅ 语义化 HTML 结构
- ✅ 清晰的视觉反馈
- ✅ 合理的焦点管理

### 5. 云端同步

- ✅ **WebDAV 协议**：支持标准 WebDAV 协议，兼容坚果云、Nextcloud 等
- ✅ **自动同步**：打开新标签页自动检测云端更新，本地有改动 5 秒后自动上传
- ✅ **指纹检测**：通过哈希对比判断数据是否真正变化，没改动不上传
- ✅ **冲突处理**：时间戳对比 + 用户确认模式，避免数据覆盖
- ✅ **新设备保护**：首次同步只下载不上传，确保云端数据安全
- ✅ **增量资产**：壁纸和贴纸图片作为独立文件同步，不与配置数据耦合
- ✅ **按需授权**：使用 Chrome Permissions API 动态请求 WebDAV 域名权限

### 6. 架构设计

- ✅ **三层 Context 架构**:精细化状态管理,减少 70% 的不必要重渲染
- ✅ **DragPreview 组件复用**:Dock 和 Folder 共享预览逻辑,减少代码重复
- ✅ **布局常量统一管理**:layout.ts 集中管理所有尺寸、阈值、动画参数
- ✅ **拖拽策略模式**:封装 Dock 和 Folder 的差异化逻辑,易于扩展
- ✅ **滞后机制**:applyHysteresis 防止拖拽时的抖动和误触发
- ✅ **类型安全**:完整的 TypeScript 类型定义,编译时错误检查

### 6. Zen Shelf 性能优化

- ✅ **RAF 节流优化**:拖拽和缩放使用 requestAnimationFrame 节流,避免频繁重渲染
- ✅ **React.memo 优化**:StickerItem 使用自定义比较函数,仅在必要时重渲染
- ✅ **物理动画系统**:
  - 独立的 RAF 动画循环,不影响 React 渲染
  - 基于速度的旋转角度计算,模拟真实物理效果
  - 平滑插值算法(Spring-like effect)
- ✅ **智能碰撞检测**:
  - 实时检测与 UI 区域的重叠
  - 计算最短逃逸路径,优化用户体验
  - 使用 data-ui-zone 属性标记 UI 区域
- ✅ **双缓冲机制**:拖拽时使用 pendingPosition 缓存,确保最终位置准确更新

---

## 📝 开发指南

### 添加新的搜索引擎

编辑 `src/constants/searchEngines.ts`，添加新的搜索引擎配置：

```typescript
{
  id: 'custom',
  name: 'Custom Search',
  url: 'https://example.com/search?q=',
  icon: '/path/to/icon.svg'
}
```

### 添加新的渐变色方案

编辑 `src/constants/gradients.ts`，添加新的渐变预设：

```typescript
{
  id: 'custom-gradient',
  name: 'Custom Gradient',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  solid: '#667eea'
}
```

### 自定义主题

修改 `src/styles/global.css` 中的 CSS 变量：

```css
:root {
  --primary-color: #your-color;
  --background-color: #your-background;
  /* ... 更多变量 */
}
```

---

## 📄 许可证

本项目仅供学习和个人使用。

---

<div align="center">

**Eclipse Tab** - 让每一个新标签页都成为一次愉悦的开始 ✨

Made with ❤️ using AI-assisted coding (VibeCoding)

</div>
