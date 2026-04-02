import { RefreshCw, Brain, AlertTriangle, Timer, Sliders } from "lucide-react";

export default function ControlPanel({
  onRefresh,
  onOptimize,
  onSimulateAlert,
  autoRefresh,
  onToggleAutoRefresh,
  threshold,
  onThresholdChange,
  optimizing,
  loading,
}) {
  return (
    <div className="slide-in rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
          <Sliders size={16} className="text-orange-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Control Panel</p>
          <p className="text-gray-500 text-xs">Agent controls</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 hover:bg-gray-800 hover:border-green-500/40 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={`text-green-400 group-hover:text-green-300 ${loading ? "animate-spin" : ""}`}
          />
          <span className="text-white text-sm font-medium">Refresh Data</span>
        </button>

        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-400/60 transition-all duration-200 disabled:opacity-50 overflow-hidden"
        >
          {/* Shimmer */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent pointer-events-none" />
          <Brain
            size={16}
            className={`text-purple-400 group-hover:text-purple-300 ${optimizing ? "animate-pulse" : ""}`}
          />
          <span className="text-white text-sm font-medium">
            {optimizing ? "Optimizing Route…" : "Optimize Route"}
          </span>
          {optimizing && (
            <div className="ml-auto w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          )}
        </button>

        <button
          onClick={onSimulateAlert}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/40 transition-all duration-200"
        >
          <AlertTriangle size={16} className="text-red-400 group-hover:text-red-300" />
          <span className="text-white text-sm font-medium">Simulate Alert</span>
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={15} className="text-gray-500" />
          <span className="text-sm text-gray-400">Auto-refresh (15s)</span>
        </div>
        <button
          onClick={onToggleAutoRefresh}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
            autoRefresh ? "bg-green-500" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
              autoRefresh ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Alert threshold slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Alert Threshold</span>
          <span className="text-sm font-semibold text-white">{threshold}%</span>
        </div>
        <input
          type="range"
          min={30}
          max={90}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #22c55e 0%, #f59e0b ${threshold}%, #374151 ${threshold}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>30%</span>
          <span>90%</span>
        </div>
      </div>
    </div>
  );
}
