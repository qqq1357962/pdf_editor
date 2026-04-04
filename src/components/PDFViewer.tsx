import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from '../types/pdf';

interface PDFViewerComponentProps {
  pdfDocument: PDFDocumentProxy | null;
  currentPage: number;
  scale: number;
}

export function PDFViewer({ pdfDocument, currentPage, scale }: PDFViewerComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!pdfDocument) return;

    const abortController = new AbortController();
    let pageCleanup: (() => void) | null = null;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdfDocument.getPage(currentPage) as PDFPageProxy;

        // Check if aborted after async operation
        if (abortController.signal.aborted) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        // Store cleanup function for the render task
        pageCleanup = () => renderTask.cancel();

        await renderTask.promise;
      } catch (err) {
        // Ignore errors from aborted renders
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
  }, [pdfDocument, currentPage, scale]);

  if (!pdfDocument) {
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