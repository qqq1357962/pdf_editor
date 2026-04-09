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

## Quick Start

### Option 1: Download Pre-built App (Recommended)

Download from the [Releases](../../releases) page:

- **macOS**: Download `PDF Editor.app` or `.dmg`, double-click to run
- **Windows**: Download `.exe` or `.msi` installer
- **Linux**: Download `.AppImage` or `.deb` package

No dependencies required - just download and run.

### Option 2: Run from Source (Development)

#### macOS
Double-click `启动PDF编辑器.command` to start.

#### Windows
Double-click `启动PDF编辑器.bat` to start.

#### Manual Startup
```bash
npm install
npm run dev
```
Then open http://localhost:5173 in your browser.

---

## Building Desktop App

### Prerequisites

- Node.js 18+
- Rust (install from https://rustup.rs)

### One-click Build

#### macOS
Double-click `一键打包.command`

#### Windows
Double-click `一键打包.bat`

### Manual Build
```bash
npm install
npm run tauri:build
```

Build outputs:
- **macOS**: `src-tauri/target/release/bundle/macos/PDF Editor.app`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`

---

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- PDF.js (PDF rendering)
- Tailwind CSS (styling)
- Tauri (desktop packaging)

## Roadmap

- [ ] Annotation tools (highlight, underline, notes)
- [x] Page operations (crop, rotate, delete)
- [ ] OCR for scanned documents
- [ ] Metadata editing
- [ ] Citation export
- [x] Tauri desktop app

## License

MIT