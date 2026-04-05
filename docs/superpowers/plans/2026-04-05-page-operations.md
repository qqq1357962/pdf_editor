# PDF页面操作功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现PDF页面操作功能，包括删除、裁剪、旋转、复制粘贴、导出PDF和图片。

**Architecture:** 使用侧边栏缩略图 + 主预览区布局，通过PageState数据结构管理每页状态，pdf-lib处理PDF导出，Canvas处理裁剪和图片导出。

**Tech Stack:** React, TypeScript, pdfjs-dist (已有), pdf-lib (新增), file-saver (新增)

---

## File Structure

```
src/
├── config/
│   └── pdf-editor.config.ts    # 新增：配置文件
├── components/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx         # 新增：侧边栏容器
│   │   └── Thumbnail.tsx       # 新增：缩略图卡片
│   ├── PDFViewer.tsx           # 修改：支持旋转和裁剪
│   ├── CropOverlay.tsx         # 新增：裁剪框层
│   ├── Toolbar.tsx             # 修改：添加导出按钮
│   └── ExportDialog.tsx        # 新增：导出对话框
├── hooks/
│   ├── usePDF.ts               # 保留：PDF加载
│   └── useEditorState.ts       # 新增：编辑器状态管理
├── utils/
│   ├── pdf-export.ts           # 新增：PDF导出逻辑
│   ├── image-export.ts         # 新增：图片导出逻辑
│   └── auto-crop.ts            # 新增：自动裁剪算法
└── types/
    └── pdf.ts                  # 修改：扩展类型定义
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install pdf-lib and file-saver**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm install pdf-lib file-saver && npm install -D @types/file-saver
```

Expected: Dependencies installed successfully

- [ ] **Step 2: Verify installation**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm list pdf-lib file-saver
```

Expected: Both packages listed with versions

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add package.json package-lock.json && git commit -m "chore: add pdf-lib and file-saver dependencies"
```

---

### Task 2: Create Configuration File

**Files:**
- Create: `src/config/pdf-editor.config.ts`

- [ ] **Step 1: Create config directory and file**

Create `src/config/pdf-editor.config.ts`:

```typescript
export const config = {
  crop: {
    autoCropMargin: 0.03,
    whitePixelThreshold: 250,
    minCropSize: 0.05,
  },
  history: {
    maxCacheSizeMB: 30,
  },
  thumbnail: {
    width: 120,
    quality: 0.8,
  },
  export: {
    defaultImageFormat: 'png' as const,
    imageResolutions: [1, 2, 3],
  },
  shortcuts: {
    copy: 'c',
    paste: 'v',
    undo: 'z',
    redo: 'y',
    delete: 'Delete',
  },
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/config/ && git commit -m "feat: add pdf-editor configuration file"
```

---

### Task 3: Extend Type Definitions

**Files:**
- Modify: `src/types/pdf.ts`

- [ ] **Step 1: Update types file**

Replace `src/types/pdf.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
export type PDFPageProxy = pdfjsLib.PDFPageProxy;

// Crop box with left-bottom origin (x-right, y-up)
export interface CropBox {
  x1: number;  // left-bottom x (%)
  y1: number;  // left-bottom y (%)
  x2: number;  // right-top x (%)
  y2: number;  // right-top y (%)
}

export interface PageState {
  sourcePageIndex: number;       // Index in source PDF (0-based)
  rotation: 0 | 90 | 180 | 270;  // Rotation in degrees
  cropBox: CropBox | null;       // Crop region
  deleted: boolean;              // Soft delete flag
}

export interface EditorState {
  pages: PageState[];
  selectedIndex: number;
  hasUnappliedChanges: boolean;
  mode: 'view' | 'crop';
  fileName: string;
}

export interface PDFState {
  document: PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  loading: boolean;
  error: string | null;
}

export interface PDFViewerProps {
  url?: string;
  file?: File;
}

export interface RenderParameters {
  canvasContext: CanvasRenderingContext2D;
  viewport: pdfjsLib.PageViewport;
}

// Clipboard for copy/paste
export interface PageClipboard {
  sourcePageIndex: number;
  rotation: 0 | 90 | 180 | 270;
  cropBox: CropBox | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/types/pdf.ts && git commit -m "feat: extend type definitions for page operations"
```

---

### Task 4: Create useEditorState Hook

**Files:**
- Create: `src/hooks/useEditorState.ts`

- [ ] **Step 1: Create editor state hook**

Create `src/hooks/useEditorState.ts`:

```typescript
import { useState, useCallback, useMemo } from 'react';
import type { PageState, EditorState, CropBox, PageClipboard } from '../types/pdf';

const initialEditorState: EditorState = {
  pages: [],
  selectedIndex: 0,
  hasUnappliedChanges: false,
  mode: 'view',
  fileName: '',
};

// History stacks for undo/redo
let historyStack: PageState[][] = [];
let futureStack: PageState[][] = [];

export function useEditorState() {
  const [state, setState] = useState<EditorState>(initialEditorState);
  const [clipboard, setClipboard] = useState<PageClipboard | null>(null);

  // Initialize pages from PDF
  const initPages = useCallback((totalPages: number, fileName: string) => {
    const pages: PageState[] = Array.from({ length: totalPages }, (_, i) => ({
      sourcePageIndex: i,
      rotation: 0 as const,
      cropBox: null,
      deleted: false,
    }));
    historyStack = [];
    futureStack = [];
    setState({
      pages,
      selectedIndex: 0,
      hasUnappliedChanges: false,
      mode: 'view',
      fileName,
    });
  }, []);

  // Save state before making changes (for undo)
  const saveToHistory = useCallback(() => {
    historyStack.push(JSON.parse(JSON.stringify(state.pages)));
    futureStack = []; // Clear redo stack on new action
  }, [state.pages]);

  // Undo
  const undo = useCallback(() => {
    if (historyStack.length === 0) return;
    futureStack.push(JSON.parse(JSON.stringify(state.pages)));
    const prevPages = historyStack.pop()!;
    setState(prev => ({
      ...prev,
      pages: prevPages,
      hasUnappliedChanges: true,
    }));
  }, [state.pages]);

  // Redo
  const redo = useCallback(() => {
    if (futureStack.length === 0) return;
    historyStack.push(JSON.parse(JSON.stringify(state.pages)));
    const nextPages = futureStack.pop()!;
    setState(prev => ({
      ...prev,
      pages: nextPages,
      hasUnappliedChanges: true,
    }));
  }, [state.pages]);

  // Select page
  const selectPage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.max(0, Math.min(index, prev.pages.length - 1)),
      mode: 'view',
    }));
  }, []);

  // Get visible pages (not deleted)
  const visiblePages = useMemo(() => {
    return state.pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => !page.deleted);
  }, [state.pages]);

  // Get current selected page state
  const currentPageState = useMemo(() => {
    return state.pages[state.selectedIndex] || null;
  }, [state.pages, state.selectedIndex]);

  // Delete page
  const deletePage = useCallback((index: number) => {
    saveToHistory();
    setState(prev => {
      const newPages = [...prev.pages];
      if (newPages[index]) {
        newPages[index] = { ...newPages[index], deleted: true };
      }
      // Find next visible page
      const visibleIndices = newPages
        .map((p, i) => (!p.deleted ? i : -1))
        .filter(i => i >= 0);
      const newSelectedIndex = visibleIndices.includes(prev.selectedIndex)
        ? prev.selectedIndex
        : visibleIndices[0] ?? 0;
      return {
        ...prev,
        pages: newPages,
        selectedIndex: newSelectedIndex,
        hasUnappliedChanges: true,
      };
    });
  }, [saveToHistory]);

  // Restore deleted page
  const restorePage = useCallback((index: number) => {
    saveToHistory();
    setState(prev => {
      const newPages = [...prev.pages];
      if (newPages[index]) {
        newPages[index] = { ...newPages[index], deleted: false };
      }
      return {
        ...prev,
        pages: newPages,
        hasUnappliedChanges: true,
      };
    });
  }, [saveToHistory]);

  // Rotate page
  const rotatePage = useCallback((index: number) => {
    saveToHistory();
    setState(prev => {
      const newPages = [...prev.pages];
      if (newPages[index]) {
        const current = newPages[index].rotation;
        newPages[index] = {
          ...newPages[index],
          rotation: ((current + 90) % 360) as 0 | 90 | 180 | 270,
        };
      }
      return {
        ...prev,
        pages: newPages,
        hasUnappliedChanges: true,
      };
    });
  }, [saveToHistory]);

  // Set crop box
  const setCropBox = useCallback((index: number, cropBox: CropBox | null) => {
    saveToHistory();
    setState(prev => {
      const newPages = [...prev.pages];
      if (newPages[index]) {
        newPages[index] = { ...newPages[index], cropBox };
      }
      return {
        ...prev,
        pages: newPages,
        hasUnappliedChanges: true,
      };
    });
  }, [saveToHistory]);

  // Enter crop mode
  const enterCropMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'crop' }));
  }, []);

  // Exit crop mode
  const exitCropMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'view' }));
  }, []);

  // Copy page
  const copyPage = useCallback((index: number) => {
    const page = state.pages[index];
    if (!page) return;
    setClipboard({
      sourcePageIndex: page.sourcePageIndex,
      rotation: page.rotation,
      cropBox: page.cropBox ? { ...page.cropBox } : null,
    });
  }, [state.pages]);

  // Paste page after index
  const pastePage = useCallback((afterIndex: number) => {
    if (!clipboard) return;
    saveToHistory();
    setState(prev => {
      const newPage: PageState = {
        sourcePageIndex: clipboard.sourcePageIndex,
        rotation: clipboard.rotation,
        cropBox: clipboard.cropBox ? { ...clipboard.cropBox } : null,
        deleted: false,
      };
      const newPages = [...prev.pages];
      newPages.splice(afterIndex + 1, 0, newPage);
      return {
        ...prev,
        pages: newPages,
        selectedIndex: afterIndex + 1,
        hasUnappliedChanges: true,
      };
    });
  }, [clipboard, saveToHistory]);

  // Apply changes (clear undo history)
  const applyChanges = useCallback(() => {
    if (!state.hasUnappliedChanges) return false;
    historyStack = [];
    futureStack = [];
    setState(prev => ({ ...prev, hasUnappliedChanges: false }));
    return true;
  }, [state.hasUnappliedChanges]);

  // Reset state
  const resetState = useCallback(() => {
    historyStack = [];
    futureStack = [];
    setState(initialEditorState);
    setClipboard(null);
  }, []);

  return {
    ...state,
    clipboard,
    visiblePages,
    currentPageState,
    initPages,
    selectPage,
    deletePage,
    restorePage,
    rotatePage,
    setCropBox,
    enterCropMode,
    exitCropMode,
    copyPage,
    pastePage,
    undo,
    redo,
    applyChanges,
    resetState,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/hooks/useEditorState.ts && git commit -m "feat: add useEditorState hook for page state management"
```

---

### Task 5: Create Auto-Crop Utility

**Files:**
- Create: `src/utils/auto-crop.ts`

- [ ] **Step 1: Create auto-crop utility**

Create `src/utils/auto-crop.ts`:

```typescript
import { config } from '../config/pdf-editor.config';
import type { CropBox } from '../types/pdf';

interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function isBlankPixel(r: number, g: number, b: number): boolean {
  const threshold = config.crop.whitePixelThreshold;
  return r > threshold && g > threshold && b > threshold;
}

function findContentBounds(pixels: PixelData): { left: number; right: number; top: number; bottom: number } | null {
  const { width, height, data } = pixels;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (!isBlankPixel(r, g, b)) {
        hasContent = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (!hasContent) return null;
  return { left, right, top, bottom };
}

export async function detectAutoCrop(
  canvas: HTMLCanvasElement
): Promise<CropBox | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const bounds = findContentBounds({
    width,
    height,
    data: imageData.data,
  });

  if (!bounds) return null;

  // Add margin
  const margin = config.crop.autoCropMargin;
  const pageWidth = width;
  const pageHeight = height;

  // Convert to percentages with left-bottom origin
  // Canvas has top-left origin, so we need to flip y
  const x1 = Math.max(0, bounds.left / pageWidth - margin);
  const x2 = Math.min(1, bounds.right / pageWidth + margin);
  const y1 = Math.max(0, (pageHeight - bounds.bottom) / pageHeight - margin);
  const y2 = Math.min(1, (pageHeight - bounds.top) / pageHeight + margin);

  // Ensure minimum size
  if (x2 - x1 < config.crop.minCropSize || y2 - y1 < config.crop.minCropSize) {
    return null;
  }

  return {
    x1: Math.round(x1 * 100) / 100,
    y1: Math.round(y1 * 100) / 100,
    x2: Math.round(x2 * 100) / 100,
    y2: Math.round(y2 * 100) / 100,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/utils/auto-crop.ts && git commit -m "feat: add auto-crop detection utility"
```

---

### Task 6: Create PDF Export Utility

**Files:**
- Create: `src/utils/pdf-export.ts`

- [ ] **Step 1: Create PDF export utility**

Create `src/utils/pdf-export.ts`:

```typescript
import { PDFDocument, degrees } from 'pdf-lib';
import type { PageState } from '../types/pdf';

export async function exportPDF(
  sourcePdfBytes: ArrayBuffer,
  pages: PageState[],
  outputFileName: string
): Promise<void> {
  const sourceDoc = await PDFDocument.load(sourcePdfBytes);
  const destDoc = await PDFDocument.create();

  // Filter non-deleted pages
  const pagesToExport = pages.filter(p => !p.deleted);

  for (const pageState of pagesToExport) {
    const [copiedPage] = await destDoc.copyPages(sourceDoc, [pageState.sourcePageIndex]);

    // Apply rotation
    if (pageState.rotation !== 0) {
      copiedPage.setRotation(degrees(pageState.rotation));
    }

    // Apply crop
    if (pageState.cropBox) {
      const { width, height } = copiedPage.getSize();
      // Convert percentages to points
      // cropBox uses left-bottom origin (x-right, y-up)
      // pdf-lib uses left-bottom origin too
      const cropLeft = width * pageState.cropBox.x1;
      const cropBottom = height * pageState.cropBox.y1;
      const cropRight = width * pageState.cropBox.x2;
      const cropTop = height * pageState.cropBox.y2;

      copiedPage.setCropBox(
        cropLeft,
        cropBottom,
        cropRight - cropLeft,
        cropTop - cropBottom
      );
    }

    destDoc.addPage(copiedPage);
  }

  const pdfBytes = await destDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/utils/pdf-export.ts && git commit -m "feat: add PDF export utility"
```

---

### Task 7: Create Image Export Utility

**Files:**
- Create: `src/utils/image-export.ts`

- [ ] **Step 1: Create image export utility**

Create `src/utils/image-export.ts`:

```typescript
import { saveAs } from 'file-saver';
import type { CropBox } from '../types/pdf';

export async function exportImage(
  canvas: HTMLCanvasElement,
  cropBox: CropBox | null,
  format: 'png' | 'jpg',
  resolution: number,
  fileName: string
): Promise<void> {
  let sourceCanvas = canvas;

  // Apply crop if needed
  if (cropBox) {
    const { x1, y1, x2, y2 } = cropBox;
    const cropWidth = (x2 - x1) / 100 * canvas.width;
    const cropHeight = (y2 - y1) / 100 * canvas.height;
    const cropX = x1 / 100 * canvas.width;
    // Convert from left-bottom origin to top-left
    const cropY = (1 - y2 / 100) * canvas.height;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth * resolution;
    croppedCanvas.height = cropHeight * resolution;
    const ctx = croppedCanvas.getContext('2d')!;

    ctx.drawImage(
      canvas,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth * resolution, cropHeight * resolution
    );
    sourceCanvas = croppedCanvas;
  } else if (resolution !== 1) {
    // Just scale for resolution
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = canvas.width * resolution;
    scaledCanvas.height = canvas.height * resolution;
    const ctx = scaledCanvas.getContext('2d')!;
    ctx.drawImage(
      canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, scaledCanvas.width, scaledCanvas.height
    );
    sourceCanvas = scaledCanvas;
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpg' ? 0.92 : undefined;

  sourceCanvas.toBlob(
    (blob) => {
      if (blob) {
        saveAs(blob, fileName);
      }
    },
    mimeType,
    quality
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/utils/image-export.ts && git commit -m "feat: add image export utility"
```

---

### Task 8: Create Thumbnail Component

**Files:**
- Create: `src/components/Sidebar/Thumbnail.tsx`

- [ ] **Step 1: Create Thumbnail component**

Create `src/components/Sidebar/Thumbnail.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, PageState } from '../../types/pdf';
import { config } from '../../config/pdf-editor.config';

interface ThumbnailProps {
  pdfDocument: PDFDocumentProxy;
  pageState: PageState;
  pageIndex: number;
  isSelected: boolean;
  onClick: () => void;
}

export function Thumbnail({
  pdfDocument,
  pageState,
  pageIndex,
  isSelected,
  onClick,
}: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || pageState.deleted) return;

    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDocument.getPage(pageState.sourcePageIndex + 1) as PDFPageProxy;
        if (cancelled) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        // Calculate thumbnail size
        const viewport = page.getViewport({ scale: 1 });
        const scale = config.thumbnail.width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Apply rotation
        const rotation = pageState.rotation;
        const finalViewport = page.getViewport({ scale, rotation });

        canvas.width = finalViewport.width;
        canvas.height = finalViewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: finalViewport,
        }).promise;

        if (!cancelled) {
          setLoaded(true);
        }
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
      }
    };

    renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pageState.sourcePageIndex, pageState.rotation, pageState.deleted]);

  if (pageState.deleted) {
    return (
      <div
        className="relative cursor-pointer opacity-30"
        onClick={onClick}
      >
        <div
          className="bg-gray-300 rounded flex items-center justify-center"
          style={{ width: config.thumbnail.width, height: 150 }}
        >
          <span className="text-gray-500 text-xs">Deleted</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          {pageIndex + 1}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative cursor-pointer rounded transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2'
          : 'hover:ring-1 hover:ring-gray-400'
      }`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className={`rounded bg-white transition-opacity ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="text-center text-xs text-gray-600 mt-1">
        {pageIndex + 1}
      </div>
      {pageState.cropBox && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full" title="Cropped" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/Sidebar/ && git commit -m "feat: add Thumbnail component for sidebar"
```

---

### Task 9: Create Sidebar Component

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `src/components/Sidebar/Sidebar.tsx`:

```typescript
import type { PDFDocumentProxy, PageState } from '../../types/pdf';
import { Thumbnail } from './Thumbnail';

interface SidebarProps {
  pdfDocument: PDFDocumentProxy | null;
  pages: PageState[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onEnterCropMode: () => void;
  mode: 'view' | 'crop';
}

export function Sidebar({
  pdfDocument,
  pages,
  selectedIndex,
  onSelectPage,
  onDeletePage,
  onRotatePage,
  onEnterCropMode,
  mode,
}: SidebarProps) {
  const currentPage = pages[selectedIndex];
  const isDeleted = currentPage?.deleted ?? false;

  if (!pdfDocument) {
    return (
      <div className="w-40 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <p className="text-gray-400 text-sm text-center px-4">
          Open a PDF to see pages
        </p>
      </div>
    );
  }

  return (
    <div className="w-40 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Thumbnails list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((pageState, index) => (
          <Thumbnail
            key={index}
            pdfDocument={pdfDocument}
            pageState={pageState}
            pageIndex={index}
            isSelected={index === selectedIndex}
            onClick={() => onSelectPage(index)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        <div className="flex gap-1">
          <button
            onClick={() => onEnterCropMode()}
            disabled={mode === 'crop' || isDeleted}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crop
          </button>
          <button
            onClick={() => onRotatePage(selectedIndex)}
            disabled={isDeleted}
            className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rotate
          </button>
        </div>
        <button
          onClick={() => isDeleted ? null : onDeletePage(selectedIndex)}
          disabled={mode === 'crop'}
          className={`w-full px-2 py-1 text-xs rounded ${
            isDeleted
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeleted ? 'Restore' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/Sidebar/Sidebar.tsx && git commit -m "feat: add Sidebar component"
```

---

### Task 10: Create CropOverlay Component

**Files:**
- Create: `src/components/CropOverlay.tsx`

- [ ] **Step 1: Create CropOverlay component**

Create `src/components/CropOverlay.tsx`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import type { CropBox } from '../types/pdf';
import { config } from '../config/pdf-editor.config';
import { detectAutoCrop } from '../utils/auto-crop';

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  initialCropBox: CropBox | null;
  onConfirm: (cropBox: CropBox) => void;
  onCancel: () => void;
  sourceCanvas: HTMLCanvasElement | null;
}

export function CropOverlay({
  canvasWidth,
  canvasHeight,
  initialCropBox,
  onConfirm,
  onCancel,
  sourceCanvas,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [cropBox, setCropBox] = useState<CropBox>(
    initialCropBox || { x1: 5, y1: 5, x2: 95, y2: 95 }
  );
  const [dragging, setDragging] = useState<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert cropBox to canvas coordinates (left-bottom origin to canvas top-left)
  const toCanvasCoords = useCallback((cb: CropBox) => {
    return {
      left: (cb.x1 / 100) * canvasWidth,
      right: (cb.x2 / 100) * canvasWidth,
      top: (1 - cb.y2 / 100) * canvasHeight,
      bottom: (1 - cb.y1 / 100) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  // Draw overlay
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    const coords = toCanvasCoords(cropBox);

    // Draw dark overlay outside crop region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, coords.top); // Top
    ctx.fillRect(0, coords.bottom, canvasWidth, canvasHeight - coords.bottom); // Bottom
    ctx.fillRect(0, coords.top, coords.left, coords.bottom - coords.top); // Left
    ctx.fillRect(coords.right, coords.top, canvasWidth - coords.right, coords.bottom - coords.top); // Right

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top);

    // Draw corner handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#3b82f6';
    const handleSize = 10;
    // Top-left
    ctx.fillRect(coords.left - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(coords.right - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(coords.left - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(coords.right - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);
  }, [cropBox, canvasWidth, canvasHeight, toCanvasCoords]);

  const handleMouseDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.stopPropagation();
    setDragging(corner);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const dx = ((e.clientX - dragStart.x) / canvasWidth) * 100;
    const dy = ((e.clientY - dragStart.y) / canvasHeight) * 100;

    setCropBox(prev => {
      let newBox = { ...prev };

      // Note: canvas y increases downward, but cropBox y increases upward
      if (dragging === 'tl') {
        newBox.x1 = Math.max(0, Math.min(prev.x1 + dx, prev.x2 - config.crop.minCropSize * 100));
        newBox.y2 = Math.max(prev.y1 + config.crop.minCropSize * 100, Math.min(100, prev.y2 - dy));
      } else if (dragging === 'tr') {
        newBox.x2 = Math.max(prev.x1 + config.crop.minCropSize * 100, Math.min(100, prev.x2 + dx));
        newBox.y2 = Math.max(prev.y1 + config.crop.minCropSize * 100, Math.min(100, prev.y2 - dy));
      } else if (dragging === 'bl') {
        newBox.x1 = Math.max(0, Math.min(prev.x1 + dx, prev.x2 - config.crop.minCropSize * 100));
        newBox.y1 = Math.max(0, Math.min(prev.y1 - dy, prev.y2 - config.crop.minCropSize * 100));
      } else if (dragging === 'br') {
        newBox.x2 = Math.max(prev.x1 + config.crop.minCropSize * 100, Math.min(100, prev.x2 + dx));
        newBox.y1 = Math.max(0, Math.min(prev.y1 - dy, prev.y2 - config.crop.minCropSize * 100));
      } else if (dragging === 'move') {
        const width = prev.x2 - prev.x1;
        const height = prev.y2 - prev.y1;
        let newX1 = prev.x1 + dx;
        let newY1 = prev.y1 - dy;

        // Keep within bounds
        if (newX1 < 0) newX1 = 0;
        if (newX1 + width > 100) newX1 = 100 - width;
        if (newY1 < 0) newY1 = 0;
        if (newY1 + height > 100) newY1 = 100 - height;

        newBox.x1 = newX1;
        newBox.y1 = newY1;
        newBox.x2 = newX1 + width;
        newBox.y2 = newY1 + height;
      }

      return newBox;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleAutoCrop = async () => {
    if (!sourceCanvas) return;
    const newCropBox = await detectAutoCrop(sourceCanvas);
    if (newCropBox) {
      setCropBox(newCropBox);
    }
  };

  const coords = toCanvasCoords(cropBox);

  return (
    <div className="absolute inset-0 z-20">
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Interactive regions */}
      <div
        className="absolute"
        style={{
          left: coords.left,
          top: coords.top,
          width: coords.right - coords.left,
          height: coords.bottom - coords.top,
          cursor: 'move',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      />

      {/* Corner handles */}
      {[
        { corner: 'tl' as const, left: coords.left, top: coords.top, cursor: 'nwse-resize' },
        { corner: 'tr' as const, left: coords.right, top: coords.top, cursor: 'nesw-resize' },
        { corner: 'bl' as const, left: coords.left, top: coords.bottom, cursor: 'nesw-resize' },
        { corner: 'br' as const, left: coords.right, top: coords.bottom, cursor: 'nwse-resize' },
      ].map(({ corner, left, top, cursor }) => (
        <div
          key={corner}
          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
          style={{ left: left - 6, top: top - 6, cursor }}
          onMouseDown={(e) => handleMouseDown(e, corner)}
        />
      ))}

      {/* Info bar */}
      <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center gap-2">
        <div className="bg-black/70 text-white text-xs px-3 py-1 rounded">
          ({x=cropBox.x1.toFixed(0)}%, y={cropBox.y1.toFixed(0)}%) → ({x=cropBox.x2.toFixed(0)}%, y={cropBox.y2.toFixed(0)}%)
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-full left-0 right-0 mt-2 flex justify-center gap-2">
        <button
          onClick={handleAutoCrop}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          Auto
        </button>
        <button
          onClick={() => onConfirm(cropBox)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/CropOverlay.tsx && git commit -m "feat: add CropOverlay component for interactive cropping"
```

---

### Task 11: Create ExportDialog Component

**Files:**
- Create: `src/components/ExportDialog.tsx`

- [ ] **Step 1: Create ExportDialog component**

Create `src/components/ExportDialog.tsx`:

```typescript
import { useState } from 'react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (fileName: string) => void;
  onExportImage: (fileName: string, format: 'png' | 'jpg', resolution: number) => void;
  defaultFileName: string;
  totalPages: number;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExportPDF,
  onExportImage,
  defaultFileName,
  totalPages,
}: ExportDialogProps) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [resolution, setResolution] = useState(2);

  if (!isOpen) return null;

  const handleExportPDF = () => {
    const name = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    onExportPDF(name);
    onClose();
  };

  const handleExportImage = () => {
    const ext = format === 'png' ? '.png' : '.jpg';
    const name = fileName.endsWith(ext) ? fileName : `${fileName}${ext}`;
    onExportImage(name, format, resolution);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Export</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File name
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pages to export: {totalPages}
          </label>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-gray-600 mb-3">Export as:</p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleExportPDF}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              PDF
            </button>
            <button
              onClick={handleExportImage}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Image
            </button>
          </div>

          {/* Image options */}
          <div className="space-y-3 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Image format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'jpg')}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value={1}>1x (standard)</option>
                <option value={2}>2x (high)</option>
                <option value={3}>3x (ultra)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/ExportDialog.tsx && git commit -m "feat: add ExportDialog component"
```

---

### Task 12: Update PDFViewer for Rotation and Crop

**Files:**
- Modify: `src/components/PDFViewer.tsx`

- [ ] **Step 1: Update PDFViewer to support rotation and crop rendering**

Replace `src/components/PDFViewer.tsx`:

```typescript
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, PageState, CropBox } from '../types/pdf';

interface PDFViewerProps {
  pdfDocument: PDFDocumentProxy | null;
  pageState: PageState | null;
  scale: number;
  mode: 'view' | 'crop';
  children?: React.ReactNode;
}

export interface PDFViewerRef {
  getCanvas: () => HTMLCanvasElement | null;
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(
  ({ pdfDocument, pageState, scale, mode, children }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    useEffect(() => {
      if (!pdfDocument || !pageState || pageState.deleted || !canvasRef.current) return;

      const abortController = new AbortController();
      let pageCleanup: (() => void) | null = null;

      const renderPage = async () => {
        setRendering(true);
        try {
          const page = await pdfDocument.getPage(pageState.sourcePageIndex + 1) as PDFPageProxy;

          if (abortController.signal.aborted) return;

          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext('2d');
          if (!context) return;

          // Apply rotation
          const rotation = pageState.rotation;
          const viewport = page.getViewport({ scale, rotation });

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          setCanvasSize({ width: viewport.width, height: viewport.height });

          const renderTask = page.render({
            canvasContext: context,
            viewport,
          });

          pageCleanup = () => renderTask.cancel();
          await renderTask.promise;
        } catch (err) {
          if (abortController.signal.aborted) return;
          console.error('Error rendering page:', err);
        } finally {
          if (!abortController.signal.aborted) {
            setRendering(false);
          }
        }
      };

      renderPage();

      return () => {
        abortController.abort();
        if (pageCleanup) {
          pageCleanup();
        }
      };
    }, [pdfDocument, pageState, scale]);

    if (!pdfDocument) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-200">
          <p className="text-gray-500">No PDF loaded. Open a file to begin.</p>
        </div>
      );
    }

    if (!pageState || pageState.deleted) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-200">
          <p className="text-gray-500">Page deleted. Select another page.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto bg-gray-300 flex items-start justify-center p-4">
        <div className="relative">
          {rendering && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
              <div className="bg-white px-4 py-2 rounded shadow">Rendering...</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
          />
          {mode === 'crop' && children}
        </div>
      </div>
    );
  }
);

PDFViewer.displayName = 'PDFViewer';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/PDFViewer.tsx && git commit -m "feat: update PDFViewer to support rotation and crop mode"
```

---

### Task 13: Update Toolbar with Export and Apply Buttons

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Update Toolbar with new functionality**

Replace `src/components/Toolbar.tsx`:

```typescript
import { useRef } from 'react';

interface ToolbarProps {
  fileName: string;
  hasUnappliedChanges: boolean;
  loading: boolean;
  onOpenFile: (file: File) => void;
  onApply: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  fileName,
  hasUnappliedChanges,
  loading,
  onOpenFile,
  onApply,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onOpenFile(file);
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const displayName = hasUnappliedChanges ? `*${fileName}` : fileName;

  return (
    <div className="h-14 bg-gray-800 text-white flex items-center px-4 gap-4 shadow-md">
      {/* Open File Button */}
      <button
        onClick={handleOpenClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Open PDF
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* File name with change indicator */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <span className={`font-medium ${hasUnappliedChanges ? 'text-yellow-400' : ''}`}>
            {displayName}
          </span>
          {hasUnappliedChanges && (
            <button
              onClick={onApply}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
            >
              Apply
            </button>
          )}
        </>
      )}

      {/* Undo/Redo */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
        </>
      )}

      {/* Export button */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <button
            onClick={onExport}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
          >
            Export
          </button>
        </>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="ml-auto">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/components/Toolbar.tsx && git commit -m "feat: update Toolbar with export, apply, and undo/redo buttons"
```

---

### Task 14: Integrate All Components in App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update App.tsx with full integration**

Replace `src/App.tsx`:

```typescript
import { useRef, useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PDFViewer, PDFViewerRef } from './components/PDFViewer';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CropOverlay } from './components/CropOverlay';
import { ExportDialog } from './components/ExportDialog';
import { usePDF } from './hooks/usePDF';
import { useEditorState } from './hooks/useEditorState';
import { exportPDF } from './utils/pdf-export';
import { exportImage } from './utils/image-export';
import './App.css';

function App() {
  const {
    document: pdfDocument,
    loading,
    error,
    loadFromFile,
    scale,
    zoomIn,
    zoomOut,
  } = usePDF();

  const {
    pages,
    selectedIndex,
    hasUnappliedChanges,
    mode,
    fileName,
    currentPageState,
    initPages,
    selectPage,
    deletePage,
    rotatePage,
    setCropBox,
    enterCropMode,
    exitCropMode,
    copyPage,
    pastePage,
    undo,
    redo,
    applyChanges,
    resetState,
  } = useEditorState();

  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const handleLoadFile = async (file: File) => {
    const bytes = await file.arrayBuffer();
    setPdfBytes(bytes);
    await loadFromFile(file);
    const name = file.name.replace('.pdf', '');
    resetState();
    initPages(1, name); // Will be updated after document loads
  };

  // Initialize pages after document loads
  useEffect(() => {
    if (pdfDocument && pdfDocument.numPages > 0 && pages.length === 0) {
      initPages(pdfDocument.numPages, fileName || 'document');
    }
  }, [pdfDocument, pages.length, fileName, initPages]);

  const handleApply = () => {
    const applied = applyChanges();
    if (applied) {
      // Could save to original file here if we had file system access
      console.log('Changes applied');
    }
  };

  const handleExportPDF = async (outputFileName: string) => {
    if (!pdfBytes) return;
    await exportPDF(pdfBytes, pages, outputFileName);
  };

  const handleExportImage = async (outputFileName: string, format: 'png' | 'jpg', resolution: number) => {
    const canvas = pdfViewerRef.current?.getCanvas();
    if (!canvas || !currentPageState) return;
    await exportImage(canvas, currentPageState.cropBox, format, resolution, outputFileName);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'c':
            e.preventDefault();
            copyPage(selectedIndex);
            break;
          case 'v':
            e.preventDefault();
            pastePage(selectedIndex);
            break;
        }
      } else if (e.key === 'Delete') {
        e.preventDefault();
        deletePage(selectedIndex);
      } else if (e.key === 'Escape' && mode === 'crop') {
        exitCropMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copyPage, pastePage, selectedIndex, deletePage, mode, exitCropMode]);

  const handleConfirmCrop = (cropBox: typeof currentPageState extends { cropBox: infer T } | null ? T : never) => {
    if (cropBox) {
      setCropBox(selectedIndex, cropBox);
    }
    exitCropMode();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        fileName={fileName}
        hasUnappliedChanges={hasUnappliedChanges}
        loading={loading}
        onOpenFile={handleLoadFile}
        onApply={handleApply}
        onExport={() => setShowExportDialog(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          Error: {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          pdfDocument={pdfDocument}
          pages={pages}
          selectedIndex={selectedIndex}
          onSelectPage={selectPage}
          onDeletePage={deletePage}
          onRotatePage={rotatePage}
          onEnterCropMode={enterCropMode}
          mode={mode}
        />

        <PDFViewer
          ref={pdfViewerRef}
          pdfDocument={pdfDocument}
          pageState={currentPageState}
          scale={scale}
          mode={mode}
        >
          {mode === 'crop' && currentPageState && (
            <CropOverlay
              canvasWidth={0}
              canvasHeight={0}
              initialCropBox={currentPageState.cropBox}
              onConfirm={handleConfirmCrop}
              onCancel={exitCropMode}
              sourceCanvas={pdfViewerRef.current?.getCanvas() ?? null}
            />
          )}
        </PDFViewer>
      </div>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportPDF={handleExportPDF}
        onExportImage={handleExportImage}
        defaultFileName={fileName || 'document'}
        totalPages={pages.filter(p => !p.deleted).length}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Update App.css**

Replace `src/App.css`:

```css
/* App-specific styles - Tailwind handles most styling */
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add src/App.tsx src/App.css && git commit -m "feat: integrate all page operation components in App"
```

---

### Task 15: Fix CropOverlay Integration and Test

**Files:**
- Modify: `src/components/PDFViewer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update PDFViewer to pass canvas dimensions**

The CropOverlay needs canvas dimensions. Update PDFViewer to expose them:

Modify `src/components/PDFViewer.tsx` - update the PDFViewerRef interface and add canvasSize to render:

```typescript
export interface PDFViewerRef {
  getCanvas: () => HTMLCanvasElement | null;
  getCanvasSize: () => { width: number; height: number };
}
```

And update useImperativeHandle:

```typescript
useImperativeHandle(ref, () => ({
  getCanvas: () => canvasRef.current,
  getCanvasSize: () => canvasSize,
}));
```

- [ ] **Step 2: Update App.tsx to pass canvas dimensions to CropOverlay**

Update the CropOverlay usage:

```typescript
{mode === 'crop' && currentPageState && (
  <CropOverlay
    canvasWidth={pdfViewerRef.current?.getCanvasSize()?.width ?? 0}
    canvasHeight={pdfViewerRef.current?.getCanvasSize()?.height ?? 0}
    initialCropBox={currentPageState.cropBox}
    onConfirm={handleConfirmCrop}
    onCancel={exitCropMode}
    sourceCanvas={pdfViewerRef.current?.getCanvas() ?? null}
  />
)}
```

- [ ] **Step 3: Test the application**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm run dev
```

Expected: Application starts, can open PDF, see sidebar with thumbnails

- [ ] **Step 4: Commit fixes**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "fix: integrate CropOverlay with canvas dimensions"
```

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Can open a PDF file
- [ ] Sidebar shows page thumbnails
- [ ] Can select pages in sidebar
- [ ] Can delete pages (shows deleted state)
- [ ] Can rotate pages
- [ ] Can enter crop mode
- [ ] Can adjust crop box
- [ ] Auto-crop detects content boundaries
- [ ] Can export to PDF
- [ ] Can export to image
- [ ] Ctrl+Z/Y undo/redo works
- [ ] Ctrl+C/V copy/paste works
- [ ] Delete key deletes selected page
- [ ] Escape exits crop mode