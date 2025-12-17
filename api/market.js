import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { symbols } = req.body;

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: "Missing symbols list" });
  }

  // Use Gemini with Google Search to get real-time data
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `
      Find the current market price in VND (Vietnam Dong) for these assets: ${symbols.join(', ')}.
      
      Rules:
      1. For 3-letter tickers (e.g., VIC, VNM, FPT), assume they are Vietnamese Stocks (HOSE/HNX).
      2. For 'BTC', 'ETH', 'SOL', assume Cryptocurrency.
      3. For 'Gold', 'Vàng', 'SJC', find the current SJC Gold sell price in VND.
      4. Convert all prices to VND numbers (integers).
      
      You MUST return the result as a valid JSON object. Keys are the symbols provided, values are the price in VND (number).
      Do not wrap in markdown code blocks. Just return the raw JSON string.
      Example: { "VIC": 42500, "BTC": 1500000000, "VNM": 68000 }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search
        // Note: responseMimeType and responseSchema are NOT allowed when using googleSearch tool
      }
    });

    let resultText = response.text;
    if (!resultText) throw new Error("No data returned from AI");
    
    // Clean up potential markdown formatting if model ignores instruction
    resultText = resultText.trim();
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/^```json/, '').replace(/```$/, '');
    } else if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```/, '').replace(/```$/, '');
    }

    // Parse JSON manually
    let prices = {};
    try {
        prices = JSON.parse(resultText);
    } catch (e) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("AI returned invalid JSON format.");
    }
    
    // Return prices and sources if available
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    res.status(200).json({ prices, sources });

  } catch (error) {
    console.error("Market API Error:", error);
    res.status(500).json({ error: "Failed to fetch market data: " + error.message });
  }
}