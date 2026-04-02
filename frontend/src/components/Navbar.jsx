import { Leaf, Activity } from "lucide-react";

export default function Navbar({ lastUpdated, isLive }) {
  return (
    <>
      <style>{`
        @keyframes navGradient {
          0%   { background-position: 0% 50%;   }
          50%  { background-position: 100% 50%;  }
          100% { background-position: 0% 50%;   }
        }
        .nav-brand-glow {
          box-shadow: 0 0 20px rgba(34,197,94,0.35);
        }
        .pipeline-tag { transition: all 0.2s; }
        .pipeline-tag:hover { border-color: rgba(255,255,255,0.25); color: #f3f4f6; }
      `}</style>

      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: "rgba(8,12,24,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl nav-brand-glow flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #059669 100%)",
              }}
            >
              <Leaf size={17} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-white font-extrabold text-xl tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Safai
                </span>
                <span
                  className="font-extrabold text-xl tracking-tight"
                  style={{
                    letterSpacing: "-0.02em",
                    background: "linear-gradient(90deg,#22c55e,#10b981)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Chakra
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-none mt-0.5">
                AI Waste Management Agent
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Pipeline tags */}
          <div className="hidden lg:flex items-center gap-1.5">
            {[
              { label: "Monitor",  dot: "bg-green-400",  delay: 0   },
              { label: "Decide",   dot: "bg-yellow-400", delay: 300 },
              { label: "Optimize", dot: "bg-blue-400",   delay: 600 },
              { label: "Act",      dot: "bg-purple-400", delay: 900 },
            ].map(({ label, dot, delay }, i) => (
              <div key={label} className="flex items-center gap-1">
                <span
                  className="pipeline-tag flex items-center gap-2 text-xs px-3 py-1.5 rounded-full text-gray-500 cursor-default"
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${dot} ${i === 0 ? "pulse-dot" : ""}`}
                    style={i > 0 ? { animationDelay: `${delay}ms` } : {}}
                  />
                  {label}
                </span>
                {i < 3 && (
                  <span className="text-gray-800 text-xs mx-0.5">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Live badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-4"
            style={{
              background: isLive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: isLive ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <span
              className={`w-2 h-2 rounded-full pulse-dot ${isLive ? "bg-green-400" : "bg-red-500"}`}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: isLive ? "#4ade80" : "#f87171" }}
            >
              {isLive ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* Last updated */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-700">
            <Activity size={11} />
            <span>{lastUpdated ? lastUpdated : "—"}</span>
          </div>
        </div>

        {/* Thin gradient line */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.3) 30%, rgba(168,85,247,0.3) 70%, transparent)",
          }}
        />
      </nav>
    </>
  );
}
