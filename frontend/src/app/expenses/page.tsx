import { getTransactions, getExpensesByCategory } from "@/lib/actions";
import TransactionTable from "@/components/TransactionTable";
import ExpensePieChart from "@/components/ExpensePieChart";

export default async function ExpensesPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, byCategory] = await Promise.all([
    getTransactions("EXPENSE"),
    getExpensesByCategory(year, month),
  ]);

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Expenses</h2>
        <p className="text-gray-500 text-sm mt-1">
          {transactions.length} records &mdash; Total:{" "}
          <span className="text-red-500 font-semibold">
            LKR {total.toLocaleString("en-LK")}
          </span>
        </p>
      </div>

      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ExpensePieChart
            data={byCategory}
            title={`Expenses by Category — ${now.toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}`}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">Expense Transactions</h3>
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}
