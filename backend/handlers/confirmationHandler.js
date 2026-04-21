import { getPending, clearPending } from "../store/pendingStore.js";
import { saveTransaction } from "../services/prismaService.js";
import { sendMessage } from "../services/whatsappService.js";

const CONFIRM_WORDS = new Set(["ok", "yes", "confirm", "save", "correct"]);
const CANCEL_WORDS = new Set(["cancel", "no", "discard", "abort"]);

// Allowed field aliases for correction parsing
const FIELD_ALIASES = {
  // Shared
  amount: "amount",
  date: "date",
  // Expense fields
  vendor: "vendor",
  category: "category",
  // Income fields
  source: "category",   // income uses category field to store source
  payment: "paymentMethod",
  platform: "platform",
};

/**
 * Parse a correction reply like "amount 1500 category Groceries" into a patch object.
 * Supports multi-word values by consuming tokens until the next known key.
 * @param {string} text
 * @returns {object} patch
 */
function parseCorrections(text) {
  const tokens = text.trim().split(/\s+/);
  const patch = {};
  let i = 0;

  while (i < tokens.length) {
    const key = tokens[i].toLowerCase();
    const mappedKey = FIELD_ALIASES[key];

    if (mappedKey) {
      i++;
      // Collect value tokens until we hit the next known key
      const valueParts = [];
      while (i < tokens.length && !FIELD_ALIASES[tokens[i].toLowerCase()]) {
        valueParts.push(tokens[i]);
        i++;
      }
      const value = valueParts.join(" ");
      if (value) {
        if (mappedKey === "amount") {
          patch[mappedKey] = parseFloat(value.replace(/,/g, ""));
        } else {
          patch[mappedKey] = value;
        }
      }
    } else {
      i++; // skip unrecognised token
    }
  }

  return patch;
}

/**
 * Handle a reply from a user who has a pending confirmation entry.
 * @param {string} senderId
 * @param {string} replyText  Raw text of the user's reply
 */
export async function handleConfirmation(senderId, replyText) {
  const entry = getPending(senderId);
  if (!entry) return; // race condition guard

  const normalized = replyText.trim().toLowerCase();

  // --- Cancel ---
  if (CANCEL_WORDS.has(normalized)) {
    clearPending(senderId);
    return sendMessage(senderId, "🗑️ Entry discarded.");
  }

  // --- Confirm as-is ---
  if (CONFIRM_WORDS.has(normalized)) {
    clearPending(senderId);
    try {
      await saveTransaction({
        ...entry.data,
        type: entry.type,
        senderId,
        isConfirmed: true,
      });
      return sendMessage(senderId, buildSuccessMessage(entry.type, entry.data));
    } catch (err) {
      console.error("❌ confirmationHandler save error:", err);
      return sendMessage(senderId, "❌ Failed to save. Please try again.");
    }
  }

  // --- Correction (key-value pairs) ---
  const patch = parseCorrections(replyText);
  if (Object.keys(patch).length > 0) {
    const updatedData = { ...entry.data, ...patch };
    clearPending(senderId);
    try {
      await saveTransaction({
        ...updatedData,
        type: entry.type,
        senderId,
        isConfirmed: true,
      });
      return sendMessage(senderId, buildSuccessMessage(entry.type, updatedData));
    } catch (err) {
      console.error("❌ confirmationHandler corrected save error:", err);
      return sendMessage(senderId, "❌ Failed to save. Please try again.");
    }
  }

  // --- Unrecognised reply ---
  return sendMessage(
    senderId,
    "❓ Reply *ok* to save, type corrections (e.g., \"amount 1500 category Supplies\"), or reply *cancel* to discard."
  );
}

function buildSuccessMessage(type, data) {
  if (type === "INCOME") {
    const payment = data.paymentMethod ? ` (${data.paymentMethod})` : "";
    return `✅ Income logged: LKR ${data.amount?.toLocaleString()} from ${data.category}${payment}.`;
  }
  return `✅ Expense logged: LKR ${data.amount?.toLocaleString()} at ${data.vendor} for ${data.category}.`;
}
