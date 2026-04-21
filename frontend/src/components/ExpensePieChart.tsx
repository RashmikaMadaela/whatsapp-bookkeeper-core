"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryTotal } from "@/lib/actions";

const COLORS = ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];

type Props = {
  data: CategoryTotal[];
  title?: string;
};

export default function ExpensePieChart({ data, title = "Expenses by Category" }: Props) {
  const chartData = data.map((d) => ({ name: d.category, value: d.total }));

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-600 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`LKR ${value.toLocaleString()}`, ""]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
