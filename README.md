# PDF Editor

A free, open-source PDF editor designed for researchers.

## Features

- **PDF Viewing** - Open and view PDF files with zoom support
- **Page Thumbnails** - Visual sidebar for quick page navigation
- **Page Operations**
  - Crop pages (visual crop box adjustment)
  - Rotate pages (90° clockwise)
  - Delete/restore pages
- **Export**
  - Export as PDF (with applied changes)
  - Export as image (PNG/JPG with configurable resolution)
- **Undo/Redo** - Full undo/redo support with keyboard shortcuts

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + C` | Copy page |
| `Ctrl/Cmd + V` | Paste page |
| `Delete` | Delete page |
| `Escape` | Exit crop mode |

---

## 用户使用指南

### 方式一：下载打包好的应用（推荐）

从 [Releases](../../releases) 页面下载对应平台的安装包：

- **macOS**: 下载 `PDF Editor.app`，双击即可运行
- **Windows**: 下载 `PDF Editor.exe` 或安装包
- **Linux**: 下载 `.AppImage` 或 `.deb` 包

下载后无需安装任何依赖，直接使用。

### 方式二：使用启动脚本（macOS）

双击 `启动PDF编辑器.command` 文件，脚本会自动启动服务并打开浏览器。

---

## 开发者指南

### 环境要求

- Node.js 18+
- npm 或 yarn
- Rust（打包桌面应用时需要）

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 http://localhost:5173

### 自行编译打包

#### 1. 安装 Rust

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows: 下载安装器
# https://rustup.rs/
```

#### 2. 一键打包（macOS）

双击 `一键打包.command`，脚本会自动：
- 检查 Rust 环境
- 编译前端代码
- 打包成 macOS 应用
- 打开打包结果目录

打包结果位于：`src-tauri/target/release/bundle/macos/PDF Editor.app`

#### 3. 命令行打包

```bash
# 安装依赖（首次）
npm install

# 打包
npm run tauri:build
```

打包完成后，应用位于：
- macOS: `src-tauri/target/release/bundle/macos/`
- Windows: `src-tauri/target/release/bundle/msi/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

---

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- PDF.js (PDF rendering)
- Tailwind CSS (styling)
- Tauri (desktop app packaging)

## Roadmap

- [ ] Annotation tools (highlight, underline, notes)
- [x] Page operations (crop, rotate, delete)
- [ ] OCR for scanned documents
- [ ] Metadata editing
- [ ] Citation export
- [x] Tauri desktop app

## License

MIT