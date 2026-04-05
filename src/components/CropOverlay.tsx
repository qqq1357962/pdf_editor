import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [cropBox, setCropBox] = useState<CropBox>(
    initialCropBox || { x1: 5, y1: 5, x2: 95, y2: 95 }
  );
  const [dragging, setDragging] = useState<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert cropBox to canvas coordinates (left-bottom origin to canvas top-left)
  const toCanvasCoords = useCallback((cb: CropBox) => {
    return {
      left: (cb.x1 / 100) * canvasWidth,
      right: (cb.x2 / 100) * canvasWidth,
      top: (1 - cb.y2 / 100) * canvasHeight,
      bottom: (1 - cb.y1 / 100) * canvasHeight,
    };
  }, [canvasWidth, canvasHeight]);

  // Draw overlay
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const coords = toCanvasCoords(cropBox);

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
    // Top-left
    ctx.fillRect(coords.left - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(coords.right - handleSize/2, coords.top - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(coords.left - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(coords.right - handleSize/2, coords.bottom - handleSize/2, handleSize, handleSize);
  }, [cropBox, canvasWidth, canvasHeight, toCanvasCoords]);

  const handleMouseDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br' | 'move') => {
    e.stopPropagation();
    setDragging(corner);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const dx = ((e.clientX - dragStart.x) / canvasWidth) * 100;
    const dy = ((e.clientY - dragStart.y) / canvasHeight) * 100;

    setCropBox(prev => {
      let newBox = { ...prev };

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

      return newBox;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleAutoCrop = async () => {
    if (!sourceCanvas) return;
    const newCropBox = await detectAutoCrop(sourceCanvas);
    if (newCropBox) {
      setCropBox(newCropBox);
    }
  };

  const coords = toCanvasCoords(cropBox);

  return (
    <div className="absolute inset-0 z-20">
      <canvas
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Interactive regions */}
      <div
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
      {[
        { corner: 'tl' as const, left: coords.left, top: coords.top, cursor: 'nwse-resize' },
        { corner: 'tr' as const, left: coords.right, top: coords.top, cursor: 'nesw-resize' },
        { corner: 'bl' as const, left: coords.left, top: coords.bottom, cursor: 'nesw-resize' },
        { corner: 'br' as const, left: coords.right, top: coords.bottom, cursor: 'nwse-resize' },
      ].map(({ corner, left, top, cursor }) => (
        <div
          key={corner}
          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
          style={{ left: left - 6, top: top - 6, cursor }}
          onMouseDown={(e) => handleMouseDown(e, corner)}
        />
      ))}

      {/* Info bar */}
      <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center gap-2">
        <div className="bg-black/70 text-white text-xs px-3 py-1 rounded">
          (x={cropBox.x1.toFixed(0)}%, y={cropBox.y1.toFixed(0)}%) - (x={cropBox.x2.toFixed(0)}%, y={cropBox.y2.toFixed(0)}%)
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
          onClick={() => onConfirm(cropBox)}
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