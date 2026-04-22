import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Save a transaction to the database.
 * @param {{
 *   type: "INCOME"|"EXPENSE",
 *   date: string|null,       // YYYY-MM-DD or null (defaults to today)
 *   amount: number,
 *   vendor: string|null,
 *   description: string|null,
 *   category: string,
 *   paymentMethod: string|null,
 *   platform: string|null,
 *   receiptUrl: string|null,
 *   isConfirmed: boolean,
 *   senderId: string,
 *   rawText: string|null
 * }} data
 */
export async function saveTransaction(data) {
  return prisma.transaction.create({
    data: {
      type: data.type,
      date: data.date ? new Date(data.date) : new Date(),
      amount: data.amount,
      vendor: data.vendor ?? null,
      description: data.description ?? null,
      category: data.category,
      paymentMethod: data.paymentMethod ?? null,
      platform: data.platform ?? null,
      receiptUrl: data.receiptUrl ?? null,
      isConfirmed: data.isConfirmed ?? true,
      senderId: data.senderId,
      rawText: data.rawText ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Read — all / filtered
// ---------------------------------------------------------------------------

/**
 * Fetch all transactions ordered by date descending.
 * @param {{ type?: "INCOME"|"EXPENSE" }} [filter]
 */
export async function getTransactions(filter = {}) {
  return prisma.transaction.findMany({
    where: filter.type ? { type: filter.type } : {},
    orderBy: { date: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

/**
 * Total income and expenses for a given calendar month.
 * @param {number} year   e.g. 2026
 * @param {number} month  1-indexed (1 = January)
 * @returns {Promise<{income: number, expenses: number}>}
 */
export async function getMonthlyPL(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return aggregatePL(start, end);
}

/**
 * Total income and expenses for a single calendar day.
 * @param {Date} date
 */
export async function getDailyPL(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return aggregatePL(start, end);
}

/**
 * Total income and expenses for the 7-day window ending today.
 * @param {Date} now
 */
export async function getWeeklyPL(now) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return aggregatePL(start, end);
}

async function aggregatePL(start, end) {
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", date: { gte: start, lt: end } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", date: { gte: start, lt: end } },
    }),
  ]);

  return {
    income: incomeAgg._sum.amount ?? 0,
    expenses: expenseAgg._sum.amount ?? 0,
  };
}

/**
 * Income aggregated by category (source) for a calendar month.
 * @param {number} year
 * @param {number} month  1-indexed
 */
export async function getIncomeBySource(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    _sum: { amount: true },
    where: { type: "INCOME", date: { gte: start, lt: end } },
  });

  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }));
}

/**
 * Expenses aggregated by category for a calendar month.
 * @param {number} year
 * @param {number} month  1-indexed
 */
export async function getExpensesByCategory(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    _sum: { amount: true },
    where: { type: "EXPENSE", date: { gte: start, lt: end } },
  });

  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }));
}
