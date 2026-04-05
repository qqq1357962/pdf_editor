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