# SafaiChakra ♻️

**SafaiChakra** is an end-to-end Smart Waste Management System designed to optimize urban waste collection using IoT sensors, real-time analytics, and AI-driven route optimization.

The name "SafaiChakra" reflects our mission to create a sustainable, efficient, and technology-driven waste management ecosystem.

---

## 🚀 Features

- **Real-time Bin Monitoring**: IoT integration using ESP sensors tracks bin fill levels and health status in real-time.
- **Mission Control Dashboard**: A high-fidelity frontend built with React for visualizing bins, trucks, and city-wide waste statistics.
- **AI-Driven Route Optimization**: Utilizes **Google OR-Tools** and **OSRM** (Open Source Routing Machine) to calculate the most fuel-efficient paths for collection trucks based on fill levels.
- **Dynamic Thresholding**: Customizable overflow thresholds that trigger visual alerts and collection priority.
- **Citizen Feedback System**: QR-based reporting allowing citizens to report overflowing bins or sensor failures directly to the command center.
- **Predictive Analytics**: Visual overlays on the map showing projected overflow areas and historical hotspots.

---

## 🛠️ Tech Stack

### **Frontend**
- **Core**: React.js (Create React App)
- **Mapping**: Leaflet / React-Leaflet
- **Styling**: Vanilla CSS (Premium Aesthetics), TailwindCSS
- **State Management**: React Hooks

### **Backend**
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Optimization Engine**: Google OR-Tools
- **Routing API**: OSRM (Open Source Routing Machine)

### **Hardware / IoT**
- **Controller**: ESP8266 (NodeMCU)
- **Sensors**: Ultrasonic (HC-SR04) for depth measurement
- **Display**: SSD1306 OLED via I2C
- **Communication**: HTTP POST (JSON payloads)

---

## 📂 Project Structure

```bash
SafaiChakra/
├── backend/          # FastAPI server, OR-Tools optimization, DB models
├── frontend/         # React application
├── esp_code/         # Arduino code for ESP8266 IoT sensors
└── README.md         # Project documentation
```

---

## ⚙️ Getting Started (Software)

### Prerequisites
- Node.js (v16+)
- Python (3.9+)
- PostgreSQL Server

### 1. Backend Setup

The backend handles the REST API, database connections, and route optimization.

```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
# Activate it:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python run.py
```
*The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.*

### 2. Frontend Setup

The frontend provides the Mission Control dashboard.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```
*The dashboard will automatically open at `http://localhost:3000`.*

---

## 🔌 Hardware Setup (Smart Bin Node)

The IoT node uses an ESP8266 to measure the bin's fill level using an Ultrasonic sensor and displays the status on a local OLED screen.

### Components Needed
- ESP8266 / NodeMCU Board
- HC-SR04 Ultrasonic Sensor
- SSD1306 128x64 I2C OLED Display
- Push Button (for calibration)
- Jumper wires & breadboard

### Wiring Guide

| Component | Pin | ESP8266 Pin | Notes |
| :--- | :--- | :--- | :--- |
| **Ultrasonic (HC-SR04)** | VCC | `Vin` / `3.3V` | Use 5V if 3.3V isn't sufficient |
| | GND | `GND` | |
| | TRIG | **`D5`** | Changed from D1 to avoid I2C conflict |
| | ECHO | **`D6`** | Changed from D2 to avoid I2C conflict |
| **OLED Display (I2C)** | VCC | `3.3V` | |
| | GND | `GND` | |
| | SCL | **`D1`** | Standard hardware I2C |
| | SDA | **`D2`** | Standard hardware I2C |
| **Calibration Button** | Pin 1 | **`D3`** | Uses internal pull-up |
| | Pin 2 | `GND` | |

### Firmware Flashing

1. Install the [Arduino IDE](https://www.arduino.cc/en/software).
2. Add ESP8266 support to the Board Manager (Add `http://arduino.esp8266.com/stable/package_esp8266com_index.json` to preferences).
3. Install required libraries via the Library Manager (`Sketch` -> `Include Library` -> `Manage Libraries`):
   - **`ArduinoJson`** by Benoit Blanchon
   - **`U8g2`** by oliver
4. Open the code at `esp_code/smartBin.ino`.
5. Update your WiFi credentials and your backend IP address in the code:
   ```cpp
   const char *WIFI_SSID = "YOUR_WIFI_SSID";
   const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   // Use your computer's local IP address (e.g., 192.168.x.x)
   const char *SERVER_URL = "http://<YOUR_BACKEND_IP>:8000/bin/update"; 
   ```
6. Select your ESP8266 board and Port from the `Tools` menu, and hit **Upload**.

### Hardware Calibration
Once the device powers on and connects to WiFi:
1. Ensure the bin is **completely empty**.
2. Press the physical calibration button connected to **D3** (or type `cal` in the Arduino Serial Monitor).
3. The sensor will take a few readings to determine the total depth of the bin automatically!

---

## 🛡️ Mission Control Preview

SafaiChakra's dashboard provides a "War Room" experience for city administrators:
- **Map View**: Live markers showing bin capacity (Green -> Red).
- **Optimization Toggle**: Run the OR-Tools solver to reroute trucks based on real-time demand.
- **Logistics Metrics**: Track efficiency, fuel savings, and average bin fill time.

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

Developed with ❤️ for a cleaner, greener future.
