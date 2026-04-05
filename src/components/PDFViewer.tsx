import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, PageState } from '../types/pdf';

interface PDFViewerProps {
  pdfDocument: PDFDocumentProxy | null;
  pageState: PageState | null;
  scale: number;
  mode: 'view' | 'crop';
  children?: React.ReactNode;
}

export interface PDFViewerRef {
  getCanvas: () => HTMLCanvasElement | null;
  getCanvasSize: () => { width: number; height: number };
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(
  ({ pdfDocument, pageState, scale, mode, children }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getCanvasSize: () => canvasSize,
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