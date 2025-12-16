import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { content, isImage } = req.body;

  try {
    const systemPrompt = `
      You are a smart financial assistant. Task: Extract transaction details from bank SMS or receipt images.
    `;

    const parts = [];

    if (isImage) {
      const matches = content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
          throw new Error("Invalid image data");
      }
      const mimeType = matches[1];
      const data = matches[2];

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      });
      parts.push({ text: "Analyze this image and extract transaction details." });
    } else {
      parts.push({ text: content });
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
            description: { type: Type.STRING, description: "Short description in English" },
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
    res.status(500).json({ error: "AI Processing Failed" });
  }
}