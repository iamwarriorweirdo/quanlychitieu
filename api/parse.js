
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
      You are a world-class financial document analyzer. 
      Your goal is to extract income or expense transactions from screenshots, photos, or OCR text of Vietnamese bank notifications or payrolls.

      SPECIFIC INSTRUCTIONS FOR PAYROLLS (Bảng lương):
      - If you see terms like "Net salary", "Tiền lương thực lãnh", "Thực nhận", "Thực lãnh", "Total income".
      - The most important number is the FINAL amount the employee actually receives.
      - Ignore intermediate calculations (Insurance, Tax, Base Salary) unless they are clearly marked as a final "Income" transfer.
      - ALWAYS return this as ONE transaction of type "INCOME" and category "Salary".
      - Date: Use current date or find the month/year in the document (e.g., "Lương tháng 03/2024").

      SPECIFIC INSTRUCTIONS FOR EXPENSES:
      - If it's a list of daily expenses (e.g. Tiền học, Tiền sữa, Ăn sáng).
      - Summarize them into one "EXPENSE" if there is a "Total" or extract each item if clearly separate.

      FORMAT: Return a JSON ARRAY.
      Example: [{"amount": 12604981, "type": "INCOME", "category": "Salary", "description": "Lương thực lãnh tháng 3", "date": "2024-03-31T00:00:00Z"}]
    `;

    const parts = [];
    if (ocrText && ocrText.trim().length > 0) {
      parts.push({ text: `OCR TEXT DATA:\n${ocrText}` });
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

    // Add explicit hint for the current task
    parts.push({ text: "Find the 'Net salary' or 'Tiền lương thực lãnh' amount. It is likely a large number like 12,000,000+." });

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
    if (!result) throw new Error("No response from AI");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "AI Parsing Failed. Please try again or use manual entry." });
  }
}
