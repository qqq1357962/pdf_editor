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
  getFullPageSize: () => { width: number; height: number };
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(
  ({ pdfDocument, pageState, scale, mode, children }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [fullPageSize, setFullPageSize] = useState({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getCanvasSize: () => canvasSize,
      getFullPageSize: () => fullPageSize,
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
          const fullViewport = page.getViewport({ scale, rotation });
          setFullPageSize({ width: fullViewport.width, height: fullViewport.height });

          // Apply crop if cropBox exists and not in crop mode
          const cropBox = pageState.cropBox;
          if (cropBox && mode !== 'crop') {
            // Render cropped region
            // cropBox uses left-bottom origin (x-right, y-up)
            // Convert to canvas coordinates (top-left origin)
            const cropX = (cropBox.x1 / 100) * fullViewport.width;
            const cropY = (1 - cropBox.y2 / 100) * fullViewport.height;
            const cropWidth = ((cropBox.x2 - cropBox.x1) / 100) * fullViewport.width;
            const cropHeight = ((cropBox.y2 - cropBox.y1) / 100) * fullViewport.height;

            canvas.width = cropWidth;
            canvas.height = cropHeight;
            setCanvasSize({ width: cropWidth, height: cropHeight });

            // Render to a temporary canvas first, then crop
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = fullViewport.width;
            tempCanvas.height = fullViewport.height;
            const tempContext = tempCanvas.getContext('2d')!;

            await page.render({
              canvasContext: tempContext,
              viewport: fullViewport,
            }).promise;

            // Copy cropped region to main canvas
            context.drawImage(
              tempCanvas,
              cropX, cropY, cropWidth, cropHeight,
              0, 0, cropWidth, cropHeight
            );
          } else {
            // Render full page
            canvas.width = fullViewport.width;
            canvas.height = fullViewport.height;
            setCanvasSize({ width: fullViewport.width, height: fullViewport.height });

            const renderTask = page.render({
              canvasContext: context,
              viewport: fullViewport,
            });

            pageCleanup = () => renderTask.cancel();
            await renderTask.promise;
          }
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
    }, [pdfDocument, pageState, scale, mode]);

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