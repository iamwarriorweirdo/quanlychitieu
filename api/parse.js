import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // 1. Explicitly check for API Key
  if (!process.env.API_KEY) {
    console.error("Server Error: Missing API_KEY environment variable.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing. Please check .env file." });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { ocrText, imageBase64, imageUrl } = req.body;

  try {
    const systemPrompt = `
      You are a smart financial assistant. 
      Task: Extract transaction details from the provided input (OCR text and/or receipt image).
      Identify: Amount, Transaction Type (INCOME/EXPENSE), Category, Description, and Date.
      
      Rules:
      1. If the date is missing, use today's date.
      2. If category is unclear, choose 'Other'.
      3. Convert amounts to absolute numbers.
      4. Detect VIETNAMESE or ENGLISH text.
      5. Return pure JSON only.
    `;

    const parts = [];

    if (ocrText && ocrText.trim().length > 0) {
      parts.push({ text: `OCR Text Data:\n${ocrText}` });
    }

    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: {
             mimeType: matches[1],
             data: matches[2]
           }
         });
       }
    }

    if (imageUrl) {
        parts.push({ text: `Reference Image URL: ${imageUrl}` });
    }
    
    parts.push({ text: "Extract transaction details from the above data." });

    if (parts.length <= 1) { 
      return res.status(400).json({ error: "No valid text or image provided to analyze." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Transaction amount" },
            type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
            category: { 
              type: Type.STRING, 
              enum: [
                "Food & Dining", "Transportation", "Utilities", "Shopping", 
                "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"
              ]
            },
            description: { type: Type.STRING, description: "Short description" },
            date: { type: Type.STRING, description: "ISO 8601 YYYY-MM-DD" }
          },
          required: ["amount", "type", "category", "description", "date"],
        },
      }
    });

    const result = response.text;
    if (!result) throw new Error("No content returned from AI");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    // Return the specific error message to frontend so we can trigger fallback
    res.status(500).json({ error: "AI Processing Failed: " + error.message });
  }
}