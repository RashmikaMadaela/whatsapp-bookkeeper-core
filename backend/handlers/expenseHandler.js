import { getMediaUrl, downloadMedia, sendMessage } from "../services/whatsappService.js";
import { extractExpenseData } from "../services/geminiService.js";
import { setPending } from "../store/pendingStore.js";
import { saveTransaction } from "../services/prismaService.js";

/**
 * Handle an incoming image identified as an expense receipt.
 * Downloads the image, sends it to Gemini, stores in pending state,
 * and sends a confirmation request to the user.
 */
export async function handleExpenseImage(senderId, mediaId) {
  try {
    const mediaUrl = await getMediaUrl(mediaId);
    const imageBuffer = await downloadMedia(mediaUrl);
    const extracted = await extractExpenseData(imageBuffer);

    if (extracted.error) {
      return sendMessage(
        senderId,
        "❌ Couldn't read that receipt clearly. Please type: expense [amount] [vendor] [category]"
      );
    }

    const data = {
      date: extracted.date,
      amount: extracted.total_amount,
      vendor: extracted.vendor,
      category: extracted.category,
      paymentMethod: null,
      platform: null,
    };

    setPending(senderId, "EXPENSE", data, autoSaveHandler);

    const dateDisplay = data.date ?? "Unknown date";
    const confirmText =
      `📋 Please confirm this expense:\n\n` +
      `Date:     ${dateDisplay}\n` +
      `Amount:   LKR ${data.amount?.toLocaleString()}\n` +
      `Vendor:   ${data.vendor}\n` +
      `Category: ${data.category}\n\n` +
      `Reply *ok* to save.\n` +
      `To correct: type field + value\n  e.g., "amount 1500 category Supplies"\n` +
      `Reply *cancel* to discard.`;

    await sendMessage(senderId, confirmText);
  } catch (err) {
    console.error("❌ expenseHandler error:", err);
    await sendMessage(
      senderId,
      "❌ Something went wrong processing your receipt. Please try again."
    );
  }
}

/**
 * Called by pendingStore after 5-minute timeout — saves with isConfirmed=false.
 */
async function autoSaveHandler(senderId, type, data) {
  try {
    await saveTransaction({ ...data, type, senderId, isConfirmed: false });
    await sendMessage(
      senderId,
      `⏰ No reply received. Expense auto-saved (unconfirmed): LKR ${data.amount} at ${data.vendor}.\nCheck the dashboard to review.`
    );
  } catch (err) {
    console.error("❌ Expense auto-save error:", err);
  }
}
