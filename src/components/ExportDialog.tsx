import { useState } from 'react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (fileName: string) => void;
  onExportImage: (fileName: string, format: 'png' | 'jpg', resolution: number) => void;
  defaultFileName: string;
  totalPages: number;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExportPDF,
  onExportImage,
  defaultFileName,
  totalPages,
}: ExportDialogProps) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [resolution, setResolution] = useState(2);

  if (!isOpen) return null;

  const handleExportPDF = () => {
    const name = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    onExportPDF(name);
    onClose();
  };

  const handleExportImage = () => {
    const ext = format === 'png' ? '.png' : '.jpg';
    const name = fileName.endsWith(ext) ? fileName : `${fileName}${ext}`;
    onExportImage(name, format, resolution);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Export</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File name
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pages to export: {totalPages}
          </label>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-gray-600 mb-3">Export as:</p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleExportPDF}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              PDF
            </button>
            <button
              onClick={handleExportImage}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Image
            </button>
          </div>

          {/* Image options */}
          <div className="space-y-3 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Image format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'jpg')}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value={1}>1x (standard)</option>
                <option value={2}>2x (high)</option>
                <option value={3}>3x (ultra)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}