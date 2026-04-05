import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const API = '/api'

// ── colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#0d1117',
  surface: '#161b22',
  border:  '#21262d',
  orange:  '#f7931a',
  blue:    '#58a6ff',
  green:   '#3fb950',
  red:     '#f85149',
  text:    '#e6edf3',
  sub:     '#8b949e',
}

const css = {
  app: { background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui, sans-serif', padding: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logo: { fontSize: 28, lineHeight: 1 },
  title: { fontSize: 22, fontWeight: 700, color: C.orange, margin: 0 },
  sub: { fontSize: 13, color: C.sub, margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' },
  cardLabel: { fontSize: 12, color: C.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  cardValue: { fontSize: 26, fontWeight: 700, margin: 0 },
  cardSub: { fontSize: 12, color: C.sub, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: C.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  minerRow: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  dot: (online) => ({ width: 10, height: 10, borderRadius: '50%', background: online ? C.green : C.red, marginRight: 8, display: 'inline-block' }),
  badge: (color) => ({ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  probBar: { height: 10, borderRadius: 5, background: C.border, overflow: 'hidden', marginTop: 6 },
  probFill: (pct, color) => ({ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 5, transition: 'width 0.8s ease' }),
}

function StatCard({ label, value, sub, color = C.text }) {
  return (
    <div style={css.card}>
      <div style={css.cardLabel}>{label}</div>
      <div style={{ ...css.cardValue, color }}>{value}</div>
      {sub && <div style={css.cardSub}>{sub}</div>}
    </div>
  )
}

function ProbBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: C.sub }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={css.probBar}>
        <div style={css.probFill(pct, color)} />
      </div>
    </div>
  )
}

export default function App() {
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [lastPoll, setLastPoll] = useState(null)

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/status`)
      const data = await res.json()
      setStatus(data)
      setLastPoll(new Date())
    } catch (e) {
      console.error('Status fetch failed:', e)
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`${API}/history/all?hours=6`)
      const data = await res.json()
      setHistory(data.map(d => ({
        time: new Date(d.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hashrate: parseFloat(d.total_hashrate?.toFixed(2) || 0),
        temp: parseFloat(d.avg_temp?.toFixed(1) || 0),
      })))
    } catch (e) {
      console.error('History fetch failed:', e)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchHistory()
    const si = setInterval(fetchStatus, 30000)
    const hi = setInterval(fetchHistory, 60000)
    return () => { clearInterval(si); clearInterval(hi) }
  }, [])

  const s = status
  const prob30  = parseFloat(s?.stats?.block_hit_prob_30d  || 0)
  const prob365 = parseFloat(s?.stats?.block_hit_prob_1yr  || 0)
  const btcPrice = s?.stats?.btc_price_usd || 0
  const dailyUsd = s ? ((s.cluster?.totalHashrateGhs || 0) / (s.stats?.network_hashrate_eh * 1e9 || 700e9)) * 144 * 3.125 * btcPrice : 0

  return (
    <div style={css.app}>
      {/* Header */}
      <div style={css.header}>
        <span style={css.logo}>⚡</span>
        <div>
          <p style={css.title}>Bitaxe Mining Dashboard</p>
          <p style={css.sub}>
            {lastPoll ? `Last updated ${lastPoll.toLocaleTimeString()}` : 'Connecting...'}
            {' · '}BTC ${btcPrice.toLocaleString()}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={css.badge(s?.cluster?.onlineCount === s?.cluster?.totalMiners ? C.green : C.red)}>
            {s ? `${s.cluster.onlineCount}/${s.cluster.totalMiners} miners online` : '—'}
          </span>
        </div>
      </div>

      {/* Top stat cards */}
      <div style={css.grid}>
        <StatCard
          label="Cluster Hashrate"
          value={s ? `${s.cluster.totalHashrateGhs?.toFixed(2)} GH/s` : '—'}
          sub="Combined all miners"
          color={C.orange}
        />
        <StatCard
          label="Est. Daily Earnings"
          value={s ? `$${dailyUsd.toFixed(4)}` : '—'}
          sub={`~${(dailyUsd / btcPrice * 1e8).toFixed(0)} sats/day`}
          color={C.green}
        />
        <StatCard
          label="Total Earned (Pool)"
          value={s ? `$${(s.cumulative?.total_usd || 0).toFixed(2)}` : '—'}
          sub="Since launch"
          color={C.blue}
        />
        <StatCard
          label="Network Hashrate"
          value={s ? `${s.stats?.network_hashrate_eh?.toFixed(0)} EH/s` : '—'}
          sub="Bitcoin global"
          color={C.sub}
        />
      </div>

      {/* Lottery odds */}
      <div style={css.section}>
        <div style={css.sectionTitle}>🎲 Block Hit Probability</div>
        <div style={css.card}>
          <ProbBar label="Next 30 Days"  pct={prob30}  color={C.orange} />
          <ProbBar label="Next 365 Days" pct={prob365} color={C.green} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>
            If you hit a block → 3.125 BTC ≈ ${(3.125 * btcPrice).toLocaleString(undefined, {maximumFractionDigits:0})} split between crew
          </div>
        </div>
      </div>

      {/* Hashrate chart */}
      <div style={css.section}>
        <div style={css.sectionTitle}>📈 Cluster Hashrate — Last 6 Hours</div>
        <div style={{ ...css.card, padding: '18px 8px' }}>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="time" stroke={C.sub} tick={{ fontSize: 11 }} />
                <YAxis stroke={C.sub} tick={{ fontSize: 11 }} unit=" GH/s" />
                <Tooltip
                  contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
                  labelStyle={{ color: C.sub }}
                  itemStyle={{ color: C.orange }}
                />
                <Line type="monotone" dataKey="hashrate" stroke={C.orange} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.sub }}>
              Waiting for data… miners will appear here after first poll
            </div>
          )}
        </div>
      </div>

      {/* Individual miner cards */}
      <div style={css.section}>
        <div style={css.sectionTitle}>🖥️ Individual Miners</div>
        {s?.miners?.length > 0 ? s.miners.map(m => (
          <div key={m.miner_ip} style={css.minerRow}>
            <div>
              <span style={css.dot(m.is_online)} />
              <span style={{ fontWeight: 600 }}>{m.miner_name || m.miner_ip}</span>
              <span style={{ color: C.sub, fontSize: 12, marginLeft: 8 }}>{m.miner_ip}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span>⚡ <b style={{ color: C.orange }}>{m.hashrate_ghs?.toFixed(2) || '—'} GH/s</b></span>
              <span>🌡️ <b style={{ color: m.temp_c > 70 ? C.red : C.text }}>{m.temp_c?.toFixed(0) || '—'}°C</b></span>
              <span>🔌 <b>{m.power_watts?.toFixed(1) || '—'}W</b></span>
              <span style={{ color: C.sub }}>up {m.uptime_secs ? `${Math.floor(m.uptime_secs/3600)}h` : '—'}</span>
            </div>
            <span style={css.badge(m.is_online ? C.green : C.red)}>
              {m.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
        )) : (
          <div style={{ ...css.card, color: C.sub, textAlign: 'center', padding: 32 }}>
            No miners detected yet. Add your Bitaxe IPs to <code>.env</code> and restart the backend.
          </div>
        )}
      </div>
    </div>
  )
}
