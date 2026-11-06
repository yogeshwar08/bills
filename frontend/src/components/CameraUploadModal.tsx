import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle, ArrowRight, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';

export type CaptureSectionMode = 'add_expense' | 'scan';

export interface CapturedImageState {
  file: File | null;
  previewUrl: string | null;
  key: string;
}

interface CameraUploadModalProps {
  isOpen: boolean;
  mode: CaptureSectionMode;
  initialAction?: 'camera' | 'gallery' | null;
  currentImageState: CapturedImageState;
  onUpdateImageState: (state: CapturedImageState) => void;
  onClearImageState: () => void;
  onClose: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function isValidImageFile(file: File): boolean {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export const CameraUploadModal: React.FC<CameraUploadModalProps> = ({
  isOpen,
  mode,
  initialAction,
  currentImageState,
  onUpdateImageState,
  onClearImageState,
  onClose,
  onConfirm,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  // Auto-trigger camera or gallery if specified via initialAction on open
  useEffect(() => {
    if (isOpen && initialAction) {
      const timer = setTimeout(() => {
        if (initialAction === 'camera') {
          triggerCamera();
        } else if (initialAction === 'gallery') {
          triggerGallery();
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  const triggerCamera = () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setErrorMsg(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
    setTimeout(() => setIsTriggering(false), 500);
  };

  const triggerGallery = () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setErrorMsg(null);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
    setTimeout(() => setIsTriggering(false), 500);
  };

  const processAndSetFile = (file: File, source: 'camera' | 'gallery') => {
    setErrorMsg(null);

    // 1. Format validation
    if (!isValidImageFile(file)) {
      setErrorMsg('Unsupported format. Please select or capture a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // 2. Size validation
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 10 MB.`);
      return;
    }

    setIsValidating(true);

    // 3. Create fresh Object URL and validate dimensions
    const newObjectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setIsValidating(false);
      if (img.width < 50 || img.height < 50) {
        URL.revokeObjectURL(newObjectUrl);
        setErrorMsg(`Image resolution is too low (${img.width}x${img.height}). Please provide a clearer receipt photograph (min 50x50).`);
        return;
      }

      // Revoke previous URL to prevent memory leaks and eliminate cached frames
      if (currentImageState.previewUrl && currentImageState.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentImageState.previewUrl);
      }

      // Generate unique key for cache-busting and fresh DOM re-mount
      const uniqueKey = `receipt-${source}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      onUpdateImageState({
        file,
        previewUrl: newObjectUrl,
        key: uniqueKey,
      });
    };

    img.onerror = () => {
      setIsValidating(false);
      URL.revokeObjectURL(newObjectUrl);
      setErrorMsg('Could not read image file. The file may be damaged or corrupted.');
    };

    img.src = newObjectUrl;
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      // User cancelled camera; keep existing preview intact
      return;
    }
    processAndSetFile(file, 'camera');
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      // User cancelled file picker
      return;
    }
    processAndSetFile(file, 'gallery');
  };

  const handleRetake = () => {
    // Open camera for retake
    triggerCamera();
  };

  const handleRemove = () => {
    if (currentImageState.previewUrl && currentImageState.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImageState.previewUrl);
    }
    setErrorMsg(null);
    onClearImageState();
  };

  const handleConfirm = () => {
    if (currentImageState.file && currentImageState.previewUrl) {
      onConfirm(currentImageState.file, currentImageState.previewUrl);
    }
  };

  const hasImage = Boolean(currentImageState.file && currentImageState.previewUrl);
  const isAddExpense = mode === 'add_expense';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                {isAddExpense ? 'Add Expense' : 'Scan Bill'}
              </span>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                {hasImage ? 'Review Photo' : isAddExpense ? 'Select Receipt' : 'Scan Receipt'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasImage 
                ? 'Verify receipt photograph before proceeding' 
                : 'Take a photo or upload from device gallery'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Native File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleCameraChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleGalleryChange}
        />

        {/* Main Body */}
        <div className="py-4 space-y-4">
          {/* Top Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Photo Selection Layout: [ Take Photo ] [ Upload Gallery ] */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={triggerCamera}
              disabled={isValidating || isTriggering}
              className="py-3.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 text-white flex items-center justify-center space-x-2 shadow-sm shadow-indigo-200 transition-all cursor-pointer touch-manipulation font-bold text-xs sm:text-sm"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              onClick={triggerGallery}
              disabled={isValidating || isTriggering}
              className="py-3.5 px-3 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 text-slate-800 border border-slate-200/90 flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer touch-manipulation font-bold text-xs sm:text-sm"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
              <span>Upload Gallery</span>
            </button>
          </div>

          {/* 2. Review Photo Preview Section */}
          <div className="relative">
            {isValidating ? (
              <div className="py-14 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center space-y-2.5">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-600">Checking image resolution & quality...</p>
              </div>
            ) : hasImage && currentImageState.previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center min-h-[220px] max-h-80 p-2 shadow-inner">
                {/* Unique key forces fresh DOM mounting and destroys previous image */}
                <img
                  key={currentImageState.key || currentImageState.previewUrl}
                  src={currentImageState.previewUrl}
                  alt="Receipt Preview"
                  className="max-h-72 w-full object-contain rounded-lg animate-in fade-in duration-200"
                />

                {/* Status Badges */}
                <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-emerald-300 flex items-center space-x-1 border border-emerald-500/30 shadow-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Latest Photo</span>
                </div>

                {currentImageState.file && (
                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-white shadow-xs border border-white/10">
                    {(currentImageState.file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={triggerCamera}
                className="py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-800">No Photo Selected</div>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Tap <strong>Take Photo</strong> to capture with camera or <strong>Upload Gallery</strong> to choose a receipt
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Supports JPG, PNG, WEBP up to 10 MB</span>
              </div>
            )}
          </div>

          {/* 3. Action Buttons Below Preview: [ Retake ] [ Remove ] */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRetake}
              disabled={!hasImage || isValidating}
              className="py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer touch-manipulation"
              title="Capture a new photo with camera"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Retake Photo</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={!hasImage || isValidating}
              className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 font-semibold text-xs bg-rose-50/60 hover:bg-rose-100/70 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 transition-all cursor-pointer touch-manipulation"
              title="Remove selected photo"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Remove</span>
            </button>
          </div>

          {/* 4. Confirm Action: [ Confirm & Continue ] or [ Confirm and Scan ] */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasImage || isValidating}
              className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-200 cursor-pointer touch-manipulation"
            >
              <span>{isAddExpense ? 'Confirm & Continue' : 'Confirm and Scan'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Helper notes */}
          <div className="text-center pt-1">
            <p className="text-[11px] text-slate-400">
              Receipt images are processed in-memory. If camera is blocked, grant browser permission or use Upload Gallery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
