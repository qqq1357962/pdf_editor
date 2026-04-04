import { Toolbar } from './components/Toolbar';
import { PDFViewer } from './components/PDFViewer';
import { usePDF } from './hooks/usePDF';
import './App.css';

function App() {
  const {
    document,
    currentPage,
    totalPages,
    scale,
    loading,
    error,
    loadFromFile,
    setPage,
    zoomIn,
    zoomOut,
  } = usePDF();

  const handleLoadFile = async (file: File) => {
    await loadFromFile(file);
  };

  const handlePrevPage = () => {
    setPage(currentPage - 1);
  };

  const handleNextPage = () => {
    setPage(currentPage + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        loading={loading}
        onLoadFile={handleLoadFile}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          Error: {error}
        </div>
      )}

      <PDFViewer
        document={document}
        currentPage={currentPage}
        scale={scale}
      />
    </div>
  );
}

export default App;