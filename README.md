# ⚡ Bitaxe Mining Dashboard

Real-time monitoring dashboard for a Bitaxe Bitcoin mining cluster.
Built for a 3-person crew — clean UI, live stats, lottery probability tracker, Discord/Telegram alerts.

---

## Stack

- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Vite + Recharts
- **Alerts:** Discord webhook + Telegram bot

---

## Prerequisites

- Node.js v18+ installed
- Your Bitaxe miners on the same local network
- Their local IP addresses (find in your router admin panel)

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env .env.local   # edit with your miner IPs
```

Edit `.env`:
```
MINER_IPS=192.168.1.100,192.168.1.101,192.168.1.102
BTC_PRICE_USD=96000
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...   # optional
TELEGRAM_BOT_TOKEN=...                                      # optional
TELEGRAM_CHAT_ID=...                                        # optional
```

Start backend:
```bash
npm run dev     # development (auto-restart)
npm start       # production
```

Backend runs on `http://localhost:3001`

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs on `http://localhost:5173`
Open this in any browser — share the URL with your crew on the same network.

---

### 3. Find Your Miner IPs

Each Bitaxe shows its IP on the OLED screen after connecting to WiFi.
Or check your router's connected devices list.
You can also scan: `nmap -sn 192.168.1.0/24`

---

## Dashboard Features

| Feature | Details |
|---|---|
| Live hashrate | Updates every 30 seconds per miner |
| Temperature | Alerts if any miner exceeds 70°C |
| Block hit probability | 30-day and 365-day calculated live |
| Earnings tracker | Cumulative pool earnings since launch |
| 6-hour hashrate chart | Visual trend line |
| Per-miner status | Online/offline, temp, watts, uptime |
| Offline alerts | Notifies Discord/Telegram if miner goes down |
| Weekly summary | Auto-sent every Sunday 9am |

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Full cluster status + latest snapshots |
| `GET /api/history/all?hours=6` | Combined hashrate over time |
| `GET /api/history/:ip?hours=24` | Single miner history |
| `GET /api/earnings?days=30` | Daily earnings breakdown |

---

## Upgrade Path

When you add more miners (NerdQaxe++, etc):
1. Connect them to same WiFi
2. Add their IPs to `MINER_IPS` in `.env`
3. Restart backend — they appear automatically

---

## Repo

`github.com/[your-handle]/bitaxe-dashboard`
