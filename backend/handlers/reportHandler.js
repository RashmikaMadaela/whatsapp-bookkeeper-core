import { sendMessage } from "../services/whatsappService.js";
import { saveTransaction } from "../services/prismaService.js";
import { getMonthlyPL, getDailyPL, getWeeklyPL } from "../services/prismaService.js";

const HELP_TEXT =
  `📖 *WhatsApp Bookkeeper Commands*\n\n` +
  `*Income (image):*  Send image with caption "income" or "sale"\n` +
  `*Expense (image):* Send receipt image (no caption needed)\n\n` +
  `*Quick text entry:*\n` +
  `  income [amount] [source] [payment]\n` +
  `    e.g., income 15000 dine-in cash\n` +
  `  expense [amount] [vendor] [category]\n` +
  `    e.g., expense 2500 vegetables groceries\n\n` +
  `*Reports:*\n` +
  `  report today\n` +
  `  report week\n` +
  `  report month\n\n` +
  `*Sources:* Dine-in | Takeout | Delivery | Catering\n` +
  `*Categories:* Food/Beverage | Groceries | Utilities | Transport | Supplies | Other`;

const INCOME_SOURCES = ["dine-in", "takeout", "delivery", "catering", "mixed"];
const EXPENSE_CATEGORIES = [
  "food/beverage", "groceries", "utilities", "transport", "supplies", "other",
];

/**
 * Normalise a source/category token to its canonical form.
 */
function normaliseCategory(token, type) {
  const t = token.toLowerCase();
  if (type === "INCOME") {
    return INCOME_SOURCES.find((s) => s === t) ?? "Other";
  }
  return (
    EXPENSE_CATEGORIES.find((c) => c === t) ??
    (t === "food" || t === "beverage" ? "Food/Beverage" : "Other")
  );
}

/**
 * Route a plain-text message to the appropriate handler.
 * Text entries skip the confirmation step (fast entry for busy staff).
 */
export async function handleTextCommand(senderId, text) {
  const lower = text.toLowerCase().trim();
  const tokens = lower.split(/\s+/);
  const command = tokens[0];

  // --- Help ---
  if (command === "help") {
    return sendMessage(senderId, HELP_TEXT);
  }

  // --- Report ---
  if (command === "report") {
    return handleReport(senderId, tokens[1] ?? "today");
  }

  // --- Income quick entry: income [amount] [source?] [payment?] ---
  if (command === "income" || command === "sale" || command === "sales") {
    const amount = parseFloat(tokens[1]?.replace(/,/g, ""));
    if (!amount || isNaN(amount)) {
      return sendMessage(senderId, '❌ Format: income [amount] [source] [payment]\n  e.g., income 15000 dine-in cash');
    }
    const category = tokens[2] ? normaliseCategory(tokens[2], "INCOME") : "Other";
    const paymentMethod = tokens[3]
      ? capitalise(tokens[3])
      : null;

    await saveTransaction({
      type: "INCOME",
      date: new Date().toISOString().split("T")[0],
      amount,
      vendor: null,
      category,
      paymentMethod,
      platform: null,
      senderId,
      rawText: text,
      isConfirmed: true,
    });
    const payment = paymentMethod ? ` (${paymentMethod})` : "";
    return sendMessage(
      senderId,
      `✅ Income logged: LKR ${amount.toLocaleString()} from ${category}${payment}.`
    );
  }

  // --- Expense quick entry: expense [amount] [vendor?] [category?] ---
  if (command === "expense" || command === "spent" || command === "paid" || command === "bought") {
    const amount = parseFloat(tokens[1]?.replace(/,/g, ""));
    if (!amount || isNaN(amount)) {
      return sendMessage(senderId, '❌ Format: expense [amount] [vendor] [category]\n  e.g., expense 2500 vegetables groceries');
    }
    const vendor = tokens[2] ? capitalise(tokens[2]) : "Unknown";
    const category = tokens[3] ? normaliseCategory(tokens[3], "EXPENSE") : "Other";

    await saveTransaction({
      type: "EXPENSE",
      date: new Date().toISOString().split("T")[0],
      amount,
      vendor,
      category,
      paymentMethod: null,
      platform: null,
      senderId,
      rawText: text,
      isConfirmed: true,
    });
    return sendMessage(
      senderId,
      `✅ Expense logged: LKR ${amount.toLocaleString()} at ${vendor} for ${category}.`
    );
  }

  // --- Unrecognised ---
  return sendMessage(
    senderId,
    '❓ Unknown command. Reply *help* to see all commands.'
  );
}

async function handleReport(senderId, period) {
  try {
    let pl;
    const now = new Date();

    if (period === "today") {
      pl = await getDailyPL(now);
    } else if (period === "week") {
      pl = await getWeeklyPL(now);
    } else {
      pl = await getMonthlyPL(now.getFullYear(), now.getMonth() + 1);
    }

    const periodLabel =
      period === "today"
        ? now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : period === "week"
        ? "This Week"
        : now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const net = pl.income - pl.expenses;
    const netSign = net >= 0 ? "+" : "";

    const report =
      `📊 *${periodLabel}*\n\n` +
      `Income:     LKR ${pl.income.toLocaleString()}\n` +
      `Expenses:   LKR ${pl.expenses.toLocaleString()}\n` +
      `─────────────────────\n` +
      `Net Profit: LKR ${netSign}${net.toLocaleString()}`;

    return sendMessage(senderId, report);
  } catch (err) {
    console.error("❌ reportHandler error:", err);
    return sendMessage(senderId, "❌ Couldn't generate report. Please try again.");
  }
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
