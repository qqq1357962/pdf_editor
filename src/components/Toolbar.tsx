import { useRef } from 'react';

interface ToolbarProps {
  fileName: string;
  hasUnappliedChanges: boolean;
  loading: boolean;
  onOpenFile: (file: File) => void;
  onApply: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  fileName,
  hasUnappliedChanges,
  loading,
  onOpenFile,
  onApply,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onOpenFile(file);
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const displayName = hasUnappliedChanges ? `*${fileName}` : fileName;

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

      {/* File name with change indicator */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <span className={`font-medium ${hasUnappliedChanges ? 'text-yellow-400' : ''}`}>
            {displayName}
          </span>
          {hasUnappliedChanges && (
            <button
              onClick={onApply}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
            >
              Apply
            </button>
          )}
        </>
      )}

      {/* Undo/Redo */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
        </>
      )}

      {/* Export button */}
      {fileName && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <button
            onClick={onExport}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
          >
            Export
          </button>
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