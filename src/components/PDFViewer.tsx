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