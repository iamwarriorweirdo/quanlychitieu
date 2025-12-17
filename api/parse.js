import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Increase limit for this specific route if using body-parser manually, 
  // but mostly relying on Vercel's config. 
  // Note: Vercel serverless functions have a payload limit (usually 4.5MB).
  
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

    // 1. Add OCR Text if available
    if (ocrText && ocrText.trim().length > 0) {
      parts.push({ text: `OCR Text Data:\n${ocrText}` });
    }

    // 2. Add Image if available (Base64)
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

    // 3. Add Image URL as context (optional, model might not fetch it but good for logging/context)
    if (imageUrl) {
        parts.push({ text: `Reference Image URL: ${imageUrl}` });
    }
    
    // Add instruction
    parts.push({ text: "Extract transaction details from the above data." });

    if (parts.length <= 1) { // Only instruction exists
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
    res.status(500).json({ error: "AI Processing Failed: " + error.message });
  }
}