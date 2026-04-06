import { PDFDocument, degrees } from 'pdf-lib';
import type { PageState } from '../types/pdf';

export async function exportPDF(
  sourcePdfBytes: ArrayBuffer,
  pages: PageState[],
  outputFileName: string
): Promise<void> {
  const sourceDoc = await PDFDocument.load(sourcePdfBytes);
  const destDoc = await PDFDocument.create();

  // Filter non-deleted pages
  const pagesToExport = pages.filter(p => !p.deleted);

  for (const pageState of pagesToExport) {
    const [copiedPage] = await destDoc.copyPages(sourceDoc, [pageState.sourcePageIndex]);

    // Apply rotation
    if (pageState.rotation !== 0) {
      copiedPage.setRotation(degrees(pageState.rotation));
    }

    // Apply crop
    if (pageState.cropBox) {
      const { width, height } = copiedPage.getSize();
      // Convert percentages to points
      // cropBox uses left-bottom origin (x-right, y-up)
      // pdf-lib uses left-bottom origin too
      const cropLeft = width * pageState.cropBox.x1;
      const cropBottom = height * pageState.cropBox.y1;
      const cropRight = width * pageState.cropBox.x2;
      const cropTop = height * pageState.cropBox.y2;

      copiedPage.setCropBox(
        cropLeft,
        cropBottom,
        cropRight - cropLeft,
        cropTop - cropBottom
      );
    }

    destDoc.addPage(copiedPage);
  }

  const pdfBytes = await destDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });

  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}