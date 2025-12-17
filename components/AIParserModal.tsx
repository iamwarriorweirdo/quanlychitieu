import React, { useState, useEffect } from 'react';
import { X, Upload, Wand2, Loader2, Image as ImageIcon, Type, ScanLine, Cloud, Zap } from 'lucide-react';
import { parseBankNotification } from '../services/geminiService';
import { ParsedTransactionData } from '../types';
import { translations, Language } from '../utils/i18n';
import { parseWithRegex } from '../utils/regexParser';
import Tesseract from 'tesseract.js';

// CẤU HÌNH CLOUDINARY
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; 
const CLOUDINARY_CLOUD_NAME = 'demo'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ParsedTransactionData[]) => void; // Expect Array
  initialMode?: 'text' | 'image';
  lang: Language;
}

export const AIParserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialMode = 'text', lang }) => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setStatusText('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    if (CLOUDINARY_CLOUD_NAME === 'demo') {
        console.warn("Using demo cloud name. Skipping upload.");
        return null; 
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.secure_url;
    } catch (e) {
      console.error("Cloudinary Upload Error:", e);
      return null;
    }
  };

  const handleOfflineExtract = async () => {
      if (mode === 'text' && !inputText.trim()) return;
      if (mode === 'image' && !imageFile) return;

      setIsLoading(true);
      setError(null);
      setStatusText("Đang xử lý Offline (Không dùng Server)...");

      try {
          let textToParse = inputText;

          if (mode === 'image' && imageFile) {
              setStatusText("Đang đọc chữ từ ảnh (OCR)...");
              const compressedBase64 = await resizeImage(imageFile);
              const { data: { text } } = await Tesseract.recognize(
                  compressedBase64,
                  'eng+vie',
                  { logger: m => console.log(m) }
              );
              textToParse = text;
          }

          if (!textToParse) throw new Error("Không tìm thấy văn bản để xử lý.");

          setStatusText("Đang phân tích dữ liệu...");
          const result = parseWithRegex(textToParse);
          result.description += " (Offline Mode)";
          
          onSuccess([result]); // Wrap in array
          onClose();

      } catch (err: any) {
          console.error(err);
          setError("Lỗi Offline: " + (err.message || "Không thể xử lý."));
      } finally {
          setIsLoading(false);
          setStatusText('');
      }
  };

  const handleProcess = async () => {
    if (mode === 'text' && !inputText.trim()) return;
    if (mode === 'image' && !imageFile) return;

    setIsLoading(true);
    setError(null);
    setStatusText(t.auth.processing);

    try {
      let ocrTextResult = '';
      let finalImageUrl = undefined;
      let compressedBase64 = null;

      if (mode === 'text') {
        ocrTextResult = inputText;
      }

      if (mode === 'image' && imageFile) {
        setStatusText("Đang xử lý ảnh...");
        compressedBase64 = await resizeImage(imageFile);

        setStatusText("Đang đọc chữ từ ảnh (OCR)...");
        try {
          const { data: { text } } = await Tesseract.recognize(
            compressedBase64,
            'eng+vie', 
            { logger: m => console.log(m) }
          );
          ocrTextResult = text;
        } catch (ocrError) {
          console.warn("OCR Failed, falling back to image-only analysis:", ocrError);
        }

        setStatusText("Đang lưu trữ ảnh...");
        const uploadedUrl = await uploadToCloudinary(imageFile);
        if (uploadedUrl) {
           finalImageUrl = uploadedUrl;
        }
      }

      setStatusText(t.auth.processing);
      
      const results = await parseBankNotification(
        ocrTextResult, 
        mode === 'image' ? compressedBase64 : null, 
        finalImageUrl
      );
      
      onSuccess(results); // results is now an Array
      
      setInputText('');
      setSelectedImage(null);
      setImageFile(null);
      onClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || t.modal.error);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              {t.modal.title}
            </h2>
            <p className="text-violet-100 text-sm mt-1">
              {t.modal.subtitle}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setMode('text')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Type size={16} /> {t.modal.textMode}
          </button>
          <button 
            onClick={() => setMode('image')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'image' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ImageIcon size={16} /> {t.modal.imageMode}
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg break-words">
              {error}
            </div>
          )}

          {mode === 'text' ? (
            <textarea
              className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-700"
              placeholder={t.modal.paste}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          ) : (
            <div className="w-full">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors relative overflow-hidden">
                {selectedImage ? (
                  <img src={selectedImage} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="text-sm text-slate-500">{t.modal.upload}</p>
                    <p className="text-xs text-slate-400">PNG, JPG (Max 5MB)</p>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              
              <div className="mt-3 flex gap-2 text-xs text-slate-500 justify-center">
                 <div className="flex items-center gap-1">
                    <ScanLine size={12} className="text-emerald-500"/>
                    <span>Tesseract OCR (Auto)</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <Cloud size={12} className="text-sky-500"/>
                    <span>Cloudinary Backup</span>
                 </div>
              </div>

              {selectedImage && (
                <button 
                  onClick={() => { setSelectedImage(null); setImageFile(null); }}
                  className="mt-2 text-xs text-rose-500 hover:underline w-full text-center"
                >
                  {t.modal.remove}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleProcess}
                disabled={isLoading || (mode === 'text' && !inputText) || (mode === 'image' && !selectedImage)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isLoading && !statusText.includes("Offline") ? (
                  <>
                    <Loader2 className="animate-spin" /> {statusText || t.auth.processing}
                  </>
                ) : (
                  <>
                    <Wand2 size={18} /> {t.modal.extract} (AI Server)
                  </>
                )}
              </button>

              <button
                onClick={handleOfflineExtract}
                disabled={isLoading || (mode === 'text' && !inputText) || (mode === 'image' && !selectedImage)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
              >
                 {isLoading && statusText.includes("Offline") ? (
                     <Loader2 className="animate-spin w-4 h-4" /> 
                 ) : (
                     <Zap size={16} className="text-amber-500" /> 
                 )}
                 Quét Offline (Không dùng Server)
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};