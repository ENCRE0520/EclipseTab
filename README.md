<div align="center">

# 🌟 Eclipse Tab

### 新一代浏览器新标签页扩展

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Available-brightgreen?logo=googlechrome)](https://chromewebstore.google.com/detail/eclipse-tab/lcnmbgidemidmfffplkpflpdpmfdgabp)
[![Edge Add-ons](https://img.shields.io/badge/Edge-Available-blue?logo=microsoftedge)](https://microsoftedge.microsoft.com/addons/detail/eclipse-tab/omlbmhdkajhbcdhjdgjalelbbmjoekfj)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Available-orange?logo=firefox)](https://addons.mozilla.org/zh-CN/firefox/addon/eclipse-tab/)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

[English](README-en.md) | 简体中文

![Eclipse Tab 预览](https://github.com/user-attachments/assets/f7674f4f-3830-43bc-8ac4-00fdc0ceec7d)

**✨ 灵感白板 · 🌐 多重空间 · 🎨 美观高效**

</div>

<br>

> 💡 **AI 驱动开发** - 本项目 90% 使用 AI 辅助编码（VibeCoding）开发

Eclipse Tab 是一款功能强大的浏览器新标签页扩展，以 **Zen Shelf（灵感白板）** 和 **Focus Spaces（多重空间）** 为核心，让你的浏览器成为创意工作站和效率中心。

<br>

## 📖 目录

- [✨ 产品简介](#-产品简介)
- [📦 安装使用](#-安装使用)
- [🎯 核心功能](#-核心功能)
- [🌟 更多功能](#-更多功能)

<br>

## ✨ 产品简介

Eclipse Tab 将你的浏览器新标签页变成一个强大的工作台：

- ✏️ **Zen Shelf（灵感白板）** - 随时随地记录灵感，支持文字和图片贴纸
- 🌐 **Focus Spaces（多重空间）** - 为不同场景创建独立工作空间
- 🚀 **Dock 应用栏** - macOS 风格的应用管理，优雅高效
- 🔍 **智能搜索** - 多引擎支持，实时搜索建议
- 🎨 **精美主题** - 多种主题模式，自定义壁纸

<br>

## 📦 安装使用

### 🎯 从扩展商店安装（推荐）

<<<<<<< HEAD
=======
<div align="left">

>>>>>>> 1404110d2391785e104a45e84dde2462893cef9d
| 浏览器 | 安装链接 |
|:---|:---|
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png" width="24" /> **Chrome** | [Chrome 扩展商店](https://chromewebstore.google.com/detail/eclipse-tab/lcnmbgidemidmfffplkpflpdpmfdgabp?utm_source=ext_app_menu) |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" width="24" /> **Edge** | [Edge 扩展商店](https://microsoftedge.microsoft.com/addons/detail/eclipse-tab/omlbmhdkajhbcdhjdgjalelbbmjoekfj?hl=zh-cn) |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png" width="24" /> **Firefox** | [Firefox 扩展商店（审核中）](https://addons.mozilla.org/zh-CN/firefox/addon/eclipse-tab/) |

### 🛠️ 手动安装

<details>
<summary>📋 点击展开手动安装步骤</summary>

<br>

**Chrome / Edge**
1. 下载项目并构建（`npm run build`）
2. 打开 `chrome://extensions/` 或 `edge://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"，选择 `dist` 文件夹

**Firefox**
1. 从 [Releases](../../releases) 下载 `.xpi` 文件
2. 拖入 Firefox 浏览器窗口并确认安装

</details>

### 🚀 开始使用

安装后打开新标签页：

```
1️⃣ 添加应用 → 点击编辑按钮添加常用网站
2️⃣ 创建空间 → 右键 Navigator 创建工作空间
3️⃣ 记录灵感 → 双击页面添加贴纸
4️⃣ 个性化 → 设置主题和壁纸
```

<br>

## 🎯 核心功能

<table>
<tr>
<td width="50%" valign="top">

### ✏️ Zen Shelf - 灵感白板

> 将新标签页变成自由的创意空间，像桌面便签纸和照片墙一样随时记录灵感。

#### 📝 文字贴纸
- ⚡ 双击页面或右键菜单快速创建
- 🎨 自定义字体颜色、对齐方式、字号
- 💾 支持编辑和导出为图片

#### 🖼️ 图片贴纸
- 📤 支持上传、粘贴（Ctrl+V）、拖拽添加
- 🔍 鼠标滚轮缩放大小
- 📋 可复制到剪贴板或导出 PNG

#### ⚡ 交互特性
- 🖱️ 自由拖拽，自动避让界面元素
- 🎭 创意模式隐藏所有 UI，专注创作
- ⌨️ 快捷键：双击添加、Ctrl+V 粘贴、Delete 删除

</td>
<td width="50%" valign="top">

### 🌐 Focus Spaces - 多重空间

> 为不同场景创建独立工作空间，每个空间有独立的应用列表，实现工作、学习、娱乐的完美分离。

#### 🗂️ 空间管理
- ➕ 右键 Navigator 按钮创建新空间
- ✏️ 自定义空间名称，置顶常用空间
- 💾 支持导入导出空间配置（JSON 格式）

#### 🔄 快速切换
- 🖱️ 点击 Navigator 循环切换空间
- ✨ 流畅的切换动画

#### 🎯 使用场景
- 💼 **工作**：邮箱、项目管理、开发工具
- 📚 **学习**：在线课程、笔记、文档
- 🎮 **娱乐**：视频、音乐、社交媒体

</td>
</tr>
</table>

<br>

## 🌟 更多功能

### 🚀 Dock 应用栏

**macOS 风格的应用管理**

- **快速访问** - 一键打开常用网站
- **文件夹整理** - 拖拽应用到应用上自动创建文件夹
- **拖拽编辑** - 自由调整应用顺序，流畅的动画效果
- **智能图标** - 自动获取网站图标

### 🔍 智能搜索

**高效的搜索体验**

- **多引擎支持** - Google、Bing、百度、DuckDuckGo
- **快速切换** - 点击图标即可切换搜索引擎
- **可选实时建议** - 开启可选权限后，输入时自动显示搜索建议
- **键盘导航** - 上下键选择，Enter 确认

### 🎨 精美主题

**个性化你的新标签页**

**四种主题模式**
- **Default（默认）** - 精美渐变背景，9 种渐变色可选
- **Light（浅色）** - 简洁明亮
- **Dark（深色）** - 护眼舒适
- **Auto（自动）** - 跟随系统自动切换

**自定义背景**
- 丰富的渐变色和纯色选择
- **纹理叠加效果** - 动态适配背景色的纹理（Point、X 纹理），更自然融合
- **上传自定义壁纸** - 支持 10MB+ 高清图片，自动压缩存储
- **壁纸历史记录** - 保存最近 7 张壁纸，一键快速切换

**智能适配**
- 自动调整文字颜色，确保可读性
- 任何背景下都有良好的视觉效果

---

##  使用技巧

### Zen Shelf 技巧

- **创意模式**:使用创意模式获得纯净的创作空间,专注灵感记录
- **导出分享**:文字贴纸支持导出为图片,方便分享到社交媒体
- **快速复制**:图片贴纸可以直接复制到剪贴板,快速粘贴到其他应用
- **层级管理**:点击贴纸自动置顶,确保重要内容始终可见
- **智能避让**:贴纸会自动避开 Dock 和搜索栏,不用担心被遮挡
- **物理反馈**:拖拽时的旋转和阴影动画提供真实的物理反馈

### Focus Spaces 技巧

- **场景分离**:为工作、学习、娱乐创建不同空间,保持专注
- **备份配置**:使用导出功能备份重要空间配置,防止数据丢失
- **快速访问**:置顶常用空间,提高切换效率
- **独立管理**:每个空间独立管理应用,互不干扰
- **团队协作**:导出空间配置分享给团队成员,统一工作环境

### Dock 技巧

- **快速编辑**:长按图标快速进入编辑模式,无需点击编辑按钮
- **文件夹整理**:拖拽应用到应用上创建文件夹,保持 Dock 整洁
- **自动解散**:文件夹少于 2 个应用时自动解散,无需手动清理
- **悬停打开**:悬停在文件夹上 500ms 自动打开,提高操作效率

---

## 📝 关于项目

Eclipse Tab 是一个使用现代 Web 技术构建的浏览器扩展项目，90% 的代码通过 AI 辅助编码（VibeCoding）完成。

**技术栈**
- React 18 + TypeScript
- Vite 构建工具
- CSS Modules

**数据存储**
- 所有数据自动保存到本地
- 使用 localStorage 和 IndexedDB
- 支持大容量壁纸存储（突破 5MB 限制）

---

## 🙏 致谢

感谢所有使用和支持 Eclipse Tab 的用户！

如果你喜欢这个项目，欢迎：
- ⭐ Star 本项目
- 🐛 提交 Issue 反馈问题
- 💡 分享你的使用体验

---

## 📄 许可证

GNU GPLv3

---

<div align="center">

**Eclipse Tab** - 让每一个新标签页都成为一次愉悦的开始 ✨

Made with ❤️ using AI-assisted coding (VibeCoding)

</div>
