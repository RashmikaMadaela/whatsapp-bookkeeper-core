import { hasPending } from "../store/pendingStore.js";
import { handleConfirmation } from "./confirmationHandler.js";
import { handleExpenseImage } from "./expenseHandler.js";
import { handleIncomeImage } from "./incomeHandler.js";
import { handleTextCommand } from "./reportHandler.js";
import { sendMessage } from "../services/whatsappService.js";

const INCOME_KEYWORDS = ["income", "sale", "sales", "earned", "received"];

/**
 * Main entry point. Called for every valid incoming WhatsApp message.
 *
 * Priority:
 * 1. If senderId has a pending confirmation entry → confirmationHandler
 * 2. Image message → incomeHandler or expenseHandler (based on caption keyword)
 * 3. Text command → reportHandler (income/expense/report/help)
 */
export async function handleIncoming({
  senderId,
  messageType,
  caption,
  textBody,
  mediaId,
}) {
  // 1. Pending confirmation check (highest priority)
  if (hasPending(senderId)) {
    return handleConfirmation(senderId, textBody || caption);
  }

  // 2. Image message
  if (messageType === "image") {
    const isIncome = INCOME_KEYWORDS.some((kw) => caption.startsWith(kw));
    if (isIncome) {
      return handleIncomeImage(senderId, mediaId);
    }
    return handleExpenseImage(senderId, mediaId);
  }

  // 3. Text command
  if (messageType === "text" && textBody) {
    return handleTextCommand(senderId, textBody);
  }

  // Unsupported message type — silently ignore (video, audio, etc.)
}
