# Eclipse Tab - 个人化新标签页浏览器扩展

Eclipse Tab 是一个浏览器插件，旨在为用户提供一个高度可定制、美观且高效的浏览器"新标签页"体验。

<img width="2000" height="1080" alt="Default" src="https://github.com/user-attachments/assets/68a369b7-3c01-44ba-b033-a1dbc38fbcd3" />

> 这是一个90%使用 VibeCoding 进行开发的项目

## ✨ 核心功能

### 🎨 主题系统
- **四种主题模式**：Default（默认渐变）、Light（浅色）、Dark（深色）、Auto（跟随系统）
- **背景自定义**：
  - Default 主题支持 9 种渐变色方案
  - Light/Dark 主题支持纯色背景
  - 支持自定义壁纸上传,使用 IndexedDB 存储,突破 5MB 限制,允许 10MB+ 高清图片
  - 壁纸历史记录:最多保存 7 张最近使用的壁纸,支持快速切换
  - 平滑壁纸切换动画:双缓冲淡入淡出效果
  - Light/Dark 主题支持 Point 和 X 两种纹理叠加
- **智能亮度检测**：自动根据背景颜色调整文字对比度

### 🚀 Dock 应用栏
- **应用管理**：添加、编辑、删除常用网站
- **文件夹组织**：支持将应用归类到文件夹
- **拖拽编辑**：完整的拖放功能，支持应用和文件夹的重新排序
- **智能图标获取**：自动获取网站图标

### 🔍 搜索功能
- **多搜索引擎支持**:Google、Bing、Baidu、DuckDuckGo
- **快速切换**:点击搜索引擎图标即可切换
- **搜索建议**:输入时自动显示搜索建议下拉列表,支持键盘导航(上下箭头选择,Enter 确认)
- **即时搜索**:输入关键词,Enter 键直达搜索结果,所选搜索引擎会通过 `storage.saveSearchEngine` 持久化,下次打开页面自动恢复。

## 📦 安装与使用

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 作为浏览器扩展安装

1. 运行 `npm run build` 构建项目
2. 在浏览器中打开扩展管理页面
   - Chrome/Edge: `chrome://extensions/`
   - Firefox: `about:addons`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `dist` 文件夹

## 🎯 完整交互逻辑

### 1️⃣ 主界面布局

应用界面分为四个主要区域：

- **顶部中央**：搜索框和搜索引擎选择器
- **底部中央**：Dock 应用栏
- **左上角**：设置按钮（悬停显示）
- **右上角**：编辑按钮（悬停显示）

### 2️⃣ 搜索交互流程

#### 基础搜索
1. **输入搜索关键词**：在搜索框中输入文本
   - 状态：搜索框获得焦点，显示文本光标
   - 反馈：输入的文本实时显示
2. **执行搜索**：按下 `Enter` 键
   - 触发：`handleSearch` 函数
   - 行为：构建搜索 URL = `搜索引擎URL + 编码后的查询词`
3. **新标签页打开**：`window.open(searchUrl, '_blank')`
   - 搜索结果在新标签页中显示
   - 当前新标签页保持不变

#### 切换搜索引擎
1. **点击搜索引擎图标**：点击搜索框左侧的搜索引擎图标
   - 触发：`onSearchEngineClick` 回调
   - 获取：点击元素的 `DOMRect` 位置信息
2. **弹出选择器**：显示搜索引擎选择模态框
   - 位置：相对于图标位置动态定位
   - 内容：显示所有预设的搜索引擎（Google、Bing、Baidu、DuckDuckGo 等）
   - 当前选中的引擎会有视觉高亮
3. **选择引擎**：点击任意搜索引擎
   - 状态更新：`setSelectedSearchEngine(engine)`
   - UI 更新：搜索框左侧图标立即更新为新引擎图标
4. **自动保存**：`storage.saveSearchEngine(engine)`
   - 持久化到 localStorage
   - 下次打开页面时自动恢复
5. **关闭模态框**：选择后自动关闭（或点击外部区域关闭）

### 3️⃣ Dock 应用栏交互

#### 查看模式（默认）

**点击应用**
- 单击应用图标 → `handleItemClick(item)`
- 判断：`item.type === 'app'` 且有 URL
- 执行：`window.open(item.url, '_blank')`
- 结果：在新标签页打开对应网站

**点击文件夹**
- 单击文件夹图标 → `handleItemClick(item, rect)`
- 判断：`item.type === 'folder'`
- 状态更新：
  - `setOpenFolderId(item.id)` - 标记打开的文件夹
  - `setFolderAnchor(rect)` - 保存触发位置
- 弹出动画：`scaleFadeIn` 缩放渐入效果（200ms）
- 位置计算：
  - 水平：文件夹图标中心对齐
  - 垂直：图标上方 24px
  - 边界检测：防止溢出屏幕边缘
- 布局：网格自动计算（最多 4 列，图标间距 8px）
- 点击文件夹内的应用 → 打开网站且文件夹保持打开
- 关闭文件夹：
  - 点击文件夹外部区域 → `scaleFadeOut` 缩放渐出（300ms）
  - 状态清理：`setOpenFolderId(null)`

**长按进入编辑模式**
- 长按任意应用图标（约 500ms）→ `onLongPressEdit` 触发
- 时间检测：`setTimeout` 500ms
- 状态切换：`setIsEditMode(true)`
- 取消条件：500ms 内松开鼠标或移动超过阈值

#### 编辑模式

**进入编辑模式的方式**：
1. 长按 Dock 中的任意图标（500ms）
2. 悬停到右上角，点击编辑按钮

**编辑模式状态切换**：
- 状态：`isEditMode = true`
- CSS 类：`dock` 元素添加 `editMode` 类
- 全局影响：同时作用于 Dock 和已打开的 FolderView

**编辑模式视觉特性**：
- **图标抖动**：
  - CSS 动画：`jiggle` keyframes
  - 周期：2 秒无限循环
  - 效果：轻微旋转摇摆（-2deg ~ +2deg）
  - 错开：每个图标有不同的 `animation-delay`
- **删除按钮**：
  - 位置：每个图标右上角
  - 动画：`fadeIn` 淡入（200ms）
  - 样式：圆形背景 + × 图标
  - 悬停：背景色加深
- **添加按钮**：
  - 位置：Dock 最左侧
  - 动画：从左侧滑入 + 淡入
  - 样式：圆形虚线边框 + + 图标
- **分隔线**：视觉分隔添加区域和应用区域

**添加应用**
1. 点击 Dock 左侧的"+"按钮
2. 弹出添加/编辑模态框
3. 输入名称和 URL
4. 自动获取网站图标
5. 点击保存

**编辑应用**
1. 在编辑模式下，点击应用图标（非删除按钮区域）
2. 弹出编辑模态框，预填充当前信息
3. 修改名称或 URL
4. 点击保存

**删除应用**
1. 在编辑模式下，点击图标右上角的"×"按钮
2. 显示确认对话框
3. 确认后删除该应用

**退出编辑模式**
- 再次点击右上角的编辑按钮

### 4️⃣ 拖拽与重排序

拖拽系统基于精密的状态机制，提供流畅的视觉反馈和智能的交互逻辑。

#### 拖拽启动机制

**鼠标按下（MouseDown）**
1. 检查：必须在编辑模式下（`isEditMode === true`）
2. 阻止默认：`e.preventDefault()` 防止文本选择
3. 记录初始状态：
   - 起始位置：`startPosition = { x: clientX, y: clientY }`
   - 偏移量：`offset` = 点击位置相对图标左上角的偏移
   - 原始索引：`originalIndex` = 图标在数组中的位置
4. 添加监听器：`mousemove` 和 `mouseup`

**移动阈值检测**
- 阈值：移动距离 > 8 像素
- 计算：`Math.hypot(currentX - startX, currentY - startY) > 8`
- 目的：区分点击和拖拽操作
- **未达阈值**：视为点击，松开后触发编辑模态框
- **达到阈值**：
  - 状态：`isDragging = true`
  - 标记：`document.body.classList.add('is-dragging')`
  - 回调：`onDragStart(item)` 通知父组件
  - 作用：禁用文件夹点击关闭，防止拖拽时误关闭
  - **布局快照**：捕获所有图标的初始位置（`layoutSnapshot`），用于后续动画计算

#### Dock 内拖拽 - 挤压动画（Squeeze Animation）

**核心设计理念**：复刻 macOS/iPadOS 的物理质感交互

1. **拖拽中状态**：
   - **原图标**：
     - 视觉隐藏：`opacity: 0; visibility: hidden`
     - 空间处理：
       - 鼠标不在 Dock 区域时：`width: 0` 完全收缩，Dock 宽度缩小
       - 鼠标在 Dock 区域时：保持 `width: 64px`，为 transform 动画预留空间
     - 目的：避免影响其他图标的 ref 索引
   - **拖拽预览**：
     - 渲染：`createPortal` 到 `document.body`
     - 位置：`position: fixed; left/top` 跟随 `currentPosition`
     - 样式：
       - 阴影：`drop-shadow(0 8px 16px rgba(0,0,0,0.3))`
       - 层级：`z-index: 9999`
       - 尺寸：64×64px
       - 指针：`pointer-events: none`

2. **实时插入位置计算**：
   - **算法：中心交叉规则**
   - 流程：
     ```
     遍历所有 Dock 图标的布局快照：
       计算图标中心 X = rect.left + rect.width / 2
       如果 mouseX < 中心 X：
         插入索引 = 当前索引
         跳出循环
     如果没有匹配：
       插入索引 = 数组长度（插入到末尾）
     ```
   - 状态更新：`setPlaceholderIndex(计算的索引)`

3. **挤压动画视觉反馈**（核心特性）：
   - **实现方式**：CSS `transform: translateX()` 平移动画
   - **动画逻辑**（`getItemTransform` 函数）：
     
     **内部拖拽（移动已有图标）**：
     ```typescript
     // 源图标保持 64px 宽度但隐藏，为动画预留空间
     if (index === draggedIndex) return 0; // 被拖拽项不移动
     
     // 向右拖拽（draggedIndex < targetSlot）
     if (index > draggedIndex && index < targetSlot) {
       return -72px; // 中间项向左移动，填补源位置
     }
     
     // 向左拖拽（draggedIndex > targetSlot）
     if (index >= targetSlot && index < draggedIndex) {
       return +72px; // 中间项向右移动，为目标位置开口
     }
     ```
     
     **外部拖入（从文件夹拖入）**：
     ```typescript
     // 插入点及之后的所有图标向右移动
     if (index >= targetSlot) {
       return +72px; // 为新图标开辟空间
     }
     ```
   
   - **过渡动画**：
     - 属性：`transition: transform 200ms cubic-bezier(0.2, 0, 0, 1)`
     - 效果：平滑的挤压和滑动
     - 触发：`placeholderIndex` 变化时自动触发
   
   - **Dock 宽度自适应**：
     - 动态占位元素：当 `getItemTransform(items.length) > 0` 时渲染
     - 宽度：等于最后一个图标的偏移量
     - 作用：确保 Dock 容器宽度随图标移动平滑扩展
     - 过渡：`transition: width 200ms cubic-bezier(0.2, 0, 0, 1)`

4. **释放鼠标（MouseUp）**：
   - **计算目标位置**：
     - 从布局快照中找到 `placeholderIndex` 对应的位置
     - 坐标：`targetX = snapshot[placeholderIndex].rect.left`
   - **触发归位动画**：
     - 状态：`isAnimatingReturn = true`
     - 目标：`targetPosition = { x, y }`
     - 动作：`targetAction = 'reorder'`
     - 数据：`targetActionData = { newItems: 计算的新数组 }`
   - **CSS 过渡**：
     - 属性：`left, top`
     - 曲线：`cubic-bezier(0.25, 0.46, 0.45, 0.94)`
     - 时长：300ms
   - **动画完成**：
     - 监听：`onTransitionEnd` 事件
     - 条件：`propertyName === 'left' || 'top'`
     - 执行：`handleAnimationComplete()`
     - 操作：`onReorder(newItems)` 更新数据
     - 清理：重置所有拖拽状态

**创建文件夹（应用合并）**

1. **悬停检测**：
   - **距离判断**：
     ```
     拖拽图标中心 = { dragX + 32, dragY + 32 }
     目标图标中心 = { targetX + 32, targetY + 32 }
     距离 = Math.hypot(dragCenterX - targetCenterX, dragCenterY - targetCenterY)
     if (距离 < 30px) → 潜在合并目标
     ```
   - **时间追踪**：
     - 首次悬停：`hoverStartTime = Date.now()`
     - 移开：`potentialMergeTarget = null`
     - 切换目标：重置计时器

2. **预合并状态（300ms 后）**：
   - **触发条件**：
     - 悬停时长：`Date.now() - hoverStartTime > 300ms`
     - 状态未激活：`!isPreMerge`
   - **状态更新**：
     - `isPreMerge = true`
     - `mergeTargetId = targetItem.id`
     - `hoveredFolderId` 或 `hoveredAppId`（根据目标类型）
   - **视觉反馈**：
     - **拖拽预览**：缩放至 0.6 倍
       - CSS：`transform: scale(0.6)`
       - 过渡：`transition: transform 200ms cubic-bezier(0.4,0,0.2,1)`
     - **目标图标**：边框高亮或脉冲效果

3. **释放执行合并**：
   - **判断**：`isPreMerge === true`
   - **分类处理**：
     - **目标是应用** (`hoveredAppId`):
       - 创建新文件夹：`{ id, name: 'Folder', type: 'folder', items: [target, dragItem] }`
       - 文件夹图标：`generateFolderIcon([target, dragItem])`
       - 数组操作：用新文件夹替换目标应用，移除拖拽应用
     - **目标是文件夹** (`hoveredFolderId`):
       - 添加到文件夹：`targetFolder.items.push(dragItem)`
       - 处理多项合并：如果拖拽的也是文件夹，合并所有 `items`
       - 更新图标：`generateFolderIcon(mergedItems)`
   - **归位动画**：拖拽预览飞到目标图标位置
   - **回调**：`onMergeFolder(dragItem, targetItem)` 或 `onDropToFolder(dragItem, targetFolder)`

**合并到现有文件夹**

- 检测逻辑与应用合并相同（距离 < 30px，悬停 300ms）
- 特殊处理：
  - 拖拽文件夹到文件夹 → 合并所有内部应用
  - 防止嵌套：文件夹内不允许再包含文件夹
- 视觉反馈：文件夹图标放大或边框高亮

#### 文件夹内拖拽 - Z 字形流动动画（Z-Shaped Flow）

**核心设计理念**：实现多行网格的物理质感交互，图标沿 Z 字形路径平滑流动

1. **前提**：文件夹已打开，处于编辑模式
2. **拖拽启动**：与 Dock 拖拽机制相同（8px 阈值）
3. **Hook**：`useFolderDragAndDrop`（独立状态管理）
4. **网格布局配置**：
   - **布局**：Flexbox + `flex-wrap: wrap`
     - 列数：最多 4 列
     - 行数：自动计算 `ceil(items.length / 4)`
     - 间距：8px
     - 单元格大小：72px（64px 图标 + 8px 间距）
   - **源项处理**（内部拖拽）：
     - 宽度收缩：`width: 0; min-width: 0`
     - 视觉隐藏：`opacity: 0; visibility: hidden`
     - 过渡：`transition: width 200ms cubic-bezier(0.2, 0, 0, 1)`
     - 作用：Flexbox 自动重排，其他图标向左填补空位

5. **Z 字形流动动画**（`getItemTransform` 函数）：
   
   **核心逻辑**：
   - **锚定区**（插入点之前）：保持 `{x: 0, y: 0}` 纹丝不动
   - **顺延区**（插入点及之后）：向后移动一格，支持跨行滑落
   
   **内部拖拽**：
   ```typescript
   // 计算移除源项后的视觉索引
   const visualIndex = index > draggedIndex ? index - 1 : index;
   
   if (visualIndex < targetSlot) {
     // 锚定区：不动
     return { x: 0, y: 0 };
   } else {
     // 顺延区：计算新位置 (visualIndex + 1)
     const currentCol = visualIndex % 4;
     const currentRow = Math.floor(visualIndex / 4);
     const newIndex = visualIndex + 1;
     const newCol = newIndex % 4;
     const newRow = Math.floor(newIndex / 4);
     
     // 同行移动：X +72px
     // 跨行滑落：X 回到第一列，Y +72px
     const xOffset = (newCol - currentCol) * 72;
     const yOffset = (newRow - currentRow) * 72;
     
     return { x: xOffset, y: yOffset };
   }
   ```
   
   **外部拖入**：
   ```typescript
   if (index < targetSlot) {
     return { x: 0, y: 0 }; // 锚定区
   } else {
     // 计算跨行偏移
     const currentCol = index % 4;
     const currentRow = Math.floor(index / 4);
     const newIndex = index + 1;
     const newCol = newIndex % 4;
     const newRow = Math.floor(newIndex / 4);
     
     return {
       x: (newCol - currentCol) * 72,
       y: (newRow - currentRow) * 72
     };
   }
   ```
   
   **跨行动画示例**：
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

6. **过渡动画**：
   - 属性：`transition: transform 200ms cubic-bezier(0.2, 0, 0, 1)`
   - 效果：平滑的 X/Y 轴联合移动
   - 触发：`placeholderIndex` 变化时自动触发

7. **容器呼吸感**（高度自适应）：
   - CSS：`transition: height 200ms cubic-bezier(0.2, 0, 0, 1)`
   - 触发：图标跨行导致行数变化
   - 效果：容器高度平滑增长/收缩
   - 示例：4 个图标（1 行）→ 拖入第 5 个 → 容器高度从 80px 增长到 160px

8. **释放完成**：
   - 归位动画到新网格位置
   - 回调：`onItemsReorder(newItems)`
   - 父组件更新文件夹的 `items` 数组
   - 图标更新：`generateFolderIcon(newItems)`

**从文件夹拖出到 Dock**

1. **拖出检测**：
   - 判断：鼠标超出文件夹容器边界
   - 状态：`isDraggingOut = true`
   - 缓冲：允许 10px 误差范围

2. **跨组件同步**：
   - **FolderView**：
     - 检测到拖出：`onDragStart(item)`
     - 传递：通过回调通知 `App`
   - **App**：
     - 状态：`setDraggingItem(item)`
     - 传递：作为 `externalDragItem` 传给 Dock
   - **Dock**：
     - 接收：`externalDragItem` prop
     - 响应：显示 placeholder 和合并反馈
     - 关键：不显示拖拽预览（由 FolderView 负责）

3. **Dock 响应**：
   - 监听 `externalDragItem` 变化
   - 添加 `mousemove` 监听器
   - 实时计算插入位置（中心交叉规则）
   - 显示挤压动画
   - 允许合并到文件夹（如果悬停 300ms）

4. **释放位置计算**：
   - Dock 计算：基于鼠标 X 坐标
   - 遍历所有 Dock 图标的 `getBoundingClientRect()`
   - 找到第一个 `中心X > 鼠标X` 的图标
   - 在该位置前插入

5. **数据更新**：
   - 回调：`handleDragFromFolder(item, { x: mouseX, y: mouseY })`
   - 操作顺序：
     1. 从原文件夹 `items` 中移除
     2. 插入到Dock 的计算位置
     3. 更新文件夹图标
     4. 触发文件夹解散检查

6. **文件夹自动解散检查**：
   - 条件检查：
     - **0 个应用**：删除整个文件夹
     - **1 个应用**：解散文件夹，应用回到 Dock
     - **2+ 个应用**：保持文件夹
   - 执行：`checkAndDissolveFolderIfNeeded(folderId, updatedItems)`
   - 如果解散：`setOpenFolderId(null)` 关闭文件夹视图

7. **归位动画**：
   - 从拖拽位置飞到 Dock 目标位置
   - 过渡：300ms cubic-bezier

**文件夹自动解散逻辑**

触发时机：
- 删除文件夹内应用时
- 拖出文件夹内应用时

解散规则（`checkAndDissolveFolderIfNeeded`）：

1. **0 个应用**：
   ```javascript
   if (folder.items.length === 0) {
     return items.filter(i => i.id !== folderId);
   }
   ```
   - 从 Dock 完全移除文件夹
   - 如果文件夹视图打开，自动关闭

2. **1 个应用**：
   ```javascript
   if (folder.items.length === 1) {
     const remainingItem = folder.items[0];
     items[folderIndex] = remainingItem;
     return items;
   }
   ```
   - 用剩余应用替换整个文件夹
   - 保持在原位置
   - 示例：`[App1, Folder[App2], App3]` → `[App1, App2, App3]`

3. **2+ 个应用**：
   - 保持文件夹
   - 仅更新图标：`generateFolderIcon(items)`

#### Dock 与文件夹跨区域拖拽

**从 Dock 拖入打开的文件夹**

1. **前提条件**：
   - 文件夹已打开（`openFolderId !== null`）
   - Dock 处于编辑模式
   - 拖拽的是应用（文件夹不能拖入文件夹）

2. **区域检测**：
   - 查询：`document.querySelector('[data-folder-view="true"]')`
   - 计算：`folderRect = element.getBoundingClientRect()`
   - 判断：
     ```javascript
     const isOverFolder = (
       mouseX >= rect.left && mouseX <= rect.right &&
       mouseY >= rect.top && mouseY <= rect.bottom
     );
     ```

3. **进入文件夹区域时**：
   - 状态：`isOverFolderView = true`
   - 清理 Dock 反馈：
     - `placeholderIndex = null`
     - `mergeTargetId = null`
     - `isPreMerge = false`
   - 原因：避免同时显示两个区域的拖拽反馈

4. **文件夹响应**：
   - FolderView 接收 `externalDragItem`
   - 计算插入位置（网格）：
     - 算法：基于鼠标坐标和网格布局
     - 计算行列：`row = floor((mouseY - padding) / 72)`, `col = floor((mouseX - padding) / 72)`
     - 转换为一维索引：`index = row * 4 + col`
   - 显示 Z 字形流动动画
   - 实时更新位置

5. **释放执行**：
   - 判断：`isOverFolderView === true`
   - 回调：`onDragToOpenFolder(item)`
   - 数据更新：
     - 从 Dock 移除：`items.filter(i => i.id !== item.id)`
     - 添加到文件夹：`folder.items.push(item)`
     - 更新文件夹图标
   - 归位动画：飞到文件夹视图中心

**拖拽时悬停自动打开文件夹**

这是一个高级 UX 功能，允许用户"拖到文件夹上自动展开"。

1. **触发条件**：
   - 在 Dock 中拖拽应用
   - 悬停在文件夹图标上
   - 距离：`中心距离 < 30px`
   - 时长：**500ms**

2. **时间区分机制**：
   - `0-300ms`：无视觉反馈
   - `300ms`：触发预合并状态（图标缩小至 0.6）
   - `500ms`：触发自动打开文件夹

   ```javascript
   const dwellTime = Date.now() - hoverStartTime;
   
   if (dwellTime > 500 && targetType === 'folder' && !isPreMerge) {
     // 打开文件夹而不是合并
     onHoverOpenFolder(dragItem, targetFolder);
   } else if (dwellTime > 300 && !isPreMerge) {
     // 进入预合并状态
     setIsPreMerge(true);
     setMergeTargetId(targetId);
   }
   ```

3. **自动打开执行**：
   - 回调：`onHoverOpenFolder(dragItem, targetFolder)`
   - 状态更新：
     - `setOpenFolderId(targetFolder.id)`
     - `setFolderAnchor(targetRect)` - 文件夹图标位置
   - UI 响应：文件夹弹窗打开（`scaleFadeIn` 动画）
   - 重置：`potentialMergeTarget = null`（避免重复触发）

4. **继续拖入**：
   - 文件夹打开后，用户保持按住鼠标
   - 自动切换到"拖入打开的文件夹"逻辑
   - 无缝过渡，无需额外操作

**边界情况处理**

1. **拖拽文件夹到文件夹**：
   - 检测：`dragItem.type === 'folder' && targetItem.type === 'folder'`
   - 阻止：不显示合并反馈，不允许拖入
   - 原因：防止无限嵌套

2. **拖出 Dock 缓冲区**：
   - 缓冲：Dock rect 外扩 50px
   - 检测：鼠标超出缓冲区
   - 响应：清除所有拖拽反馈
     - `placeholderIndex = null`
     - `mergeTargetId = null`
     - `isPreMerge = false`

3. **快速移动切换目标**：
   - 检测：`potentialMergeTarget` 变化
   - 响应：重置计时器 `hoverStartTime = Date.now()`
   - 效果：避免误触发合并或打开

4. **点击与拖拽区分**：
   - 8px 移动阈值
   - 未达阈值：`isDragging` 保持 `false`
   - 松开鼠标：清理状态，允许点击事件触发

5. **归位动画中的状态保护**：
   - 动画期间：`isAnimatingReturn = true`
   - 禁止：启动新的拖拽
   - 原因：避免状态混乱

6. **多指或快速连续操作**：
   - 全局标记：`document.body.classList.add('is-dragging')`
   - 禁用：文件夹点击关闭
   - 清理：拖拽结束后移除类

#### 拖拽系统架构总结

**模块化设计**：
- **useDragBase**：共享拖拽基础逻辑
  - 状态管理：`isDragging`、`currentPosition`、`targetPosition`
  - 布局快照：捕获初始位置，避免动态计算
  - 阈值检测：区分点击和拖拽
  - Refs 同步：高频状态使用 ref 避免重渲染

- **useDragAndDrop**（Dock）：
  - 继承 `useDragBase`
  - 实现：水平挤压动画、合并检测、归位动画
  - 策略：`createHorizontalStrategy()`

- **useFolderDragAndDrop**（文件夹）：
  - 继承 `useDragBase`
  - 实现：Z 字形流动动画、跨行滑落、容器呼吸
  - 策略：`createGridStrategy(4)`

**工具函数**：
- **dragStrategies.ts**：策略模式，封装 Dock 和 Folder 的差异化逻辑
- **dragDetection.ts**：共享区域检测，确保 Dock 和 Folder 判断一致
- **dragUtils.ts**：通用工具函数（距离计算、索引计算、事件处理）

**性能优化**：
- 布局快照：拖拽开始时捕获，避免实时查询 DOM
- Ref 化高频状态：`placeholderIndex`、`currentPosition` 使用 ref
- 直接 DOM 操作：拖拽预览位置通过 `style.left/top` 更新，避免 React 重渲染
- CSS 硬件加速：`transform` 和 `will-change` 优化动画性能

### 5️⃣ 设置面板交互

#### 打开设置
1. 悬停到左上角区域
2. 设置图标渐显
3. 点击设置图标
4. 弹出设置模态框（位于图标下方）



#### 主题选择

**默认主题（Default）**
- 点击左侧的星形图标
- 启用渐变背景模式（使用 `gradientId` 控制）
- 禁用纹理选项（仅 Light/Dark 支持纹理）
- 显示 8 个渐变色选项，若未选择渐变则使用 `DEFAULT_THEME_COLORS` 的默认纯色
- 通过 `setGradientId`、`setTexture`、`setFollowSystem` 进行交互，默认主题下可同时使用纹理（仅在 Light/Dark 时生效）

**Light / Dark / Auto 主题**
- 点击右侧的 Sun（Light）、Moon（Dark）、Monitor（Auto）图标
- 选中主题的按钮会有蓝色高亮滑块
- 启用纹理选项（显示纹理选择区域），可选择 Point 或 X 纹理
- 显示 8 个纯色选项
- 开启 **跟随系统** 时，主题随系统暗/亮模式自动切换，且不自动重置纹理设置

**Auto 模式**
- 自动跟随系统主题（明暗模式）
- 保持与系统同步

#### 背景自定义

**颜色/渐变选择**
1. 点击任意色块
2. 背景立即切换
3. 选中色块显示蓝色边框
4. 第一个带星号的色块代表主题默认色

**纹理选择（仅 Light/Dark 主题）**
- 显示三个选项：无纹理（斜杠）、Point 纹理、X 纹理
- 点击切换纹理
- 纹理会叠加在背景色上方

**上传壁纸**
1. 点击壁纸上传按钮（图片图标）
2. 选择本地图片（最大 2MB）
3. 壁纸立即应用
4. 壁纸按钮显示蓝色边框
5. 右侧显示壁纸预览
6. 点击预览右上角的 × 可删除壁纸

**壁纸快速复用**
- 删除当前壁纸后，上次使用的壁纸会在预览区半透明显示
- 点击预览区 → 快速重新应用上次的壁纸

#### 关闭设置
- 点击设置面板外的任意区域
- 按 `Esc` 键
- 设置会自动保存

### 6️⃣ 数据持久化

所有用户设置和数据都会自动保存:

- **Dock 应用列表**:实时保存每次增删改(localStorage)
- **搜索引擎选择**:自动保存(localStorage)
- **主题设置**:包括主题模式、跟随系统、纹理选项(localStorage)
- **背景选择**:渐变 ID、壁纸 ID(localStorage)
- **壁纸存储**:使用 IndexedDB 存储壁纸数据,突破 localStorage 5MB 限制,支持 10MB+ 高清壁纸
- **壁纸历史**:最多保存 7 张最近使用的壁纸,包含缩略图(IndexedDB)
- **图标缓存**:获取的网站图标会缓存(localStorage)

## 🛠️ 技术栈

### 核心框架
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具

### 主要技术特性
- **CSS Modules**:组件样式隔离
- **CSS Variables**:动态主题系统
- **React Context API**:全局状态管理(ThemeContext、DockContext)
- **Custom Hooks**:模块化拖拽系统(useDragBase、useDragAndDrop、useFolderDragAndDrop)、系统主题检测、壁纸存储、搜索建议
- **LocalStorage**:轻量数据持久化(设置、应用列表)
- **IndexedDB**:大容量壁纸存储,突破 5MB 限制
- **FileReader API**:壁纸上传与压缩
- **ResizeObserver**:Dock 宽度自适应
- **Favicon API**:自动获取网站图标
- **JSONP**:跨域搜索建议 API 调用
- **TypeScript 类型系统**:模块化类型定义,统一导出入口

### 项目结构

```
src/
├── assets/                 # 静态资源
│   ├── icons/             # 应用图标资源
│   └── textures/          # 背景纹理图片(Point、X 纹理)
│
├── components/             # React 组件
│   ├── Background/        # 背景组件
│   │   ├── Background.tsx           # 双缓冲背景切换,支持壁纸/渐变/纹理
│   │   └── Background.module.css    # 淡入淡出过渡动画
│   │
│   ├── Dock/              # Dock 应用栏
│   │   ├── Dock.tsx                 # 主容器,集成拖拽、编辑、文件夹逻辑
│   │   ├── DockItem.tsx             # 单个应用/文件夹图标,支持点击、删除、编辑
│   │   ├── AddIcon.tsx              # 编辑模式下的"+"添加按钮
│   │   └── *.module.css             # 抖动动画、间隙动画、样式
│   │
│   ├── Editor/            # 编辑按钮
│   │   ├── Editor.tsx               # 右上角编辑按钮,切换编辑模式
│   │   └── Editor.module.css        # 悬停显示动画
│   │
│   ├── FolderView/        # 文件夹弹窗
│   │   ├── FolderView.tsx           # 文件夹内容网格布局,支持拖拽重排
│   │   └── FolderView.module.css    # 缩放渐入/渐出动画,网格布局
│   │
│   ├── Modal/             # 模态框组件
│   │   ├── Modal.tsx                # 通用模态框基础组件,处理定位和关闭
│   │   ├── AddEditModal.tsx         # 添加/编辑应用模态框,表单验证
│   │   ├── SearchEngineModal.tsx    # 搜索引擎选择器
│   │   ├── SettingsModal.tsx        # 设置面板,主题/背景/壁纸配置
│   │   ├── ThemeModal.tsx           # 主题选择子组件(Default/Light/Dark/Auto)
│   │   └── *.module.css             # 各模态框样式和动画
│   │
│   ├── Searcher/          # 搜索组件
│   │   ├── Searcher.tsx             # 搜索框,集成搜索引擎切换
│   │   ├── SuggestionsList.tsx      # 搜索建议下拉列表,支持键盘导航
│   │   └── *.module.css             # 搜索框样式,建议列表动画
│   │
│   ├── Settings/          # 设置按钮
│   │   ├── Settings.tsx             # 左上角设置按钮,悬停显示
│   │   └── Settings.module.css      # 悬停动画
│   │
│   ├── Tooltip/           # 工具提示
│   │   ├── Tooltip.tsx              # 通用 Tooltip 组件,自动定位
│   │   └── Tooltip.module.css       # 淡入动画
│   │
│   └── WallpaperGallery/  # 壁纸历史画廊
│       ├── WallpaperGallery.tsx     # 壁纸历史管理,最多 7 张,支持删除
│       └── WallpaperGallery.module.css  # 网格布局,缩略图样式
│
├── constants/             # 常量配置
│   ├── gradients.ts       # 9 种渐变色预设(紫粉、粉蓝、微光等)
│   └── searchEngines.ts   # 搜索引擎配置(Google、Bing、Baidu、DuckDuckGo)
│
├── context/               # React Context 状态管理
│   ├── DockContext.tsx    # Dock 状态管理(双层 Context 架构)
│   │                      # DockDataContext: 低频数据状态(dockItems、searchEngine)
│   │                      # DockUIContext: 中频 UI 状态(isEditMode、openFolderId)
│   │                      # useDock(): 兼容层,组合两个 Context
│   │
│   └── ThemeContext.tsx   # 主题全局状态:theme、followSystem、wallpaper
│                          # 背景值计算、亮度检测、壁纸管理
│
├── hooks/                 # 自定义 Hooks
│   ├── useDragBase.ts     # 共享拖拽基础逻辑
│   │                      # 提供:状态管理、阈值检测、refs 同步
│   │                      # 返回:dragState、placeholderIndex、itemRefs 等
│   │
│   ├── useDragAndDrop.ts  # Dock 拖拽逻辑(基于 useDragBase)
│   │                      # 功能:重排序、合并文件夹、拖入打开的文件夹
│   │                      # 处理:placeholder 计算、合并检测、归位动画
│   │
│   ├── useFolderDragAndDrop.ts  # 文件夹内拖拽逻辑(基于 useDragBase)
│   │                            # 功能:文件夹内重排、拖出到 Dock
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
│   ├── dock.ts            # DockItem、SearchEngine、AppState 等
│   ├── drag.ts            # Position、DragState、PlaceholderState 等
│   ├── index.ts           # 统一导出入口
│   └── css.d.ts           # CSS Modules 类型声明
│
├── utils/                 # 工具函数
│   ├── storage.ts         # localStorage 封装
│   │                      # 管理:dockItems、searchEngine、theme、wallpaper 等
│   │
│   ├── db.ts              # IndexedDB 封装
│   │                      # 壁纸存储:save、get、remove、getAll
│   │                      # 支持 Blob 存储,突破 5MB 限制
│   │
│   ├── animations.ts      # 动画工具函数
│   │                      # scaleFadeIn、scaleFadeOut 等动画触发
│   │
│   ├── dragUtils.ts       # 拖拽工具函数
│   │                      # 距离计算、索引计算、mousedown 处理
│   │                      # createMouseDownHandler 统一事件逻辑
│   │
│   ├── iconFetcher.ts     # 图标获取
│   │                      # 从 URL 获取 favicon,生成文件夹组合图标
│   │
│   └── jsonp.ts           # JSONP 跨域请求
│                          # 用于搜索建议 API 调用
│
└── styles/                # 全局样式
    └── global.css         # CSS 变量、全局样式、字体
```

### 架构亮点

#### 状态管理
- **双层 Context 架构**: 避免不必要的 Re-render
  - `DockDataContext`: 低频数据状态(dockItems、searchEngine)
  - `DockUIContext`: 中频 UI 状态(isEditMode、openFolderId、draggingItem)
  - `useDock()`: 兼容层,组合两个 Context
- **useMemo 优化**: Context value 使用 useMemo 包装,避免引用变化触发重渲染
- **高频状态 Ref 化**: 拖拽坐标、placeholder 索引等使用 useRef 管理

#### 模块化拖拽系统
- **useDragBase**: 提取共享拖拽逻辑,减少代码重复
  - 统一的状态管理: isDragging、currentPosition、targetPosition 等
  - 通用的工具函数: 距离计算、阈值检测、状态重置
- **dragUtils**: 拖拽工具函数库
  - 位置计算: calculateDistance、calculateDistanceToCenter、isPointInRect
  - 索引计算: findClosestItemIndex、calculateInsertIndex
  - 事件处理: createMouseDownHandler 统一 mousedown 逻辑
- **类型安全**: BaseDragState、DockDragState、FolderDragState 清晰的类型层次

#### 搜索建议 API
- **Chrome Extension 权限**: 利用扩展的跨域特权,使用标准 fetch API
- **双 API 降级**: Google 搜索建议 API 优先,百度 API 作为备选
- **安全性**: 移除 JSONP,避免 XSS 风险

## 🎨 设计亮点

### 1. 流畅动画
- 所有状态切换都有平滑过渡动画
- 编辑模式图标抖动效果
- 模态框缩放渐入/渐出
- 拖拽时的实时视觉反馈
- 主题切换的背景渐变过渡
- **平滑壁纸切换动画**:双缓冲层淡入淡出(0.5s),无闪烁切换
- 搜索建议下拉列表缩放渐入/渐出动画

### 2. 响应式设计
- Dock 宽度自适应内容
- 搜索框与 Dock 宽度同步
- 文件夹弹窗自动计算列数和位置
- 智能边界检测，防止溢出屏幕

### 3. 用户体验优化
- 长按触发编辑,避免误操作
- 拖拽时的预览和插入指示器
- 智能文件夹合并和自动解散
- 壁纸历史画廊:最多保存 7 张壁纸,支持快速切换和删除
- 编辑模态框位置跟随触发元素
- 搜索建议实时显示,支持键盘导航
- 壁纸自动压缩优化,支持 10MB+ 高清图片

### 4. 可访问性
- 完整的键盘支持（Esc 关闭弹窗）
- 语义化 HTML 结构
- 清晰的视觉反馈
- 合理的焦点管理

## 📝 开发说明

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

## 📄 许可证

本项目仅供学习和个人使用。

---

**Eclipse Tab** - 让每一个新标签页都成为一次愉悦的开始 ✨
