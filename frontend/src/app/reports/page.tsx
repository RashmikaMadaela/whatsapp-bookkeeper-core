import { getMonthlyPL, getDailyTotals } from "@/lib/actions";
import PLChart from "@/components/PLChart";

export default async function ReportsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [pl, dailyTotals] = await Promise.all([
    getMonthlyPL(year, month),
    getDailyTotals(year, month),
  ]);

  const monthLabel = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const profitMargin =
    pl.income > 0 ? ((pl.net / pl.income) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-gray-500 text-sm mt-1">{monthLabel}</p>
      </div>

      {/* Monthly P&L summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Income" value={`LKR ${pl.income.toLocaleString("en-LK")}`} color="text-green-600" />
        <StatCard label="Total Expenses" value={`LKR ${pl.expenses.toLocaleString("en-LK")}`} color="text-red-500" />
        <StatCard
          label="Net Profit"
          value={`LKR ${pl.net.toLocaleString("en-LK")}`}
          color={pl.net >= 0 ? "text-blue-600" : "text-orange-600"}
        />
        <StatCard
          label="Profit Margin"
          value={`${profitMargin}%`}
          color={Number(profitMargin) >= 0 ? "text-blue-600" : "text-orange-600"}
        />
      </div>

      {/* Daily bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">
          Daily P&amp;L — {monthLabel}
        </h3>
        {dailyTotals.length > 0 ? (
          <PLChart data={dailyTotals} />
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">
            No data yet for this month.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
