const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/mining.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // better concurrent read performance
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- Every 30-second poll snapshot per miner
    CREATE TABLE IF NOT EXISTS snapshots (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      miner_ip      TEXT NOT NULL,
      miner_name    TEXT,
      timestamp     INTEGER NOT NULL,          -- unix epoch ms
      hashrate_ghs  REAL,                      -- GH/s
      temp_c        REAL,                      -- chip temp celsius
      power_watts   REAL,
      uptime_secs   INTEGER,
      best_diff     TEXT,                      -- best difficulty found
      pool_url      TEXT,
      is_online     INTEGER DEFAULT 1          -- 0 if poll failed
    );

    -- Daily rollup (computed each midnight)
    CREATE TABLE IF NOT EXISTS daily_stats (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date_str        TEXT NOT NULL,           -- YYYY-MM-DD
      miner_ip        TEXT NOT NULL,
      avg_hashrate    REAL,
      max_hashrate    REAL,
      avg_temp        REAL,
      total_uptime    INTEGER,
      estimated_btc   REAL,
      estimated_usd   REAL,
      UNIQUE(date_str, miner_ip)
    );

    -- Running totals across all miners
    CREATE TABLE IF NOT EXISTS totals (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      updated_at          INTEGER NOT NULL,
      total_btc_earned    REAL DEFAULT 0,
      total_usd_earned    REAL DEFAULT 0,
      block_hit_prob_30d  REAL DEFAULT 0,      -- % probability next 30 days
      block_hit_prob_1yr  REAL DEFAULT 0,      -- % probability next 365 days
      network_hashrate_eh REAL,                -- EH/s from public API
      btc_price_usd       REAL
    );

    -- Notification log so we don't spam
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      sent_at    INTEGER NOT NULL,
      type       TEXT NOT NULL,               -- 'hashrate_drop', 'block_found', 'weekly_summary'
      message    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_ts     ON snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_snapshots_ip     ON snapshots(miner_ip);
    CREATE INDEX IF NOT EXISTS idx_daily_date       ON daily_stats(date_str);
  `);
}

module.exports = { getDb };
