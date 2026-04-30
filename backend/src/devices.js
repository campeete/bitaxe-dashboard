const { getDb } = require('./db');

const SUPPORTED_TYPES = ['bitaxe', 'nerdqaxe', 'generic_asic'];

function initDevicesTable() {
  const db = getDb();
  db.prepare(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT UNIQUE NOT NULL,
    name TEXT,
    type TEXT DEFAULT 'bitaxe',
    owner TEXT,
    location TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    added_at INTEGER
  )`).run();
}

function getAllDevices() {
  return getDb().prepare('SELECT * FROM devices ORDER BY added_at DESC').all();
}

function addDevice({ ip, name, type, owner, location, notes }) {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO devices
    (ip, name, type, owner, location, notes, active, added_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(ip, name || ip, type || 'bitaxe', owner || '', location || '', notes || '', Date.now());
  return db.prepare('SELECT * FROM devices WHERE ip = ?').get(ip);
}

function updateDevice(ip, fields) {
  const db = getDb();
  const allowed = ['name', 'type', 'owner', 'location', 'notes', 'active'];
  const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ');
  const vals = Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]);
  if (!sets) return null;
  db.prepare(`UPDATE devices SET ${sets} WHERE ip = ?`).run(...vals, ip);
  return db.prepare('SELECT * FROM devices WHERE ip = ?').get(ip);
}

function removeDevice(ip) {
  getDb().prepare('DELETE FROM devices WHERE ip = ?').run(ip);
}

module.exports = { initDevicesTable, getAllDevices, addDevice, updateDevice, removeDevice, SUPPORTED_TYPES };
