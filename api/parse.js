
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
      You are a smart financial assistant specializing in Vietnamese financial documents.
      Task: Extract financial transactions from the provided input (text or image).
      
      CRITICAL RULES FOR DOCUMENTS:
      1. **Salary Slips / Payslips (Bảng lương/Phiếu lương)**:
         - If the document looks like a payroll (contains "Lương", "Net salary", "Thực lãnh", "BHXH", "Deductions").
         - LOOK FOR "Tiền lương thực lãnh" or "Net salary". This is the final amount the user actually receives.
         - Classify this final amount as a SINGLE "INCOME" transaction.
         - Category: "Salary".
         - Description: "Lương tháng [Month]" (infer month from document if available, e.g., "Lương tháng 3/2025").

      2. **Expense Lists (Danh sách chi tiêu)**: 
         - Items starting with "Tiền..." (e.g., Tiền sữa, Tiền học) are EXPENSES.
         - If there's a "Tổng cộng" at the bottom of an expense list, extract it as one single "EXPENSE" summary.

      3. **General Bank Notifications**:
         - "Cộng/+" = INCOME.
         - "Trừ/-" = EXPENSE.

      4. **Categorization**: 
         - Payroll/Income: "Salary"
         - Education/Kids: "Other" (description "Tiền học/Sữa")
         - Bills: "Utilities"
         - Food: "Food & Dining"
         - General/Summary: "Other"
      
      OUTPUT: Return a JSON ARRAY of objects. Example: [{"amount": 12604981, "type": "INCOME", "category": "Salary", "description": "Lương tháng 3/2025", "date": "2025-03-31T00:00:00Z"}]
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
    
    parts.push({ text: "If this is a salary slip, please find the Net Salary amount and return it as INCOME." });

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
