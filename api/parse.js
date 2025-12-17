import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { content, isImage, imageUrl } = req.body;

  try {
    const systemPrompt = `
      You are a smart financial assistant. 
      Task: Extract transaction details from the provided text or image data.
      The input might be raw text from an OCR scan of a receipt, or a direct SMS copy.
      Identify: Amount, Transaction Type (INCOME/EXPENSE), Category, Description, and Date.
      If the date is missing, use today's date.
      Return JSON only.
    `;

    const parts = [];

    // Nếu có văn bản (từ nhập tay HOẶC từ Tesseract OCR)
    if (content) {
      parts.push({ text: `Analyze this transaction data: ${content}` });
      if (imageUrl) {
        parts.push({ text: `Original Receipt Image URL for reference: ${imageUrl}` });
      }
    } 
    // Fallback: Nếu không có text nhưng là ảnh base64 (cách cũ, đề phòng)
    else if (isImage && content && content.startsWith('data:')) {
       const matches = content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: {
             mimeType: matches[1],
             data: matches[2]
           }
         });
         parts.push({ text: "Analyze this image and extract transaction details." });
       }
    }

    if (parts.length === 0) {
      throw new Error("No content provided to analyze");
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
            amount: { type: Type.NUMBER, description: "Transaction amount (positive number)" },
            type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
            category: { 
              type: Type.STRING, 
              enum: [
                "Food & Dining", "Transportation", "Utilities", "Shopping", 
                "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"
              ]
            },
            description: { type: Type.STRING, description: "Short description in English or Vietnamese" },
            date: { type: Type.STRING, description: "ISO 8601 YYYY-MM-DD" }
          },
          required: ["amount", "type", "category", "description", "date"],
        },
      }
    });

    const result = response.text;
    if (!result) throw new Error("No content returned");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    res.status(500).json({ error: "AI Processing Failed: " + error.message });
  }
}