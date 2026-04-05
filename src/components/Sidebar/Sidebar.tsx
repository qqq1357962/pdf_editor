import type { PDFDocumentProxy, PageState } from '../../types/pdf';
import { Thumbnail } from './Thumbnail';

interface SidebarProps {
  pdfDocument: PDFDocumentProxy | null;
  pages: PageState[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onEnterCropMode: () => void;
  mode: 'view' | 'crop';
}

export function Sidebar({
  pdfDocument,
  pages,
  selectedIndex,
  onSelectPage,
  onDeletePage,
  onRotatePage,
  onEnterCropMode,
  mode,
}: SidebarProps) {
  const currentPage = pages[selectedIndex];
  const isDeleted = currentPage?.deleted ?? false;

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

      {/* Action buttons */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        <div className="flex gap-1">
          <button
            onClick={() => onEnterCropMode()}
            disabled={mode === 'crop' || isDeleted}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crop
          </button>
          <button
            onClick={() => onRotatePage(selectedIndex)}
            disabled={isDeleted}
            className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rotate
          </button>
        </div>
        <button
          onClick={() => isDeleted ? null : onDeletePage(selectedIndex)}
          disabled={mode === 'crop'}
          className={`w-full px-2 py-1 text-xs rounded ${
            isDeleted
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeleted ? 'Restore' : 'Delete'}
        </button>
      </div>
    </div>
  );
}