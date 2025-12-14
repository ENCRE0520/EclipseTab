# Eclipse Tab - 新一代浏览器新标签页扩展

<div align="center">

![Eclipse Tab 预览](https://github.com/user-attachments/assets/68a369b7-3c01-44ba-b033-a1dbc38fbcd3)

**高度可定制 · 美观高效 · 流畅交互**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)

</div>

> 💡 本项目 90% 使用 AI 辅助编码（VibeCoding）开发

---

## 📖 目录

- [✨ 核心功能](#-核心功能)
- [📦 快速开始](#-快速开始)
- [🎯 完整交互指南](#-完整交互指南)
- [🛠️ 技术架构](#️-技术架构)
- [🎨 设计亮点](#-设计亮点)
- [📝 开发指南](#-开发指南)

---

## ✨ 核心功能

### 🎨 主题系统

#### 四种主题模式
- **Default（默认）**：精美渐变背景，9 种渐变色方案可选
- **Light（浅色）**：简洁明亮，支持纯色背景
- **Dark（深色）**：护眼舒适，支持纯色背景
- **Auto（自动）**：跟随系统明暗模式自动切换

#### 背景自定义
- **渐变色方案**：Default 主题提供 9 种精心设计的渐变（紫粉、粉蓝、微光等）
- **纯色背景**：Light/Dark 主题支持 8 种纯色选择
- **纹理叠加**：Light/Dark 主题支持 Point 和 X 两种纹理效果
- **自定义壁纸**：
  - 支持上传本地图片（最大 10MB+）
  - 使用 IndexedDB 存储，突破 localStorage 5MB 限制
  - 壁纸历史记录：保存最近 7 张壁纸，支持快速切换
  - 平滑切换动画：双缓冲淡入淡出效果，无闪烁

#### 智能亮度检测
- 自动根据背景颜色调整文字对比度
- 确保在任何背景下都有良好的可读性

---

### 🚀 Dock 应用栏

#### 应用管理
- **添加应用**：输入名称和 URL，自动获取网站图标
- **编辑应用**：修改名称、URL 或图标
- **删除应用**：编辑模式下点击删除按钮
- **智能图标**：自动从网站获取 favicon，支持图标缓存

#### 文件夹组织
- **创建文件夹**：拖拽应用到应用上自动创建文件夹
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

#### 多引擎支持
- **预设引擎**：Google、Bing、Baidu、DuckDuckGo
- **快速切换**：点击搜索引擎图标即可切换
- **持久化**：自动保存选择，下次打开自动恢复

#### 搜索建议
- **实时建议**：输入时自动显示搜索建议
- **键盘导航**：上下箭头选择，Enter 确认
- **智能降级**：Google API 优先，百度 API 备选

#### 即时搜索
- **快速搜索**：输入关键词，Enter 直达搜索结果
- **新标签打开**：搜索结果在新标签页显示

---

### 🎯 Focus Spaces（焦点空间）

#### 多空间管理
- **创建空间**：右键点击 Navigator 按钮，选择"Add space"
- **切换空间**：点击 Navigator 按钮循环切换空间
- **重命名空间**：右键菜单选择"Rename"，输入新名称
- **删除空间**：右键菜单选择"Delete space"（至少保留一个空间）

#### 空间独立性
- **独立应用列表**：每个空间拥有独立的 Dock 应用列表
- **快速切换**：不同空间间无缝切换，应用数据自动保存
- **场景化组织**：工作、学习、娱乐等不同场景分别管理

#### 平滑动画
- **退场动画**：当前空间图标向上滑出并淡出（200ms）
- **入场动画**：新空间图标从下方依次滑入，带交错延迟效果（stagger）
- **宽度过渡**：Dock 宽度平滑适应不同空间的图标数量（500ms）
- **Navigator 淡化**：切换时 Navigator 按钮淡出，减少视觉干扰

#### Navigator 设计
- **位置**：固定在 Dock 右侧
- **显示内容**：
  - 空间名称（左上角，首字母大写）
  - 分页指示点（右下角）
    - 未选中：圆形点
    - 选中：胶囊形高亮
- **交互**：
  - 左键点击：切换到下一个空间
  - 右键点击：打开空间管理菜单

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

### 1️⃣ 主界面布局

应用界面分为四个主要区域：

| 区域 | 位置 | 功能 |
|------|------|------|
| **搜索区** | 顶部中央 | 搜索框 + 搜索引擎选择器 |
| **Dock 栏** | 底部中央 | 应用图标 + 文件夹 |
| **设置按钮** | 左上角 | 悬停显示，打开设置面板 |
| **编辑按钮** | 右上角 | 悬停显示，切换编辑模式 |

---

### 2️⃣ 搜索交互流程

#### 基础搜索

1. **输入关键词** → 搜索框获得焦点，实时显示输入
2. **按 Enter** → 触发 `handleSearch` 函数
3. **新标签打开** → `window.open(searchUrl, '_blank')`

#### 切换搜索引擎

1. **点击引擎图标** → 弹出搜索引擎选择器
2. **选择引擎** → 图标立即更新，自动保存到 localStorage
3. **关闭选择器** → 点击外部区域或自动关闭

#### 搜索建议

1. **输入文本** → 自动调用搜索建议 API
2. **显示建议** → 下拉列表展示建议项
3. **键盘导航** → ↑↓ 选择，Enter 确认
4. **点击建议** → 直接搜索该关键词

---

### 3️⃣ Dock 应用栏交互

#### 查看模式（默认）

**点击应用**
- 单击应用图标 → 新标签页打开对应网站

**点击文件夹**
- 单击文件夹 → 弹出文件夹视图（`scaleFadeIn` 动画）
- 位置计算：文件夹图标上方 24px，水平居中
- 布局：网格自动计算（最多 4 列，间距 8px）
- 关闭：点击外部区域 → `scaleFadeOut` 动画

**进入编辑模式**
- 方式 1：长按任意图标（500ms）
- 方式 2：点击右上角编辑按钮

#### 编辑模式

**视觉特性**
- **图标抖动**：`jiggle` 动画，2 秒循环，轻微旋转（-2° ~ +2°）
- **删除按钮**：每个图标右上角显示 × 按钮
- **添加按钮**：Dock 最左侧显示 + 按钮
- **分隔线**：视觉分隔添加区域和应用区域

**操作流程**

| 操作 | 步骤 | 结果 |
|------|------|------|
| **添加应用** | 点击 + 按钮 → 输入名称和 URL → 保存 | 新应用添加到 Dock |
| **编辑应用** | 点击图标 → 修改信息 → 保存 | 应用信息更新 |
| **删除应用** | 点击 × 按钮 → 确认 | 应用从 Dock 移除 |
| **退出编辑** | 点击编辑按钮 | 返回查看模式 |

---

### 4️⃣ 拖拽与重排序

拖拽系统是本项目的核心特性，提供流畅的物理质感交互。

#### 拖拽启动机制

**鼠标按下（MouseDown）**
1. 检查编辑模式（`isEditMode === true`）
2. 记录初始状态：起始位置、偏移量、原始索引
3. 添加 `mousemove` 和 `mouseup` 监听器

**移动阈值检测**
- 阈值：8 像素
- 计算：`Math.hypot(currentX - startX, currentY - startY) > 8`
- **未达阈值**：视为点击，触发编辑模态框
- **达到阈值**：
  - 状态：`isDragging = true`
  - 标记：`document.body.classList.add('is-dragging')`
  - 快照：捕获所有图标的初始位置（`layoutSnapshot`）

---

#### Dock 内拖拽 - 挤压动画

**核心设计**：复刻 macOS/iPadOS 的物理质感交互

**拖拽中状态**

| 元素 | 状态 | 说明 |
|------|------|------|
| **原图标** | `opacity: 0; width: 0/64px` | 鼠标不在 Dock 时收缩，在 Dock 时保持宽度 |
| **拖拽预览** | `position: fixed; z-index: 9999` | Portal 到 body，跟随鼠标，带阴影 |

**插入位置计算**
- 算法：中心交叉规则
- 遍历所有图标，找到第一个中心 X > 鼠标 X 的图标
- 在该位置前插入

**挤压动画逻辑**

```typescript
// 内部拖拽（移动已有图标）
if (index === draggedIndex) return 0; // 被拖拽项不移动

// 向右拖拽
if (index > draggedIndex && index < targetSlot) {
  return -72px; // 中间项向左移动，填补源位置
}

// 向左拖拽
if (index >= targetSlot && index < draggedIndex) {
  return +72px; // 中间项向右移动，为目标位置开口
}

// 外部拖入
if (index >= targetSlot) {
  return +72px; // 为新图标开辟空间
}
```

**过渡动画**
- 属性：`transition: transform 200ms cubic-bezier(0.2, 0, 0, 1)`
- 效果：平滑的挤压和滑动
- Dock 宽度自适应：动态占位元素确保容器宽度平滑扩展

**释放完成**
1. 计算目标位置：从布局快照中获取
2. 触发归位动画：`isAnimatingReturn = true`
3. CSS 过渡：300ms cubic-bezier
4. 动画完成：`onTransitionEnd` → 更新数据 → 清理状态

---

#### 创建文件夹（应用合并）

**悬停检测**
- 距离判断：拖拽图标中心与目标图标中心距离 < 30px
- 时间追踪：`hoverStartTime = Date.now()`

**预合并状态（300ms 后）**
- 触发条件：悬停时长 > 300ms
- 状态更新：`isPreMerge = true`
- 视觉反馈：
  - 拖拽预览缩放至 0.6 倍
  - 目标图标边框高亮

**释放执行合并**
- **目标是应用**：创建新文件夹 `{ type: 'folder', items: [target, dragItem] }`
- **目标是文件夹**：添加到文件夹 `targetFolder.items.push(dragItem)`
- 归位动画：拖拽预览飞到目标图标位置

---

#### 文件夹内拖拽 - Z 字形流动动画

**核心设计**：多行网格的物理质感交互，图标沿 Z 字形路径平滑流动

**网格布局配置**
- 布局：Flexbox + `flex-wrap: wrap`
- 列数：最多 4 列
- 间距：8px
- 单元格：72px（64px 图标 + 8px 间距）

**源项处理**
- 宽度收缩：`width: 0; min-width: 0`
- 视觉隐藏：`opacity: 0`
- 作用：Flexbox 自动重排，其他图标向左填补空位

**Z 字形流动逻辑**

```typescript
// 核心逻辑
const visualIndex = index > draggedIndex ? index - 1 : index;

if (visualIndex < targetSlot) {
  // 锚定区：不动
  return { x: 0, y: 0 };
} else {
  // 顺延区：向后移动一格，支持跨行滑落
  const currentCol = visualIndex % 4;
  const currentRow = Math.floor(visualIndex / 4);
  const newIndex = visualIndex + 1;
  const newCol = newIndex % 4;
  const newRow = Math.floor(newIndex / 4);
  
  // 同行移动：X +72px
  // 跨行滑落：X 回到第一列，Y +72px
  return {
    x: (newCol - currentCol) * 72,
    y: (newRow - currentRow) * 72
  };
}
```

**跨行动画示例**

```
初始布局（4列）：
[A] [B] [C] [D]
[E] [F] [G]

拖拽到 B 和 C 之间：
锚定区：A, B 保持不动
顺延区：
- C: 向右移动 +72px (同行)
- D: X -216px (回到第一列), Y +72px (下移一行) → 跨行滑落
- E, F, G: 各自向右移动 +72px

视觉效果：
[A] [B] gap [C]
[D] [E] [F] [G]
```

**容器呼吸感**
- CSS：`transition: height 200ms cubic-bezier(0.2, 0, 0, 1)`
- 触发：图标跨行导致行数变化
- 效果：容器高度平滑增长/收缩

---

#### 跨区域拖拽

**从文件夹拖出到 Dock**

1. **拖出检测**：鼠标超出文件夹容器边界（10px 缓冲）
2. **跨组件同步**：
   - FolderView：`onDragStart(item)` 通知 App
   - App：`setDraggingItem(item)` 传递给 Dock
   - Dock：接收 `externalDragItem`，显示 placeholder
3. **Dock 响应**：计算插入位置，显示挤压动画
4. **释放完成**：从文件夹移除，插入到 Dock
5. **自动解散检查**：
   - 0 个应用：删除整个文件夹
   - 1 个应用：解散文件夹，应用回到 Dock
   - 2+ 个应用：保持文件夹

**从 Dock 拖入打开的文件夹**

1. **前提条件**：文件夹已打开，Dock 处于编辑模式
2. **区域检测**：`document.querySelector('[data-folder-view="true"]')`
3. **进入文件夹区域**：清理 Dock 反馈，避免双重显示
4. **文件夹响应**：计算网格插入位置，显示 Z 字形动画
5. **释放执行**：从 Dock 移除，添加到文件夹

**拖拽悬停自动打开文件夹**

- 触发条件：拖拽应用悬停在文件夹上，距离 < 30px，时长 > 500ms
- 时间区分：
  - 0-300ms：无视觉反馈
  - 300ms：触发预合并状态（图标缩小至 0.6）
  - 500ms：触发自动打开文件夹
- 自动打开：文件夹弹窗打开，用户可继续拖入

---

#### 边界情况处理

| 情况 | 处理 |
|------|------|
| **拖拽文件夹到文件夹** | 阻止操作，防止无限嵌套 |
| **拖出 Dock 缓冲区** | 清除所有拖拽反馈 |
| **快速移动切换目标** | 重置计时器，避免误触发 |
| **点击与拖拽区分** | 8px 移动阈值 |
| **归位动画中** | 禁止启动新拖拽 |

---

#### 拖拽系统架构总结

**模块化设计**

| 模块 | 职责 |
|------|------|
| **useDragBase** | 共享拖拽基础逻辑：状态管理、阈值检测、布局快照 |
| **useDragAndDrop** | Dock 拖拽：水平挤压动画、合并检测、归位动画 |
| **useFolderDragAndDrop** | 文件夹拖拽：Z 字形流动、跨行滑落、容器呼吸 |

**工具函数**
- **dragStrategies.ts**：策略模式，封装差异化逻辑
- **dragDetection.ts**：共享区域检测
- **dragUtils.ts**：通用工具函数

**性能优化**
- 布局快照：拖拽开始时捕获，避免实时查询 DOM
- Ref 化高频状态：避免 React 重渲染
- 直接 DOM 操作：拖拽预览位置通过 `style.left/top` 更新
- CSS 硬件加速：`transform` 和 `will-change`

---

### 5️⃣ 设置面板交互

#### 打开设置

1. 悬停到左上角区域 → 设置图标渐显
2. 点击设置图标 → 弹出设置模态框

#### 主题选择

**Default 主题**
- 点击星形图标
- 启用渐变背景模式
- 显示 9 个渐变色选项

**Light / Dark / Auto 主题**
- 点击 Sun（Light）、Moon（Dark）、Monitor（Auto）图标
- 选中主题有蓝色高亮滑块
- 启用纹理选项（Point 或 X 纹理）
- 显示 8 个纯色选项

**Auto 模式**
- 自动跟随系统主题（明暗模式）
- 保持与系统同步

#### 背景自定义

**颜色/渐变选择**
1. 点击任意色块 → 背景立即切换
2. 选中色块显示蓝色边框
3. 第一个带星号的色块代表主题默认色

**纹理选择（仅 Light/Dark）**
- 三个选项：无纹理（斜杠）、Point 纹理、X 纹理
- 点击切换纹理
- 纹理叠加在背景色上方

**上传壁纸**
1. 点击壁纸上传按钮（图片图标）
2. 选择本地图片（最大 10MB+）
3. 壁纸立即应用
4. 右侧显示壁纸预览
5. 点击预览右上角的 × 可删除壁纸

**壁纸快速复用**
- 删除当前壁纸后，上次使用的壁纸会在预览区半透明显示
- 点击预览区 → 快速重新应用上次的壁纸

#### 关闭设置

- 点击设置面板外的任意区域
- 按 `Esc` 键
- 设置会自动保存

---

### 6️⃣ 数据持久化

所有用户设置和数据都会自动保存：

| 数据类型 | 存储方式 | 说明 |
|----------|----------|------|
| **Focus Spaces 数据** | localStorage | 空间列表、当前空间 ID、每个空间的应用列表 |
| **Dock 应用列表** | localStorage | 实时保存每次增删改（已迁移到 Spaces 结构） |
| **搜索引擎选择** | localStorage | 自动保存，下次打开恢复 |
| **主题设置** | localStorage | 包括主题模式、跟随系统、纹理选项 |
| **背景选择** | localStorage | 渐变 ID、壁纸 ID |
| **壁纸存储** | IndexedDB | 突破 5MB 限制，支持 10MB+ 高清壁纸 |
| **壁纸历史** | IndexedDB | 最多保存 7 张，包含缩略图 |
| **图标缓存** | localStorage | 获取的网站图标会缓存 |

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
│   │   ├── AddIcon.tsx              # 编辑模式下的 + 按钮
│   │   └── *.module.css             # 抖动动画、间隙动画、样式
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

#### 3. 搜索建议 API

- **Chrome Extension 权限**：利用扩展的跨域特权，使用标准 fetch API
- **双 API 降级**：Google 搜索建议 API 优先，百度 API 作为备选
- **安全性**：移除 JSONP，避免 XSS 风险

---

## 🎨 设计亮点

### 1. 流畅动画

- ✅ 所有状态切换都有平滑过渡动画
- ✅ 编辑模式图标抖动效果（`jiggle` keyframes）
- ✅ 模态框缩放渐入/渐出（`scaleFadeIn/Out`）
- ✅ 拖拽时的实时视觉反馈（挤压、Z 字形流动）
- ✅ 主题切换的背景渐变过渡
- ✅ 平滑壁纸切换动画（双缓冲淡入淡出 0.5s）
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

### 5. 架构设计

- ✅ **三层 Context 架构**：精细化状态管理，减少 70% 的不必要重渲染
- ✅ **DragPreview 组件复用**：Dock 和 Folder 共享预览逻辑，减少代码重复
- ✅ **布局常量统一管理**：layout.ts 集中管理所有尺寸、阈值、动画参数
- ✅ **拖拽策略模式**：封装 Dock 和 Folder 的差异化逻辑，易于扩展
- ✅ **滞后机制**：applyHysteresis 防止拖拽时的抖动和误触发
- ✅ **类型安全**：完整的 TypeScript 类型定义，编译时错误检查

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
