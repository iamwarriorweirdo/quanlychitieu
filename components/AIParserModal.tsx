
import { X, Upload, Wand2, Loader2, Image as ImageIcon, Type, ScanLine, Cloud, Zap, AlertCircle, CheckCircle, Camera, RefreshCcw, Info } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { parseBankNotification } from '../services/geminiService';
import { ParsedTransactionData } from '../types';
import { translations, Language } from '../utils/i18n';
import { parseWithRegex } from '../utils/regexParser';
import Tesseract from 'tesseract.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ParsedTransactionData[]) => void;
  initialMode?: 'text' | 'image' | 'camera';
  lang: Language;
}

export const AIParserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialMode = 'text', lang }) => {
  const [mode, setMode] = useState<'text' | 'image' | 'camera'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setStatusText('');
      if (initialMode === 'camera') startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, initialMode]);

  const startCamera = async () => {
    setError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(t.modal.cameraError);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImage(dataUrl);
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
          setImageFile(file);
        });
      stopCamera();
    }
  };

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
          
          // TỐI ƯU HÓA: Đặt mặc định 480p theo yêu cầu để tối ưu token/tốc độ.
          // Mức này rất thấp, giúp gửi request cực nhanh và tốn ít token nhất.
          const MAX = 480; 
          
          // Logic Resize
          if (width > MAX || height > MAX) {
            if (width > height) { 
                height *= MAX / width; 
                width = MAX; 
            } else { 
                width *= MAX / height; 
                height = MAX; 
            }
          } 
          // Logic Upscale: Nếu ảnh quá nhỏ (vd < 300px), upscale nhẹ lên 480p để AI dễ đọc hơn
          else if (width < 300 && height < 300) {
             const scale = MAX / Math.max(width, height);
             width *= scale;
             height *= scale;
          }

          canvas.width = width; 
          canvas.height = height;
          
          // Sử dụng chất lượng cao (0.95) để bù lại độ phân giải thấp, giữ nét chữ
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
          }
          
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
      setStatusText("Đang nhận diện...");
      try {
          let textToParse = inputText;
          if ((mode === 'image' || mode === 'camera') && (imageFile || selectedImage)) {
              let compressed;
              if (imageFile) compressed = await resizeImage(imageFile);
              else compressed = selectedImage!;
              const { data: { text } } = await Tesseract.recognize(compressed, 'eng+vie');
              textToParse = text;
          }
          const result = parseWithRegex(textToParse);
          onSuccess([result]);
          onClose();
      } catch (err: any) {
          setError("Lỗi: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);
    setStatusText("AI đang phân tích...");
    try {
      let ocrTextResult = inputText;
      let compressedBase64 = null;

      if ((mode === 'image' || mode === 'camera') && (imageFile || selectedImage)) {
        if (imageFile) compressedBase64 = await resizeImage(imageFile);
        else compressedBase64 = selectedImage;
        try {
          // Tesseract vẫn chạy để lấy text phụ trợ
          const { data: { text } } = await Tesseract.recognize(compressedBase64!, 'eng+vie');
          ocrTextResult = text;
        } catch (e) {}
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
      <div className="bg-white rounded-3xl w-full max-md:fixed max-md:bottom-0 max-md:rounded-b-none max-w-md shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-20 duration-300 flex flex-col max-h-[95vh]">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-xl"><Wand2 size={24}/></div>
             <h2 className="text-xl font-bold">{t.modal.title}</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* AI Disclosure for Google Play Policy */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
             <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
             <p className="text-[10px] text-amber-800 font-medium">
               Tính năng này sử dụng <b>Google Gemini AI</b> để hỗ trợ trích xuất dữ liệu. Vui lòng kiểm tra lại kết quả trước khi lưu.
             </p>
          </div>

          {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl flex items-center gap-2 border border-rose-100"><AlertCircle size={14}/> {error}</div>}

          <div className="flex p-1 bg-slate-100 rounded-2xl shrink-0">
             <button onClick={() => { stopCamera(); setMode('text'); }} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t.modal.textMode}</button>
             <button onClick={() => { stopCamera(); setMode('image'); }} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t.modal.imageMode}</button>
             <button onClick={() => { setMode('camera'); startCamera(); }} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'camera' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t.modal.cameraMode}</button>
          </div>

          <div className="min-h-[200px] flex flex-col gap-4">
            {mode === 'text' && (
              <textarea className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder={t.modal.paste} value={inputText} onChange={e => setInputText(e.target.value)} />
            )}

            {mode === 'image' && (
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

            {mode === 'camera' && (
              <div className="w-full h-64 bg-black rounded-2xl relative overflow-hidden">
                {isCameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <button onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                      <div className="w-12 h-12 border-2 border-slate-800 rounded-full"></div>
                    </button>
                  </>
                ) : selectedImage ? (
                  <div className="h-full w-full relative">
                    <img src={selectedImage} className="w-full h-full object-contain" />
                    <button onClick={startCamera} className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full text-slate-700 shadow flex items-center gap-1 text-xs font-bold">
                       <RefreshCcw size={16} /> {t.modal.retake}
                    </button>
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-500">
                    <Camera size={48} className="mb-2 opacity-20" />
                    <button onClick={startCamera} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">{t.modal.cameraMode}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 shrink-0">
             <button onClick={handleProcess} disabled={isLoading || (mode !== 'text' && !selectedImage && !imageFile)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {isLoading ? "Đang xử lý..." : t.modal.extract}
             </button>
             <button onClick={handleOfflineExtract} disabled={isLoading || (mode !== 'text' && !selectedImage && !imageFile)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm">
                <Zap size={16} className="text-amber-500" /> Quét thủ công
             </button>
          </div>
        </div>
      </div>
    );
  };
