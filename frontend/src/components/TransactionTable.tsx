import type { TransactionRow } from "@/lib/actions";

type Props = {
  transactions: TransactionRow[];
};

export default function TransactionTable({ transactions }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Vendor / Source</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Amount (LKR)</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                No transactions found.
              </td>
            </tr>
          )}
          {transactions.map((t) => (
            <tr
              key={t.id}
              className={
                !t.isConfirmed
                  ? "bg-amber-50 border-l-4 border-amber-400"
                  : "border-t border-gray-100 hover:bg-gray-50"
              }
            >
              <td className="px-4 py-3 whitespace-nowrap">{t.date}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.type === "INCOME"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {t.type === "INCOME" ? "Income" : "Expense"}
                </span>
              </td>
              <td className="px-4 py-3">{t.vendor ?? t.category}</td>
              <td className="px-4 py-3">{t.category}</td>
              <td className="px-4 py-3 text-right font-medium">
                {t.amount.toLocaleString("en-LK")}
              </td>
              <td className="px-4 py-3">{t.paymentMethod ?? "—"}</td>
              <td className="px-4 py-3">
                {t.isConfirmed ? (
                  <span className="text-green-600 text-xs">✓ Confirmed</span>
                ) : (
                  <span className="text-amber-600 text-xs font-semibold">
                    ⚠ Review
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
