import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts"
import { QRCodeSVG } from "qrcode.react"

// ── Crew config ───────────────────────────────────────────────────────────────
const CREW = [
  { id: "carbon",  name: "Carbon",  devices: 2, color: "#f7931a", you: true  },
  { id: "neon",    name: "Neon",    devices: 2, color: "#58a6ff", you: false },
  { id: "argon",   name: "Argon",   devices: 2, color: "#3fb950", you: false },
]

const BLOCK_REWARD_USD = 300000
const TAX_RATE = 0.20
const DEFAULT_API = `${window.location.protocol}//${window.location.hostname}:3001/api`

// ── Utility ───────────────────────────────────────────────────────────────────
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

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ value, prefix = "", suffix = "", decimals = 2, color = "#f7931a" }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const end   = parseFloat(value) || 0
    if (start === end) return
    const dur = 800, steps = 40
    let i = 0
    const t = setInterval(() => {
      i++
      setDisplay(start + (end - start) * (i / steps))
      if (i >= steps) { clearInterval(t); prev.current = end }
    }, dur / steps)
    return () => clearInterval(t)
  }, [value])
  return (
    <span style={{ color, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}

// ── Probability arc ───────────────────────────────────────────────────────────
function ProbArc({ pct, label, color }) {
  const r = 54, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const dash  = (Math.min(pct, 100) / 100) * circ
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <svg viewBox="0 0 128 128" width={110} height={110} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c2128" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color}
          style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700 }}>
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#8b949e" style={{ fontSize: 10 }}>
          {label}
        </text>
      </svg>
    </div>
  )
}

// ── Crew card ─────────────────────────────────────────────────────────────────
function CrewCard({ member, payout, totalDevices, animDelay }) {
  const pct = (member.devices / totalDevices * 100).toFixed(1)
  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${member.color}33`,
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      animation: `fadeUp 0.5s ease ${animDelay}s both`,
    }}>
      {member.you && (
        <span style={{
          position: "absolute", top: 10, right: 12,
          background: member.color + "22", color: member.color,
          border: `1px solid ${member.color}44`,
          borderRadius: 6, fontSize: 10, padding: "2px 8px", fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}>YOU</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: member.color + "22",
          border: `2px solid ${member.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", color: member.color, fontWeight: 700, fontSize: 13,
        }}>
          {member.name[0]}
        </div>
        <div>
          <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: 15, fontFamily: "'Space Mono', monospace" }}>
            {member.name}
          </div>
          <div style={{ color: "#8b949e", fontSize: 11 }}>{member.devices} device{member.devices > 1 ? "s" : ""}</div>
        </div>
      </div>
      {/* Device bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
          <span>Cluster share</span>
          <span style={{ color: member.color }}>{pct}%</span>
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
        <span style={{
          fontFamily: "'Space Mono', monospace", fontWeight: 700,
          fontSize: 16, color: "#3fb950",
        }}>${Math.round(payout).toLocaleString()}</span>
      </div>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#161b22", border: "1px solid #21262d",
      borderRadius: 8, padding: "8px 14px", fontSize: 12,
    }}>
      <div style={{ color: "#8b949e", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: "'Space Mono', monospace" }}>
          {p.name}: {p.value?.toFixed(3)} GH/s
        </div>
      ))}
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus]   = useState(null)
  const [history, setHistory] = useState([])
  const [lastPoll, setLastPoll] = useState(null)
  const [newMembers, setNewMembers] = useState([])
  const [addCount, setAddCount] = useState(1)
  const [tab, setTab] = useState("dashboard")
  const [demoMode, setDemoMode] = useState(false)
  const [toast, setToast] = useState("")
  const [walletLabel, setWalletLabel] = useState(() => localStorage.getItem("walletLabel") || "Main Payout Wallet")
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem("walletAddress") || "bc1qexamplewalletaddress0000000000000000000")
  const [walletNotes, setWalletNotes] = useState(() => localStorage.getItem("walletNotes") || "Primary BTC payout destination for cluster rewards.")
  const [showWalletAddress, setShowWalletAddress] = useState(false)
  const [locationName, setLocationName] = useState(() => localStorage.getItem("locationName") || "Home A")
  const [locationSubnet, setLocationSubnet] = useState(() => localStorage.getItem("locationSubnet") || "192.168.1.x")
  const [locationNotes, setLocationNotes] = useState(() => localStorage.getItem("locationNotes") || "Primary home network for the Bitaxe cluster.")
  const [newProfileName, setNewProfileName] = useState("")
  const [settingsUnlocked, setSettingsUnlocked] = useState(() => localStorage.getItem("settingsUnlocked") === "true")
  const [settingsPin, setSettingsPin] = useState(() => localStorage.getItem("settingsPin") || "1234")
  const [pinInput, setPinInput] = useState("")
  const [apiBaseUrl, setApiBaseUrl] = useState(
    () => localStorage.getItem("apiBaseUrl") || "https://bitaxe-dashboard.onrender.com/api"
  )
  const [backendOnline, setBackendOnline] = useState(false)
  const [newPinInput, setNewPinInput] = useState("")
  const importConfigRef = useRef(null)
  const [savedProfiles, setSavedProfiles] = useState(() => {
    const saved = localStorage.getItem("savedProfiles")
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {}
  })
  const [activeProfile, setActiveProfile] = useState(() => localStorage.getItem("activeProfile") || "Home A")
  const [miner1Name, setMiner1Name] = useState(() => localStorage.getItem("miner1Name") || "Carbon-01")
  const [miner1Ip, setMiner1Ip] = useState(() => localStorage.getItem("miner1Ip") || "192.168.1.100")
  const [miner2Name, setMiner2Name] = useState(() => localStorage.getItem("miner2Name") || "Neon-01")
  const [miner2Ip, setMiner2Ip] = useState(() => localStorage.getItem("miner2Ip") || "192.168.1.101")
  const [miner3Name, setMiner3Name] = useState(() => localStorage.getItem("miner3Name") || "Argon-01")
  const [miner3Ip, setMiner3Ip] = useState(() => localStorage.getItem("miner3Ip") || "192.168.1.102")

  const { origEach } = calcPayouts(CREW, newMembers)
  const totalDevices  = CREW.reduce((s, m) => s + m.devices, 0)

  useEffect(() => {
    localStorage.setItem("settingsUnlocked", settingsUnlocked ? "true" : "false")
    localStorage.setItem("settingsPin", settingsPin)
  }, [settingsUnlocked, settingsPin])

  useEffect(() => {
    localStorage.setItem("apiBaseUrl", apiBaseUrl)
  }, [apiBaseUrl])

  async function fetchStatus() {
    try {
      const res = await fetch(`${apiBaseUrl}/status`)
      const d   = await res.json()
      setStatus(d); setLastPoll(new Date()); setBackendOnline(true)
    } catch {
      setBackendOnline(false)
    }
  }

  async function fetchRootInfo() {
    try {
      const res = await fetch(`/`)
      const d = await res.json()
      setDemoMode(!!d.demoMode)
    } catch {}
  }

  async function toggleDemoMode() {
    try {
      const res = await fetch(`/api/demo-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !demoMode })
      })
      const d = await res.json()
      const enabled = !!d.demoMode
      setDemoMode(enabled)
      setToast(enabled ? "Demo mode enabled" : "Live mode enabled")
      setTimeout(() => setToast(""), 2200)
      fetchStatus()
      fetchHistory()
    } catch {
      setToast("Failed to switch mode")
      setTimeout(() => setToast(""), 2200)
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`${apiBaseUrl}/history/all?hours=6`)
      const d   = await res.json()
      setHistory(d.map(r => ({
        time: new Date(r.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hashrate: parseFloat((r.total_hashrate || 0).toFixed(3)),
      })))
    } catch {}
  }

  useEffect(() => {
    fetchStatus(); fetchHistory(); fetchRootInfo()
    const si = setInterval(fetchStatus, 30000)
    const hi = setInterval(fetchHistory, 60000)
    return () => { clearInterval(si); clearInterval(hi) }
  }, [])

  useEffect(() => {
    localStorage.setItem("walletLabel", walletLabel)
    localStorage.setItem("walletAddress", walletAddress)
    localStorage.setItem("walletNotes", walletNotes)
  }, [walletLabel, walletAddress, walletNotes])

  useEffect(() => {
    localStorage.setItem("locationName", locationName)
    localStorage.setItem("locationSubnet", locationSubnet)
    localStorage.setItem("locationNotes", locationNotes)
    localStorage.setItem("activeProfile", activeProfile)
  }, [locationName, locationSubnet, locationNotes, activeProfile])

  useEffect(() => {
    localStorage.setItem("miner1Name", miner1Name)
    localStorage.setItem("miner1Ip", miner1Ip)
    localStorage.setItem("miner2Name", miner2Name)
    localStorage.setItem("miner2Ip", miner2Ip)
    localStorage.setItem("miner3Name", miner3Name)
    localStorage.setItem("miner3Ip", miner3Ip)
  }, [miner1Name, miner1Ip, miner2Name, miner2Ip, miner3Name, miner3Ip])

  const btc        = status?.stats?.btc_price_usd || 0
  const prob30     = parseFloat(status?.stats?.block_hit_prob_30d  || 0)
  const prob365    = parseFloat(status?.stats?.block_hit_prob_1yr  || 0)
  const totalTH    = (status?.cluster?.totalHashrateGhs || 0) / 1000
  const networkEH  = status?.stats?.network_hashrate_eh || 700
  const dailyBTC   = totalTH * 1000 / (networkEH * 1e9) * 144 * 3.125
  const dailyUSD   = dailyBTC * btc
  const online     = status?.cluster?.onlineCount || 0
  const total      = status?.cluster?.totalMiners  || 3
  const hostName = window.location.hostname
  const hostPort = window.location.port || "5173"
  const shareHost =
    localStorage.getItem("shareHost") ||
    (hostName === "localhost" || hostName === "127.0.0.1" ? "192.168.1.152" : hostName)
  const frontendUrl = `${window.location.protocol}//${shareHost}${window.location.port ? `:${hostPort}` : ""}/`
  const backendRootUrl = `${window.location.protocol}//${shareHost}:3001/`

  const locationProfiles = {
    "Home A": {
      locationName: "Home A",
      locationSubnet: "192.168.1.x",
      locationNotes: "Primary home network for the Bitaxe cluster.",
      miners: [
        { name: "Carbon-01", ip: "192.168.1.100" },
        { name: "Neon-01", ip: "192.168.1.101" },
        { name: "Argon-01", ip: "192.168.1.102" }
      ]
    },
    "Home B": {
      locationName: "Home B",
      locationSubnet: "192.168.0.x",
      locationNotes: "Secondary house setup with a different subnet.",
      miners: [
        { name: "Carbon-01", ip: "192.168.0.110" },
        { name: "Neon-01", ip: "192.168.0.111" },
        { name: "Argon-01", ip: "192.168.0.112" }
      ]
    },
    "Temporary Site": {
      locationName: "Temporary Site",
      locationSubnet: "10.0.0.x",
      locationNotes: "Portable deployment profile for short-term relocation.",
      miners: [
        { name: "Carbon-Portable", ip: "10.0.0.20" },
        { name: "Neon-Portable", ip: "10.0.0.21" },
        { name: "Argon-Portable", ip: "10.0.0.22" }
      ]
    }
  }

  function applyLocationProfile(profileKey) {
    const profile = locationProfiles[profileKey]
    if (!profile) return

    setActiveProfile(profileKey)
    setLocationName(profile.locationName)
    setLocationSubnet(profile.locationSubnet)
    setLocationNotes(profile.locationNotes)

    setMiner1Name(profile.miners[0].name)
    setMiner1Ip(profile.miners[0].ip)
    setMiner2Name(profile.miners[1].name)
    setMiner2Ip(profile.miners[1].ip)
    setMiner3Name(profile.miners[2].name)
    setMiner3Ip(profile.miners[2].ip)

    setToast(`Loaded profile: ${profileKey}`)
    setTimeout(() => setToast(""), 2200)
  }

  function saveCurrentProfile() {
    const key = locationName || "Unnamed Profile"

    const updatedProfiles = {
      ...savedProfiles,
      [key]: {
        locationName,
        locationSubnet,
        locationNotes,
        miners: [
          { name: miner1Name, ip: miner1Ip },
          { name: miner2Name, ip: miner2Ip },
          { name: miner3Name, ip: miner3Ip }
        ]
      }
    }

    setSavedProfiles(updatedProfiles)
    localStorage.setItem("savedProfiles", JSON.stringify(updatedProfiles))

    setToast(`Saved profile: ${key}`)
    setTimeout(() => setToast(""), 2200)
  }

  function loadSavedProfile(profileKey) {
    const profile = savedProfiles[profileKey]
    if (!profile) return

    setLocationName(profile.locationName || "")
    setLocationSubnet(profile.locationSubnet || "")
    setLocationNotes(profile.locationNotes || "")

    setMiner1Name(profile.miners?.[0]?.name || "")
    setMiner1Ip(profile.miners?.[0]?.ip || "")
    setMiner2Name(profile.miners?.[1]?.name || "")
    setMiner2Ip(profile.miners?.[1]?.ip || "")
    setMiner3Name(profile.miners?.[2]?.name || "")
    setMiner3Ip(profile.miners?.[2]?.ip || "")

    setToast(`Loaded profile: ${profileKey}`)
    setTimeout(() => setToast(""), 2200)
  }

  function deleteSavedProfile(profileKey) {
    const updated = { ...savedProfiles }
    delete updated[profileKey]
    setSavedProfiles(updated)
    localStorage.setItem("savedProfiles", JSON.stringify(updated))
    setToast(`Deleted profile: ${profileKey}`)
    setTimeout(() => setToast(""), 2200)
  }

  function unlockSettings() {
    if ((pinInput || "").trim() === settingsPin) {
      setSettingsUnlocked(true)
      setPinInput("")
      setToast("Settings unlocked")
      setTimeout(() => setToast(""), 2200)
    } else {
      setToast("Incorrect PIN")
      setTimeout(() => setToast(""), 2200)
    }
  }

  function lockSettings() {
    setSettingsUnlocked(false)
    setToast("Settings locked")
    setTimeout(() => setToast(""), 2200)
  }

  function changeSettingsPin() {
    const nextPin = (newPinInput || "").trim()

    if (nextPin.length < 4) {
      setToast("PIN must be at least 4 characters")
      setTimeout(() => setToast(""), 2200)
      return
    }

    setSettingsPin(nextPin)
    setNewPinInput("")
    setToast("PIN updated")
    setTimeout(() => setToast(""), 2200)
  }

  function createNewProfile() {
    const key = (newProfileName || "").trim()
    if (!key) {
      setToast("Enter a new profile name")
      setTimeout(() => setToast(""), 2200)
      return
    }

    if (savedProfiles[key]) {
      setToast("Profile already exists")
      setTimeout(() => setToast(""), 2200)
      return
    }

    const newProfile = {
      locationName: key,
      locationSubnet: "",
      locationNotes: "",
      miners: [
        { name: "", ip: "" },
        { name: "", ip: "" },
        { name: "", ip: "" }
      ]
    }

    const updated = { ...savedProfiles, [key]: newProfile }
    setSavedProfiles(updated)
    localStorage.setItem("savedProfiles", JSON.stringify(updated))

    setLocationName(newProfile.locationName)
    setLocationSubnet(newProfile.locationSubnet)
    setLocationNotes(newProfile.locationNotes)
    setMiner1Name("")
    setMiner1Ip("")
    setMiner2Name("")
    setMiner2Ip("")
    setMiner3Name("")
    setMiner3Ip("")
    setNewProfileName("")

    setToast(`Created profile: ${key}`)
    setTimeout(() => setToast(""), 2200)
  }

  function exportConfig() {
    const payload = {
      walletLabel,
      walletAddress,
      walletNotes,
      locationName,
      locationSubnet,
      locationNotes,
      miner1Name,
      miner1Ip,
      miner2Name,
      miner2Ip,
      miner3Name,
      miner3Ip,
      savedProfiles,
      settingsPin
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bitaxe-dashboard-config.json"
    a.click()
    URL.revokeObjectURL(url)

    setToast("Config exported")
    setTimeout(() => setToast(""), 2200)
  }

  function importConfigFromFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)

        setWalletLabel(data.walletLabel || "Main Payout Wallet")
        setWalletAddress(data.walletAddress || "")
        setWalletNotes(data.walletNotes || "")

        setLocationName(data.locationName || "Home A")
        setLocationSubnet(data.locationSubnet || "")
        setLocationNotes(data.locationNotes || "")

        setMiner1Name(data.miner1Name || "")
        setMiner1Ip(data.miner1Ip || "")
        setMiner2Name(data.miner2Name || "")
        setMiner2Ip(data.miner2Ip || "")
        setMiner3Name(data.miner3Name || "")
        setMiner3Ip(data.miner3Ip || "")

        setSavedProfiles(data.savedProfiles || {})
        setSettingsPin(data.settingsPin || "1234")

        localStorage.setItem("walletLabel", data.walletLabel || "Main Payout Wallet")
        localStorage.setItem("walletAddress", data.walletAddress || "")
        localStorage.setItem("walletNotes", data.walletNotes || "")

        localStorage.setItem("locationName", data.locationName || "Home A")
        localStorage.setItem("locationSubnet", data.locationSubnet || "")
        localStorage.setItem("locationNotes", data.locationNotes || "")

        localStorage.setItem("miner1Name", data.miner1Name || "")
        localStorage.setItem("miner1Ip", data.miner1Ip || "")
        localStorage.setItem("miner2Name", data.miner2Name || "")
        localStorage.setItem("miner2Ip", data.miner2Ip || "")
        localStorage.setItem("miner3Name", data.miner3Name || "")
        localStorage.setItem("miner3Ip", data.miner3Ip || "")

        localStorage.setItem("savedProfiles", JSON.stringify(data.savedProfiles || {}))
        localStorage.setItem("settingsPin", data.settingsPin || "1234")

        setToast("Config imported")
        setTimeout(() => setToast(""), 2200)
      } catch {
        setToast("Invalid config file")
        setTimeout(() => setToast(""), 2200)
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value)
      setToast(`${label} copied`)
      setTimeout(() => setToast(""), 2200)
    } catch {
      setToast(`Failed to copy ${label.toLowerCase()}`)
      setTimeout(() => setToast(""), 2200)
    }
  }

  const configuredMiners = [
    { miner_name: miner1Name, miner_ip: miner1Ip },
    { miner_name: miner2Name, miner_ip: miner2Ip },
    { miner_name: miner3Name, miner_ip: miner3Ip },
  ]

  const displayedMiners = (status?.miners || []).map((m, i) => ({
    ...m,
    miner_name: configuredMiners[i]?.miner_name || m.miner_name || m.miner_ip,
    miner_ip: configuredMiners[i]?.miner_ip || m.miner_ip
  }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060910; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        ::-webkit-scrollbar { width: 4px; background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#060910", color: "#e6edf3",
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, #f7931a08 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 80% 80%, #58a6ff06 0%, transparent 50%)
        `,
      }}>
        {toast && (
          <div style={{
            position: "fixed",
            top: 18,
            right: 18,
            zIndex: 50,
            background: "#161b22",
            border: "1px solid #30363d",
            color: "#e6edf3",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)"
          }}>
            {toast}
          </div>
        )}
        {/* Scanline overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff03 2px, #ffffff03 4px)",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", position: "relative", zIndex: 1 }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 32, animation: "fadeUp 0.4s ease both",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                {demoMode && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#58a6ff18",
                    border: "1px solid #58a6ff44",
                    color: "#58a6ff",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: 1
                  }}>
                    DEMO MODE
                  </div>
                )}
                <button onClick={toggleDemoMode} style={{
                  background: demoMode ? "#f8514918" : "#3fb95018",
                  border: `1px solid ${demoMode ? "#f8514944" : "#3fb95044"}`,
                  color: demoMode ? "#f85149" : "#3fb950",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: 1,
                  cursor: "pointer"
                }}>
                  {demoMode ? "SWITCH TO LIVE" : "SWITCH TO DEMO"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, #f7931a, #e67e00)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, boxShadow: "0 0 20px #f7931a44",
                }}>⚡</div>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    color: "#f7931a", letterSpacing: "-0.5px",
                  }}>BITAXE CLUSTER</div>
                  <div style={{ fontSize: 11, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase" }}>
                    Carbon · Neon · Argon
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: online === total ? "#3fb95018" : "#f8514918",
                border: `1px solid ${online === total ? "#3fb95044" : "#f8514944"}`,
                borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                color: online === total ? "#3fb950" : "#f85149",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: online === total ? "#3fb950" : "#f85149",
                  animation: online > 0 ? "pulse 2s infinite" : "none",
                }} />
                {online}/{total} ONLINE
              </div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>
                {lastPoll ? `synced ${lastPoll.toLocaleTimeString()}` : "connecting..."}
                {btc > 0 && <span style={{ color: "#f7931a", marginLeft: 8 }}>₿ ${btc.toLocaleString()}</span>}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 8,
                  color: backendOnline ? "#3fb950" : "#f85149"
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: backendOnline ? "#3fb950" : "#f85149"
                  }} />
                  {backendOnline ? "backend online" : "backend offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, animation: "fadeUp 0.4s ease 0.05s both" }}>
            {[
  ["dashboard", "Dashboard"],
  ["crew", "Crew"],
  ["payout", "Payout Calc"],
  ["settings", "Settings"]
].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                background: tab === id ? "#f7931a18" : "transparent",
                border: `1px solid ${tab === id ? "#f7931a44" : "#21262d"}`,
                borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                color: tab === id ? "#f7931a" : "#8b949e", cursor: "pointer",
                fontFamily: "'Space Mono', monospace", transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {/* ── DASHBOARD TAB ─────────────────────────────────────────────── */}
          {tab === "dashboard" && <>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "CLUSTER HASHRATE", value: (status?.cluster?.totalHashrateGhs || 0).toFixed(2), suffix: " GH/s", color: "#f7931a", delay: 0.1 },
                { label: "DAILY EARNINGS",   value: dailyUSD.toFixed(4), prefix: "$", color: "#3fb950", delay: 0.15 },
                { label: "TOTAL EARNED",     value: (status?.cumulative?.total_usd || 0).toFixed(2), prefix: "$", color: "#58a6ff", delay: 0.2 },
                { label: "NETWORK",          value: (networkEH).toFixed(0), suffix: " EH/s", color: "#8b949e", delay: 0.25 },
              ].map(({ label, value, prefix, suffix, color, delay }) => (
                <div key={label} style={{
                  background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
                  padding: "18px 20px", animation: `fadeUp 0.5s ease ${delay}s both`,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(ellipse at top left, ${color}08 0%, transparent 60%)`,
                    pointerEvents: "none",
                  }} />
                  <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>
                    <Counter value={parseFloat(value) || 0} prefix={prefix || ""} suffix={suffix || ""} color={color}
                      decimals={value.toString().includes(".") ? value.toString().split(".")[1].length : 0} />
                  </div>
                </div>
              ))}
            </div>

            {/* System status */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "18px 20px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.28s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                System Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Backend
                  </div>
                  <div style={{ color: "#3fb950", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16 }}>
                    ONLINE
                  </div>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Data Mode
                  </div>
                  <div style={{
                    color: demoMode ? "#58a6ff" : "#f7931a",
                    fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16
                  }}>
                    {demoMode ? "DEMO" : "LIVE"}
                  </div>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Last Sync
                  </div>
                  <div style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16 }}>
                    {lastPoll ? lastPoll.toLocaleTimeString() : "—"}
                  </div>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    API
                  </div>
                  <div style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16 }}>
                    /api
                  </div>
                </div>
              </div>
            </div>

            {/* Share / Access */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "18px 20px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.29s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                Share / Access
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Frontend URL
                  </div>
                  <div style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 10 }}>
                    {frontendUrl}
                  </div>
                  <button
                    onClick={() => copyText(frontendUrl, "Frontend URL")}
                    style={{
                      background: "#58a6ff18",
                      border: "1px solid #58a6ff44",
                      color: "#58a6ff",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    COPY FRONTEND URL
                  </button>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Backend URL
                  </div>
                  <div style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 10 }}>
                    {backendRootUrl}
                  </div>
                  <button
                    onClick={() => copyText(backendRootUrl, "Backend URL")}
                    style={{
                      background: "#f7931a18",
                      border: "1px solid #f7931a44",
                      color: "#f7931a",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    COPY BACKEND URL
                  </button>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Device Host
                  </div>
                  <div style={{ color: "#e6edf3", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                    {hostName}
                  </div>
                </div>

                <div style={{
                  background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
                  padding: "12px 14px"
                }}>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Quick Tip
                  </div>
                  <div style={{ color: "#8b949e", fontSize: 12, lineHeight: 1.5 }}>
                    Open the frontend URL on a phone connected to the same Wi-Fi network.
                  </div>
                </div>
              </div>
            </div>

            {/* QR Access */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "18px 20px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.295s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                QR Access
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "center" }}>
                <div style={{
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  justifyContent: "center"
                }}>
                  <QRCodeSVG
                    value={frontendUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={true}
                  />
                </div>
                <div>
                  <div style={{ color: "#e6edf3", fontSize: 14, marginBottom: 10 }}>
                    Scan this with a phone on the same Wi-Fi to open the dashboard.
                  </div>
                  <div style={{
                    color: "#8b949e",
                    fontSize: 12,
                    lineHeight: 1.6,
                    marginBottom: 10
                  }}>
                    Best for quick setup when sharing the app locally without typing the full address.
                  </div>
                  <div style={{
                    color: "#e6edf3",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12,
                    wordBreak: "break-all"
                  }}>
                    {frontendUrl}
                  </div>
                </div>
              </div>
            </div>

            {/* Probability arcs */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "20px 24px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Block Hit Probability
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
                <ProbArc pct={prob30}  label="30 Days"  color="#f7931a" />
                <ProbArc pct={prob365} label="365 Days" color="#3fb950" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 160 }}>
                  <div style={{
                    background: "#3fb95015", border: "1px solid #3fb95033",
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>If block hit →</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: "#3fb950", fontWeight: 700 }}>
                      ~$100K each
                    </div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>
                      3.125 BTC ÷ Carbon · Neon · Argon
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hashrate chart */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "20px 20px 12px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.35s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Cluster Hashrate — Last 6 Hours
              </div>
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
                    <Area type="monotone" dataKey="hashrate" name="Hashrate"
                      stroke="#f7931a" strokeWidth={2} fill="url(#hg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  height: 180, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#8b949e", fontSize: 13, fontStyle: "italic",
                }}>Waiting for miners to connect...</div>
              )}
            </div>

            {/* Individual miners */}
            <div style={{ animation: "fadeUp 0.5s ease 0.4s both" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Individual Miners
              </div>
              {displayedMiners.map((m, i) => (
                <div key={m.miner_ip} style={{
                  background: "#0d1117", border: `1px solid ${m.is_online ? "#21262d" : "#f8514922"}`,
                  borderRadius: 12, padding: "13px 18px", marginBottom: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: m.is_online ? "#3fb950" : "#f85149",
                      animation: m.is_online ? "pulse 2s infinite" : "none",
                    }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                      {m.miner_name || m.miner_ip}
                    </span>
                    <span style={{ color: "#8b949e", fontSize: 11 }}>{m.miner_ip}</span>
                  </div>
                  <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
                    <span>⚡ <b style={{ color: "#f7931a", fontFamily: "Space Mono, monospace" }}>
                      {m.hashrate_ghs?.toFixed(2) || "—"} GH/s
                    </b></span>
                    <span>🌡 <b style={{ color: m.temp_c > 70 ? "#f85149" : "#e6edf3" }}>
                      {m.temp_c?.toFixed(0) || "—"}°C
                    </b></span>
                    <span style={{ color: "#8b949e" }}>{m.power_watts?.toFixed(1) || "—"}W</span>
                  </div>
                  <span style={{
                    background: m.is_online ? "#3fb95018" : "#f8514918",
                    color: m.is_online ? "#3fb950" : "#f85149",
                    border: `1px solid ${m.is_online ? "#3fb95044" : "#f8514944"}`,
                    borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                  }}>{m.is_online ? "ONLINE" : "OFFLINE"}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ── CREW TAB ──────────────────────────────────────────────────── */}
          {tab === "crew" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
              {CREW.map((m, i) => (
                <CrewCard key={m.id} member={m} payout={origEach}
                  totalDevices={totalDevices + newMembers.reduce((s, n) => s + n.devices, 0)}
                  animDelay={i * 0.08} />
              ))}
            </div>
            <div style={{
              background: "#0d1117", border: "1px solid #21262d",
              borderRadius: 14, padding: "20px 24px",
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                Crew Agreement
              </div>
              {[
                "All block payouts split equally 3 ways between Carbon, Neon, and Argon",
                "New members pay 20% tax on their proportional share back to original crew",
                "Devices can be hosted at any location — ownership tracked by wallet address",
                "Anyone who joins signs a written agreement before hardware is purchased",
              ].map((rule, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: "10px 0", borderBottom: i < 3 ? "1px solid #21262d" : "none",
                }}>
                  <span style={{ color: "#f7931a", fontFamily: "Space Mono, monospace", fontSize: 12, minWidth: 20 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ── PAYOUT CALC TAB ───────────────────────────────────────────── */}
          {tab === "payout" && <>
            <div style={{
              background: "#0d1117", border: "1px solid #21262d",
              borderRadius: 14, padding: "20px 24px", marginBottom: 20,
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Add New Members (Taxed 20%)
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <input type="number" min={1} max={10} value={addCount}
                  onChange={e => setAddCount(parseInt(e.target.value) || 1)}
                  style={{
                    width: 70, background: "#161b22", border: "1px solid #21262d",
                    borderRadius: 8, padding: "8px 12px", color: "#e6edf3",
                    fontFamily: "'Space Mono', monospace", fontSize: 13,
                  }} />
                <span style={{ color: "#8b949e", fontSize: 13 }}>devices for new member</span>
                <button onClick={() => setNewMembers(p => [...p, { id: Date.now(), devices: addCount }])}
                  style={{
                    background: "#f7931a22", border: "1px solid #f7931a44",
                    borderRadius: 8, padding: "8px 18px", color: "#f7931a",
                    fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                  }}>+ ADD</button>
                {newMembers.length > 0 && (
                  <button onClick={() => setNewMembers([])} style={{
                    background: "#f8514918", border: "1px solid #f8514944",
                    borderRadius: 8, padding: "8px 14px", color: "#f85149",
                    fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
                  }}>CLEAR</button>
                )}
              </div>
              {newMembers.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {newMembers.map((m, i) => (
                    <span key={m.id} style={{
                      background: "#bc8cff18", border: "1px solid #bc8cff44",
                      borderRadius: 6, padding: "4px 10px", fontSize: 12,
                      color: "#bc8cff", fontFamily: "Space Mono, monospace",
                    }}>Member {i + 1}: {m.devices} device{m.devices > 1 ? "s" : ""}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Payout breakdown */}
            {(() => {
              const { origEach, newShare } = calcPayouts(CREW, newMembers)
              const allDevices = totalDevices + newMembers.reduce((s, m) => s + m.devices, 0)
              const newEach = newMembers.length > 0
                ? newShare / newMembers.length : 0
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeUp 0.5s ease 0.2s both" }}>
                  <div style={{
                    border: "1px solid #3fb95033",
                    borderRadius: 14, padding: "22px 24px",
                    background: "linear-gradient(135deg, #0d1117, #3fb95008)",
                  }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                      Carbon · Neon · Argon
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#3fb950" }}>
                      ${Math.round(origEach).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>each — always equal split</div>
                    <div style={{ fontSize: 11, color: "#3fb95088", marginTop: 10 }}>
                      {totalDevices} devices · {(totalDevices / allDevices * 100).toFixed(1)}% of cluster
                      {newMembers.length > 0 && ` + 20% tax from ${newMembers.length} new member${newMembers.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div style={{
                    border: "1px solid #bc8cff33",
                    borderRadius: 14, padding: "22px 24px",
                    background: "linear-gradient(135deg, #0d1117, #bc8cff08)",
                    opacity: newMembers.length > 0 ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                      New Members (each)
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#bc8cff" }}>
                      {newMembers.length > 0 ? `$${Math.round(newEach).toLocaleString()}` : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>after 20% tax to orig crew</div>
                    <div style={{ fontSize: 11, color: "#bc8cff88", marginTop: 10 }}>
                      {newMembers.length > 0
                        ? `${newMembers.reduce((s, m) => s + m.devices, 0)} devices · ${(newMembers.reduce((s, m) => s + m.devices, 0) / allDevices * 100).toFixed(1)}% of cluster`
                        : "Add new members above"}
                    </div>
                  </div>
                </div>
              )
            })()}
          </>}

          {/* ── SETTINGS TAB ───────────────────────────────────────────── */}
          {tab === "settings" && <>
            {!settingsUnlocked ? (
              <div style={{
                maxWidth: 420,
                margin: "0 auto 24px",
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "22px 24px",
                animation: "fadeUp 0.5s ease 0.1s both",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  Settings Locked
                </div>
                <div style={{ color: "#e6edf3", fontSize: 14, marginBottom: 12 }}>
                  Enter your PIN to access wallet, miner, and location settings.
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter PIN"
                  style={{
                    width: "100%",
                    background: "#161b22",
                    border: "1px solid #21262d",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#e6edf3",
                    fontSize: 13,
                    marginBottom: 12,
                    fontFamily: "'Space Mono', monospace"
                  }}
                />
                <button
                  onClick={unlockSettings}
                  style={{
                    background: "#58a6ff18",
                    border: "1px solid #58a6ff44",
                    color: "#58a6ff",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    cursor: "pointer"
                  }}
                >
                  UNLOCK SETTINGS
                </button>
              </div>
            ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <div style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  Wallet Settings
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>Wallet Label</div>
                  <input
                    value={walletLabel}
                    onChange={e => setWalletLabel(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>BTC Address</div>
                  <input
                    value={walletAddress}
                    onChange={e => setWalletAddress(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13,
                      fontFamily: "'Space Mono', monospace"
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>Notes</div>
                  <textarea
                    value={walletNotes}
                    onChange={e => setWalletNotes(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13,
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 10
                }}>
                  <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Preview
                  </div>
                  <div style={{ color: "#e6edf3", fontSize: 13, marginBottom: 6 }}>
                    <b>Label:</b> {walletLabel || "—"}
                  </div>
                  <div style={{ color: "#e6edf3", fontSize: 13, marginBottom: 6, wordBreak: "break-all" }}>
                    <b>Address:</b> {walletAddress ? (showWalletAddress ? walletAddress : `${walletAddress.slice(0, 8)}••••••••••${walletAddress.slice(-6)}`) : "—"}
                  </div>
                  <button
                    onClick={() => setShowWalletAddress(v => !v)}
                    style={{
                      background: showWalletAddress ? "#f8514918" : "#58a6ff18",
                      border: `1px solid ${showWalletAddress ? "#f8514944" : "#58a6ff44"}`,
                      color: showWalletAddress ? "#f85149" : "#58a6ff",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer",
                      marginBottom: 10
                    }}
                  >
                    {showWalletAddress ? "HIDE ADDRESS" : "SHOW ADDRESS"}
                  </button>
                  <div style={{ color: "#8b949e", fontSize: 12 }}>
                    {walletNotes || "No notes added."}
                  </div>
                </div>
              </div>

              <div style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  Location Profiles
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <input
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="New profile name"
                    style={{
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e6edf3",
                      fontSize: 12,
                      minWidth: 180
                    }}
                  />
                  <button
                    onClick={createNewProfile}
                    style={{
                      background: "#f7931a18",
                      border: "1px solid #f7931a44",
                      color: "#f7931a",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    CREATE NEW PROFILE
                  </button>
                </div>

                <button
                  onClick={saveCurrentProfile}
                  style={{
                    background: "#3fb95018",
                    border: "1px solid #3fb95044",
                    color: "#3fb950",
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    cursor: "pointer",
                    marginBottom: 14
                  }}
                >
                  SAVE CURRENT PROFILE
                </button>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {Object.keys(locationProfiles).map(profile => (
                    <button
                      key={profile}
                      onClick={() => applyLocationProfile(profile)}
                      style={{
                        background: activeProfile === profile ? "#58a6ff18" : "#161b22",
                        border: `1px solid ${activeProfile === profile ? "#58a6ff44" : "#21262d"}`,
                        color: activeProfile === profile ? "#58a6ff" : "#e6edf3",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "'Space Mono', monospace",
                        cursor: "pointer"
                      }}
                    >
                      {profile}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>Profile Name</div>
                  <input
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>Expected Subnet</div>
                  <input
                    value={locationSubnet}
                    onChange={e => setLocationSubnet(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13,
                      fontFamily: "'Space Mono', monospace"
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>Location Notes</div>
                  <textarea
                    value={locationNotes}
                    onChange={e => setLocationNotes(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 13,
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 10
                }}>
                  <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Active Profile Preview
                  </div>
                  <div style={{ color: "#e6edf3", fontSize: 13, marginBottom: 6 }}>
                    <b>Name:</b> {locationName || "—"}
                  </div>
                  <div style={{ color: "#e6edf3", fontSize: 13, marginBottom: 6 }}>
                    <b>Subnet:</b> {locationSubnet || "—"}
                  </div>
                  <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 10 }}>
                    {locationNotes || "No location notes added."}
                  </div>

                  <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Saved Profiles
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {savedProfiles && Object.keys(savedProfiles).length > 0 ? (
                      Object.keys(savedProfiles).map(profile => (
                        <div
                          key={profile}
                          style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
                        >
                          <button
                            onClick={() => loadSavedProfile(profile)}
                            style={{
                              background: "#58a6ff18",
                              border: "1px solid #58a6ff44",
                              color: "#58a6ff",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "'Space Mono', monospace",
                              cursor: "pointer"
                            }}
                          >
                            LOAD {profile}
                          </button>
                          <button
                            onClick={() => deleteSavedProfile(profile)}
                            style={{
                              background: "#f8514918",
                              border: "1px solid #f8514944",
                              color: "#f85149",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "'Space Mono', monospace",
                              cursor: "pointer"
                            }}
                          >
                            DELETE
                          </button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#8b949e", fontSize: 12 }}>No saved profiles yet.</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  Miner Config
                </div>

                {[
                  [miner1Name, setMiner1Name, miner1Ip, setMiner1Ip, "Miner 1"],
                  [miner2Name, setMiner2Name, miner2Ip, setMiner2Ip, "Miner 2"],
                  [miner3Name, setMiner3Name, miner3Ip, setMiner3Ip, "Miner 3"]
                ].map(([name, setName, ip, setIp, label], idx) => (
                  <div key={idx} style={{
                    marginBottom: idx < 2 ? 14 : 0,
                    paddingBottom: idx < 2 ? 14 : 0,
                    borderBottom: idx < 2 ? "1px solid #21262d" : "none"
                  }}>
                    <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 8 }}>{label}</div>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Miner name"
                      style={{
                        width: "100%",
                        background: "#161b22",
                        border: "1px solid #21262d",
                        borderRadius: 8,
                        padding: "10px 12px",
                        color: "#e6edf3",
                        fontSize: 13,
                        marginBottom: 8
                      }}
                    />
                    <input
                      value={ip}
                      onChange={e => setIp(e.target.value)}
                      placeholder="192.168.1.xxx"
                      style={{
                        width: "100%",
                        background: "#161b22",
                        border: "1px solid #21262d",
                        borderRadius: 8,
                        padding: "10px 12px",
                        color: "#e6edf3",
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace"
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  App Controls
                </div>
                <div style={{ color: "#e6edf3", fontSize: 14, marginBottom: 8 }}>
                  Demo/live controls and admin tools will go here.
                </div>
                <div style={{ color: "#8b949e", fontSize: 12 }}>
                  This section will later hold security and configuration actions.
                </div>
              </div>
              <div style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#8b949e",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12
                }}>
                  Security
                </div>
                <div style={{ color: "#e6edf3", fontSize: 14, marginBottom: 10 }}>
                  Settings are currently unlocked on this device.
                </div>
                <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 12 }}>
                  Current PIN: <span style={{ fontFamily: "'Space Mono', monospace", color: "#e6edf3" }}>{settingsPin}</span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value)}
                    placeholder="New PIN"
                    style={{
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e6edf3",
                      fontSize: 12,
                      minWidth: 140,
                      fontFamily: "'Space Mono', monospace"
                    }}
                  />
                  <button
                    onClick={changeSettingsPin}
                    style={{
                      background: "#3fb95018",
                      border: "1px solid #3fb95044",
                      color: "#3fb950",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    CHANGE PIN
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>API Base URL</div>
                  <input
                    value={apiBaseUrl}
                    onChange={e => setApiBaseUrl(e.target.value)}
                    placeholder={DEFAULT_API}
                    style={{
                      width: "100%",
                      background: "#161b22",
                      border: "1px solid #21262d",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#e6edf3",
                      fontSize: 12,
                      fontFamily: "'Space Mono', monospace",
                      marginBottom: 10
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <button
                    onClick={exportConfig}
                    style={{
                      background: "#58a6ff18",
                      border: "1px solid #58a6ff44",
                      color: "#58a6ff",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    EXPORT CONFIG
                  </button>

                  <button
                    onClick={() => importConfigRef.current?.click()}
                    style={{
                      background: "#f7931a18",
                      border: "1px solid #f7931a44",
                      color: "#f7931a",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer"
                    }}
                  >
                    IMPORT CONFIG
                  </button>

                  <input
                    ref={importConfigRef}
                    type="file"
                    accept="application/json"
                    onChange={importConfigFromFile}
                    style={{ display: "none" }}
                  />
                </div>

                <button
                  onClick={lockSettings}
                  style={{
                    background: "#f8514918",
                    border: "1px solid #f8514944",
                    color: "#f85149",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    cursor: "pointer"
                  }}
                >
                  LOCK SETTINGS
                </button>
              </div>
            </div>
            )}
          </>}

        </div>
      </div>
    </>
  )
}
