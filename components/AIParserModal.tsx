import React, { useState, useEffect } from 'react';
import { X, Upload, Wand2, Loader2, Image as ImageIcon, Type, ScanLine, Cloud } from 'lucide-react';
import { parseBankNotification } from '../services/geminiService';
import { ParsedTransactionData } from '../types';
import { translations, Language } from '../utils/i18n';
import Tesseract from 'tesseract.js';

// CẤU HÌNH CLOUDINARY (Bạn nên thay thế bằng thông tin của bạn)
// Tạo tại: https://cloudinary.com/ -> Settings -> Upload -> Upload presets (Unsigned)
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // Thay bằng preset của bạn
const CLOUDINARY_CLOUD_NAME = 'demo'; // Thay bằng cloud name của bạn

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ParsedTransactionData) => void;
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        console.warn("Using demo cloud name. Please configure your own.");
        return null; // Bỏ qua upload nếu chưa cấu hình
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (e) {
      console.error("Cloudinary Upload Error:", e);
      return null;
    }
  };

  const handleProcess = async () => {
    if (mode === 'text' && !inputText.trim()) return;
    if (mode === 'image' && !imageFile) return;

    setIsLoading(true);
    setError(null);
    setStatusText(t.auth.processing);

    try {
      let contentToAnalyze = inputText;
      let finalImageUrl = undefined;

      if (mode === 'image' && imageFile) {
        // BƯỚC 1: OCR (Nhận diện văn bản)
        setStatusText("Đang đọc chữ từ ảnh (OCR)...");
        try {
          const { data: { text } } = await Tesseract.recognize(
            imageFile,
            'eng+vie', // Hỗ trợ tiếng Anh và tiếng Việt
            { logger: m => console.log(m) }
          );
          contentToAnalyze = text;
          console.log("OCR Result:", text);
        } catch (ocrError) {
          console.error("OCR Failed:", ocrError);
          // Nếu OCR lỗi, vẫn tiếp tục để gửi ảnh raw (nếu file nhỏ)
        }

        // BƯỚC 2: Upload Cloudinary (Nếu cấu hình)
        setStatusText("Đang lưu trữ ảnh...");
        const uploadedUrl = await uploadToCloudinary(imageFile);
        if (uploadedUrl) {
           finalImageUrl = uploadedUrl;
        }
      }

      // BƯỚC 3: Gửi cho AI phân tích
      setStatusText(t.auth.processing);
      // Nếu OCR thành công, contentToAnalyze sẽ chứa văn bản -> API xử lý nhẹ hơn
      // Nếu không, gửi base64 (chỉ khi file nhỏ, nếu không sẽ lỗi 500)
      const payloadContent = contentToAnalyze || (selectedImage || "");
      
      const result = await parseBankNotification(payloadContent, mode === 'image', finalImageUrl);
      
      onSuccess(result);
      
      // Reset
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
                    <ScanLine size={12} className="text-indigo-500"/>
                    <span>Tesseract OCR</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <Cloud size={12} className="text-indigo-500"/>
                    <span>Cloudinary</span>
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

          <button
            onClick={handleProcess}
            disabled={isLoading || (mode === 'text' && !inputText) || (mode === 'image' && !selectedImage)}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" /> {statusText || t.auth.processing}
              </>
            ) : (
              <>
                <Wand2 size={18} /> {t.modal.extract}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};