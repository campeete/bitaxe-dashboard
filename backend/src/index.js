require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { getDb } = require('./db');
const { pollAllMiners, getLatestSnapshots, getHashrateHistory } = require('./poller');
const { updateTotals, getCumulativeEarnings } = require('./stats');
const { checkAlerts, sendWeeklySummary } = require('./notifications');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let DEMO_MODE = process.env.DEMO_MODE === 'true';

function getDemoStatus() {
  const miners = [
    {
      miner_ip: "192.168.1.100",
      miner_name: "Carbon-01",
      is_online: true,
      hashrate_ghs: 1.28,
      temp_c: 58,
      power_watts: 14.2
    },
    {
      miner_ip: "192.168.1.101",
      miner_name: "Neon-01",
      is_online: true,
      hashrate_ghs: 1.31,
      temp_c: 61,
      power_watts: 14.8
    },
    {
      miner_ip: "192.168.1.102",
      miner_name: "Argon-01",
      is_online: true,
      hashrate_ghs: 1.22,
      temp_c: 57,
      power_watts: 13.9
    }
  ];

  const totalHashrate = miners.reduce((sum, m) => sum + m.hashrate_ghs, 0);

  return {
    miners,
    cluster: {
      totalHashrateGhs: totalHashrate,
      onlineCount: miners.filter(m => m.is_online).length,
      totalMiners: miners.length,
    },
    stats: {
      btc_price_usd: 96000,
      block_hit_prob_30d: 0.02,
      block_hit_prob_1yr: 0.21,
      network_hashrate_eh: 700,
      updated_at: Date.now()
    },
    cumulative: {
      total_btc: 0.00018421,
      total_usd: 17.68
    },
    lastUpdated: Date.now()
  };
}

function getDemoHistory(hours = 6) {
  const now = Date.now();
  const points = [];
  const totalPoints = Math.max(12, hours * 6);

  for (let i = totalPoints - 1; i >= 0; i--) {
    const bucket = now - i * 10 * 60 * 1000;
    const wave = Math.sin(i / 2.7) * 0.18;
    const drift = Math.cos(i / 4.1) * 0.09;
    const total_hashrate = 3.75 + wave + drift;

    points.push({
      bucket,
      total_hashrate: Number(total_hashrate.toFixed(3)),
      avg_temp: Number((58 + Math.sin(i / 3.4) * 2.5).toFixed(1)),
      active_miners: 3
    });
  }

  return points;
}

function getDemoEarnings(days = 30) {
  const rows = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const date_str = d.toISOString().slice(0, 10);
    const btc = 0.000005 + (Math.sin(i / 3) + 1) * 0.0000012;
    const usd = btc * 96000;

    rows.push({
      date_str,
      btc: Number(btc.toFixed(8)),
      usd: Number(usd.toFixed(2))
    });
  }

  return rows;
}

// ── GET / ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Bitaxe Dashboard Backend is running',
    demoMode: DEMO_MODE,
    endpoints: ['/api/status', '/api/history/all?hours=6', '/api/earnings']
  });
});

app.post('/api/demo-mode', (req, res) => {
  try {
    if (typeof req.body.enabled === 'boolean') {
      DEMO_MODE = req.body.enabled;
    } else {
      DEMO_MODE = !DEMO_MODE;
    }

    res.json({
      ok: true,
      demoMode: DEMO_MODE
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ── GET /api/status ──────────────────────────────────────────────────────────
// Latest snapshot for every miner + cluster totals
app.get('/api/status', async (req, res) => {
  try {
    if (DEMO_MODE) {
      return res.json(getDemoStatus());
    }

    const snapshots = getLatestSnapshots();
    const totalHashrate = snapshots
      .filter(s => s.is_online)
      .reduce((sum, s) => sum + (s.hashrate_ghs || 0), 0);

    const db = getDb();
    const totals = db.prepare(`SELECT * FROM totals ORDER BY updated_at DESC LIMIT 1`).get();
    const cumulative = getCumulativeEarnings();

    res.json({
      miners: snapshots,
      cluster: {
        totalHashrateGhs: totalHashrate,
        onlineCount: snapshots.filter(s => s.is_online).length,
        totalMiners: snapshots.length,
      },
      stats: totals || {},
      cumulative,
      lastUpdated: Date.now()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/history/:ip ─────────────────────────────────────────────────────
// Hashrate + temp history for one miner (last 24h by default)
app.get('/api/history/:ip', (req, res, next) => {
  if (req.params.ip === 'all') return next();

  try {
    const hours = parseInt(req.query.hours) || 24;
    const data = getHashrateHistory(req.params.ip, hours);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/history/all ─────────────────────────────────────────────────────
// Combined cluster hashrate over time
app.get('/api/history/all', (req, res) => {
  try {
    if (DEMO_MODE) {
      const hours = parseInt(req.query.hours) || 24;
      return res.json(getDemoHistory(hours));
    }

    const db = getDb();
    const hours = parseInt(req.query.hours) || 24;
    const since = Date.now() - hours * 60 * 60 * 1000;

    // Group by 5-minute buckets, sum hashrate across all miners
    const rows = db.prepare(`
      SELECT
        (timestamp / 300000) * 300000 AS bucket,
        SUM(hashrate_ghs) AS total_hashrate,
        AVG(temp_c) AS avg_temp,
        COUNT(DISTINCT miner_ip) AS active_miners
      FROM snapshots
      WHERE timestamp > ? AND is_online = 1
      GROUP BY bucket
      ORDER BY bucket ASC
    `).all(since);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/earnings ────────────────────────────────────────────────────────
// Daily earnings breakdown
app.get('/api/earnings', (req, res) => {
  try {
    if (DEMO_MODE) {
      const days = parseInt(req.query.days) || 30;
      return res.json(getDemoEarnings(days));
    }

    const db = getDb();
    const days = parseInt(req.query.days) || 30;
    const rows = db.prepare(`
      SELECT date_str, SUM(estimated_btc) as btc, SUM(estimated_usd) as usd
      FROM daily_stats
      GROUP BY date_str
      ORDER BY date_str DESC
      LIMIT ?
    `).all(days);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Cron: poll miners every 30 seconds ───────────────────────────────────────
let pollInterval = parseInt(process.env.POLL_INTERVAL) || 30;
setInterval(async () => {
  try {
    const results = await pollAllMiners();
    const totalHashrate = results
      .filter(r => r.online)
      .reduce((sum, r) => sum + ((r.data?.hashRate || 0) / 1000), 0);

    // Update stats every 5 minutes (not every poll to avoid API spam)
    const db = getDb();
    const lastTotals = db.prepare(`SELECT updated_at FROM totals ORDER BY updated_at DESC LIMIT 1`).get();
    if (!lastTotals || Date.now() - lastTotals.updated_at > 5 * 60 * 1000) {
      const stats = await updateTotals(totalHashrate);
      const snapshots = getLatestSnapshots();
      await checkAlerts(snapshots, { ...stats, totalHashrate });
    }
  } catch (e) {
    console.error('Poll cycle error:', e.message);
  }
}, pollInterval * 1000);

// Cron: weekly summary every Sunday 9am
cron.schedule('0 9 * * 0', async () => {
  const totals = getDb().prepare(`SELECT * FROM totals ORDER BY updated_at DESC LIMIT 1`).get();
  const cumulative = getCumulativeEarnings();
  if (totals) await sendWeeklySummary(totals, cumulative);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ Bitaxe Dashboard Backend running on http://localhost:${PORT}`);
  console.log(`📡 Polling ${process.env.MINER_IPS} every ${pollInterval}s\n`);
});
