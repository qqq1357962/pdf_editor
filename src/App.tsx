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
import type { CropBox } from './types/pdf';
import './App.css';

function App() {
  const {
    document: pdfDocument,
    loading,
    error,
    loadFromFile,
    scale,
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
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Track undo/redo availability using internal state counters
  // Note: useEditorState doesn't expose canUndo/canRedo, so we track changes
  const [changeCount, setChangeCount] = useState(0);
  const [undoCount, setUndoCount] = useState(0);

  const handleLoadFile = async (file: File) => {
    const bytes = await file.arrayBuffer();
    setPdfBytes(bytes);
    resetState();
    await loadFromFile(file);
  };

  // Initialize pages after document loads
  useEffect(() => {
    if (pdfDocument && pdfDocument.numPages > 0 && pages.length === 0) {
      const name = fileName || 'document';
      initPages(pdfDocument.numPages, name);
      setChangeCount(0);
      setUndoCount(0);
    }
  }, [pdfDocument, pages.length, fileName, initPages]);

  // Track canvas dimensions for CropOverlay
  useEffect(() => {
    if (mode === 'crop' && pdfViewerRef.current) {
      const size = pdfViewerRef.current.getCanvasSize();
      setCanvasDimensions(size);
    }
  }, [mode, currentPageState]);

  const handleApply = () => {
    const applied = applyChanges();
    if (applied) {
      setChangeCount(0);
      setUndoCount(0);
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

  // Wrapped undo/redo with tracking
  const handleUndo = useCallback(() => {
    undo();
    setUndoCount(prev => prev + 1);
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
    setUndoCount(prev => prev - 1);
  }, [redo]);

  // Track when changes are made
  useEffect(() => {
    if (hasUnappliedChanges) {
      setChangeCount(prev => prev + 1);
    }
  }, [hasUnappliedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
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
  }, [handleUndo, handleRedo, copyPage, pastePage, selectedIndex, deletePage, mode, exitCropMode]);

  const handleConfirmCrop = useCallback((cropBox: CropBox) => {
    setCropBox(selectedIndex, cropBox);
    exitCropMode();
  }, [selectedIndex, setCropBox, exitCropMode]);

  // Determine canUndo/canRedo based on tracked state
  const canUndo = changeCount > undoCount;
  const canRedo = undoCount > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        fileName={fileName}
        hasUnappliedChanges={hasUnappliedChanges}
        loading={loading}
        onOpenFile={handleLoadFile}
        onApply={handleApply}
        onExport={() => setShowExportDialog(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
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
          {mode === 'crop' && currentPageState && canvasDimensions.width > 0 && (
            <CropOverlay
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
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