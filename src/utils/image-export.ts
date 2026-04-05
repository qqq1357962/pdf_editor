import { saveAs } from 'file-saver';
import type { CropBox } from '../types/pdf';

export async function exportImage(
  canvas: HTMLCanvasElement,
  cropBox: CropBox | null,
  format: 'png' | 'jpg',
  resolution: number,
  fileName: string
): Promise<void> {
  let sourceCanvas = canvas;

  // Apply crop if needed
  if (cropBox) {
    const { x1, y1, x2, y2 } = cropBox;
    const cropWidth = (x2 - x1) / 100 * canvas.width;
    const cropHeight = (y2 - y1) / 100 * canvas.height;
    const cropX = x1 / 100 * canvas.width;
    // Convert from left-bottom origin to top-left
    const cropY = (1 - y2 / 100) * canvas.height;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth * resolution;
    croppedCanvas.height = cropHeight * resolution;
    const ctx = croppedCanvas.getContext('2d')!;

    ctx.drawImage(
      canvas,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth * resolution, cropHeight * resolution
    );
    sourceCanvas = croppedCanvas;
  } else if (resolution !== 1) {
    // Just scale for resolution
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = canvas.width * resolution;
    scaledCanvas.height = canvas.height * resolution;
    const ctx = scaledCanvas.getContext('2d')!;
    ctx.drawImage(
      canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, scaledCanvas.width, scaledCanvas.height
    );
    sourceCanvas = scaledCanvas;
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpg' ? 0.92 : undefined;

  sourceCanvas.toBlob(
    (blob) => {
      if (blob) {
        saveAs(blob, fileName);
      }
    },
    mimeType,
    quality
  );
}