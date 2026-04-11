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

app.get('/', (req, res) => res.json({ status: 'ok', service: 'bitaxe-dashboard-backend' }));

// ── GET /api/status ──────────────────────────────────────────────────────────
// Latest snapshot for every miner + cluster totals
app.get('/api/status', async (req, res) => {
  try {
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
app.get('/api/history/:ip', (req, res) => {
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
