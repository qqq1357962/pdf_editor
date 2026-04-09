import { config } from '../config/pdf-editor.config';
import type { CropBox } from '../types/pdf';

interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function isBlankPixel(r: number, g: number, b: number): boolean {
  const threshold = config.crop.whitePixelThreshold;
  return r > threshold && g > threshold && b > threshold;
}

function findContentBounds(pixels: PixelData): { left: number; right: number; top: number; bottom: number } | null {
  const { width, height, data } = pixels;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (!isBlankPixel(r, g, b)) {
        hasContent = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (!hasContent) return null;
  return { left, right, top, bottom };
}

export async function detectAutoCrop(
  canvas: HTMLCanvasElement
): Promise<CropBox | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const bounds = findContentBounds({
    width,
    height,
    data: imageData.data,
  });

  if (!bounds) return null;

  // Add margin
  const margin = config.crop.autoCropMargin;
  const pageWidth = width;
  const pageHeight = height;

  // Convert to percentages (0-100 range) with left-bottom origin
  // Canvas has top-left origin, so we need to flip y
  const x1Percent = Math.max(0, bounds.left / pageWidth - margin) * 100;
  const x2Percent = Math.min(1, bounds.right / pageWidth + margin) * 100;
  const y1Percent = Math.max(0, (pageHeight - bounds.bottom) / pageHeight - margin) * 100;
  const y2Percent = Math.min(1, (pageHeight - bounds.top) / pageHeight + margin) * 100;

  // Ensure minimum size
  if ((x2Percent - x1Percent) / 100 < config.crop.minCropSize || (y2Percent - y1Percent) / 100 < config.crop.minCropSize) {
    return null;
  }

  return {
    x1: Math.round(x1Percent),
    y1: Math.round(y1Percent),
    x2: Math.round(x2Percent),
    y2: Math.round(y2Percent),
  };
}