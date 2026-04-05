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