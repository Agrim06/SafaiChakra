import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 shadow-2xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">
          {payload[0].value.toFixed(1)}% filled
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsChart({ history, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex items-center justify-center min-h-[220px]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="slide-in rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Fill History</p>
            <p className="text-gray-500 text-xs">{history.length} readings</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="w-3 h-0.5 rounded bg-green-500 inline-block" />
          <span>fill %</span>
          <span className="w-3 h-0.5 rounded bg-red-500/60 inline-block ml-2" />
          <span>alert threshold</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#4b5563", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#4b5563", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="fill"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#fillGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mini stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-800">
          {[
            { label: "Current", value: `${history[history.length - 1]?.fill.toFixed(1)}%` },
            { label: "Min",     value: `${Math.min(...history.map(h => h.fill)).toFixed(1)}%` },
            { label: "Max",     value: `${Math.max(...history.map(h => h.fill)).toFixed(1)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-gray-600 text-xs">{label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
