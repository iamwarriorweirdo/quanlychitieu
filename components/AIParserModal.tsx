
import { X, Upload, Wand2, Loader2, Image as ImageIcon, Type, ScanLine, Cloud, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { parseBankNotification } from '../services/geminiService';
import { ParsedTransactionData } from '../types';
import { translations, Language } from '../utils/i18n';
import { parseWithRegex } from '../utils/regexParser';
import Tesseract from 'tesseract.js';

const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; 
const CLOUDINARY_CLOUD_NAME = 'demo'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ParsedTransactionData[]) => void;
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
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 1600; // Tăng độ phân giải một chút để AI nhìn rõ số hơn
          if (width > MAX || height > MAX) {
            if (width > height) { height *= MAX / width; width = MAX; }
            else { width *= MAX / height; height = MAX; }
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOfflineExtract = async () => {
      setIsLoading(true);
      setError(null);
      setStatusText("Đang nhận diện ký tự...");
      try {
          let textToParse = inputText;
          if (mode === 'image' && imageFile) {
              const compressed = await resizeImage(imageFile);
              const { data: { text } } = await Tesseract.recognize(compressed, 'eng+vie');
              textToParse = text;
          }
          const result = parseWithRegex(textToParse);
          onSuccess([result]);
          onClose();
      } catch (err: any) {
          setError("Lỗi Offline: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);
    setStatusText("Đang phân tích hình ảnh & Kiểm tra logic...");
    try {
      let ocrTextResult = inputText;
      let compressedBase64 = null;

      if (mode === 'image' && imageFile) {
        compressedBase64 = await resizeImage(imageFile);
        // Tesseract chỉ làm nền, Gemini sẽ nhìn trực tiếp vào ảnh
        try {
          const { data: { text } } = await Tesseract.recognize(compressedBase64, 'eng+vie');
          ocrTextResult = text;
        } catch (e) {
          console.warn("Tesseract failed, proceeding with image only");
        }
      }
      
      const results = await parseBankNotification(ocrTextResult, compressedBase64);
      onSuccess(results);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-md:fixed max-md:bottom-0 max-md:rounded-b-none max-w-md shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-20 duration-300">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-xl"><Wand2 size={24}/></div>
             <h2 className="text-xl font-bold">{t.modal.title}</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl flex items-center gap-2 border border-rose-100"><AlertCircle size={14}/> {error}</div>}

          <div className="flex p-1 bg-slate-100 rounded-2xl">
             <button onClick={() => setMode('text')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t.modal.textMode}</button>
             <button onClick={() => setMode('image')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${mode === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t.modal.imageMode}</button>
          </div>

          {mode === 'text' ? (
            <textarea className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder={t.modal.paste} value={inputText} onChange={e => setInputText(e.target.value)} />
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50 transition-colors overflow-hidden group">
              {selectedImage ? <img src={selectedImage} className="h-full w-full object-contain p-2" /> : (
                <div className="text-center p-4">
                   <Upload className="mx-auto mb-2 text-slate-400 group-hover:scale-110 transition-transform" />
                   <p className="text-xs text-slate-500 font-bold">{t.modal.upload}</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-xl animate-pulse">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-xs font-bold">{statusText}</span>
            </div>
          )}

          <div className="space-y-3">
             <button onClick={handleProcess} disabled={isLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group">
                {!isLoading && <><CheckCircle size={18} className="group-hover:scale-125 transition-transform" /> {t.modal.extract}</>}
                {isLoading && <span>Đang xử lý...</span>}
             </button>
             <button onClick={handleOfflineExtract} disabled={isLoading} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                <Zap size={16} className="text-amber-500" /> Quét nhanh (Offline)
             </button>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-xl flex gap-3 items-start border border-blue-100">
             <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
             <p className="text-[10px] text-blue-700 leading-relaxed font-bold">Mẹo: Chế độ AI sẽ tự động tính toán lại [Số lượng x Đơn giá] để sửa lỗi OCR khi các con số 3, 5, 8 bị nhòe.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
