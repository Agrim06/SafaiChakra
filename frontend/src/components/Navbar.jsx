import { Leaf, Activity, ChevronRight, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar({ lastUpdated, isLive }) {
  // Sync local state with the document attribute
  const [theme, setTheme] = useState(document.documentElement.getAttribute("data-theme") || "dark");

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("safai-theme", newTheme);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] px-8 py-3 transition-all duration-500">
      <div className="max-w-[1800px] mx-auto glass-panel border-[var(--color-card-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 py-2.5 shadow-xl relative overflow-hidden">

        {/* Animated HUD line */}
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--color-green)]/30 to-transparent" />

        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center group transition-all ${
            theme === 'light' 
              ? 'bg-[var(--color-bg)] border-2 border-[var(--color-green)] shadow-sm' 
              : 'bg-[var(--color-green)]/10 border-2 border-[var(--color-green)]/20 hover:bg-[var(--color-green)]/20'
          }`}>
            <Leaf 
              size={18} 
              className={`transition-transform group-hover:scale-110 ${
                theme === 'light' ? 'text-[var(--color-green)] fill-[var(--color-bg)]' : 'text-[var(--color-green)]'
              }`} 
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline leading-none">
              <span className="text-[22px] font-black tracking-tight text-[var(--color-text)]">Safai</span>
              <span className="text-[22px] font-black tracking-tight text-[var(--color-green)]">Chakra</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-dim)] mt-0.5">
              Operations Center V2.0
            </p>
          </div>
        </div>

        {/* Status & Theme Controls */}
        <div className="flex items-center gap-4">
          {/* Activity Readout */}
          <div className="hidden sm:flex items-center gap-2.5 text-[var(--color-text-dim)] pr-4 border-r-2 border-[var(--color-card-border)]">
            <Activity size={16} className="animate-pulse" />
            <span className="text-[13px] font-black tabular-nums tracking-widest text-[var(--color-text)]">
              {lastUpdated || "--:--:--"}
            </span>
          </div>

          {/* Integrated Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] text-[var(--color-text-dim)] hover:text-[var(--color-green)] transition-all shadow-sm active:scale-95"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Live Heartbeat */}
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border-2 transition-all duration-500 shadow-sm ${isLive ? 'bg-[var(--color-green)]/5 border-[var(--color-green)]/20 text-[var(--color-green)]' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse shadow-[0_0_8px_var(--color-green)]' : ''} bg-current`} />
            <span className="text-[12px] font-black uppercase tracking-[0.25em]">{isLive ? "LIVE" : "OFFLINE"}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}