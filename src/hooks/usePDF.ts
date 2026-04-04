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