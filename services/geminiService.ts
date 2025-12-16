import { ParsedTransactionData } from '../types';

// Bây giờ service này sẽ gọi tới Vercel API Route (/api/parse)
// API Route này sẽ sử dụng Groq SDK phía server để bảo mật Key
export const parseBankNotification = async (
  input: string, 
  isImage: boolean = false
): Promise<ParsedTransactionData> => {
  
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: input, 
        isImage 
      })
    });

    if (!response.ok) {
      throw new Error("AI Service Error");
    }

    const data = await response.json();
    return data as ParsedTransactionData;

  } catch (error) {
    console.error("Groq/AI Parsing Error:", error);
    throw new Error("Không thể phân tích giao dịch. Vui lòng kiểm tra lại đầu vào.");
  }
};