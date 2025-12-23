
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Hỗ trợ cả API_KEY (chuẩn) và CLIENT_KEY (do người dùng cấu hình trên Vercel)
  const apiKey = (process.env.API_KEY || process.env.CLIENT_KEY || "").trim();

  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: API_KEY/CLIENT_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64 } = req.body;

  try {
    // TỐI ƯU SYSTEM PROMPT: Ngắn gọn, súc tích để tiết kiệm token.
    const systemPrompt = `Analyze receipt image.
    1. Identify Store Name, Total Amount, and Date/Time (HH:mm).
    2. Combine Date + Time into precise ISO String.
    3. If multiple receipts, split them.
    4. Return JSON array.`;

    const parts = [];
    if (ocrText) parts.push({ text: `OCR: \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    // VẪN SỬ DỤNG GEMINI FLASH LITE (TỐI ƯU TOKEN & TỐC ĐỘ)
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest', 
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Total" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING },
              date: { type: Type.STRING, description: "ISO Date" }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    let resultText = response.text || "[]";
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/^```json/, '').replace(/```$/, '');
    } else if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```/, '').replace(/```$/, '');
    }

    const result = JSON.parse(resultText);
    res.status(200).json(result);
  } catch (error) {
    console.error("Parse API Error:", error);
    res.status(500).json({ error: "Lỗi phân tích: " + error.message });
  }
}
