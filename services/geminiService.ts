import { ParsedTransactionData } from '../types';

export const parseBankNotification = async (
  ocrText: string, 
  imageBase64?: string | null,
  imageUrl?: string | null
): Promise<ParsedTransactionData> => {
  
  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ocrText, 
        imageBase64,
        imageUrl 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Try to parse JSON error if possible
      try {
          const jsonError = JSON.parse(errorText);
          throw new Error(jsonError.error || errorText);
      } catch {
          throw new Error(`Server Error: ${errorText}`);
      }
    }

    const data = await response.json();
    return data as ParsedTransactionData;

  } catch (error: any) {
    console.error("AI Parsing Error:", error);
    throw new Error(error.message || "Unable to parse transaction.");
  }
};