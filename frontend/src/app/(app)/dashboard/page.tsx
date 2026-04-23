import {
  getTransactions,
  getMonthlyPL,
  getDailyTotals,
} from "@/lib/actions";
import TransactionTable from "@/components/TransactionTable";
import PLChart from "@/components/PLChart";

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, pl, dailyTotals] = await Promise.all([
    getTransactions(),
    getMonthlyPL(year, month),
    getDailyTotals(year, month),
  ]);

  const unconfirmedCount = transactions.filter((t) => !t.isConfirmed).length;
  const monthLabel = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">{monthLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Income"
          value={pl.income}
          color="text-green-600"
        />
        <SummaryCard
          label="Expenses"
          value={pl.expenses}
          color="text-red-500"
        />
        <SummaryCard
          label="Net Profit"
          value={pl.net}
          color={pl.net >= 0 ? "text-blue-600" : "text-orange-600"}
        />
      </div>

      {/* Unconfirmed alert */}
      {unconfirmedCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-4 py-3 text-sm">
          ⚠ <strong>{unconfirmedCount}</strong> transaction
          {unconfirmedCount > 1 ? "s" : ""} auto-saved without confirmation.
          Review highlighted rows below.
        </div>
      )}

      {/* P&L Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">
          Daily Income vs Expenses — {monthLabel}
        </h3>
        <PLChart data={dailyTotals} />
      </div>

      {/* All transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">All Transactions</h3>
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        LKR {value.toLocaleString("en-LK")}
      </p>
    </div>
  );
}
