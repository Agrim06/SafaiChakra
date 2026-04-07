import { Leaf, Activity } from "lucide-react";

export default function Navbar({ lastUpdated, isLive }) {
  return (
    <>
      <nav className="navbar">
        <div className="navbar__inner">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="navbar__logo-icon">
              <Leaf size={17} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="navbar__brand-safai">Safai</span>
                <span className="navbar__brand-chakra">Chakra</span>
              </div>
              <p className="navbar__tagline">
                AI Waste Management Agent
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Pipeline tags */}
          <div className="navbar__pipeline">
            {[
              { label: "Monitor", dot: "bg-green-400", delay: 0 },
              { label: "Decide", dot: "bg-yellow-400", delay: 300 },
              { label: "Optimize", dot: "bg-blue-400", delay: 600 },
              { label: "Act", dot: "bg-purple-400", delay: 900 },
            ].map(({ label, dot, delay }, i) => (
              <div key={label} className="flex items-center gap-1">
                <span className="pipeline-tag">
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
          <div className={`navbar__live-badge ${isLive ? 'navbar__live-badge--online' : 'navbar__live-badge--offline'} ml-4`}>
            <span
              className={`w-2 h-2 rounded-full pulse-dot ${isLive ? "bg-green-400" : "bg-red-500"}`}
            />
            <span className={isLive ? 'navbar__live-text--online' : 'navbar__live-text--offline'}>
              {isLive ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          {/* Last updated */}
          <div className="navbar__updated">
            <Activity size={11} />
            <span>{lastUpdated ? lastUpdated : "—"}</span>
          </div>
        </div>

        {/* Thin gradient line */}
        <div className="navbar__gradient-line" />
      </nav>
    </>
  );
}
