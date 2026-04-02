# SafaiChakra — Single Bin Prototype: Complete Build Guide

---

## Overview

You will build a working IoT waste monitoring system with:
- **ESP8266** reading an **HC-SR04 ultrasonic sensor**
- **FastAPI backend** storing data in **PostgreSQL**
- **React dashboard** showing live fill level + alerts

Total estimated time: **6–8 hours** for a hackathon-ready prototype.

---

## PHASE 1: Hardware Setup

### Components needed
- ESP8266 NodeMCU board
- HC-SR04 ultrasonic sensor
- Jumper wires (4x)
- USB cable (micro-USB)
- A bin / cardboard box (to simulate the waste bin)

### Wiring

```
HC-SR04 Pin → ESP8266 Pin
VCC         → 3.3V (or Vin for 5V)
GND         → GND
TRIG        → D1 (GPIO5)
ECHO        → D2 (GPIO4)
```

> ⚠️ The HC-SR04 ECHO pin outputs 5V. Use a voltage divider (1kΩ + 2kΩ resistors) or a logic level converter before connecting to ESP8266 to avoid damaging the board.

**Voltage divider for ECHO pin:**
```
ECHO ──── 1kΩ ──── D2 (GPIO4)
                |
               2kΩ
                |
               GND
```

### Measuring bin fill level

Place the sensor at the **top of the bin** facing downward.

```
fill_percentage = (1 - measured_distance / bin_height) × 100
```

Example: bin is 40cm tall, sensor reads 15cm → fill = (1 - 15/40) × 100 = **62.5%**

---

## PHASE 2: ESP8266 Firmware

### 2.1 Setup Arduino IDE

1. Download [Arduino IDE](https://www.arduino.cc/en/software)
2. Go to **File → Preferences → Additional Board Manager URLs**, add:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Go to **Tools → Board Manager**, search "esp8266", install **ESP8266 by ESP8266 Community**
4. Select board: **Tools → Board → NodeMCU 1.0 (ESP-12E Module)**
5. Install libraries via **Tools → Manage Libraries**:
   - `ArduinoJson` by Benoit Blanchon
   - `ESP8266HTTPClient` (comes built-in with ESP8266 board package)

### 2.2 Firmware Code

Create a new sketch and paste this code:

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// ── Config ──────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_SERVER_IP:8000/bin/update";

const char* BIN_ID        = "BIN_01";
const float BIN_HEIGHT_CM = 40.0;   // measure your actual bin height
const int   SEND_INTERVAL = 30000;  // send every 30 seconds

// ── Pin definitions ──────────────────────────────────────
const int TRIG_PIN = D1;  // GPIO5
const int ECHO_PIN = D2;  // GPIO4

// ── Globals ──────────────────────────────────────────────
WiFiClient wifiClient;
unsigned long lastSendTime = 0;

// ── Setup ────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());
}

// ── Read HC-SR04 distance ────────────────────────────────
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1; // sensor error / out of range

  return (duration * 0.0343) / 2.0;
}

// ── Calculate fill percentage ────────────────────────────
float calcFillPercent(float distanceCm) {
  if (distanceCm < 0 || distanceCm > BIN_HEIGHT_CM) return 0.0;
  float fill = (1.0 - distanceCm / BIN_HEIGHT_CM) * 100.0;
  return constrain(fill, 0.0, 100.0);
}

// ── Send data to server ──────────────────────────────────
void sendData(float fillPct, float distCm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping send.");
    return;
  }

  HTTPClient http;
  http.begin(wifiClient, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["bin_id"]       = BIN_ID;
  doc["fill_pct"]     = round(fillPct * 10) / 10.0;
  doc["distance_cm"]  = round(distCm * 10) / 10.0;
  doc["timestamp"]    = millis();

  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending: " + payload);
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.println("Response: " + String(httpCode));
  } else {
    Serial.println("POST failed: " + http.errorToString(httpCode));
  }
  http.end();
}

// ── Main loop ────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL) {
    float dist = readDistanceCm();
    float fill = calcFillPercent(dist);

    Serial.printf("Distance: %.1f cm | Fill: %.1f%%\n", dist, fill);
    sendData(fill, dist);

    lastSendTime = now;
  }
}
```

### 2.3 Upload to ESP8266

1. Plug ESP8266 into USB
2. Select correct **Port** under `Tools → Port`
3. Click **Upload** (→ arrow button)
4. Open **Serial Monitor** (`Tools → Serial Monitor`, baud 115200) to see live output

---

## PHASE 3: Backend (FastAPI + PostgreSQL)

### 3.1 Project structure

```
safaichakra-backend/
├── main.py
├── models.py
├── database.py
├── requirements.txt
└── .env
```

### 3.2 Install dependencies

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic
```

`requirements.txt`:
```
fastapi
uvicorn
sqlalchemy
psycopg2-binary
python-dotenv
pydantic
```

### 3.3 Database setup (PostgreSQL)

Install PostgreSQL locally or use a free cloud instance (Railway, Neon, Supabase).

```sql
CREATE DATABASE safaichakra;
CREATE TABLE bin_readings (
    id          SERIAL PRIMARY KEY,
    bin_id      VARCHAR(50) NOT NULL,
    fill_pct    FLOAT NOT NULL,
    distance_cm FLOAT,
    is_alert    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### 3.4 `.env` file

```
DATABASE_URL=postgresql://username:password@localhost:5432/safaichakra
ALERT_THRESHOLD=70.0
```

### 3.5 `database.py`

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 3.6 `models.py`

```python
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class BinReading(Base):
    __tablename__ = "bin_readings"

    id          = Column(Integer, primary_key=True, index=True)
    bin_id      = Column(String, nullable=False)
    fill_pct    = Column(Float, nullable=False)
    distance_cm = Column(Float)
    is_alert    = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.7 `main.py`

```python
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from database import get_db, engine
import models

load_dotenv()
models.Base.metadata.create_all(bind=engine)

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))

app = FastAPI(title="SafaiChakra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ──────────────────────────────────────
class BinUpdateRequest(BaseModel):
    bin_id:      str
    fill_pct:    float
    distance_cm: float = None

class BinStatusResponse(BaseModel):
    bin_id:     str
    fill_pct:   float
    is_alert:   bool
    message:    str
    created_at: str

# ── POST /bin/update ──────────────────────────────────────
@app.post("/bin/update")
def update_bin(payload: BinUpdateRequest, db: Session = Depends(get_db)):
    is_alert = payload.fill_pct >= ALERT_THRESHOLD

    reading = models.BinReading(
        bin_id      = payload.bin_id,
        fill_pct    = payload.fill_pct,
        distance_cm = payload.distance_cm,
        is_alert    = is_alert,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    return {
        "status":   "ok",
        "bin_id":   reading.bin_id,
        "fill_pct": reading.fill_pct,
        "is_alert": reading.is_alert,
        "id":       reading.id,
    }

# ── GET /bin/status ───────────────────────────────────────
@app.get("/bin/status/{bin_id}")
def get_bin_status(bin_id: str, db: Session = Depends(get_db)):
    reading = (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .first()
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Bin not found")

    return {
        "bin_id":     reading.bin_id,
        "fill_pct":   reading.fill_pct,
        "is_alert":   reading.is_alert,
        "message":    "Collection needed!" if reading.is_alert else "All good.",
        "created_at": str(reading.created_at),
    }

# ── GET /bin/history ──────────────────────────────────────
@app.get("/bin/history/{bin_id}")
def get_bin_history(bin_id: str, limit: int = 20, db: Session = Depends(get_db)):
    readings = (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "fill_pct":   r.fill_pct,
            "is_alert":   r.is_alert,
            "created_at": str(r.created_at),
        }
        for r in readings
    ]

# ── Health check ──────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "running"}
```

### 3.8 Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Visit `http://localhost:8000/docs` to see the auto-generated Swagger UI and test all endpoints.

---

## PHASE 4: Frontend (React Dashboard)

### 4.1 Create React app

```bash
npx create-react-app safaichakra-dashboard
cd safaichakra-dashboard
npm install axios recharts lucide-react
```

### 4.2 Replace `src/App.js`

```jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Trash2, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

const API_BASE = "http://localhost:8000";
const BIN_ID   = "BIN_01";
const POLL_MS  = 15000; // refresh every 15 seconds

function FillGauge({ pct }) {
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ position: "relative", width: 160, height: 200, margin: "0 auto" }}>
      {/* Bin outline */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 100, height: 160, border: "3px solid #374151", borderRadius: "4px 4px 8px 8px",
        overflow: "hidden", background: "#1f2937",
      }}>
        {/* Fill level */}
        <div style={{
          position: "absolute", bottom: 0, width: "100%",
          height: `${pct}%`,
          background: color,
          transition: "height 0.8s ease, background 0.4s ease",
          opacity: 0.85,
        }}/>
      </div>
      {/* Lid */}
      <div style={{
        position: "absolute", bottom: 158, left: "50%", transform: "translateX(-50%)",
        width: 110, height: 12, background: "#374151", borderRadius: 4,
      }}/>
      {/* Percentage label */}
      <div style={{
        position: "absolute", top: 8, width: "100%",
        textAlign: "center", fontSize: 28, fontWeight: 700, color,
      }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function fetchData() {
    try {
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/bin/status/${BIN_ID}`),
        axios.get(`${API_BASE}/bin/history/${BIN_ID}?limit=20`),
      ]);
      setStatus(statusRes.data);
      // reverse so oldest is left on chart
      setHistory([...historyRes.data].reverse().map((r, i) => ({
        name: `T-${historyRes.data.length - 1 - i}`,
        fill: r.fill_pct,
      })));
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const fill  = status?.fill_pct ?? 0;
  const alert = status?.is_alert ?? false;

  return (
    <div style={{
      minHeight: "100vh", background: "#111827", color: "#f9fafb",
      fontFamily: "'Segoe UI', sans-serif", padding: "32px 24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <Trash2 size={28} color="#22c55e"/>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>SafaiChakra</h1>
        <span style={{
          marginLeft: "auto", fontSize: 12, color: "#6b7280",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <RefreshCw size={12}/> Updated {lastUpdate ?? "—"}
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>

          {/* Fill gauge card */}
          <div style={{
            background: "#1f2937", borderRadius: 16, padding: 28,
            border: alert ? "1px solid #ef4444" : "1px solid #374151",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Bin ID</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{BIN_ID}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {alert
                  ? <><AlertTriangle size={18} color="#ef4444"/><span style={{ color: "#ef4444", fontWeight: 600 }}>Collection needed</span></>
                  : <><CheckCircle size={18} color="#22c55e"/><span style={{ color: "#22c55e", fontWeight: 600 }}>All good</span></>
                }
              </div>
            </div>
            <FillGauge pct={fill}/>
            <p style={{ textAlign: "center", marginTop: 16, color: "#9ca3af", fontSize: 14 }}>
              {status?.message}
            </p>
          </div>

          {/* History chart card */}
          <div style={{ background: "#1f2937", borderRadius: 16, padding: 28, border: "1px solid #374151" }}>
            <p style={{ margin: "0 0 16px", fontWeight: 600, color: "#d1d5db" }}>Fill level history</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }}/>
                <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} unit="%"/>
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v) => [`${v.toFixed(1)}%`, "Fill"]}
                />
                <Area type="monotone" dataKey="fill" stroke="#22c55e" fill="url(#fillGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          {[
            { label: "Current fill",    value: `${fill.toFixed(1)}%` },
            { label: "Alert threshold", value: "70%" },
            { label: "Status",          value: alert ? "⚠ Alert" : "✓ Normal" },
            { label: "Readings stored", value: history.length },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#1f2937", borderRadius: 12, padding: "16px 20px",
              border: "1px solid #374151",
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>{value}</p>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
```

### 4.3 Run the dashboard

```bash
npm start
```

Open `http://localhost:3000` to see the live dashboard.

---

## PHASE 5: Deployment (Hackathon-ready)

### Backend → Render (free)

1. Push backend to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `DATABASE_URL`, `ALERT_THRESHOLD`
6. Use a free PostgreSQL instance from [Neon.tech](https://neon.tech) or [Railway](https://railway.app)

### Frontend → Vercel (free)

1. Push frontend to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import repo
3. Update `API_BASE` in `App.js` to your Render backend URL
4. Deploy — done

### ESP8266 → point to Render URL

Update `SERVER_URL` in your Arduino sketch to your Render backend URL:
```cpp
const char* SERVER_URL = "https://your-app.onrender.com/bin/update";
```

---

## PHASE 6: Testing Checklist

- [ ] HC-SR04 reads distance correctly in Serial Monitor
- [ ] ESP8266 connects to WiFi (check Serial Monitor)
- [ ] `POST /bin/update` returns `{"status": "ok"}` (test via Postman or Swagger UI at `/docs`)
- [ ] Data appears in PostgreSQL (`SELECT * FROM bin_readings;`)
- [ ] `GET /bin/status/BIN_01` returns latest reading
- [ ] React dashboard shows correct fill percentage
- [ ] Chart updates every 15 seconds
- [ ] Alert state triggers when fill > 70%

---

## Quick Test Without Hardware

Use curl or Postman to simulate the ESP8266 while hardware isn't ready:

```bash
curl -X POST http://localhost:8000/bin/update \
  -H "Content-Type: application/json" \
  -d '{"bin_id": "BIN_01", "fill_pct": 75.5, "distance_cm": 9.8}'
```

---

## Common Issues & Fixes

| Problem | Fix |
|---|---|
| HC-SR04 always reads 0 | Check TRIG/ECHO wiring, add voltage divider on ECHO |
| ESP won't connect to WiFi | Double-check SSID/password, use 2.4GHz network (not 5GHz) |
| CORS error in React | Confirm CORSMiddleware is added in `main.py` |
| DB connection refused | Verify DATABASE_URL in `.env`, PostgreSQL is running |
| Render server sleeps | Free tier sleeps after 15 min idle — ping endpoint to wake it |

---

## Future Enhancements (post-hackathon)

- Add **MQTT** instead of HTTP for lower-latency sensor updates
- Add **scikit-learn** model to predict overflow time from fill rate trend
- Add **OR-Tools** route optimizer when you scale to multiple bins
- Add **Telegram bot alert** using `requests.post` to Telegram API on is_alert=True
- Add **gas sensor** (MQ-2) readings to detect decomposition / fire risk
- Add **map view** using React Leaflet with bin location pin

---

*Built for Infothon 6.0 | Team Ctrl Alt Delete | VVCE Mysuru*
