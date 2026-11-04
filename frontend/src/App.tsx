import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { CameraUploadModal } from './components/CameraUploadModal';
import { AnalysisLoadingView } from './components/AnalysisLoadingView';
import { NonBillRejectionView } from './components/NonBillRejectionView';
import { ExtractionCorrectionView } from './components/ExtractionCorrectionView';
import { analyzeBill, ApiError } from './services/api';
import { createThumbnail } from './utils/imageCompressor';
import { BillAnalysisResponse, SavedBill } from './types';
import { CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // Upload & Camera Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Active Analysis State
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<ApiError | Error | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BillAnalysisResponse | null>(null);

  // Success Notification Toast
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const startAnalysisSession = async (file: File, url: string) => {
    setActiveFile(file);
    setPreviewUrl(url);
    setIsUploadOpen(false);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    // Generate lightweight thumbnail for IndexedDB storage
    try {
      const thumb = await createThumbnail(file, 240);
      setThumbnailBase64(thumb);
    } catch {
      setThumbnailBase64(url);
    }

    try {
      const result = await analyzeBill(file);
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = async () => {
    if (!activeFile || !previewUrl) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeBill(activeFile);
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancelSession = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setActiveFile(null);
    setPreviewUrl(null);
    setThumbnailBase64(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  };

  const handleSaveSuccess = (savedBill: SavedBill) => {
    handleCancelSession();
    setSavedToast(`Saved bill from ${savedBill.merchantName} (₹${savedBill.amount.toFixed(2)})`);
    setTimeout(() => setSavedToast(null), 4000);
    navigate('/history');
  };

  // Determine whether an active analysis / correction session is taking over the screen
  const isSessionActive = Boolean(previewUrl && (isAnalyzing || analysisError || analysisResult));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Global Success Toast */}
      {savedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md text-white py-3 px-4 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{savedToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-md md:max-w-2xl lg:max-w-4xl w-full mx-auto p-4 sm:p-6 transition-all">
        {isSessionActive ? (
          <div>
            {isAnalyzing || analysisError ? (
              <AnalysisLoadingView
                previewUrl={previewUrl!}
                error={analysisError}
                onRetry={handleRetry}
                onCancel={handleCancelSession}
              />
            ) : analysisResult?.classification === 'NON_BILL' || analysisResult?.classification === 'UNCERTAIN' ? (
              <NonBillRejectionView
                previewUrl={previewUrl!}
                result={analysisResult}
                onTryAnother={() => {
                  handleCancelSession();
                  setIsUploadOpen(true);
                }}
                onRetry={handleRetry}
              />
            ) : analysisResult?.classification === 'BILL' ? (
              <ExtractionCorrectionView
                previewUrl={previewUrl!}
                thumbnailBase64={thumbnailBase64 || previewUrl!}
                result={analysisResult}
                onSaveSuccess={handleSaveSuccess}
                onCancel={handleCancelSession}
              />
            ) : null}
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage onOpenUpload={() => setIsUploadOpen(true)} />} />
            <Route path="/history" element={<HistoryPage onOpenUpload={() => setIsUploadOpen(true)} />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="*" element={<HomePage onOpenUpload={() => setIsUploadOpen(true)} />} />
          </Routes>
        )}
      </main>

      {/* Camera / Upload Modal */}
      <CameraUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onStartAnalysis={startAnalysisSession}
      />

      {/* Bottom Navigation (visible when not reviewing a bill) */}
      {!isSessionActive && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
export default App;
