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
- **Core**: React.js, Vite
- **Mapping**: Leaflet / React-Leaflet
- **Styling**: Vanilla CSS (Premium Aesthetics), TailwindCSS
- **State Management**: React Hooks & Context API

### **Backend**
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Optimization Engine**: Google OR-Tools
- **Routing API**: OSRM (Open Source Routing Machine)
- **Environment**: Docker & Docker Compose

### **Hardware / IoT**
- **Controller**: ESP-series (ESP8266/ESP32)
- **Sensors**: Ultrasonic (HC-SR04) for depth measurement
- **Communication**: MQTT/HTTP (JSON payloads)

---

## 📂 Project Structure

```bash
SafaiChakra/
├── backend/          # FastAPI server, OR-Tools optimization, DB models
├── frontend/         # React application (Vite-powered)
├── esp_code/         # MicroPython/Arduino code for IoT sensors
├── docker-compose.yml # Orchestration for local development
└── .env.example      # Environment variable templates
```

---

## ⚙️ Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for manual frontend dev)
- Python 3.9+ (for manual backend dev)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Agrim06/SafaiChakra.git
   cd SafaiChakra
   ```

2. **Setup Environment**
   Create `.env` files in both `frontend` and `backend` directories based on the provided examples.

3. **Run with Docker**
   ```bash
   docker-compose up --build
   ```

4. **Access the App**
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛡️ Mission Control Preview

SafaiChakra's dashboard provides a "War Room" experience for city administrators:
- **Map View**: Live markers showing bin capacity (Green -> Red).
- **Optimization Toggle**: Run the OR-Tools solver to reroute trucks based on demand.
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

Developed with ❤️ for a cleaner future.
