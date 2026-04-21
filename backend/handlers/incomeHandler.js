import { getMediaUrl, downloadMedia, sendMessage } from "../services/whatsappService.js";
import { extractIncomeData } from "../services/geminiService.js";
import { setPending } from "../store/pendingStore.js";
import { saveTransaction } from "../services/prismaService.js";

/**
 * Handle an incoming image identified as an income record (POS summary / sales sheet).
 * Downloads the image, sends it to Gemini, stores in pending state,
 * and sends a confirmation request to the user.
 */
export async function handleIncomeImage(senderId, mediaId) {
  try {
    const mediaUrl = await getMediaUrl(mediaId);
    const imageBuffer = await downloadMedia(mediaUrl);
    const extracted = await extractIncomeData(imageBuffer);

    if (extracted.error) {
      return sendMessage(
        senderId,
        "❌ Couldn't read that income record. Please type: income [amount] [source] [payment]"
      );
    }

    const data = {
      date: extracted.date,
      amount: extracted.total_amount,
      vendor: null,
      category: extracted.source,
      paymentMethod: extracted.payment_method ?? null,
      platform: extracted.platform ?? null,
    };

    setPending(senderId, "INCOME", data, autoSaveHandler);

    const dateDisplay = data.date ?? "Unknown date";
    const platformLine = data.platform ? `\nPlatform: ${data.platform}` : "";
    const confirmText =
      `📋 Please confirm this income entry:\n\n` +
      `Date:    ${dateDisplay}\n` +
      `Amount:  LKR ${data.amount?.toLocaleString()}\n` +
      `Source:  ${data.category}\n` +
      `Payment: ${data.paymentMethod ?? "Unknown"}` +
      platformLine +
      `\n\nReply *ok* to save.\n` +
      `To correct: type field + value\n  e.g., "amount 15000 source Dine-in payment Cash"\n` +
      `Reply *cancel* to discard.`;

    await sendMessage(senderId, confirmText);
  } catch (err) {
    console.error("❌ incomeHandler error:", err);
    await sendMessage(
      senderId,
      "❌ Something went wrong processing your income record. Please try again."
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
      `⏰ No reply received. Income auto-saved (unconfirmed): LKR ${data.amount} from ${data.category}.\nCheck the dashboard to review.`
    );
  } catch (err) {
    console.error("❌ Income auto-save error:", err);
  }
}
