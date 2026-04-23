import { getTransactions, getIncomeBySource } from "@/lib/actions";
import TransactionTable from "@/components/TransactionTable";
import IncomePieChart from "@/components/IncomePieChart";

export default async function IncomePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, bySource] = await Promise.all([
    getTransactions("INCOME"),
    getIncomeBySource(year, month),
  ]);

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Income</h2>
        <p className="text-gray-500 text-sm mt-1">
          {transactions.length} records &mdash; Total:{" "}
          <span className="text-green-600 font-semibold">
            LKR {total.toLocaleString("en-LK")}
          </span>
        </p>
      </div>

      {bySource.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <IncomePieChart
            data={bySource}
            title={`Income by Source — ${now.toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}`}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">Income Transactions</h3>
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}
