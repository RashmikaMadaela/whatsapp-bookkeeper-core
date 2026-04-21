"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DayData = {
  date: string;
  income: number;
  expenses: number;
};

type Props = {
  data: DayData[];
};

export default function PLChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          }
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: number) => [
            `LKR ${value.toLocaleString()}`,
          ]}
          labelFormatter={(label: string) =>
            new Date(label).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })
          }
        />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
