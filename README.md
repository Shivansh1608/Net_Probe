# Smart Network Performance Analyzer + AI Diagnostic Assistant

This project is a high-performance **MERN Stack** (MongoDB, Express.js, React, Node.js) application designed for real-time local network performance auditing, statistical trending, and automatic anomaly diagnosis.

Instead of just showing raw throughput numbers, the application employs a custom **rule-based correlational diagnostic engine** to analyze network bottlenecks, trace connection degradation causes (e.g. DNS congestion, Wi-Fi attenuation, or ISP throttling), and summarize issues in friendly, plain English with actionable troubleshooting steps. It also supports an optional AI Summary layer using the **Anthropic Claude API** and produces printable **PDF Audit Reports** using **Puppeteer**.

---

## Key Features

1. **Continuous Automated Auditing**: Runs network probes (latency, packet loss, DNS lookup speeds, Wi-Fi link parameters, and throughput) on a schedule configured via background `node-cron` workers.
2. **Real-time Live Dashboard**: Subscribes to backend scan results via `Socket.io` WebSockets to update dashboard widgets, radial gauges, and diagnosis logs instantly without manual refreshes.
3. **Smart Heuristic Engine**:
   - Compares current scans against the rolling average of the last 20 queries to identify bandwidth bottlenecks.
   - Evaluates weekly timestamps (+/- 1-hour window) to trace recurring congestion patterns.
   - Computes an overall connection health score (0–100) based on multiple network thresholds.
4. **Historical Visualizer**: Plots lines and area charts using `Recharts` to correlate latency, packet loss, and speeds, with diagnostic event markers.
5. **PDF Report Compiler**: Aggregates metrics to produce audit documents via Puppeteer (with static HTML styling fallbacks).
6. **AI Assistant Integration**: Translates complex technical measurements into a user-friendly paragraph of advice (pluggable Sonnet integration, toggled via env).

---

## Project Structure

```
├── backend/
│   ├── server.js               # Entrypoint, server boot, routing and socket binding
│   ├── routes/                 # Express REST endpoint maps
│   ├── controllers/            # Controller layers for metrics, alerts, reports, and settings
│   ├── models/                 # Mongoose schema definitions (Metric, Diagnosis, Report, Settings)
│   ├── services/
│   │   ├── pingService.js      # Latency and packet loss probes
│   │   ├── dnsService.js       # Native DNS resolve timer
│   │   ├── bandwidthService.js # Throughput tests (CDN-based with local loopback fallbacks)
│   │   ├── wifiService.js      # OS shell parser for Wi-Fi SSID/Signal (netsh/nmcli/airport)
│   │   ├── diagnosticEngine.js # Evaluates the 6 heuristic rules and health scores
│   │   └── aiSummaryService.js # Optional Claude API summarizer client
│   ├── jobs/
│   │   └── scheduler.js        # Dynamic node-cron job controller
│   ├── utils/
│   │   └── pdfGenerator.js     # Puppeteer PDF layout generator
│   └── package.json            # Node.js backend configuration
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # React pages: Dashboard, History, Reports, Settings
│   │   ├── components/         # Shared card and gauge components
│   │   ├── api.js              # Configure Axios and Socket.io clients
│   │   ├── App.jsx             # Shell sidebar layout and router definitions
│   │   ├── main.jsx            # Entry point imports and renderer
│   │   └── index.css           # Custom styles, custom scrollbars, animations, and Tailwind directives
│   ├── tailwind.config.js      # Tailwind theme configuration
│   └── package.json            # Vite React project dependencies
```

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally on `mongodb://127.0.0.1:27017/` (or a remote Atlas URI)

### Setup Configurations
Create a `.env` file in the `/backend` folder (you can duplicate `backend/.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/network-analyzer
SCAN_INTERVAL_MINUTES=5
ENABLE_AI_SUMMARY=false
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## How to Run

### Step 1: Run the Database Seeder (Recommended)
Before starting the servers, run the seeder script to populate your database with 24 hours of historical charts data and test diagnoses:
```bash
# In the root workspace
node backend/utils/seedData.js
```

### Step 2: Start the Express Backend
Navigate to the `backend/` folder and install dependencies, then start the server:
```bash
cd backend
npm install
npm start
```
The backend server will list on `http://localhost:5000`.

### Step 3: Start the Vite React Frontend
In a new terminal window, navigate to the `frontend/` folder, install dependencies, and start the development server:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open `http://localhost:5173` in your web browser.

---

## The Heuristic Diagnostic Rules

The `diagnosticEngine.js` evaluates every scan against these rules:

1. **High Packet Loss**: Checks if packet drops exceed `5%` (Medium warning) or `15%` (Critical severity).
2. **Slow DNS**: Identifies if DNS resolution duration exceeds `100ms`, recommending public DNS overrides (1.1.1.1 or 8.8.8.8).
3. **Weak Wi-Fi**: Warns if Wi-Fi link signal falls below `40%`, suggesting router relocation.
4. **Routing/ISP Issue**: Checks if latency is high (`>150ms`) despite healthy download speed (`>20Mbps`), pinpointing external routing latency rather than local congestion.
5. **Bandwidth Bottleneck**: Checks if download throughput falls by more than `40%` relative to the rolling average of the last 20 queries while latency remains healthy (`<100ms`).
6. **Time-Based Congestion**: Checks if the same issue type recurs `3+ times` in the past `7 days` within a matching daily time window (`+/- 1 hour`).

### Connection Health Formula
$$HealthScore = 100 - (PacketLoss \times 2) - Deductions(Latency > 100) - Deductions(DNS > 50) - Deductions(Signal < 50)$$
Clamped between `0%` and `100%`.
