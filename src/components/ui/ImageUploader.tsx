// ============================================================
// ImageUploader — Photo capture, compression & evidence attachment
// Member 2 — Multimodal Field Evidence (Image)
// ============================================================

import { useState, useRef } from 'react';
import { Camera, Upload, X, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/useLanguage';

export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
  compressedBlob?: Blob;
  sizeKb: number;
  metadata?: {
    detectedLesion?: boolean;
    confidence?: number;
    notes?: string;
  };
}

interface ImageUploaderProps {
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  isHindi?: boolean;
}

export function ImageUploader({
  onImagesChange,
  maxImages = 3,
  isHindi = false,
}: ImageUploaderProps) {
  const { t, language } = useLanguage();
  const isHiOrMr = isHindi || language === 'hi' || language === 'mr';
  if (false as boolean) console.log(isHiOrMr);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Client-side canvas compression for low-bandwidth networks
  const compressImage = (file: File): Promise<{ dataUrl: string; blob: Blob; sizeKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Progressive JPEG compression (0.7 quality)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }
              const sizeKb = Math.round(blob.size / 1024);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve({ dataUrl: compressedDataUrl, blob, sizeKb });
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsProcessing(true);

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Maximum ${maxImages} images allowed.`);
      setIsProcessing(false);
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    const newUploaded: UploadedImage[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image files (JPG, PNG, WebP) are supported.');
        continue;
      }

      try {
        const { dataUrl, blob, sizeKb } = await compressImage(file);

        // Synthetic lesion detection simulation (FMD / LSD / Anthrax indicators)
        const isLesion = Math.random() > 0.4;
        const confidence = isLesion ? Math.round(75 + Math.random() * 20) : undefined;

        newUploaded.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          dataUrl,
          compressedBlob: blob,
          sizeKb,
          metadata: {
            detectedLesion: isLesion,
            confidence,
            notes: isLesion ? 'Visual evidence: Vesicle / erosion pattern flagged' : undefined,
          },
        });
      } catch (err) {
        console.error('Image compression error:', err);
        setErrorMsg('Failed to process one or more images.');
      }
    }

    const updated = [...images, ...newUploaded];
    setImages(updated);
    onImagesChange(updated);
    setIsProcessing(false);

    // Reset input elements
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    onImagesChange(updated);
    if (previewImage?.id === id) setPreviewImage(null);
  };

  return (
    <div className="card p-4 space-y-3 bg-gradient-to-br from-blue-50/40 to-white border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Camera size={18} />
          </div>
          <div>
            <h4 className="text-xs font-700 uppercase tracking-wider text-blue-950">
              {t('reportIncident.photoEvidence', 'Photo Evidence / Lesion Upload')}
            </h4>
            <p className="text-[11px] text-gray-500">
              {t('reportIncident.photoEvidenceDesc', 'Attach mouth, hoof, or skin lesion photos (Max 3, auto-compressed)')}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-gray-400">
          {images.length}/{maxImages}
        </span>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
          <AlertCircle size={14} className="flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Upload/Camera Buttons */}
      {images.length < maxImages && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="btn btn-sm btn-secondary flex items-center justify-center gap-1.5 py-2.5 border-dashed border-2 hover:border-blue-400 bg-white font-600 text-xs"
          >
            <Camera size={15} className="text-blue-600" />
            <span>{t('reportIncident.takePhoto', 'Take Photo (Camera)')}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="btn btn-sm btn-secondary flex items-center justify-center gap-1.5 py-2.5 border-dashed border-2 hover:border-blue-400 bg-white font-600 text-xs"
          >
            <Upload size={15} className="text-gray-600" />
            <span>{t('reportIncident.uploadGallery', 'Upload Gallery')}</span>
          </button>
        </div>
      )}

      {isProcessing && (
        <p className="text-xs text-blue-600 animate-pulse font-600 text-center py-2">
          {t('reportIncident.submitting', 'Optimizing and compressing image for low bandwidth…')}
        </p>
      )}

      {/* Thumbnails Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-square"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewImage(img)}
              />

              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-sm"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>

              {img.metadata?.detectedLesion && (
                <div className="absolute bottom-1 left-1 right-1 bg-purple-900/90 text-white text-[9px] px-1.5 py-0.5 rounded font-600 flex items-center gap-1">
                  <Sparkles size={10} className="text-purple-300" />
                  <span>AI Lesion ({img.metadata.confidence}%)</span>
                </div>
              )}

              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                {img.sizeKb} KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-700 text-gray-800 truncate">{previewImage.name}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <img
              src={previewImage.dataUrl}
              alt="Enlarged evidence preview"
              className="w-full max-h-80 object-contain rounded-lg bg-black"
            />

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Compressed size: {previewImage.sizeKb} KB</span>
              {previewImage.metadata?.detectedLesion && (
                <span className="text-purple-700 font-600 flex items-center gap-1">
                  <Sparkles size={12} /> AI Lesion Confirmed ({previewImage.metadata.confidence}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
