import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { InsightsPage } from './pages/InsightsPage';
import { DatabasePage } from './pages/DatabasePage';
import { CameraUploadModal, CapturedImageState, CaptureSectionMode } from './components/CameraUploadModal';
import { AnalysisLoadingView } from './components/AnalysisLoadingView';
import { NonBillRejectionView } from './components/NonBillRejectionView';
import { ExtractionCorrectionView } from './components/ExtractionCorrectionView';
import { analyzeBill, ApiError } from './services/api';
import { createThumbnail } from './utils/imageCompressor';
import { BillAnalysisResponse, SavedBill } from './types';
import { CheckCircle2 } from 'lucide-react';

const emptyCaptureState: CapturedImageState = {
  file: null,
  previewUrl: null,
  key: '',
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // 1. Independent State for "Add Expense" section
  const [addExpenseImage, setAddExpenseImage] = useState<CapturedImageState>(emptyCaptureState);

  // 2. Independent State for "Scan" section
  const [scanImage, setScanImage] = useState<CapturedImageState>(emptyCaptureState);

  // Active capture modal & trigger intent
  const [activeModal, setActiveModal] = useState<CaptureSectionMode | null>(null);
  const [modalInitialAction, setModalInitialAction] = useState<'camera' | 'gallery' | null>(null);

  // Active Analysis Session State
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<ApiError | Error | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BillAnalysisResponse | null>(null);

  // Success Notification Toast
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Modal open handlers
  const handleOpenAddExpense = (action?: 'camera' | 'gallery') => {
    setActiveModal('add_expense');
    setModalInitialAction(action || null);
  };

  const handleOpenScan = (action?: 'camera' | 'gallery') => {
    setActiveModal('scan');
    setModalInitialAction(action || null);
  };

  const handleCloseModal = () => {
    // Preserves selected image when simply closing or opening preview
    setActiveModal(null);
    setModalInitialAction(null);
  };

  const handleClearImageState = () => {
    if (activeModal === 'add_expense') {
      if (addExpenseImage.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(addExpenseImage.previewUrl);
      }
      setAddExpenseImage(emptyCaptureState);
    } else if (activeModal === 'scan') {
      if (scanImage.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(scanImage.previewUrl);
      }
      setScanImage(emptyCaptureState);
    }
  };

  const handleUpdateImageState = (newState: CapturedImageState) => {
    if (activeModal === 'add_expense') {
      setAddExpenseImage(newState);
    } else if (activeModal === 'scan') {
      setScanImage(newState);
    }
  };

  const handleConfirmModal = (file: File, url: string) => {
    const currentMode = activeModal;
    setActiveModal(null);
    setModalInitialAction(null);

    // Reset that section's captured image state upon confirmed submission
    if (currentMode === 'add_expense') {
      setAddExpenseImage(emptyCaptureState);
    } else if (currentMode === 'scan') {
      setScanImage(emptyCaptureState);
    }

    startAnalysisSession(file, url);
  };

  const startAnalysisSession = async (file: File, url: string) => {
    setActiveFile(file);
    setPreviewUrl(url);
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
    // Ensure all capture states are completely cleared upon saving
    setAddExpenseImage(emptyCaptureState);
    setScanImage(emptyCaptureState);

    setSavedToast(`Saved bill from ${savedBill.merchantName} (₹${savedBill.amount.toFixed(2)})`);
    setTimeout(() => setSavedToast(null), 4000);
    navigate('/history');
  };

  // Determine whether an active analysis / correction session is taking over the screen
  const isSessionActive = Boolean(previewUrl && (isAnalyzing || analysisError || analysisResult));

  // Supply isolated image state to the active modal mode
  const currentModalImage = activeModal === 'add_expense' ? addExpenseImage : scanImage;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar 
        onOpenScan={() => handleOpenScan()} 
        onOpenAddExpense={() => handleOpenAddExpense()}
      />

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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 transition-all">
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
                  handleOpenScan();
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
            <Route 
              path="/" 
              element={
                <HomePage 
                  onOpenAddExpense={handleOpenAddExpense} 
                  onOpenScan={() => handleOpenScan()}
                />
              } 
            />
            <Route 
              path="/history" 
              element={
                <HistoryPage 
                  onOpenScan={() => handleOpenScan()}
                />
              } 
            />
            <Route path="/insights" element={<InsightsPage />} />
            <Route 
              path="/database" 
              element={
                <DatabasePage 
                  onOpenScan={() => handleOpenScan()}
                />
              } 
            />
            <Route 
              path="*" 
              element={
                <HomePage 
                  onOpenAddExpense={handleOpenAddExpense} 
                  onOpenScan={() => handleOpenScan()}
                />
              } 
            />
          </Routes>
        )}
      </main>

      {/* Camera / Upload Modal (supports both Add Expense and Scan with isolated state) */}
      {activeModal && (
        <CameraUploadModal
          isOpen={Boolean(activeModal)}
          mode={activeModal}
          initialAction={modalInitialAction}
          currentImageState={currentModalImage}
          onUpdateImageState={handleUpdateImageState}
          onClearImageState={handleClearImageState}
          onClose={handleCloseModal}
          onConfirm={handleConfirmModal}
        />
      )}

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
