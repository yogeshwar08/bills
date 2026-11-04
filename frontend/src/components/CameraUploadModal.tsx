import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle, ArrowRight, RotateCcw, Trash2 } from 'lucide-react';

interface CameraUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAnalysis: (file: File, previewUrl: string) => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const CameraUploadModal: React.FC<CameraUploadModalProps> = ({
  isOpen,
  onClose,
  onStartAnalysis,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileSelection = (file: File | undefined) => {
    setErrorMsg(null);
    if (!file) return;

    // 1. Format validation
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('Unsupported format. Please select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // 2. Size validation
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 10 MB.`);
      return;
    }

    setIsValidating(true);

    // 3. Read image as Data URL for rock-solid cross-browser preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setIsValidating(false);
        if (img.width < 50 || img.height < 50) {
          setErrorMsg('Image resolution is too low (< 50x50). Please provide a clearer receipt photograph.');
          return;
        }
        setSelectedFile(file);
        setPreviewUrl(dataUrl);
      };
      img.onerror = () => {
        setIsValidating(false);
        setErrorMsg('Could not read image file. The file may be damaged or corrupted.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setIsValidating(false);
      setErrorMsg('Failed to read uploaded file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    // Open gallery input to pick another photo directly
    galleryInputRef.current?.click();
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
  };

  const handleProceed = () => {
    if (selectedFile && previewUrl) {
      onStartAnalysis(selectedFile, previewUrl);
    }
  };

  const handleClose = () => {
    handleRemove();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {selectedFile ? 'Review Photograph' : 'Scan or Upload Bill'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedFile ? 'Ensure merchant and amounts are legible' : 'Select a clear photo of your receipt or digital invoice'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden HTML Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files?.[0])}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files?.[0])}
        />

        {/* Content Area */}
        <div className="py-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isValidating && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Validating image quality...</p>
            </div>
          )}

          {!isValidating && selectedFile && previewUrl && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center min-h-[220px] max-h-80 p-2">
                <img
                  src={previewUrl}
                  alt="Bill preview"
                  className="max-h-72 w-full object-contain rounded-lg"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-white shadow-xs">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>

              {/* Action Buttons: Retake, Remove, and Analyze */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="py-3 px-3.5 rounded-xl border border-rose-200 text-rose-600 font-semibold text-xs bg-rose-50/60 hover:bg-rose-100/70 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Remove</span>
                </button>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 px-3.5 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceed}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 font-semibold text-xs text-white hover:bg-indigo-700 flex items-center justify-center space-x-1.5 transition-colors shadow-sm shadow-indigo-200 cursor-pointer"
                >
                  <span>Analyze Bill</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!isValidating && !selectedFile && (
            <div className="space-y-3">
              {/* Primary Mobile Camera Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-3.5 transition-all shadow-md shadow-indigo-200 group active:scale-[0.99] cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-sm tracking-tight">Take Photograph</div>
                  <div className="text-[11px] text-indigo-100">Use mobile camera with autofocus</div>
                </div>
              </button>

              {/* Gallery Upload Button */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 flex items-center space-x-3.5 transition-all shadow-xs group active:scale-[0.99] cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 group-hover:bg-slate-200 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-sm text-slate-900 tracking-tight">Upload from Gallery</div>
                  <div className="text-[11px] text-slate-500">Pick saved bill, invoice or receipt screenshot</div>
                </div>
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400">
                  Supports JPG, PNG, WEBP up to 10 MB. In-memory processing.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
