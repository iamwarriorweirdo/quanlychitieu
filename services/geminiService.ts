import { ParsedTransactionData } from '../types';

export const parseBankNotification = async (
  input: string, 
  isImage: boolean = false,
  imageUrl?: string
): Promise<ParsedTransactionData> => {
  
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: input, // Đây sẽ là Text (OCR hoặc nhập tay)
        isImage,
        imageUrl // Link ảnh Cloudinary (nếu có)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${errorText}`);
    }

    const data = await response.json();
    return data as ParsedTransactionData;

  } catch (error: any) {
    console.error("AI Parsing Error:", error);
    throw new Error(error.message || "Unable to parse transaction.");
  }
};