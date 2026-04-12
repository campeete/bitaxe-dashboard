import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts"

const CREW = [
  { id: "carbon", name: "Carbon", devices: 2, color: "#f7931a", you: true  },
  { id: "neon",   name: "Neon",   devices: 2, color: "#58a6ff", you: false },
  { id: "argon",  name: "Argon",  devices: 2, color: "#3fb950", you: false },
]
const BLOCK_REWARD_USD = 300000
const TAX_RATE = 0.20
const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'

const TYPE_COLORS = { bitaxe: "#f7931a", nerdqaxe: "#bc8cff", generic_asic: "#58a6ff" }
const TYPE_LABELS = { bitaxe: "Bitaxe", nerdqaxe: "NerdQAxe", generic_asic: "ASIC" }

function calcPayouts(crew, newMembers = []) {
  const origDevices = crew.reduce((s, m) => s + m.devices, 0)
  const newDevices  = newMembers.reduce((s, m) => s + m.devices, 0)
  const total       = origDevices + newDevices
  const origShare   = (origDevices / total) * BLOCK_REWARD_USD
  const newShare    = (newDevices  / total) * BLOCK_REWARD_USD
  const taxPool     = newShare * TAX_RATE
  const origEach    = (origShare + taxPool) / crew.length
  return { origEach, newShare: newShare * (1 - TAX_RATE), total }
}

function Counter({ value, prefix = "", suffix = "", decimals = 2, color = "#f7931a" }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current, end = parseFloat(value) || 0
    if (start === end) return
    const dur = 800, steps = 40; let i = 0
    const t = setInterval(() => {
      i++; setDisplay(start + (end - start) * (i / steps))
      if (i >= steps) { clearInterval(t); prev.current = end }
    }, dur / steps)
    return () => clearInterval(t)
  }, [value])
  return <span style={{ color, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{prefix}{display.toFixed(decimals)}{suffix}</span>
}

function ProbArc({ pct, label, color }) {
  const r = 54, cx = 64, cy = 64, circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <svg viewBox="0 0 128 128" width={110} height={110} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c2128" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color}
          style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700 }}>{pct.toFixed(1)}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#8b949e" style={{ fontSize: 10 }}>{label}</text>
      </svg>
    </div>
  )
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || "#8b949e"
  const label = TYPE_LABELS[type] || type
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "1px 7px", fontSize: 10,
      fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: 0.5,
    }}>{label}</span>
  )
}

function CrewCard({ member, payout, totalDevices, animDelay }) {
  const pct = (member.devices / totalDevices * 100).toFixed(1)
  return (
    <div style={{
      background: "#0d1117", border: `1px solid ${member.color}33`,
      borderRadius: 14, padding: "18px 20px", position: "relative",
      overflow: "hidden", animation: `fadeUp 0.5s ease ${animDelay}s both`,
    }}>
      {member.you && (
        <span style={{
          position: "absolute", top: 10, right: 12,
          background: member.color + "22", color: member.color,
          border: `1px solid ${member.color}44`, borderRadius: 6,
          fontSize: 10, padding: "2px 8px", fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}>YOU</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: member.color + "22", border: `2px solid ${member.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", color: member.color, fontWeight: 700, fontSize: 13,
        }}>{member.name[0]}</div>
        <div>
          <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: 15, fontFamily: "'Space Mono', monospace" }}>{member.name}</div>
          <div style={{ color: "#8b949e", fontSize: 11 }}>{member.devices} device{member.devices > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
          <span>Cluster share</span><span style={{ color: member.color }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "#21262d", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: `linear-gradient(90deg, ${member.color}, ${member.color}88)`,
            width: `${pct}%`, transition: "width 1s ease",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "#8b949e", fontSize: 11 }}>Block payout</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, color: "#3fb950" }}>
          ${Math.round(payout).toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
      <div style={{ color: "#8b949e", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: "'Space Mono', monospace" }}>
          {p.name}: {p.value?.toFixed(3)} GH/s
        </div>
      ))}
    </div>
  )
}

function SimulatorTab() {
  const [hashPerMiner, setHashPerMiner] = useState(1.2)
  const [btcPrice,     setBtcPrice]     = useState(84000)
  const [netEh,        setNetEh]        = useState(720)
  const [elec,         setElec]         = useState(0.10)
  const [watts,        setWatts]        = useState(15)
  const [days,         setDays]         = useState(90)
  const [crewMode,     setCrewMode]     = useState("orig")
  const [chartMode,    setChartMode]    = useState("cumulative")
  const [carbonD,      setCarbonD]      = useState(2)
  const [neonD,        setNeonD]        = useState(2)
  const [argonD,       setArgonD]       = useState(2)
  const [origTotal,    setOrigTotal]    = useState(6)
  const [newMemberD,   setNewMemberD]   = useState(2)
  const [taxRate,      setTaxRate]      = useState(20)

  const totalDevices = crewMode === "orig" ? carbonD + neonD + argonD : origTotal + newMemberD
  const totalHash    = totalDevices * hashPerMiner
  const netGhs       = netEh * 1e9
  const dailyBtc     = (totalHash / netGhs) * 144 * 3.125
  const dailyUsd     = dailyBtc * btcPrice
  const dailyElec    = (watts * totalDevices / 1000) * 24 * elec
  const dailyProfit  = dailyUsd - dailyElec
  const BLOCK        = 300000

  function blockProb(h, n, d) {
    const p = h / (n * 1e9)
    return (1 - Math.pow(1 - p, 144 * d)) * 100
  }

  const probData = [
    { label: "7 days",  val: blockProb(totalHash, netEh, 7) },
    { label: "30 days", val: blockProb(totalHash, netEh, 30) },
    { label: "90 days", val: blockProb(totalHash, netEh, 90) },
    { label: "1 year",  val: blockProb(totalHash, netEh, 365) },
    { label: fmtDays(days), val: blockProb(totalHash, netEh, days) },
  ]
  const maxProb = Math.max(...probData.map(p => p.val), 0.001)

  function fmtDays(d) {
    if (d >= 365) return (d/365).toFixed(1) + "yr"
    if (d >= 30)  return Math.round(d/30) + "mo"
    return d + "d"
  }

  const chartData = (() => {
    const pts = []
    if (chartMode === "daily") {
      const show = Math.min(days, 60)
      for (let d = 1; d <= show; d++) {
        pts.push({ name: "D"+d, pool: parseFloat((dailyUsd*d).toFixed(4)), profit: parseFloat(((dailyUsd-dailyElec)*d).toFixed(4)) })
      }
    } else if (chartMode === "weekly") {
      const weeks = Math.min(Math.ceil(days/7), 52)
      for (let w = 1; w <= weeks; w++) {
        pts.push({ name: "W"+w, pool: parseFloat((dailyUsd*7*w).toFixed(3)), profit: parseFloat(((dailyUsd-dailyElec)*7*w).toFixed(3)) })
      }
    } else if (chartMode === "monthly") {
      const months = Math.min(Math.ceil(days/30), 24)
      for (let m = 1; m <= months; m++) {
        pts.push({ name: "M"+m, pool: parseFloat((dailyUsd*30*m).toFixed(2)), profit: parseFloat(((dailyUsd-dailyElec)*30*m).toFixed(2)) })
      }
    } else {
      const show = Math.min(days, 365)
      const step = Math.max(1, Math.floor(show/60))
      for (let d = step; d <= show; d += step) {
        pts.push({ name: "D"+d, pool: parseFloat((dailyUsd*d).toFixed(4)), profit: parseFloat(((dailyUsd-dailyElec)*d).toFixed(4)) })
      }
    }
    return pts
  })()

  const panel = { background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }
  const lbl   = { fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }
  const sliderRow = (label, val, setter, min, max, step, fmt) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: "#8b949e", minWidth: 150 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => setter(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#f7931a" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3", fontFamily: "'Space Mono', monospace", minWidth: 80, textAlign: "right" }}>{fmt(val)}</span>
    </div>
  )

  const crewCards = crewMode === "orig" ? (() => {
    const devs  = [carbonD, neonD, argonD]
    const names = ["Carbon", "Neon", "Argon"]
    const colors= ["#f7931a", "#58a6ff", "#3fb950"]
    return devs.map((d, i) => {
      const share  = d / totalDevices
      const payout = Math.round(BLOCK * share)
      const daily  = (d * hashPerMiner / netGhs) * 144 * 3.125 * btcPrice
      return (
        <div key={names[i]} style={{ background: "#0d1117", border: `1px solid ${colors[i]}33`, borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: "#e6edf3", marginBottom: 4 }}>{names[i]}</div>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 10 }}>{d} device{d>1?"s":""} · {(share*100).toFixed(1)}% of cluster</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: colors[i] }}>${payout.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "#8b949e", marginTop: 3 }}>if block hit · ${daily.toFixed(5)}/day pool</div>
          <div style={{ height: 4, borderRadius: 2, background: "#21262d", overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${(share*100).toFixed(1)}%`, background: colors[i], borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )
    })
  })() : (() => {
    const tr     = taxRate / 100
    const oShare = origTotal / totalDevices
    const nShare = newMemberD / totalDevices
    const tax    = nShare * BLOCK * tr
    const oEach  = Math.round((oShare * BLOCK + tax) / 3)
    const nEach  = Math.round(nShare * BLOCK * (1 - tr))
    const oDaily = (origTotal * hashPerMiner / netGhs) * 144 * 3.125 * btcPrice / 3
    const nDaily = (newMemberD * hashPerMiner / netGhs) * 144 * 3.125 * btcPrice
    return [
      <div key="orig" style={{ background: "#0d1117", border: "1px solid #f7931a33", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: "#e6edf3", marginBottom: 4 }}>Carbon / Neon / Argon</div>
        <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 10 }}>{origTotal} devices · {(oShare*100).toFixed(1)}% · incl. {taxRate}% tax from new member</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#f7931a" }}>${oEach.toLocaleString()} each</div>
        <div style={{ fontSize: 10, color: "#8b949e", marginTop: 3 }}>if block hit · ${oDaily.toFixed(5)}/day pool each</div>
        <div style={{ height: 4, borderRadius: 2, background: "#21262d", overflow: "hidden", marginTop: 10 }}>
          <div style={{ height: "100%", width: `${(oShare*100).toFixed(1)}%`, background: "#f7931a", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>,
      <div key="new" style={{ background: "#0d1117", border: "1px solid #bc8cff33", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color: "#e6edf3", marginBottom: 4 }}>New Member</div>
        <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 10 }}>{newMemberD} device{newMemberD>1?"s":""} · {(nShare*100).toFixed(1)}% · after {taxRate}% tax</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#bc8cff" }}>${nEach.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: "#8b949e", marginTop: 3 }}>if block hit · ${nDaily.toFixed(5)}/day pool</div>
        <div style={{ height: 4, borderRadius: 2, background: "#21262d", overflow: "hidden", marginTop: 10 }}>
          <div style={{ height: "100%", width: `${(nShare*100).toFixed(1)}%`, background: "#bc8cff", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>
    ]
  })()

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={panel}>
          <div style={lbl}>Mining variables</div>
          {sliderRow("Hashrate per miner", hashPerMiner, setHashPerMiner, 0.5, 5, 0.1, v => v.toFixed(1)+" GH/s")}
          {sliderRow("BTC price", btcPrice, setBtcPrice, 20000, 500000, 1000, v => "$"+v.toLocaleString())}
          {sliderRow("Network hashrate", netEh, setNetEh, 200, 2000, 10, v => v+" EH/s")}
          {sliderRow("Power cost $/kWh", elec, setElec, 0, 0.30, 0.01, v => "$"+v.toFixed(2))}
          {sliderRow("Watts per miner", watts, setWatts, 5, 50, 1, v => v+"W")}
          {sliderRow("Projection period", days, setDays, 1, 365, 1, v => fmtDays(v))}
        </div>
        <div style={panel}>
          <div style={lbl}>Crew setup</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["orig","Original 3 add miners"],["new","Add new member"]].map(([m, l]) => (
              <button key={m} onClick={() => setCrewMode(m)} style={{
                background: crewMode === m ? "#f7931a18" : "transparent",
                border: `1px solid ${crewMode === m ? "#f7931a44" : "#21262d"}`,
                borderRadius: 8, padding: "5px 12px", fontSize: 11,
                color: crewMode === m ? "#f7931a" : "#8b949e",
                fontFamily: "'Space Mono', monospace", cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>
          {crewMode === "orig" ? <>
            {sliderRow("Carbon devices", carbonD, setCarbonD, 1, 10, 1, v => v)}
            {sliderRow("Neon devices",   neonD,   setNeonD,   1, 10, 1, v => v)}
            {sliderRow("Argon devices",  argonD,  setArgonD,  1, 10, 1, v => v)}
          </> : <>
            {sliderRow("Original crew devices", origTotal,   setOrigTotal,   1, 20, 1, v => v)}
            {sliderRow("New member devices",     newMemberD,  setNewMemberD,  1, 10, 1, v => v)}
            {sliderRow("Tax rate on new member", taxRate,     setTaxRate,     0, 50, 1, v => v+"%")}
          </>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total hashrate",   val: totalHash.toFixed(2)+" GH/s",    sub: totalDevices+" miners",             color: "#f7931a" },
          { label: "Daily earnings",   val: "$"+dailyUsd.toFixed(5),          sub: dailyBtc.toFixed(8)+" BTC",         color: "#3fb950" },
          { label: "Daily profit",     val: "$"+dailyProfit.toFixed(5),       sub: "after $"+dailyElec.toFixed(3)+"/day elec", color: dailyProfit >= 0 ? "#3fb950" : "#f85149" },
          { label: fmtDays(days)+" earnings", val: "$"+(dailyUsd*days).toFixed(2), sub: "$"+(dailyProfit*days).toFixed(2)+" profit", color: "#58a6ff" },
          { label: "Break-even BTC",   val: dailyBtc > 0 ? "$"+Math.round(dailyElec/dailyBtc).toLocaleString() : "—", sub: "min price to profit", color: "#bc8cff" },
        ].map(({ label, val, sub, color }) => (
          <div key={label} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 10, color: "#8b949e", marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={panel}>
        <div style={lbl}>Block hit probability</div>
        {probData.map(p => (
          <div key={p.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 3 }}>
              <span>{p.label}</span>
              <span style={{ fontWeight: 700, color: "#e6edf3", fontFamily: "'Space Mono', monospace" }}>{p.val.toFixed(3)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#21262d", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min((p.val/maxProb)*100, 100).toFixed(1)}%`, background: "#58a6ff", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          {[
            { l: "Block reward", v: "$"+Math.round(3.125*btcPrice).toLocaleString() },
            { l: "Avg time to block", v: Math.round(100/blockProb(totalHash,netEh,365)*365)+"d avg" },
            { l: "Pool daily est", v: "$"+dailyUsd.toFixed(5) },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: "#161b22", borderRadius: 8, padding: "6px 12px", fontSize: 10, color: "#8b949e" }}>
              {l}: <span style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <div style={lbl}>Earnings projection</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["cumulative","Cumulative"]].map(([m, l]) => (
            <button key={m} onClick={() => setChartMode(m)} style={{
              background: chartMode === m ? "#58a6ff18" : "transparent",
              border: `1px solid ${chartMode === m ? "#58a6ff44" : "#21262d"}`,
              borderRadius: 8, padding: "5px 12px", fontSize: 11,
              color: chartMode === m ? "#58a6ff" : "#8b949e",
              fontFamily: "'Space Mono', monospace", cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
          {[["#f7931a","Pool earnings (USD)"],["#3fb950","After electricity cost"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8b949e" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f7931a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="prg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="name" stroke="#8b949e" tick={{ fontSize: 9, fontFamily: "Space Mono" }} />
            <YAxis stroke="#8b949e" tick={{ fontSize: 9, fontFamily: "Space Mono" }} tickFormatter={v => "$"+v.toFixed(3)} />
            <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#8b949e" }} itemStyle={{ fontFamily: "Space Mono, monospace" }} />
            <Area type="monotone" dataKey="pool"   name="Pool earnings"      stroke="#f7931a" strokeWidth={2} fill="url(#pg)"  dot={false} />
            <Area type="monotone" dataKey="profit" name="After electricity"  stroke="#3fb950" strokeWidth={2} fill="url(#prg)" dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={panel}>
        <div style={lbl}>Payout split</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {crewCards}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          {[
            { l: "Block reward total", v: "$"+BLOCK.toLocaleString() },
            { l: "Total devices", v: totalDevices },
            crewMode === "new" && { l: "Tax collected", v: "$"+Math.round((newMemberD/totalDevices)*BLOCK*(taxRate/100)).toLocaleString() },
          ].filter(Boolean).map(({ l, v }) => (
            <div key={l} style={{ background: "#161b22", borderRadius: 8, padding: "6px 12px", fontSize: 10, color: "#8b949e" }}>
              {l}: <span style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DevicesTab() {
  const [devices, setDevices]     = useState([])
  const [supported, setSupported] = useState([])
  const [form, setForm]           = useState({ ip: "", name: "", type: "bitaxe", owner: "", location: "", notes: "" })
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(false)

  async function loadDevices() {
    try {
      const r = await fetch(`${API}/devices`)
      const d = await r.json()
      setDevices(d.devices || [])
      setSupported(d.supportedTypes || [])
    } catch {}
  }

  useEffect(() => { loadDevices() }, [])

  async function addDevice(e) {
    e.preventDefault()
    if (!form.ip) return setMsg({ error: true, text: "IP is required" })
    setLoading(true)
    try {
      const r = await fetch(`${API}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { setMsg({ error: true, text: d.error }); return }
      setMsg({ error: false, text: `${form.ip} registered as ${form.type}` })
      setForm({ ip: "", name: "", type: "bitaxe", owner: "", location: "", notes: "" })
      loadDevices()
    } catch (e) { setMsg({ error: true, text: e.message }) }
    finally { setLoading(false) }
  }

  async function toggleActive(device) {
    await fetch(`${API}/devices/${encodeURIComponent(device.ip)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: device.active ? false : true }),
    })
    loadDevices()
  }

  async function removeDevice(ip) {
    if (!confirm(`Deactivate ${ip}? History is preserved.`)) return
    await fetch(`${API}/devices/${encodeURIComponent(ip)}`, { method: "DELETE" })
    loadDevices()
  }

  const inp = (field, placeholder) => (
    <input placeholder={placeholder} value={form[field]}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8,
        padding: "8px 12px", color: "#e6edf3", fontSize: 12,
        fontFamily: "'Space Mono', monospace", width: "100%" }} />
  )

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Register New Miner</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
          {inp("ip", "IP Address *")}
          {inp("name", "Display Name")}
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8,
              padding: "8px 12px", color: "#e6edf3", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
            {supported.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
          {inp("owner", "Owner")}
          {inp("location", "Location")}
          {inp("notes", "Notes")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={addDevice} disabled={loading} style={{
            background: "#f7931a22", border: "1px solid #f7931a44", borderRadius: 8,
            padding: "8px 20px", color: "#f7931a", fontFamily: "'Space Mono', monospace",
            fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{loading ? "..." : "+ ADD MINER"}</button>
          {msg && <span style={{ fontSize: 12, color: msg.error ? "#f85149" : "#3fb950", fontFamily: "'Space Mono', monospace" }}>{msg.text}</span>}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Registered Devices ({devices.length})
      </div>
      {devices.map(d => (
        <div key={d.id} style={{
          background: "#0d1117", border: `1px solid ${d.active ? "#21262d" : "#f8514922"}`,
          borderRadius: 12, padding: "14px 18px", marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8, opacity: d.active ? 1 : 0.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: d.active ? "#3fb950" : "#f85149" }} />
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>{d.name || d.ip}</div>
              <div style={{ fontSize: 11, color: "#8b949e" }}>{d.ip}{d.owner ? ` · ${d.owner}` : ""}{d.location ? ` · ${d.location}` : ""}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TypeBadge type={d.type} />
            <button onClick={() => toggleActive(d)} style={{
              background: d.active ? "#f8514918" : "#3fb95018",
              border: `1px solid ${d.active ? "#f8514944" : "#3fb95044"}`,
              borderRadius: 6, padding: "3px 10px", fontSize: 11,
              color: d.active ? "#f85149" : "#3fb950",
              fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>{d.active ? "PAUSE" : "RESUME"}</button>
            {!d.active && (
              <button onClick={() => removeDevice(d.ip)} style={{
                background: "transparent", border: "1px solid #f8514933",
                borderRadius: 6, padding: "3px 10px", fontSize: 11,
                color: "#f85149", fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>REMOVE</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [status, setStatus]         = useState(null)
  const [history, setHistory]       = useState([])
  const [lastPoll, setLastPoll]     = useState(null)
  const [newMembers, setNewMembers] = useState([])
  const [addCount, setAddCount]     = useState(1)
  const [tab, setTab]               = useState("dashboard")

  const { origEach } = calcPayouts(CREW, newMembers)
  const totalDevices  = CREW.reduce((s, m) => s + m.devices, 0)

  async function fetchStatus() {
    try { const r = await fetch(`${API}/status`); const d = await r.json(); setStatus(d); setLastPoll(new Date()) } catch {}
  }
  async function fetchHistory() {
    try {
      const r = await fetch(`${API}/history/all?hours=6`)
      const d = await r.json()
      setHistory(d.map(r => ({ time: new Date(r.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), hashrate: parseFloat((r.total_hashrate || 0).toFixed(3)) })))
    } catch {}
  }

  useEffect(() => {
    fetchStatus(); fetchHistory()
    const si = setInterval(fetchStatus, 30000)
    const hi = setInterval(fetchHistory, 60000)
    return () => { clearInterval(si); clearInterval(hi) }
  }, [])

  const btc       = status?.stats?.btc_price_usd || 0
  const prob30    = parseFloat(status?.stats?.block_hit_prob_30d  || 0)
  const prob365   = parseFloat(status?.stats?.block_hit_prob_1yr  || 0)
  const networkEH = status?.stats?.network_hashrate_eh || 700
  const totalTH   = (status?.cluster?.totalHashrateGhs || 0) / 1000
  const dailyBTC  = totalTH * 1000 / (networkEH * 1e9) * 144 * 3.125
  const dailyUSD  = dailyBTC * btc
  const online    = status?.cluster?.onlineCount || 0
  const total     = status?.cluster?.totalMiners  || 3

  const tabs = [["dashboard","Dashboard"],["crew","Crew"],["payout","Payout Calc"],["simulator","Simulator"],["devices","Devices"]]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060910; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        ::-webkit-scrollbar { width: 4px; background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 2px; }
        input[type=range] { accent-color: #f7931a; }
        input::placeholder { color: #484f58; }
        select option { background: #0d1117; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#060910", color: "#e6edf3", fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, #f7931a08 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, #58a6ff06 0%, transparent 50%)` }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff03 2px, #ffffff03 4px)" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", position: "relative", zIndex: 1 }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #f7931a, #e67e00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#f7931a" }}>BITAXE CLUSTER</div>
                <div style={{ fontSize: 11, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase" }}>Carbon · Neon · Argon</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7,
                background: online === total ? "#3fb95018" : "#f8514918",
                border: `1px solid ${online === total ? "#3fb95044" : "#f8514944"}`,
                borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                color: online === total ? "#3fb950" : "#f85149" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: online === total ? "#3fb950" : "#f85149", animation: online > 0 ? "pulse 2s infinite" : "none" }} />
                {online}/{total} ONLINE
              </div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>
                {lastPoll ? `synced ${lastPoll.toLocaleTimeString()}` : "connecting..."}
                {btc > 0 && <span style={{ color: "#f7931a", marginLeft: 8 }}>₿ ${btc.toLocaleString()}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap", animation: "fadeUp 0.4s ease 0.05s both" }}>
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                background: tab === id ? "#f7931a18" : "transparent",
                border: `1px solid ${tab === id ? "#f7931a44" : "#21262d"}`,
                borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                color: tab === id ? "#f7931a" : "#8b949e", cursor: "pointer",
                fontFamily: "'Space Mono', monospace", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          {tab === "dashboard" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "CLUSTER HASHRATE", value: (status?.cluster?.totalHashrateGhs || 0).toFixed(2), suffix: " GH/s", color: "#f7931a", delay: 0.1 },
                { label: "DAILY EARNINGS",   value: dailyUSD.toFixed(4), prefix: "$", color: "#3fb950", delay: 0.15 },
                { label: "TOTAL EARNED",     value: (status?.cumulative?.total_usd || 0).toFixed(2), prefix: "$", color: "#58a6ff", delay: 0.2 },
                { label: "NETWORK",          value: networkEH.toFixed(0), suffix: " EH/s", color: "#8b949e", delay: 0.25 },
              ].map(({ label, value, prefix, suffix, color, delay }) => (
                <div key={label} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "18px 20px", animation: `fadeUp 0.5s ease ${delay}s both`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top left, ${color}08 0%, transparent 60%)`, pointerEvents: "none" }} />
                  <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>
                    <Counter value={parseFloat(value) || 0} prefix={prefix || ""} suffix={suffix || ""} color={color}
                      decimals={value.toString().includes(".") ? value.toString().split(".")[1].length : 0} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 24px", marginBottom: 24, animation: "fadeUp 0.5s ease 0.3s both" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Block Hit Probability</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
                <ProbArc pct={prob30}  label="30 Days"  color="#f7931a" />
                <ProbArc pct={prob365} label="365 Days" color="#3fb950" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 160 }}>
                  <div style={{ background: "#3fb95015", border: "1px solid #3fb95033", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>If block hit →</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: "#3fb950", fontWeight: 700 }}>~$100K each</div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>3.125 BTC ÷ Carbon · Neon · Argon</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 20px 12px", marginBottom: 24, animation: "fadeUp 0.5s ease 0.35s both" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Cluster Hashrate — Last 6 Hours</div>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f7931a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
                    <YAxis stroke="#8b949e" tick={{ fontSize: 10, fontFamily: "Space Mono" }} unit=" GH/s" />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="hashrate" name="Hashrate" stroke="#f7931a" strokeWidth={2} fill="url(#hg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: 13, fontStyle: "italic" }}>Waiting for miners to connect...</div>
              )}
            </div>
            <div style={{ animation: "fadeUp 0.5s ease 0.4s both" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Individual Miners</div>
              {status?.miners?.map(m => (
                <div key={m.miner_ip} style={{ background: "#0d1117", border: `1px solid ${m.is_online ? "#21262d" : "#f8514922"}`, borderRadius: 12, padding: "13px 18px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.is_online ? "#3fb950" : "#f85149", animation: m.is_online ? "pulse 2s infinite" : "none" }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>{m.miner_name || m.miner_ip}</span>
                    <span style={{ color: "#8b949e", fontSize: 11 }}>{m.miner_ip}</span>
                    <TypeBadge type={m.miner_type || "bitaxe"} />
                  </div>
                  <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
                    <span>⚡ <b style={{ color: "#f7931a", fontFamily: "Space Mono, monospace" }}>{m.hashrate_ghs?.toFixed(2) || "—"} GH/s</b></span>
                    <span>🌡 <b style={{ color: m.temp_c > 70 ? "#f85149" : "#e6edf3" }}>{m.temp_c?.toFixed(0) || "—"}°C</b></span>
                    <span style={{ color: "#8b949e" }}>{m.power_watts?.toFixed(1) || "—"}W</span>
                  </div>
                  <span style={{ background: m.is_online ? "#3fb95018" : "#f8514918", color: m.is_online ? "#3fb950" : "#f85149", border: `1px solid ${m.is_online ? "#3fb95044" : "#f8514944"}`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{m.is_online ? "ONLINE" : "OFFLINE"}</span>
                </div>
              ))}
            </div>
          </>}

          {tab === "crew" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
              {CREW.map((m, i) => <CrewCard key={m.id} member={m} payout={origEach} totalDevices={totalDevices + newMembers.reduce((s, n) => s + n.devices, 0)} animDelay={i * 0.08} />)}
            </div>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Crew Agreement</div>
              {["All block payouts split equally 3 ways between Carbon, Neon, and Argon","New members pay 20% tax on their proportional share back to original crew","Devices can be hosted at any location — ownership tracked by wallet address","Anyone who joins signs a written agreement before hardware is purchased"].map((rule, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < 3 ? "1px solid #21262d" : "none" }}>
                  <span style={{ color: "#f7931a", fontFamily: "Space Mono, monospace", fontSize: 12, minWidth: 20 }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          </>}

          {tab === "payout" && <>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Add New Members (Taxed 20%)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <input type="number" min={1} max={10} value={addCount} onChange={e => setAddCount(parseInt(e.target.value)||1)}
                  style={{ width: 70, background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "8px 12px", color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontSize: 13 }} />
                <span style={{ color: "#8b949e", fontSize: 13 }}>devices for new member</span>
                <button onClick={() => setNewMembers(p => [...p, { id: Date.now(), devices: addCount }])}
                  style={{ background: "#f7931a22", border: "1px solid #f7931a44", borderRadius: 8, padding: "8px 18px", color: "#f7931a", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ ADD</button>
                {newMembers.length > 0 && <button onClick={() => setNewMembers([])} style={{ background: "#f8514918", border: "1px solid #f8514944", borderRadius: 8, padding: "8px 14px", color: "#f85149", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer" }}>CLEAR</button>}
              </div>
              {newMembers.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{newMembers.map((m,i) => <span key={m.id} style={{ background: "#bc8cff18", border: "1px solid #bc8cff44", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#bc8cff", fontFamily: "Space Mono, monospace" }}>Member {i+1}: {m.devices} device{m.devices>1?"s":""}</span>)}</div>}
            </div>
            {(() => {
              const { origEach, newShare } = calcPayouts(CREW, newMembers)
              const newEach = newMembers.length > 0 ? newShare / newMembers.length : 0
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: "linear-gradient(135deg, #0d1117, #3fb95008)", border: "1px solid #3fb95033", borderRadius: 14, padding: "22px 24px" }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Carbon · Neon · Argon</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#3fb950" }}>${Math.round(origEach).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>each — always equal split</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #0d1117, #bc8cff08)", border: "1px solid #bc8cff33", borderRadius: 14, padding: "22px 24px", opacity: newMembers.length > 0 ? 1 : 0.4 }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>New Members (each)</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#bc8cff" }}>{newMembers.length > 0 ? `$${Math.round(newEach).toLocaleString()}` : "—"}</div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>after 20% tax to orig crew</div>
                  </div>
                </div>
              )
            })()}
          </>}

          {tab === "simulator" && <SimulatorTab />}
          {tab === "devices"   && <DevicesTab />}

        </div>
      </div>
    </>
  )
}

