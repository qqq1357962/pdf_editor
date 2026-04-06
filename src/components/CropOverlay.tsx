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
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for drag state to avoid re-renders
  const cropBoxRef = useRef<CropBox>(initialCropBox || { x1: 5, y1: 5, x2: 95, y2: 95 });
  const draggingRef = useRef<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  // Convert cropBox to canvas coordinates
  const toCanvasCoords = useCallback((cb: CropBox) => {
    return {
      left: (cb.x1 / 100) * canvasWidth,
      right: (cb.x2 / 100) * canvasWidth,
      top: (1 - cb.y2 / 100) * canvasHeight,
      bottom: (1 - cb.y1 / 100) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  // Draw overlay directly (no React state involved)
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
  }, [canvasWidth, canvasHeight, toCanvasCoords]);

  // Update UI elements (corner handles and info)
  const updateUI = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cb = cropBoxRef.current;
    const coords = toCanvasCoords(cb);

    // Update interactive region position
    const moveRegion = container.querySelector('[data-region="move"]') as HTMLDivElement;
    if (moveRegion) {
      moveRegion.style.left = `${coords.left}px`;
      moveRegion.style.top = `${coords.top}px`;
      moveRegion.style.width = `${coords.right - coords.left}px`;
      moveRegion.style.height = `${coords.bottom - coords.top}px`;
    }

    // Update corner handle positions
    const handles = container.querySelectorAll('[data-handle]');
    handles.forEach((handle) => {
      const corner = handle.getAttribute('data-handle');
      const el = handle as HTMLDivElement;
      switch (corner) {
        case 'tl':
          el.style.left = `${coords.left - 6}px`;
          el.style.top = `${coords.top - 6}px`;
          break;
        case 'tr':
          el.style.left = `${coords.right - 6}px`;
          el.style.top = `${coords.top - 6}px`;
          break;
        case 'bl':
          el.style.left = `${coords.left - 6}px`;
          el.style.top = `${coords.bottom - 6}px`;
          break;
        case 'br':
          el.style.left = `${coords.right - 6}px`;
          el.style.top = `${coords.bottom - 6}px`;
          break;
      }
    });

    // Update info display
    const infoEl = container.querySelector('[data-info]') as HTMLDivElement;
    if (infoEl) {
      infoEl.textContent = `(x=${cb.x1.toFixed(0)}%, y=${cb.y1.toFixed(0)}%) - (x=${cb.x2.toFixed(0)}%, y=${cb.y2.toFixed(0)}%)`;
    }
  }, [toCanvasCoords]);

  // Schedule a frame update
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      drawOverlay();
      updateUI();
    });
  }, [drawOverlay, updateUI]);

  // Initial draw
  useEffect(() => {
    const canvas = overlayRef.current;
    if (canvas) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
    scheduleUpdate();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [canvasWidth, canvasHeight, scheduleUpdate]);

  const handleMouseDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.stopPropagation();
    draggingRef.current = corner;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;

    const dx = ((e.clientX - dragStartRef.current.x) / canvasWidth) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / canvasHeight) * 100;

    const prev = cropBoxRef.current;
    const newBox = { ...prev };

    const dragging = draggingRef.current;

    // Note: canvas y increases downward, but cropBox y increases upward
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

      // Keep within bounds
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
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    // Directly update without React state
    scheduleUpdate();
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
  };

  const handleAutoCrop = async () => {
    if (!sourceCanvas) return;
    const newCropBox = await detectAutoCrop(sourceCanvas);
    if (newCropBox) {
      cropBoxRef.current = newCropBox;
      scheduleUpdate();
    }
  };

  const handleConfirm = () => {
    onConfirm(cropBoxRef.current);
  };

  const coords = toCanvasCoords(cropBoxRef.current);

  return (
    <div ref={containerRef} className="absolute inset-0 z-20">
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Interactive move region */}
      <div
        data-region="move"
        className="absolute"
        style={{
          left: coords.left,
          top: coords.top,
          width: coords.right - coords.left,
          height: coords.bottom - coords.top,
          cursor: 'move',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      />

      {/* Corner handles */}
      <div
        data-handle="tl"
        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
        style={{ left: coords.left - 6, top: coords.top - 6, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'tl')}
      />
      <div
        data-handle="tr"
        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
        style={{ left: coords.right - 6, top: coords.top - 6, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'tr')}
      />
      <div
        data-handle="bl"
        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
        style={{ left: coords.left - 6, top: coords.bottom - 6, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'bl')}
      />
      <div
        data-handle="br"
        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
        style={{ left: coords.right - 6, top: coords.bottom - 6, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'br')}
      />

      {/* Info bar */}
      <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center gap-2">
        <div
          data-info
          className="bg-black/70 text-white text-xs px-3 py-1 rounded"
        >
          (x={cropBoxRef.current.x1.toFixed(0)}%, y={cropBoxRef.current.y1.toFixed(0)}%) - (x={cropBoxRef.current.x2.toFixed(0)}%, y={cropBoxRef.current.y2.toFixed(0)}%)
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-full left-0 right-0 mt-2 flex justify-center gap-2">
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