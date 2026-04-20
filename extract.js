import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to prepare the image for the API
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function extractReceiptData(imagePath) {
  // Using 1.5 Flash for speed and setting responseMimeType to enforce JSON output
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
  // The System Prompt: This is where the magic happens
  const prompt = `
    You are an expert automated bookkeeper processing receipts from Sri Lanka. 
    Analyze the attached receipt image and extract the following information. 
    Return ONLY a valid JSON object with the exact following keys:
    
    - "date": The date on the receipt in YYYY-MM-DD format (if missing, return null).
    - "total_amount": The final total amount paid as a number (ignore commas and currency symbols like Rs, LKR, etc.).
    - "vendor": The name of the shop, cafe, or business.
    - "category": Categorize the expense into one of these exact strings: ["Food/Beverage", "Groceries", "Utilities", "Transport", "Supplies", "Other"].

    If the receipt is completely unreadable or clearly not a receipt, return {"error": "unreadable"}.
  `;

  // Make sure the mimeType matches your test image (image/jpeg, image/png, etc.)
  const imagePart = fileToGenerativePart(imagePath, "image/jpeg"); 

  try {
    console.log("Analyzing receipt via Gemini Vision...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const jsonText = response.text();
    
    console.log("\n✅ Extraction Successful!");
    console.log(JSON.parse(jsonText));

  } catch (error) {
    console.error("❌ Error during extraction:", error);
  }
}

// Execution: Replace this with the name of a real receipt photo in your folder
extractReceiptData("test-receipt.jpeg");