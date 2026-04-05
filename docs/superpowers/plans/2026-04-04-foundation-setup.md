# PDF Editor Foundation Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the project structure and get a working frontend page that can open and display a PDF file.

**Architecture:** React + TypeScript frontend with Vite build tool, using PDF.js for PDF rendering. Tauri will be added later for desktop packaging.

**Tech Stack:** React 18, TypeScript, Vite, PDF.js, Tailwind CSS

---

## File Structure

```
pdf_editor/
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # TypeScript config for Node scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS for Tailwind
├── index.html                # Entry HTML
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main application component
│   ├── App.css               # App styles
│   ├── index.css             # Global styles with Tailwind
│   ├── vite-env.d.ts         # Vite type declarations
│   ├── components/
│   │   ├── PDFViewer.tsx     # PDF rendering component
│   │   └── Toolbar.tsx       # Top toolbar component
│   ├── hooks/
│   │   └── usePDF.ts         # PDF loading and rendering hook
│   └── types/
│       └── pdf.ts            # PDF-related type definitions
└── public/
    └── sample.pdf            # Sample PDF for testing
```

---

### Task 1: Initialize Project with Vite and React

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`

- [ ] **Step 1: Initialize Vite project**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm create vite@latest . -- --template react-ts
```

Expected: Vite scaffolds a React + TypeScript project

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm install
```

Expected: All dependencies installed successfully

- [ ] **Step 3: Verify project runs**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm run dev
```

Expected: Dev server starts at http://localhost:5173, shows Vite + React page

---

### Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Install Tailwind and PostCSS**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
```

Expected: Tailwind installed and config files created

- [ ] **Step 2: Configure Tailwind content paths**

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 3: Add Tailwind directives to CSS**

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 4: Verify Tailwind works**

Modify `src/App.tsx` to test:

```tsx
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-blue-600">
        PDF Editor - Tailwind Working!
      </h1>
    </div>
  )
}

export default App
```

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm run dev
```

Expected: Page shows "PDF Editor - Tailwind Working!" with blue text on gray background

- [ ] **Step 5: Commit Tailwind setup**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "chore: add Tailwind CSS configuration"
```

---

### Task 3: Install PDF.js and Create Type Definitions

**Files:**
- Create: `src/types/pdf.ts`

- [ ] **Step 1: Install pdfjs-dist**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm install pdfjs-dist
```

Expected: pdfjs-dist installed (version 4.x)

- [ ] **Step 2: Create PDF type definitions**

Create `src/types/pdf.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
export type PDFPageProxy = pdfjsLib.PDFPageProxy;

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
```

- [ ] **Step 3: Commit types**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "feat: add PDF.js and type definitions"
```

---

### Task 4: Create PDF Loading Hook

**Files:**
- Create: `src/hooks/usePDF.ts`

- [ ] **Step 1: Create usePDF hook**

Create `src/hooks/usePDF.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFState, PDFDocumentProxy } from '../types/pdf';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const initialState: PDFState = {
  document: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.5,
  loading: false,
  error: null,
};

export function usePDF() {
  const [state, setState] = useState<PDFState>(initialState);

  const loadDocument = useCallback(async (source: string | ArrayBuffer) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const loadingTask = pdfjsLib.getDocument(source);
      const document = await loadingTask.promise as PDFDocumentProxy;

      setState(prev => ({
        ...prev,
        document,
        totalPages: document.numPages,
        currentPage: 1,
        loading: false,
      }));

      return document;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load PDF';
      setState(prev => ({ ...prev, loading: false, error }));
      return null;
    }
  }, []);

  const loadFromUrl = useCallback(async (url: string) => {
    return loadDocument(url);
  }, [loadDocument]);

  const loadFromFile = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    return loadDocument(arrayBuffer);
  }, [loadDocument]);

  const setPage = useCallback((page: number) => {
    setState(prev => {
      if (page < 1 || page > prev.totalPages) return prev;
      return { ...prev, currentPage: page };
    });
  }, []);

  const setScale = useCallback((scale: number) => {
    setState(prev => ({ ...prev, scale: Math.max(0.1, scale) }));
  }, []);

  const zoomIn = useCallback(() => {
    setScale(state.scale + 0.25);
  }, [state.scale, setScale]);

  const zoomOut = useCallback(() => {
    setScale(state.scale - 0.25);
  }, [state.scale, setScale]);

  const closeDocument = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    loadFromUrl,
    loadFromFile,
    setPage,
    setScale,
    zoomIn,
    zoomOut,
    closeDocument,
  };
}
```

- [ ] **Step 2: Commit hook**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "feat: add usePDF hook for document loading"
```

---

### Task 5: Create PDF Viewer Component

**Files:**
- Create: `src/components/PDFViewer.tsx`

- [ ] **Step 1: Create PDFViewer component**

Create `src/components/PDFViewer.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import type { PDFPageProxy, PDFViewerProps } from '../types/pdf';

interface PDFViewerComponentProps extends PDFViewerProps {
  document: ReturnType<typeof import('../hooks/usePDF').usePDF>['document'];
  currentPage: number;
  scale: number;
}

export function PDFViewer({ document, currentPage, scale }: PDFViewerComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!document || !canvasRef.current) return;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await document.getPage(currentPage) as PDFPageProxy;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [document, currentPage, scale]);

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200">
        <p className="text-gray-500">No PDF loaded. Open a file to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-300 flex items-start justify-center p-4">
      {rendering && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
          <div className="bg-white px-4 py-2 rounded shadow">Rendering...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="shadow-lg bg-white"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "feat: add PDFViewer component"
```

---

### Task 6: Create Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`

- [ ] **Step 1: Create Toolbar component**

Create `src/components/Toolbar.tsx`:

```typescript
import { useRef } from 'react';

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  loading: boolean;
  onLoadFile: (file: File) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function Toolbar({
  currentPage,
  totalPages,
  scale,
  loading,
  onLoadFile,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onLoadFile(file);
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const zoomPercent = Math.round(scale * 100);

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

      {/* Divider */}
      {totalPages > 0 && (
        <>
          <div className="w-px h-8 bg-gray-600" />

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span className="min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onZoomOut}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              −
            </button>
            <span className="min-w-[60px] text-center">{zoomPercent}%</span>
            <button
              onClick={onZoomIn}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              +
            </button>
          </div>
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

- [ ] **Step 2: Commit component**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "feat: add Toolbar component"
```

---

### Task 7: Integrate Components in App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update App.tsx**

Replace `src/App.tsx`:

```tsx
import { Toolbar } from './components/Toolbar';
import { PDFViewer } from './components/PDFViewer';
import { usePDF } from './hooks/usePDF';
import './App.css';

function App() {
  const {
    document,
    currentPage,
    totalPages,
    scale,
    loading,
    error,
    loadFromFile,
    setPage,
    zoomIn,
    zoomOut,
  } = usePDF();

  const handleLoadFile = async (file: File) => {
    await loadFromFile(file);
  };

  const handlePrevPage = () => {
    setPage(currentPage - 1);
  };

  const handleNextPage = () => {
    setPage(currentPage + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        loading={loading}
        onLoadFile={handleLoadFile}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          Error: {error}
        </div>
      )}

      <PDFViewer
        document={document}
        currentPage={currentPage}
        scale={scale}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Clean up App.css**

Replace `src/App.css`:

```css
/* App-specific styles - Tailwind handles most styling */
```

- [ ] **Step 3: Test the application**

Run:
```bash
cd /Users/lx/Desktop/pdf_editor && npm run dev
```

Expected: Application runs at http://localhost:5173 with toolbar and empty PDF viewer area

- [ ] **Step 4: Test PDF loading**

1. Open browser to http://localhost:5173
2. Click "Open PDF" button
3. Select a PDF file from your computer
4. Verify PDF displays correctly
5. Test page navigation (← →)
6. Test zoom controls (+ −)

Expected: PDF loads and displays, navigation and zoom work

- [ ] **Step 5: Commit integration**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "feat: integrate PDF viewer with App component"
```

---

### Task 8: Add Sample PDF and Final Polish

**Files:**
- Create: `public/sample.pdf` (placeholder instruction)
- Modify: `README.md`

- [ ] **Step 1: Update README**

Replace `README.md`:

```markdown
# PDF Editor

A free, open-source PDF editor designed for researchers.

## Features (Current)

- Open and view PDF files
- Page navigation
- Zoom in/out

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- PDF.js (PDF rendering)
- Tailwind CSS (styling)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Roadmap

- [ ] Annotation tools (highlight, underline, notes)
- [ ] Page operations (merge, split, rotate, delete)
- [ ] OCR for scanned documents
- [ ] Metadata editing
- [ ] Citation export
- [ ] Tauri desktop app

## License

MIT
```

- [ ] **Step 2: Final commit**

```bash
cd /Users/lx/Desktop/pdf_editor && git add . && git commit -m "docs: update README with project info"
```

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Browser opens to show toolbar with "Open PDF" button
- [ ] Clicking "Open PDF" opens file picker
- [ ] Selecting a PDF file displays it correctly
- [ ] Page navigation buttons work
- [ ] Zoom buttons work
- [ ] No console errors