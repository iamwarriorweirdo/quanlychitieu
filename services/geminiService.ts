import { ParsedTransactionData } from '../types';
import { parseWithRegex } from '../utils/regexParser';

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
    console.warn("AI Parsing Error:", error);
    
    // FALLBACK: If API fails (Auth error, quota exceeded, etc.) and we have text, use Regex
    if (ocrText && ocrText.trim().length > 0) {
        console.log("Falling back to Offline Regex Parser...");
        const fallbackData = parseWithRegex(ocrText);
        // Add a flag or note to description so user knows
        fallbackData.description += " (Offline Scan)";
        return fallbackData;
    }

    throw new Error(error.message || "Unable to parse transaction.");
  }
};