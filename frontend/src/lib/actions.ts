"use server";

import { prisma } from "./prisma";

export type TransactionRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  amount: number;
  vendor: string | null;
  category: string;
  paymentMethod: string | null;
  platform: string | null;
  isConfirmed: boolean;
  senderId: string;
};

export type CategoryTotal = {
  category: string;
  total: number;
};

export type PLSummary = {
  income: number;
  expenses: number;
  net: number;
};

// ---------------------------------------------------------------------------
// Fetch all transactions (optionally filtered by type)
// ---------------------------------------------------------------------------
export async function getTransactions(
  filter?: "INCOME" | "EXPENSE"
): Promise<TransactionRow[]> {
  const rows = await prisma.transaction.findMany({
    where: filter ? { type: filter } : {},
    orderBy: { date: "desc" },
    select: {
      id: true,
      type: true,
      date: true,
      amount: true,
      vendor: true,
      category: true,
      paymentMethod: true,
      platform: true,
      isConfirmed: true,
      senderId: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    type: r.type as "INCOME" | "EXPENSE",
    date: r.date.toISOString().split("T")[0],
  }));
}

// ---------------------------------------------------------------------------
// Monthly P&L summary
// ---------------------------------------------------------------------------
export async function getMonthlyPL(
  year: number,
  month: number // 1-indexed
): Promise<PLSummary> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

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

  const income = incomeAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;
  return { income, expenses, net: income - expenses };
}

// ---------------------------------------------------------------------------
// Income by source/category for the current month
// ---------------------------------------------------------------------------
export async function getIncomeBySource(
  year: number,
  month: number
): Promise<CategoryTotal[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    _sum: { amount: true },
    where: { type: "INCOME", date: { gte: start, lt: end } },
  });

  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }));
}

// ---------------------------------------------------------------------------
// Expenses by category for the current month
// ---------------------------------------------------------------------------
export async function getExpensesByCategory(
  year: number,
  month: number
): Promise<CategoryTotal[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    _sum: { amount: true },
    where: { type: "EXPENSE", date: { gte: start, lt: end } },
  });

  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }));
}

// ---------------------------------------------------------------------------
// Daily totals for the current month (for PLChart bar chart)
// ---------------------------------------------------------------------------
export async function getDailyTotals(
  year: number,
  month: number
): Promise<{ date: string; income: number; expenses: number }[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const rows = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, amount: true, type: true },
    orderBy: { date: "asc" },
  });

  const map = new Map<string, { income: number; expenses: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().split("T")[0];
    if (!map.has(key)) map.set(key, { income: 0, expenses: 0 });
    const entry = map.get(key)!;
    if (row.type === "INCOME") entry.income += row.amount;
    else entry.expenses += row.amount;
  }

  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

// ---------------------------------------------------------------------------
// User management (OWNER only — enforce role check at the call site)
// ---------------------------------------------------------------------------
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  createdAt: string;
};

async function requireOwner() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized");
  }
}

export async function listUsers(): Promise<UserRow[]> {
  await requireOwner();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as "OWNER" | "STAFF",
    createdAt: u.createdAt.toISOString().split("T")[0],
  }));
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "STAFF";
}): Promise<{ success: boolean; error?: string }> {
  await requireOwner();
  try {
    const hashed = await bcrypt.hash(data.password, 12);
    await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed, role: data.role },
    });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("Unique constraint")) return { success: false, error: "Email already in use." };
    return { success: false, error: msg };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  await requireOwner();
  const session = await auth();
  if (session?.user.id === id) return { success: false, error: "Cannot delete your own account." };
  await prisma.user.delete({ where: { id } });
  return { success: true };
}
