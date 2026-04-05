const axios = require('axios');
const { getDb } = require('./db');

// Bitaxe exposes its stats at http://<IP>/api/system/info
async function pollMiner(ip) {
  const db = getDb();
  const now = Date.now();

  try {
    const res = await axios.get(`http://${ip}/api/system/info`, { timeout: 5000 });
    const d = res.data;

    db.prepare(`
      INSERT INTO snapshots
        (miner_ip, miner_name, timestamp, hashrate_ghs, temp_c, power_watts, uptime_secs, best_diff, pool_url, is_online)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      ip,
      d.hostname || ip,
      now,
      d.hashRate / 1000 || 0,        // Bitaxe returns MH/s, convert to GH/s
      d.temp || 0,
      d.power || 0,
      d.uptimeSeconds || 0,
      d.bestDiff || '0',
      d.stratumURL || ''
    );

    console.log(`[${new Date().toISOString()}] Polled ${ip} — ${(d.hashRate/1000).toFixed(2)} GH/s @ ${d.temp}°C`);
    return { ip, online: true, data: d };

  } catch (err) {
    // Miner offline or unreachable — log it anyway
    db.prepare(`
      INSERT INTO snapshots (miner_ip, timestamp, is_online)
      VALUES (?, ?, 0)
    `).run(ip, now);

    console.warn(`[${new Date().toISOString()}] ${ip} unreachable: ${err.message}`);
    return { ip, online: false };
  }
}

async function pollAllMiners() {
  const ips = process.env.MINER_IPS.split(',').map(ip => ip.trim()).filter(Boolean);
  const results = await Promise.allSettled(ips.map(ip => pollMiner(ip)));
  return results.map(r => r.value || r.reason);
}

// Pull latest snapshot per miner
function getLatestSnapshots() {
  const db = getDb();
  const ips = process.env.MINER_IPS.split(',').map(ip => ip.trim()).filter(Boolean);

  return ips.map(ip => {
    const row = db.prepare(`
      SELECT * FROM snapshots WHERE miner_ip = ? ORDER BY timestamp DESC LIMIT 1
    `).get(ip);
    return row || { miner_ip: ip, is_online: 0 };
  });
}

// Get hashrate history for a miner over last N hours
function getHashrateHistory(ip, hours = 24) {
  const db = getDb();
  const since = Date.now() - hours * 60 * 60 * 1000;
  return db.prepare(`
    SELECT timestamp, hashrate_ghs, temp_c
    FROM snapshots
    WHERE miner_ip = ? AND timestamp > ? AND is_online = 1
    ORDER BY timestamp ASC
  `).all(ip, since);
}

module.exports = { pollAllMiners, getLatestSnapshots, getHashrateHistory };
