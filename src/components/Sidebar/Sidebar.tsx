import type { PDFDocumentProxy, PageState } from '../../types/pdf';
import { Thumbnail } from './Thumbnail';

interface SidebarProps {
  pdfDocument: PDFDocumentProxy | null;
  pages: PageState[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
}

export function Sidebar({
  pdfDocument,
  pages,
  selectedIndex,
  onSelectPage,
}: SidebarProps) {
  if (!pdfDocument) {
    return (
      <div className="w-40 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <p className="text-gray-400 text-sm text-center px-4">
          Open a PDF to see pages
        </p>
      </div>
    );
  }

  return (
    <div className="w-40 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Thumbnails list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((pageState, index) => (
          <Thumbnail
            key={index}
            pdfDocument={pdfDocument}
            pageState={pageState}
            pageIndex={index}
            isSelected={index === selectedIndex}
            onClick={() => onSelectPage(index)}
          />
        ))}
      </div>
    </div>
  );
}