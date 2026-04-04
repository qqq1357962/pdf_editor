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