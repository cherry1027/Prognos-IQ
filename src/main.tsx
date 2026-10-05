import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Inputs = {
  criticality: number; data: number; history: number; physics: number;
  safety: number; interpretability: number; compute: number; rul: number;
};

const FACTORS: { key: keyof Inputs; label: string }[] = [
  { key: "criticality", label: "Asset criticality" },
  { key: "data", label: "Sensor-data availability" },
  { key: "history", label: "Historical failure data" },
  { key: "physics", label: "Physics-model availability" },
  { key: "safety", label: "Safety impact" },
  { key: "interpretability", label: "Interpretability requirement" },
  { key: "compute", label: "Compute budget" },
  { key: "rul", label: "RUL requirement" },
];

const STRATEGIES = [
  { name: "Heuristic / threshold", short: "Threshold", color: "#8295a2", map: [92, 24], weights: [.25,.10,.04,.12,.16,.17,.13,.03], maturity: "High", data: "Low", strength: "Fast, transparent alerts", limitation: "Weak long-horizon prediction", requirement: "Limits and expert rules", applicability: "Stable, well-understood failure modes" },
  { name: "Statistical", short: "Statistical", color: "#3678a5", map: [74, 53], weights: [.16,.22,.20,.07,.11,.11,.09,.04], maturity: "High", data: "Medium", strength: "Reliable trend and uncertainty", limitation: "Limited nonlinear behavior", requirement: "Clean history and baselines", applicability: "Repeatable degradation patterns" },
  { name: "Physics-based", short: "Physics-based", color: "#009a9f", map: [88, 72], weights: [.13,.10,.04,.20,.18,.18,.07,.10], maturity: "High", data: "Low–medium", strength: "Causal and explainable", limitation: "Costly model calibration", requirement: "Failure physics and parameters", applicability: "Safety-critical engineered assets" },
  { name: "AI / ML", short: "AI / ML", color: "#6557b7", map: [37, 89], weights: [.07,.27,.25,.02,.08,.03,.14,.14], maturity: "Medium", data: "High", strength: "Learns complex signatures", limitation: "Opaque outside training range", requirement: "Large labeled datasets", applicability: "Sensor-rich fleets" },
  { name: "Hybrid physics + AI", short: "Hybrid", color: "#e77425", map: [65, 96], weights: [.09,.14,.08,.18,.16,.14,.06,.15], maturity: "Emerging", data: "Medium–high", strength: "High prediction with constraints", limitation: "Highest integration complexity", requirement: "Physics model plus operating data", applicability: "Critical assets needing RUL" },
];

const MATRIX = [
  ["Threshold", "Low", "Low", "Very high", "Low", "High", "Low"],
  ["Statistical", "Medium", "Medium", "High", "Medium", "High", "Low–medium"],
  ["Physics-based", "High", "Low–medium", "Very high", "High", "High", "Medium"],
  ["AI / ML", "High", "Very high", "Low", "High", "Medium", "High"],
  ["Hybrid", "Very high", "High", "High", "Very high", "Emerging", "High"],
];

const ASSETS = ["Gas turbine", "Steam turbine", "Bearing", "Pump", "Truck tire", "Aircraft engine"];
const initial: Inputs = { criticality: 88, data: 78, history: 64, physics: 84, safety: 91, interpretability: 82, compute: 58, rul: 100 };

function scores(inputs: Inputs) {
  return STRATEGIES.map((strategy) => {
    const contributions = FACTORS.map((factor, i) => ({ label: factor.label, value: Math.round(inputs[factor.key] * strategy.weights[i]) }));
    return { ...strategy, contributions, score: contributions.reduce((sum, item) => sum + item.value, 0) };
  }).sort((a, b) => b.score - a.score);
}

function App() {
  const [page, setPage] = useState(location.pathname.includes("case-study") ? "case" : "selector");
  const [asset, setAsset] = useState("Gas turbine");
  const [inputs, setInputs] = useState(initial);
  const ranking = useMemo(() => scores(inputs), [inputs]);

  const navigate = (next: "selector" | "case") => {
    setPage(next);
    history.pushState({}, "", next === "selector" ? "/" : "/case-study");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onPop = () => setPage(location.pathname.includes("case-study") ? "case" : "selector");
    addEventListener("popstate", onPop);
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: unknown) => unknown } }).modelContext;
    const lifecycle = new AbortController();
    if (modelContext?.registerTool) {
      try {
        void Promise.resolve(modelContext.registerTool({
          name: "configure_maintenance_strategy",
          title: "Configure maintenance strategy",
          description: "Update the visible PrognosIQ strategy inputs and return the deterministic recommendation.",
          inputSchema: { type: "object", properties: { asset: { type: "string", enum: ASSETS }, data: { type: "number", minimum: 0, maximum: 100 }, physics: { type: "number", minimum: 0, maximum: 100 }, safety: { type: "number", minimum: 0, maximum: 100 } }, additionalProperties: false },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (value: { asset?: string; data?: number; physics?: number; safety?: number }) => {
            if (value.asset && ASSETS.includes(value.asset)) setAsset(value.asset);
            const next = { ...inputs, data: value.data ?? inputs.data, physics: value.physics ?? inputs.physics, safety: value.safety ?? inputs.safety };
            setInputs(next); setPage("selector");
            return { recommendedStrategy: scores(next)[0].name, score: scores(next)[0].score, synthetic: true };
          },
        }, { signal: lifecycle.signal }));
      } catch { /* Optional browser capability. */ }
    }
    return () => { removeEventListener("popstate", onPop); lifecycle.abort(); };
  }, []);

  return <div className="app">
    <Header page={page} navigate={navigate} />
    {page === "selector" ? <SelectorPage asset={asset} setAsset={setAsset} inputs={inputs} setInputs={setInputs} ranking={ranking} navigate={navigate} /> : <CaseStudyPage navigate={navigate} />}
    <Footer />
  </div>;
}

function Header({ page, navigate }: { page: string; navigate: (page: "selector" | "case") => void }) {
  return <header className="topbar"><div className="topbar-inner">
    <button className="brand" onClick={() => navigate("selector")}><span className="brand-mark"><span /></span><span><strong>PrognosIQ</strong><small>Predictive Maintenance Strategy Advisor</small></span></button>
    <nav aria-label="Primary navigation"><button className={page === "selector" ? "active" : ""} onClick={() => navigate("selector")}>Strategy selector</button><button className={page === "case" ? "active" : ""} onClick={() => navigate("case")}>Degradation case study</button></nav>
    <span className="synthetic-status"><i /> Synthetic research model</span>
  </div></header>;
}

function SelectorPage({ asset, setAsset, inputs, setInputs, ranking, navigate }: { asset: string; setAsset: (asset: string) => void; inputs: Inputs; setInputs: React.Dispatch<React.SetStateAction<Inputs>>; ranking: ReturnType<typeof scores>; navigate: (page: "selector" | "case") => void }) {
  const winner = ranking[0];
  return <main className="page shell">
    <div className="page-heading"><div><p className="eyebrow">01 / Strategy selector</p><h1>Find the right prognostics approach</h1><p>Tune asset conditions to compare five strategies with a transparent, deterministic scoring model.</p></div><span className="method-pill">✓ Methodology mode · no model training</span></div>
    <div className="selector-layout">
      <aside className="card controls-card"><div className="card-heading"><span className="icon-box">▦</span><div><h2>Asset profile</h2><p>Set decision conditions</p></div></div>
        <label className="field-label" htmlFor="asset">Asset type</label><select id="asset" value={asset} onChange={e => setAsset(e.target.value)}>{ASSETS.map(a => <option key={a}>{a}</option>)}</select>
        {FACTORS.slice(0, 7).map(f => <RangeControl key={f.key} label={f.label} value={inputs[f.key]} onChange={value => setInputs(v => ({ ...v, [f.key]: value }))} />)}
        <div className="switch-row"><div><strong>RUL prediction</strong><small>Remaining-useful-life output required</small></div><button role="switch" aria-checked={inputs.rul > 50} className={inputs.rul > 50 ? "switch on" : "switch"} onClick={() => setInputs(v => ({ ...v, rul: v.rul > 50 ? 20 : 100 }))}><span /></button></div>
      </aside>
      <section className="selector-results">
        <div className="card recommendation"><div className="rec-copy"><span className="rec-label">Recommended strategy</span><p>Best fit for {asset.toLowerCase()}</p><h2>{winner.name}</h2><div className="score-big">{winner.score}<small>/ 100 suitability</small></div><p className="rec-summary">Balances forecast capability, engineering constraints and decision transparency for the selected operating context.</p><button className="light-button" onClick={() => navigate("case")}>Open degradation case study <span>↗</span></button></div>
          <div className="contribution-panel"><p className="mini-title">Why this recommendation</p>{winner.contributions.slice().sort((a,b) => b.value-a.value).slice(0,5).map(c => <div className="contribution" key={c.label}><span>{c.label}</span><div><i style={{ width: `${Math.min(100, c.value * 4)}%` }} /></div><strong>+{c.value}</strong></div>)}<small>Contributions are rounded weighted points. Total score is deterministic.</small></div>
        </div>
        <div className="card ranking-card"><div className="section-head"><div><p className="eyebrow">Weighted suitability</p><h2>Strategy scores</h2></div><span>0—100 index</span></div>{ranking.map((s, i) => <div className="rank-row" key={s.name}><span className={i === 0 ? "rank-number first" : "rank-number"}>{String(i+1).padStart(2,"0")}</span><div className="rank-name"><strong>{s.name}</strong><small>{i === 0 ? "Recommended fit" : "Alternative approach"}</small></div><div className="bar"><i style={{ width: `${s.score}%`, background: s.color }} /></div><b>{s.score}</b></div>)}</div>
        <div className="split-row">
          <div className="card strategy-map"><div className="section-head"><div><p className="eyebrow">Strategy map</p><h2>Interpretability vs prediction capability</h2></div></div><div className="map-area"><span className="axis-y">Prediction capability</span><span className="axis-x">Interpretability</span>{STRATEGIES.map(s => <div className="map-dot" key={s.name} style={{ left: `${s.map[0]}%`, bottom: `${s.map[1]}%`, background: s.color }}><span>{s.short}</span></div>)}</div></div>
          <div className="card logic-card"><p className="eyebrow">Model logic</p><h2>How scoring works</h2><p>Each input is normalized from 0–100 and multiplied by a strategy-specific weight. The highest total is recommended; ties favor interpretability.</p><div className="formula"><span>Σ</span><code>input × strategy weight</code></div><p className="note">Synthetic decision model—not an asset diagnostic.</p></div>
        </div>
        <div className="approaches"><div className="section-head"><div><p className="eyebrow">Approach library</p><h2>Strengths, limits and readiness</h2></div></div><div className="approach-grid">{STRATEGIES.map(s => <article className="approach-card" key={s.name} style={{ borderTopColor: s.color }}><div><h3>{s.name}</h3><span>{s.maturity} maturity</span></div><dl><dt>Strength</dt><dd>{s.strength}</dd><dt>Limitation</dt><dd>{s.limitation}</dd><dt>Data requirement</dt><dd>{s.data} · {s.requirement}</dd><dt>Applicability</dt><dd>{s.applicability}</dd></dl></article>)}</div></div>
      </section>
    </div>
  </main>;
}

function RangeControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="range-control"><div><label>{label}</label><output>{value}%</output></div><input aria-label={label} type="range" min="0" max="100" value={value} onChange={e => onChange(Number(e.target.value))} /></div>;
}

function CaseStudyPage({ navigate }: { navigate: (page: "selector" | "case") => void }) {
  const [data, setData] = useState(72); const [physics, setPhysics] = useState(82); const [safety, setSafety] = useState(88);
  const scenario = useMemo(() => scores({ ...initial, data, physics, safety }), [data, physics, safety]);
  const recommended = scenario[0];
  const reason = recommended.short === "AI / ML" ? "Dense sensor history increases the value of nonlinear pattern learning." : recommended.short === "Threshold" ? "Limited evidence favors a transparent, low-data rule system." : recommended.short === "Physics-based" ? "Strong physical knowledge and safety needs reward causal explainability." : recommended.short === "Hybrid" ? "Data and physical knowledge are both sufficient for a constrained RUL model." : "Moderate data and model availability favor stable statistical trends.";
  const signalCards = [{ label: "Temperature", value: "574 °C", delta: "+18.4" },{ label: "Vibration", value: "5.8 mm/s", delta: "+1.2" },{ label: "Pressure", value: "16.9 bar", delta: "−0.8" },{ label: "Load", value: "86 %", delta: "+3.1" },{ label: "Efficiency", value: "89.4 %", delta: "−2.6" },{ label: "Operating hours", value: "6,420 h", delta: "+480" }];
  return <main className="page shell">
    <div className="page-heading"><div><p className="eyebrow">02 / Degradation case study</p><h1>Synthetic gas turbine degradation outlook</h1><p>A lightweight condition-health scenario showing history, current deterioration and a constrained forecast.</p></div><button className="outline-button" onClick={() => navigate("selector")}>← Back to strategy selector</button></div>
    <div className="case-banner"><strong>100% synthetic industrial data</strong><span>Illustrative signals only · not calibrated to any real asset or fleet</span></div>
    <section className="metric-grid"><Metric label="Current health" value="63" suffix="%" hint="synthetic condition index" tone="teal"/><Metric label="Degradation rate" value="0.42" suffix="% / day" hint="synthetic 30-day slope"/><Metric label="Estimated RUL" value="74" suffix="days" hint="synthetic point estimate" tone="orange"/><Metric label="Confidence" value="82" suffix="%" hint="synthetic interval confidence"/><Metric label="Maintenance window" value="28–46" suffix="days" hint="synthetic planning window" tone="dark"/></section>
    <section className="card chart-card"><div className="section-head"><div><p className="eyebrow">Condition health index · synthetic</p><h2>Historical health and degradation forecast</h2></div><div className="legend"><span className="hist">Historical</span><span className="curr">Current</span><span className="forecast">Forecast</span><span className="threshold">Failure threshold</span></div></div><HealthChart /><div className="chart-callout"><span>Today · 6,420 h</span><strong>Forecast crosses threshold near day 74</strong><span>90% synthetic interval: 61–92 days</span></div></section>
    <section className="signal-grid">{signalCards.map((s,i) => <article className="card signal-card" key={s.label}><div><p>{s.label} <em>SYNTHETIC</em></p><strong>{s.value}</strong><span className={s.delta.startsWith("−") ? "down" : "up"}>{s.delta} / 30d</span></div><Spark direction={i === 2 || i === 4 ? "down" : "up"} /></article>)}</section>
    <section className="case-split">
      <div className="card matrix-card"><div className="section-head"><div><p className="eyebrow">Method comparison</p><h2>Prognostics strategy matrix</h2></div></div><div className="table-wrap"><table><thead><tr>{["Approach","RUL capability","Data requirement","Interpretability","Complexity","Maturity","Compute cost"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{MATRIX.map(row => <tr key={row[0]}>{row.map((cell,i) => <td key={i}><span className={i === 0 ? "method-name" : badgeTone(cell)}>{cell}</span></td>)}</tr>)}</tbody></table></div></div>
      <div className="card window-card"><p className="eyebrow">Maintenance recommendation</p><h2>Inspect within 28–46 days</h2><p>Prioritize hot-section inspection and vibration review before the forecast enters the high-risk band.</p><div className="timeline"><i/><span className="today">Today</span><span className="window">Preferred window</span><span className="risk">Threshold</span></div><ul><li>Confirm vibration sensor calibration</li><li>Review thermal efficiency loss</li><li>Plan inspection before synthetic day 46</li></ul></div>
    </section>
    <section className="card change-card"><div className="change-copy"><p className="eyebrow">Sensitivity explorer</p><h2>What changes the recommendation?</h2><p>Adjust the three most influential evidence conditions. The result updates with the same deterministic method used on page one.</p><div className="change-result"><span style={{ background: recommended.color }} /><div><small>Recommended strategy</small><strong>{recommended.name} · {recommended.score}/100</strong><p>{reason}</p></div></div></div><div className="change-controls"><RangeControl label="Data availability" value={data} onChange={setData}/><RangeControl label="Physics-model availability" value={physics} onChange={setPhysics}/><RangeControl label="Safety criticality" value={safety} onChange={setSafety}/><div className="runner-up"><span>Next-best alternative</span><strong>{scenario[1].name} · {scenario[1].score}</strong></div></div></section>
  </main>;
}

function Metric({ label, value, suffix, hint, tone = "default" }: { label: string; value: string; suffix: string; hint: string; tone?: string }) { return <article className={`metric ${tone}`}><p>{label} <em>SYNTHETIC</em></p><div><strong>{value}</strong><span>{suffix}</span></div><small>{hint}</small></article>; }

function HealthChart() {
  const points = Array.from({ length: 41 }, (_, i) => { const x = i * 2.5; const health = i < 24 ? 98 - i * .72 + Math.sin(i*.7)*1.5 : 81 - (i-24)*2.92 + Math.sin(i*.6); return [x, Math.max(24, health)] as const; });
  const path = (slice: typeof points) => slice.map(([x,y]) => `${44 + x*8.7},${24 + (100-y)*2.25}`).join(" ");
  return <svg className="health-chart" viewBox="0 0 960 300" role="img" aria-label="Synthetic condition health declining from 98 percent to the 35 percent failure threshold">
    <defs><linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e77425" stopOpacity=".22"/><stop offset="1" stopColor="#e77425" stopOpacity="0"/></linearGradient></defs>
    {[0,25,50,75,100].map(v => <g key={v}><line x1="44" x2="914" y1={249-v*2.25} y2={249-v*2.25} stroke="#e5ecef"/><text x="8" y={253-v*2.25} fontSize="11" fill="#788b96">{v}%</text></g>)}
    <rect x="566" y="24" width="348" height="225" fill="#f8fafb"/><line x1="566" x2="566" y1="24" y2="249" stroke="#1d8c92" strokeDasharray="4 4"/>
    <line x1="44" x2="914" y1={249-35*2.25} y2={249-35*2.25} stroke="#ca4b4d" strokeWidth="2" strokeDasharray="6 5"/><text x="785" y={242-35*2.25} fill="#b63e42" fontSize="11">FAILURE THRESHOLD · 35%</text>
    <polyline points={path(points.slice(0,24))} fill="none" stroke="#397aa2" strokeWidth="3" strokeLinejoin="round"/>
    <polyline points={path(points.slice(23,29))} fill="none" stroke="#009a9f" strokeWidth="4" strokeLinejoin="round"/>
    <polyline points={path(points.slice(28))} fill="none" stroke="#e77425" strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="round"/>
    <path d={`M${path(points.slice(28))} L914,274 L653,274 Z`} fill="url(#forecastFill)" opacity=".7"/>
    <circle cx="653" cy={24+(100-points[28][1])*2.25} r="6" fill="#fff" stroke="#009a9f" strokeWidth="3"/><text x="42" y="285" fontSize="11" fill="#788b96">−120 days</text><text x="548" y="285" fontSize="11" fill="#087b81">TODAY</text><text x="870" y="285" fontSize="11" fill="#788b96">+90 days</text>
  </svg>;
}

function Spark({ direction }: { direction: "up" | "down" }) { const p = direction === "up" ? "2,36 18,31 34,34 50,24 66,26 82,13 98,8" : "2,8 18,13 34,11 50,22 66,20 82,31 98,35"; return <svg viewBox="0 0 100 42" aria-hidden="true"><polyline points={p} fill="none" stroke={direction === "up" ? "#d36e2d" : "#16878b"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function badgeTone(value: string) { if (["Very high","High"].includes(value)) return "badge high"; if (["Low","Low–medium"].includes(value)) return "badge low"; return "badge medium"; }

function Footer() { return <footer><strong>PrognosIQ</strong><p>Independent research prototype using synthetic industrial data. Results do not represent Siemens Energy assets, measurements, models or proprietary information.</p><span>Methodology demonstration only · No diagnostic use</span></footer>; }

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
