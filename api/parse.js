
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : null;

  if (!apiKey) {
    console.error("Server Error: Missing API_KEY environment variable.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64, imageUrl } = req.body;

  try {
    const systemPrompt = `
      You are a smart financial assistant specializing in Vietnamese household expenses.
      Task: Extract financial transactions from the provided input.
      
      CRITICAL RULES FOR VIETNAMESE CONTEXT:
      1. **Expense Lists**: If you see a list of items starting with "Tiền..." (e.g., Tiền sữa, Tiền học, Tiền điện), these are ALWAYS EXPENSES.
      2. **Summary Items**: If the input has a "Tổng cộng" (Total) at the bottom of an expense list, extract that "Tổng cộng" as a single EXPENSE transaction with description "Tổng chi phí tháng".
      3. **Income Detection**: Only classify as INCOME if you see clear keywords like "Lương", "Thưởng", "Nhận tiền", or "Cộng vào tài khoản". "Tổng cộng" is NOT an indicator of income.
      4. **Categorization**: 
         - Education/Kids: "Other" (description "Tiền học/Sữa")
         - Bills: "Utilities"
         - Food: "Food & Dining"
         - General/Summary: "Other"
      
      OUTPUT: Return a JSON ARRAY of objects. Even if there's only one summary transaction, it must be in an array [].
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
    
    parts.push({ text: "Please extract the total summary transaction if this is a monthly expense list." });

    if (parts.length <= 1) { 
      return res.status(400).json({ error: "No valid input provided." });
    }

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
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: [
                  "Food & Dining", "Transportation", "Utilities", "Shopping", 
                  "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"
                ]
              },
              description: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
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
