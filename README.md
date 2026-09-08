<div align="center">

# Eclipse Tab

把新标签页变成你的灵感白板和常用网站入口。

[![Chrome Web Store](https://img.shields.io/badge/Chrome-安装-brightgreen?logo=googlechrome)](https://chromewebstore.google.com/detail/eclipse-tab/lcnmbgidemidmfffplkpflpdpmfdgabp)
[![Edge Add-ons](https://img.shields.io/badge/Edge-安装-blue?logo=microsoftedge)](https://microsoftedge.microsoft.com/addons/detail/eclipse-tab/omlbmhdkajhbcdhjdgjalelbbmjoekfj)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-安装-orange?logo=firefox)](https://addons.mozilla.org/zh-CN/firefox/addon/eclipse-tab/)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

[English](README-en.md) · 简体中文

![Eclipse Tab 预览](https://github.com/user-attachments/assets/f7674f4f-3830-43bc-8ac4-00fdc0ceec7d)

</div>

在 Eclipse Tab 里，你可以随手贴下一句话、一张图或一个链接，再用不同空间把工作、学习和生活分开。所有内容默认保存在浏览器本地，也可以通过自己的 WebDAV 服务同步。

## 它有什么不同

### Zen Shelf：让灵感有处停留

Zen Shelf 是一块自由排布的轻量画布。文字、图片和链接可以像贴纸一样留在桌面上，随手记录，也随心整理。链接会呈现为带标题与封面的卡片，误删的内容也可以从回收站找回。

### Focus Spaces：一套新标签页，多种使用场景

每个空间都有独立的内容与 Dock。工作、学习和生活不必挤在一起，切换空间，也是在切换当下的状态。

### Dock：常用的，始终顺手

Dock 将常用网站收在视线边缘，需要时触手可及，不需要时安静退后。它支持文件夹、书签批量导入与自动图标，让整理这件事本身尽可能少打扰你。

此外，你还可以使用自定义壁纸、渐变与明暗主题，并通过完整备份或 WebDAV 在设备间迁移数据。

## 一些不容易发现的操作

| 操作 | 效果 |
| --- | --- |
| 鼠标移到页面左上角 / 右上角 | 打开设置 / Dock 编辑模式 |
| 长按 Dock 最右侧的空间按钮并滑动 | 快速跳转到其他空间 |
| 双击空白处 | 新建文字贴纸 |
| 双击文字贴纸 | 编辑内容 |
| `Ctrl+V` | 将剪贴板图片贴到页面上 |
| `Shift` + 点击 | 多选贴纸，再一起拖动或删除 |
| 拖到屏幕边缘 | 放入回收站 |
| 输入 URL 后点击链接按钮 | 转为链接卡片 |
| `Ctrl+1` ～ `Ctrl+7` | 快速更换贴纸颜色 |

贴纸文字支持 `[文字](https://example.com)` 格式的链接。回收站中的内容可以左滑恢复、右滑永久删除。

## 安装

直接从扩展商店安装：

- [Chrome 扩展商店](https://chromewebstore.google.com/detail/eclipse-tab/lcnmbgidemidmfffplkpflpdpmfdgabp?utm_source=ext_app_menu)
- [Microsoft Edge 扩展商店](https://microsoftedge.microsoft.com/addons/detail/eclipse-tab/omlbmhdkajhbcdhjdgjalelbbmjoekfj?hl=zh-cn)
- [Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/eclipse-tab/)

<details>
<summary>从源码安装 Chrome / Edge 版本</summary>

```bash
npm install
npm run build
```

然后打开 `chrome://extensions/` 或 `edge://extensions/`，开启「开发者模式」，选择「加载已解压的扩展程序」，并载入生成的 `dist` 文件夹。

</details>

<details>
<summary>在 Zen Browser 中使用</summary>

按 Firefox 的方式安装后，打开 `about:config`，将 `zen.urlbar.replace-newtab` 设为 `false`。

</details>

## 数据、备份与同步

Eclipse Tab 没有后端。空间、设置和贴纸默认保存在浏览器的 `localStorage` 与 IndexedDB 中，不会自动上传到第三方服务器。

- **完整备份：** 设置 → 导出备份，保存 `.zip` 文件；恢复时选择「导入备份」。
- **单个空间：** 右键空间按钮，导入或导出 JSON；也可以一次导出全部空间。
- **WebDAV 同步：** 在同步面板填写自己的服务器地址与账号。壁纸和贴纸图片默认不同步，需要时可手动开启。

建议在卸载扩展或清除浏览器数据前先导出完整备份。

## 参与项目

欢迎提交 Issue、改进建议或 Pull Request。

感谢 [@SheepTAO](https://github.com/SheepTAO) 贡献 WebDAV 同步功能，以及 [@lycohana](https://github.com/lycohana) 贡献文字贴纸的超链接解析逻辑。

本项目采用 [GNU GPLv3](LICENSE) 许可证。
