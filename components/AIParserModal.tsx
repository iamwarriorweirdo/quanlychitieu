import React, { useState, useEffect } from 'react';
import { X, Upload, Wand2, Loader2, Image as ImageIcon, Type } from 'lucide-react';
import { parseBankNotification } from '../services/geminiService';
import { ParsedTransactionData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ParsedTransactionData) => void;
  initialMode?: 'text' | 'image';
}

export const AIParserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialMode = 'text' }) => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update mode when modal opens with a specific initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (mode === 'text' && !inputText.trim()) return;
    if (mode === 'image' && !selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const input = mode === 'text' ? inputText : selectedImage!;
      const result = await parseBankNotification(input, mode === 'image');
      onSuccess(result);
      // Reset form
      setInputText('');
      setSelectedImage(null);
      onClose();
    } catch (err) {
      setError("Không thể phân tích nội dung. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Trợ lý AI
            </h2>
            <p className="text-violet-100 text-sm mt-1">
              Dán tin nhắn SMS hoặc tải ảnh lên để tự động điền thông tin.
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setMode('text')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Type size={16} /> Văn bản / SMS
          </button>
          <button 
            onClick={() => setMode('image')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'image' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ImageIcon size={16} /> Hóa đơn / QR
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {mode === 'text' ? (
            <textarea
              className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-700"
              placeholder="Dán nội dung tin nhắn ngân hàng vào đây..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          ) : (
            <div className="w-full">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                {selectedImage ? (
                  <img src={selectedImage} alt="Preview" className="h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="text-sm text-slate-500">Tải ảnh hóa đơn / QR</p>
                    <p className="text-xs text-slate-400">PNG, JPG (Tối đa 5MB)</p>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              {selectedImage && (
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="mt-2 text-xs text-rose-500 hover:underline w-full text-center"
                >
                  Xóa ảnh
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
                <Loader2 className="animate-spin" /> Đang phân tích...
              </>
            ) : (
              <>
                <Wand2 size={18} /> Trích xuất dữ liệu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};