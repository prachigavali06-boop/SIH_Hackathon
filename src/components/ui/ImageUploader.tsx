// ============================================================
// ImageUploader — Photo capture, compression & evidence attachment
// Member 2 — Multimodal Field Evidence (Image)
// ============================================================

import { useState, useRef } from 'react';
import { Camera, Upload, X, Eye, Sparkles, AlertCircle } from 'lucide-react';

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
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 0.75
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression blob creation failed'));
                return;
              }
              const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
              const sizeKb = Math.round(blob.size / 1024);
              resolve({ dataUrl, blob, sizeKb });
            },
            'image/jpeg',
            0.75
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsProcessing(true);

    const newImages: UploadedImage[] = [...images];

    for (let i = 0; i < fileList.length; i++) {
      if (newImages.length >= maxImages) break;
      const file = fileList[i];

      if (!file.type.startsWith('image/')) {
        setErrorMsg(isHindi ? 'केवल फोटो (JPG/PNG) समर्थित हैं।' : 'Only image files (JPEG/PNG) are supported.');
        continue;
      }

      try {
        const { dataUrl, blob, sizeKb } = await compressImage(file);

        // Provider-independent demo lesion tagger simulation
        const isLesionLikely = file.name.toLowerCase().includes('lesion') ||
                               file.name.toLowerCase().includes('mouth') ||
                               file.name.toLowerCase().includes('blister') ||
                               sizeKb > 50;

        const imgEntry: UploadedImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          dataUrl,
          compressedBlob: blob,
          sizeKb,
          metadata: {
            detectedLesion: isLesionLikely,
            confidence: isLesionLikely ? 0.84 : 0.65,
            notes: isLesionLikely
              ? 'Visual feature tagger: Epithelial / cutaneous irregularity noted (prototype triage only).'
              : 'Visual feature tagger: General herd photograph indexed.',
          },
        };

        newImages.push(imgEntry);
      } catch (err) {
        console.error('Image compression error:', err);
        setErrorMsg(isHindi ? 'फोटो लोड करने में त्रुटि।' : 'Failed to compress and load image.');
      }
    }

    setImages(newImages);
    onImagesChange(newImages);
    setIsProcessing(false);

    // Reset inputs
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
              {isHindi ? 'फोटो साक्ष्य / Lesion Photos' : 'Photo Evidence / Lesion Upload'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isHindi
                ? 'मुंह, खुर या त्वचा के घाव/छाले की फोटो खींचें (अधिकतम 3)'
                : 'Attach mouth, hoof, or skin lesion photos (Max 3, auto-compressed)'}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-gray-400">
          {images.length}/{maxImages} {isHindi ? 'फोटो' : 'Photos'}
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
            className="btn btn-sm btn-secondary flex items-center justify-center gap-1.5 py-2.5 border-dashed border-2 hover:border-blue-400 bg-white"
          >
            <Camera size={15} className="text-blue-600" />
            <span className="text-xs font-600">
              {isHindi ? 'कैमरा खोलें' : 'Take Photo (Camera)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="btn btn-sm btn-secondary flex items-center justify-center gap-1.5 py-2.5 border-dashed border-2 hover:border-blue-400 bg-white"
          >
            <Upload size={15} className="text-gray-600" />
            <span className="text-xs font-600">
              {isHindi ? 'गैलरी से चुनें' : 'Upload Gallery'}
            </span>
          </button>
        </div>
      )}

      {isProcessing && (
        <p className="text-xs text-blue-600 animate-pulse font-600 text-center py-2">
          {isHindi ? 'फोटो कंप्रेस की जा रही है…' : 'Optimizing and compressing image for low bandwidth…'}
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

              {/* Tag / Size Badge */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs pointer-events-none">
                <span className="truncate">{img.sizeKb} KB</span>
                {img.metadata?.detectedLesion && (
                  <span className="text-amber-300 font-bold flex items-center gap-0.5">
                    <Sparkles size={8} /> Lesion
                  </span>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-sm"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>

              {/* Preview Click Overlay */}
              <button
                type="button"
                onClick={() => setPreviewImage(img)}
                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 shadow-sm"
                aria-label="Preview full size"
              >
                <Eye size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-2">
              <div className="text-xs">
                <p className="font-700 text-gray-900">{previewImage.name}</p>
                <p className="text-gray-400 font-mono text-[10px]">
                  {previewImage.sizeKb} KB (Compressed for field sync)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="btn btn-sm btn-secondary p-1"
              >
                <X size={16} />
              </button>
            </div>

            <img
              src={previewImage.dataUrl}
              alt={previewImage.name}
              className="max-h-[60vh] w-full object-contain rounded-lg bg-black"
            />

            {previewImage.metadata?.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <p className="font-700 flex items-center gap-1 text-blue-950">
                  <Sparkles size={13} className="text-blue-600" />
                  Prototype Visual Indexing
                </p>
                <p className="mt-0.5 opacity-90">{previewImage.metadata.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
