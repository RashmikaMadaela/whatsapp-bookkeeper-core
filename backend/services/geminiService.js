import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}

/**
 * Convert an image Buffer to the inline data format required by Gemini.
 * @param {Buffer} buffer
 * @param {string} mimeType  e.g. "image/jpeg"
 */
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// ---------------------------------------------------------------------------
// Expense extraction
// ---------------------------------------------------------------------------
const EXPENSE_PROMPT = `
You are an expert automated bookkeeper processing expense receipts from Sri Lanka.
Analyze the attached receipt image and extract the following information.
Return ONLY a valid JSON object with these exact keys:

- "date": The date on the receipt in YYYY-MM-DD format (if missing, return null).
- "total_amount": The final total amount paid as a number (strip commas and currency symbols like Rs, LKR).
- "vendor": The name of the shop, cafe, or business.
- "category": One of exactly: ["Food/Beverage","Groceries","Utilities","Transport","Supplies","Other"].

If the image is unreadable or clearly not a receipt, return {"error":"unreadable"}.
`;

/**
 * Extract expense data from a receipt image buffer.
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType="image/jpeg"]
 * @returns {Promise<{date:string|null, total_amount:number, vendor:string, category:string} | {error:string}>}
 */
export async function extractExpenseData(imageBuffer, mimeType = "image/jpeg") {
  const model = getModel();
  const imagePart = bufferToGenerativePart(imageBuffer, mimeType);
  const result = await model.generateContent([EXPENSE_PROMPT, imagePart]);
  return JSON.parse(result.response.text());
}

// ---------------------------------------------------------------------------
// Income extraction
// ---------------------------------------------------------------------------
const INCOME_PROMPT = `
You are an expert automated bookkeeper processing income records for a Sri Lankan cafe.
Analyze the attached image (POS summary, daily sales sheet, or sales receipt) and extract:

Return ONLY a valid JSON object with these exact keys:

- "date": The date in YYYY-MM-DD format (if missing, return null).
- "total_amount": The total income amount as a number (strip commas and currency symbols like Rs, LKR).
- "source": One of exactly: ["Dine-in","Takeout","Delivery","Catering","Mixed"].
- "payment_method": How it was paid — one of ["Cash","Card","Digital","Platform Payout"] or null if unclear.
- "platform": If source is "Delivery", name the platform (e.g. "Uber Eats", "PickMe Food") or null otherwise.

If the image is unreadable or clearly not a sales/income record, return {"error":"unreadable"}.
`;

/**
 * Extract income data from a POS summary or sales image buffer.
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType="image/jpeg"]
 * @returns {Promise<{date:string|null, total_amount:number, source:string, payment_method:string|null, platform:string|null} | {error:string}>}
 */
export async function extractIncomeData(imageBuffer, mimeType = "image/jpeg") {
  const model = getModel();
  const imagePart = bufferToGenerativePart(imageBuffer, mimeType);
  const result = await model.generateContent([INCOME_PROMPT, imagePart]);
  return JSON.parse(result.response.text());
}
