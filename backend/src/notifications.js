const axios = require('axios');
const { getDb } = require('./db');

const COOLDOWNS = {
  hashrate_drop:   60 * 60 * 1000,   // 1 hour between same alert
  block_found:     0,                  // always send
  weekly_summary:  7 * 24 * 60 * 60 * 1000,
  miner_offline:   30 * 60 * 1000,    // 30 mins
};

function wasRecentlySent(type) {
  const db = getDb();
  const cooldown = COOLDOWNS[type] || 3600000;
  const since = Date.now() - cooldown;
  const row = db.prepare(`
    SELECT id FROM notifications WHERE type = ? AND sent_at > ? LIMIT 1
  `).get(type, since);
  return !!row;
}

function logNotification(type, message) {
  const db = getDb();
  db.prepare(`INSERT INTO notifications (sent_at, type, message) VALUES (?, ?, ?)`).run(Date.now(), type, message);
}

async function sendDiscord(message) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await axios.post(url, { content: message });
  } catch (e) {
    console.warn('Discord notification failed:', e.message);
  }
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.warn('Telegram notification failed:', e.message);
  }
}

async function notify(type, message) {
  if (wasRecentlySent(type)) return;
  console.log(`[NOTIFY] ${type}: ${message}`);
  await Promise.all([sendDiscord(message), sendTelegram(message)]);
  logNotification(type, message);
}

// Check conditions and fire alerts
async function checkAlerts(snapshots, stats) {
  for (const s of snapshots) {
    if (!s.is_online) {
      await notify('miner_offline', `⚠️ Miner ${s.miner_ip} is OFFLINE. Check the device!`);
    } else if (s.hashrate_ghs < 0.8) {
      // Below 80% of expected 1.2 GH/s
      await notify('hashrate_drop',
        `📉 Miner ${s.miner_ip} hashrate low: ${s.hashrate_ghs?.toFixed(2)} GH/s. Expected ~1.2 GH/s.`);
    }
  }
}

async function sendWeeklySummary(stats, cumulative) {
  const msg =
    `📊 *Weekly Mining Summary*\n` +
    `💰 Total earned (pool): $${cumulative.total_usd?.toFixed(2) || '0.00'}\n` +
    `⚡ Cluster hashrate: ${stats.totalHashrate?.toFixed(2)} GH/s\n` +
    `🎲 Block hit chance (30d): ${stats.prob30}%\n` +
    `🎲 Block hit chance (1yr): ${stats.prob365}%\n` +
    `₿ BTC price: $${stats.btcPrice?.toLocaleString()}`;
  await notify('weekly_summary', msg);
}

module.exports = { notify, checkAlerts, sendWeeklySummary };
