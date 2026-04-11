import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  MapPin, 
  Calendar, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  ExternalLink,
  Navigation,
  RefreshCcw,
  Maximize2
} from "lucide-react";

import dp1 from "../images/dp1.jpeg";
import dp2 from "../images/dp2.jpeg";
import dp3 from "../images/dp3.jpeg";

const API_BASE = "http://localhost:8000";

export default function ReportPage() {
  const [reports, setReports] = useState([]);
  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(() => {
    const loadStaticReports = async () => {
      try {
        // Fetch real bin IDs just to assign authentic IDs/Locations to your images
        const { data } = await axios.get(`${API_BASE}/sensor/health`);
        const bins = data.sensors || [];
        const shuffled = bins.length > 0 ? [...bins].sort(() => 0.5 - Math.random()) : [];

        setReports([
          { 
            id: "s1", 
            location_name: shuffled[0]?.bin_id || "BIN_04", 
            latitude: shuffled[0]?.latitude || 12.3023, 
            longitude: shuffled[0]?.longitude || 76.6212, 
            image_data: dp1, 
            created_at: new Date().toISOString() 
          },
          { 
            id: "s2", 
            location_name: shuffled[1]?.bin_id || "BIN_07", 
            latitude: shuffled[1]?.latitude || 12.3080, 
            longitude: shuffled[1]?.longitude || 76.6250, 
            image_data: dp2, 
          { id: "s3", location_name: "BIN_01", latitude: 12.3150, longitude: 76.6180, image_data: dp3, created_at: new Date().toISOString() }
        ]);
      }
    };
    loadStaticReports();
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto px-8 py-8 custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[var(--color-text)] uppercase tracking-tighter mb-2">Citizen Feed</h1>
          <p className="text-[var(--color-text-dim)] text-sm font-medium">Monitoring citizen-reported overflows & manual alerts.</p>
        </div>
        <button 
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-card-border)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-bg)] transition-all"
        >
          <RefreshCcw size={14} /> Refresh Feed
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center">
          <AlertTriangle size={60} strokeWidth={1} className="mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest">No Active Reports</h2>
          <p className="text-sm font-medium">The city seems to be clean under current mission control.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className="group glass-panel bg-[var(--color-surface)] border-[var(--color-card-border)] hover:border-[var(--color-cyan)]/20 transition-all rounded-2xl overflow-hidden flex flex-col shadow-xl"
            >
              {/* Image Preview */}
              <div className="relative aspect-video bg-black overflow-hidden group-hover:shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all">
                {report.image_data ? (
                  <img 
                    src={report.image_data} 
                    alt={report.location_name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <Navigation size={40} />
                    <span className="text-[10px] font-black uppercase mt-2">No Image Provided</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                   <button 
                     onClick={() => setSelectedImg(report.image_data)}
                     className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-[var(--color-cyan)]"
                   >
                     <Maximize2 size={14} />
                   </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin size={14} className="text-[var(--color-cyan)]" />
                    <span className="text-[11px] font-bold truncate uppercase tracking-wider">{report.location_name}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-[var(--color-card-border)]">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">Latitude</p>
                      <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">{report.latitude.toFixed(6)}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">Longitude</p>
                      <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">{report.longitude.toFixed(6)}</p>
                   </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-2 text-[var(--color-text-dim)]">
                    <Calendar size={12} />
                    <span className="text-[9px] font-bold uppercase">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Dismiss Report"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal Preview */}
      {selectedImg && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300"
          onClick={() => setSelectedImg(null)}
        >
          <img 
            src={selectedImg} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
            alt="Enlarged view"
          />
          <button className="absolute top-8 right-8 text-white bg-white/10 p-4 rounded-full hover:bg-white/20">
            <Trash2 size={24} onClick={() => setSelectedImg(null)} />
          </button>
        </div>
      )}
    </div>
  );
}

