import { useEffect, useRef, useCallback } from 'react';
import type { CropBox } from '../types/pdf';
import { config } from '../config/pdf-editor.config';
import { detectAutoCrop } from '../utils/auto-crop';

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  initialCropBox: CropBox | null;
  onConfirm: (cropBox: CropBox) => void;
  onCancel: () => void;
  sourceCanvas: HTMLCanvasElement | null;
}

export function CropOverlay({
  canvasWidth,
  canvasHeight,
  initialCropBox,
  onConfirm,
  onCancel,
  sourceCanvas,
}: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Use refs for drag state to avoid re-renders
  const cropBoxRef = useRef<CropBox>(initialCropBox || { x1: 5, y1: 5, x2: 95, y2: 95 });
  const draggingRef = useRef<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Convert cropBox to canvas coordinates
  const toCanvasCoords = useCallback((cb: CropBox) => {
    return {
      left: (cb.x1 / 100) * canvasWidth,
      right: (cb.x2 / 100) * canvasWidth,
      top: (1 - cb.y2 / 100) * canvasHeight,
      bottom: (1 - cb.y1 / 100) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  // Draw overlay
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cb = cropBoxRef.current;
    const coords = toCanvasCoords(cb);

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw dark overlay outside crop region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, coords.top); // Top
    ctx.fillRect(0, coords.bottom, canvasWidth, canvasHeight - coords.bottom); // Bottom
    ctx.fillRect(0, coords.top, coords.left, coords.bottom - coords.top); // Left
    ctx.fillRect(coords.right, coords.top, canvasWidth - coords.right, coords.bottom - coords.top); // Right

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top);

    // Draw corner handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#3b82f6';
    const handleSize = 10;
    ctx.fillRect(coords.left - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    ctx.fillRect(coords.right - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    ctx.fillRect(coords.left - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);
    ctx.fillRect(coords.right - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);

    // Update info display
    const infoEl = containerRef.current?.querySelector('[data-info]') as HTMLDivElement;
    if (infoEl) {
      infoEl.textContent = `(x=${cb.x1.toFixed(0)}%, y=${cb.y1.toFixed(0)}%) → (x=${cb.x2.toFixed(0)}%, y=${cb.y2.toFixed(0)}%)`;
    }
  }, [canvasWidth, canvasHeight, toCanvasCoords]);

  // Handle drag
  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = ((x - lastPosRef.current.x) / canvasWidth) * 100;
    const dy = ((y - lastPosRef.current.y) / canvasHeight) * 100;

    const prev = cropBoxRef.current;
    const newBox = { ...prev };

    const dragging = draggingRef.current;

    if (dragging === 'tl') {
      newBox.x1 = Math.max(0, Math.min(prev.x1 + dx, prev.x2 - config.crop.minCropSize * 100));
      newBox.y2 = Math.max(prev.y1 + config.crop.minCropSize * 100, Math.min(100, prev.y2 - dy));
    } else if (dragging === 'tr') {
      newBox.x2 = Math.max(prev.x1 + config.crop.minCropSize * 100, Math.min(100, prev.x2 + dx));
      newBox.y2 = Math.max(prev.y1 + config.crop.minCropSize * 100, Math.min(100, prev.y2 - dy));
    } else if (dragging === 'bl') {
      newBox.x1 = Math.max(0, Math.min(prev.x1 + dx, prev.x2 - config.crop.minCropSize * 100));
      newBox.y1 = Math.max(0, Math.min(prev.y1 - dy, prev.y2 - config.crop.minCropSize * 100));
    } else if (dragging === 'br') {
      newBox.x2 = Math.max(prev.x1 + config.crop.minCropSize * 100, Math.min(100, prev.x2 + dx));
      newBox.y1 = Math.max(0, Math.min(prev.y1 - dy, prev.y2 - config.crop.minCropSize * 100));
    } else if (dragging === 'move') {
      const width = prev.x2 - prev.x1;
      const height = prev.y2 - prev.y1;
      let newX1 = prev.x1 + dx;
      let newY1 = prev.y1 - dy;

      if (newX1 < 0) newX1 = 0;
      if (newX1 + width > 100) newX1 = 100 - width;
      if (newY1 < 0) newY1 = 0;
      if (newY1 + height > 100) newY1 = 100 - height;

      newBox.x1 = newX1;
      newBox.y1 = newY1;
      newBox.x2 = newX1 + width;
      newBox.y2 = newY1 + height;
    }

    cropBoxRef.current = newBox;
    lastPosRef.current = { x, y };
    drawOverlay();
  }, [canvasWidth, canvasHeight, drawOverlay]);

  // Global mouse events for smooth dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDrag(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleDrag]);

  // Start drag
  const startDrag = useCallback((e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    lastPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    draggingRef.current = corner;
  }, []);

  // Initial draw
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.width = canvasWidth;
      overlayRef.current.height = canvasHeight;
    }
    drawOverlay();
  }, [canvasWidth, canvasHeight, drawOverlay]);

  const handleAutoCrop = async () => {
    if (!sourceCanvas) return;
    const newCropBox = await detectAutoCrop(sourceCanvas);
    if (newCropBox) {
      cropBoxRef.current = newCropBox;
      drawOverlay();
    }
  };

  const handleConfirm = () => {
    onConfirm(cropBoxRef.current);
  };

  const coords = toCanvasCoords(cropBoxRef.current);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Dark overlay canvas */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Interactive move region - transparent, catches events */}
      <div
        className="absolute"
        style={{
          left: coords.left,
          top: coords.top,
          width: coords.right - coords.left,
          height: coords.bottom - coords.top,
          cursor: 'move',
        }}
        onMouseDown={(e) => startDrag(e, 'move')}
      />

      {/* Corner handles */}
      <div
        className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nwse-resize hover:bg-blue-400"
        style={{ left: coords.left - 8, top: coords.top - 8 }}
        onMouseDown={(e) => startDrag(e, 'tl')}
      />
      <div
        className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nesw-resize hover:bg-blue-400"
        style={{ left: coords.right - 8, top: coords.top - 8 }}
        onMouseDown={(e) => startDrag(e, 'tr')}
      />
      <div
        className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nesw-resize hover:bg-blue-400"
        style={{ left: coords.left - 8, top: coords.bottom - 8 }}
        onMouseDown={(e) => startDrag(e, 'bl')}
      />
      <div
        className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nwse-resize hover:bg-blue-400"
        style={{ left: coords.right - 8, top: coords.bottom - 8 }}
        onMouseDown={(e) => startDrag(e, 'br')}
      />

      {/* Info bar */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: canvasHeight + 10 }}>
        <div
          data-info
          className="bg-black/70 text-white text-xs px-3 py-1 rounded whitespace-nowrap"
        >
          (x={cropBoxRef.current.x1.toFixed(0)}%, y={cropBoxRef.current.y1.toFixed(0)}%) → (x={cropBoxRef.current.x2.toFixed(0)}%, y={cropBoxRef.current.y2.toFixed(0)}%)
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute left-1/2 -translate-x-1/2 flex gap-2" style={{ top: canvasHeight + 10 }}>
        <button
          onClick={handleAutoCrop}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          Auto
        </button>
        <button
          onClick={handleConfirm}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}