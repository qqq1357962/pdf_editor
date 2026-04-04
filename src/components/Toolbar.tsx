import { useRef } from 'react';

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  loading: boolean;
  onLoadFile: (file: File) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function Toolbar({
  currentPage,
  totalPages,
  scale,
  loading,
  onLoadFile,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onLoadFile(file);
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="h-14 bg-gray-800 text-white flex items-center px-4 gap-4 shadow-md">
      {/* Open File Button */}
      <button
        onClick={handleOpenClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Open PDF
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Divider */}
      {totalPages > 0 && (
        <>
          <div className="w-px h-8 bg-gray-600" />

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span className="min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onZoomOut}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              −
            </button>
            <span className="min-w-[60px] text-center">{zoomPercent}%</span>
            <button
              onClick={onZoomIn}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              +
            </button>
          </div>
        </>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="ml-auto">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
    </div>
  );
}