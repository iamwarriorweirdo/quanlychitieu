
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = (process.env.API_KEY || process.env.CLIENT_KEY || "").trim();

  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: API_KEY/CLIENT_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64 } = req.body;

  try {
    // TỐI ƯU SYSTEM PROMPT: Thêm hướng dẫn cụ thể về dấu phân cách hàng nghìn
    const systemPrompt = `Analyze financial transaction text or image.
    1. Identify Store/Sender Name, Total Amount, and Date/Time.
    2. Combined Date + Time into ISO String.
    
    CRITICAL NUMBER RULE:
    - In Vietnamese bank notifications (VCB, Techcombank, etc.), a dot (.) or comma (,) is often a THOUSANDS SEPARATOR.
    - Example: '100.000' or '100,000' must be interpreted as 100000 (one hundred thousand), NOT 100.
    - Example: '455.000' must be 455000.
    - Do NOT treat trailing '.000' as decimal places.
    
    3. If multiple transactions exist, return an array.
    4. Return JSON array according to schema.`;

    const parts = [];
    if (ocrText) parts.push({ text: `Input Text: \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    // Nâng cấp lên gemini-3-flash-preview để có khả năng suy luận tốt hơn về ngữ cảnh số liệu
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Full numeric value without separators" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING },
              date: { type: Type.STRING, description: "ISO Date String" }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    let resultText = response.text || "[]";
    // Xử lý Markdown nếu có
    resultText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    const result = JSON.parse(resultText);
    res.status(200).json(result);
  } catch (error) {
    console.error("Parse API Error:", error);
    res.status(500).json({ error: "Lỗi phân tích: " + error.message });
  }
}
