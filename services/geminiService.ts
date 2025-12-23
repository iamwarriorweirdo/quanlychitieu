
import { ParsedTransactionData } from '../types';
import { parseWithRegex } from '../utils/regexParser';
import { Capacitor } from '@capacitor/core';

const PRODUCTION_DOMAIN = 'https://quanlychitieu-dusky.vercel.app';
const API_URL = Capacitor.isNativePlatform() ? `${PRODUCTION_DOMAIN}/api` : '/api';

export const parseBankNotification = async (
  ocrText: string, 
  imageBase64?: string | null,
  imageUrl?: string | null
): Promise<ParsedTransactionData[]> => {
  
  try {
    const response = await fetch(`${API_URL}/parse`, {
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
      try {
          const jsonError = JSON.parse(errorText);
          throw new Error(jsonError.error || errorText);
      } catch {
          throw new Error(`Server Error: ${errorText}`);
      }
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];

  } catch (error: any) {
    if (ocrText && ocrText.trim().length > 0) {
        const fallbackData = parseWithRegex(ocrText);
        fallbackData.description += " (Offline Scan)";
        return [fallbackData];
    }
    throw new Error(error.message || "Unable to parse transaction.");
  }
};
