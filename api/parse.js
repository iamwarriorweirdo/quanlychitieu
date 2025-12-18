
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : null;

  if (!apiKey) {
    console.error("Server Error: Missing API_KEY environment variable.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing. Please check .env file." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64, imageUrl } = req.body;

  try {
    // UPDATED PROMPT: Extract MULTIPLE transactions
    const systemPrompt = `
      You are a smart financial assistant.
      Task: Extract a list of financial transactions from the provided input (Image/Text).
      
      SCENARIO: SUMMARY TABLES (Like salary slips):
      - If you see a table with "Lương" (Salary/Income) and "Tổng Chi" (Total Expense), create TWO separate transactions:
        1. One INCOME transaction for the Salary amount.
        2. One EXPENSE transaction for the Total Expense amount.
      - DO NOT create a transaction for "Dư" (Balance/Remaining), as this is calculated automatically.
      
      SCENARIO: DETAILED LISTS:
      - If it is a long receipt with many small items, extract them individually if possible.
      
      RULES:
      1. **Type**: Detect based on context. "Lương", "Thu nhập" = INCOME. "Chi", "Mua", "Tổng chi" = EXPENSE.
      2. **Category**: 
         - "Lương" -> "Salary"
         - "Tổng chi" -> "Other" (or infer from context)
         - "Ăn uống" -> "Food & Dining"
      3. **Amount**: Must be a positive number.
      4. **Date**: Use today's date if not found.
      
      OUTPUT: Return a JSON **ARRAY** of objects.
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
    
    parts.push({ text: "Extract a list of transactions." });

    if (parts.length <= 1) { 
      return res.status(400).json({ error: "No valid text or image provided to analyze." });
    }

    // Always use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY, // CHANGED TO ARRAY
          items: {
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
          }
        },
      }
    });

    // The GenerateContentResponse object features a text property (not a method) that directly returns the string output.
    const result = response.text;
    if (!result) throw new Error("No content returned from AI");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    res.status(500).json({ error: "AI Processing Failed: " + error.message });
  }
}
