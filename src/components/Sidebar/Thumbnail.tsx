import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, PageState } from '../../types/pdf';
import { config } from '../../config/pdf-editor.config';

interface ThumbnailProps {
  pdfDocument: PDFDocumentProxy;
  pageState: PageState;
  pageIndex: number;
  isSelected: boolean;
  onClick: () => void;
}

export function Thumbnail({
  pdfDocument,
  pageState,
  pageIndex,
  isSelected,
  onClick,
}: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || pageState.deleted) return;

    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDocument.getPage(pageState.sourcePageIndex + 1) as PDFPageProxy;
        if (cancelled) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        // Calculate thumbnail size
        const viewport = page.getViewport({ scale: 1 });
        const scale = config.thumbnail.width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Apply rotation
        const rotation = pageState.rotation;
        const finalViewport = page.getViewport({ scale, rotation });

        canvas.width = finalViewport.width;
        canvas.height = finalViewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: finalViewport,
        }).promise;

        if (!cancelled) {
          setLoaded(true);
        }
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
      }
    };

    renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pageState.sourcePageIndex, pageState.rotation, pageState.deleted]);

  if (pageState.deleted) {
    return (
      <div
        className="relative cursor-pointer opacity-30"
        onClick={onClick}
      >
        <div
          className="bg-gray-300 rounded flex items-center justify-center"
          style={{ width: config.thumbnail.width, height: 150 }}
        >
          <span className="text-gray-500 text-xs">Deleted</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          {pageIndex + 1}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative cursor-pointer rounded transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2'
          : 'hover:ring-1 hover:ring-gray-400'
      }`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className={`rounded bg-white transition-opacity ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="text-center text-xs text-gray-600 mt-1">
        {pageIndex + 1}
      </div>
      {pageState.cropBox && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full" title="Cropped" />
      )}
    </div>
  );
}