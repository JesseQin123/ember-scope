import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Battery,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Satellite as Drone,
  Flame,
  Focus,
  Layers,
  Map,
  Maximize2,
  Moon,
  Mountain,
  Pause,
  Plane,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  SkipBack,
  SkipForward,
  Sun,
  TreePine,
  Truck,
  Users,
  Wind,
  X,
} from "lucide-react";
import { Scene } from "./Scene";
import { useStore, pageHidden, type Layer } from "./store";
import {
  checkpoints,
  clockLabel,
  archiveLabel,
  archiveDay,
  fireSpine,
  DRONE_IDS,
  droneNames,
  eventLog,
  missions,
  resourceMetrics,
  resources,
  sampleDrone,
  sampleResource,
  sampleTerrain,
  selectMetrics,
  timeLabel,
} from "./simulation";
const set = useStore.setState;
function Header() {
  const s = useStore();
  return (
    <header>
      <div className="brand">
        <span className="brand-mark">
          <Mountain size={27} />
          <Flame size={14} />
        </span>
        <strong>Ember Scope</strong>
      </div>
      <span className="subtitle">Wildfire Forensic Analysis</span>
      <div className="incident-name">
        Aster Ridge <span>Demo incident</span>
      </div>
      <span className="date">Day 01–05 · Synthetic archive</span>
      <nav aria-label="Workspace mode">
        {(["incident", "drones", "resources"] as const).map((m, i) => (
          <button
            key={m}
            className={s.mode === m ? "active" : ""}
            onClick={() => s.setMode(m)}
          >
            {i === 0 ? <Map /> : i === 1 ? <Drone /> : <Truck />}
            {m[0].toUpperCase() + m.slice(1)}
            {i > 0 && <b className="count">{i === 1 ? 6 : 13}</b>}
          </button>
        ))}
      </nav>
      <span className="demo-badge">SYNTHETIC DEMO</span>
      <button
        className="icon-btn"
        aria-label="Toggle color theme"
        onClick={() => set({ dark: !s.dark })}
      >
        {s.dark ? <Sun /> : <Moon />}
      </button>
      <button
        className="icon-btn"
        aria-label="Data and keyboard help"
        onClick={() => set({ info: true })}
      >
        <CircleHelp />
      </button>
    </header>
  );
}
const layerItems: Array<{ key: Layer; title: string; style: string }> = [
  { key: "trees", title: "Forest canopy", style: "forest" },
  { key: "imagery", title: "Terrain texture", style: "texture" },
  { key: "coverage", title: "Burn scar & active area", style: "burn" },
  { key: "effects", title: "Fire effects", style: "fire" },
  { key: "history", title: "Past fire perimeters", style: "history" },
  { key: "drones", title: "Drone markers", style: "drone" },
  { key: "tracks", title: "Recorded flight paths", style: "tracks" },
  { key: "resources", title: "Response resources", style: "resource" },
];
function IncidentPanel() {
  const s = useStore(),
    m = useMemo(() => selectMetrics(s.time), [s.time]);
  const [tab, setTab] = useState("Layers");
  return (
    <>
      <div className="panel-tabs">
        {["Layers", "Analysis", "Notes"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Layers" ? (
        <section className="layer-list">
          <div className="layer-row fixed">
            <span className="check">✓</span>
            <span className="swatch terrain" />
            <span>Terrain (3D)</span>
            <small>100%</small>
          </div>
          {layerItems.map((l) => (
            <label key={l.key} className="layer-row">
              <input
                type="checkbox"
                checked={s.layers[l.key]}
                onChange={() => s.toggleLayer(l.key)}
              />
              <span className={"swatch " + l.style} />
              <span>{l.title}</span>
              <small>{s.layers[l.key] ? "ON" : "OFF"}</small>
            </label>
          ))}
          <label className="opacity-row">
            Fire overlay opacity <output>{Math.round(s.opacity * 100)}%</output>
            <input
              aria-label="Fire overlay opacity"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={s.opacity}
              onChange={(e) => set({ opacity: +e.target.value })}
            />
          </label>
        </section>
      ) : tab === "Analysis" ? (
        <section className="analysis-copy">
          <h3>Recorded scenario</h3>
          <p>
            Area is measured from the same 128 × 128 coverage grid shown on the
            map.
          </p>
          <dl>
            <dt>Affected cells</dt>
            <dd>{m.affectedCells}</dd>
            <dt>Active cells</dt>
            <dd>{m.activeCells}</dd>
            <dt>Burned cells</dt>
            <dd>{m.burnedCells}</dd>
            <dt>Grid perimeter</dt>
            <dd>{m.perimeter.toFixed(2)} km</dd>
          </dl>
          <button onClick={() => set({ info: true })}>View data methods</button>
        </section>
      ) : (
        <section className="analysis-copy">
          <h3>Analyst notebook</h3>
          <p>Local scratch notes for this session.</p>
          <textarea
            aria-label="Analyst notes"
            value={s.notes}
            onChange={(event) => set({ notes: event.target.value })}
            placeholder="Add an observation…"
            rows={7}
          />
          <small>Notes stay in this tab. No data is transmitted.</small>
        </section>
      )}
      <h3 className="section-heading">
        Incident Overview <span>FICTIONAL</span>
      </h3>
      <section className="panel-card">
        <dl>
          <dt>Incident name</dt>
          <dd>Aster Ridge Demo</dd>
          <dt>Incident ID</dt>
          <dd>DEMO-AR-001</dd>
          <dt>Location</dt>
          <dd>Procedural alpine terrain</dd>
          <dt>Recorded period</dt>
          <dd>Day 01–05 · 96 hours</dd>
          <dt>Current time</dt>
          <dd>{archiveLabel(s.time)}</dd>
          <dt>Affected area</dt>
          <dd className="metric-area">{m.area.toFixed(2)} ha</dd>
          <dt>Active area</dt>
          <dd>{m.active.toFixed(2)} ha</dd>
          <dt>Grid perimeter</dt>
          <dd>{m.perimeter.toFixed(2)} km</dd>
          <dt>Available drones</dt>
          <dd>{m.availableDrones} / 6</dd>
          <dt>Source</dt>
          <dd>
            <span className="dot" /> Synthetic recording
          </dd>
        </dl>
      </section>
      <h3 className="section-heading">
        Scenario Conditions <span>SCRIPTED</span>
      </h3>
      <section className="weather-grid">
        <div>
          <Wind />
          <span>
            Wind<b>12 km/h</b>
            <small>SW → NE</small>
          </span>
        </div>
        <div>
          <Mountain />
          <span>
            Domain<b>4 × 4</b>
            <small>kilometers</small>
          </span>
        </div>
        <div>
          <TreePine />
          <span>
            Terrain<b>{s.relief.toFixed(1)}×</b>
            <small>visual relief</small>
          </span>
        </div>
      </section>
      <p className="source-note">Fictional incident · All data simulated</p>
    </>
  );
}
function Telemetry({ id }: { id: string }) {
  const s = useStore(),
    d = sampleDrone(id, s.time),
    i = DRONE_IDS.indexOf(id);
  return (
    <>
      <h3 className="section-heading">
        {id}{" "}
        <span className={d.link === "stale" ? "warn" : "green"}>
          {d.link === "stale" ? "LAST KNOWN" : d.mission.toUpperCase()}
        </span>
      </h3>
      <section className="panel-card">
        <div className="telemetry-grid">
          <div>
            Altitude<strong>{Math.round(d.altitudeAglM)}</strong>
            <small>m AGL</small>
          </div>
          <div>
            Ground speed<strong>{d.speedMps.toFixed(1)}</strong>
            <small>m/s</small>
          </div>
          <div>
            Heading<strong>{Math.round(d.headingDeg) % 360}°</strong>
            <small>from north</small>
          </div>
          <div>
            Battery<strong>{Math.round(d.batteryPct)}%</strong>
            <small>simulated</small>
          </div>
          <div>
            Connection
            <strong className="small-value">
              {d.link === "stale" ? "LOST" : "OK"}
            </strong>
            <small>
              {d.age ? `${d.age * 96}s archive age` : "current sample"}
            </small>
          </div>
          <div>
            Sample time
            <strong className="small-value">{timeLabel(d.sampledAtSec)}</strong>
            <small>replay coordinate</small>
          </div>
        </div>
        <dl>
          <dt>Aircraft</dt>
          <dd>{droneNames[i]} · Quadcopter</dd>
          <dt>Mission</dt>
          <dd>{missions[i]}</dd>
          <dt>Sensor</dt>
          <dd>{s.ir ? "IR visualization" : "EO visualization"}</dd>
          <dt>Local position</dt>
          <dd>
            {Math.round(d.x)} E / {Math.round(-d.z)} N
          </dd>
          <dt>Ground elevation</dt>
          <dd>{Math.round(d.groundElevationM)} m</dd>
        </dl>
        <div className="action-row">
          <button
            className={s.camera === "follow" ? "accent" : ""}
            onClick={() =>
              set({
                camera: s.camera === "follow" ? "orbit" : "follow",
                map2d: false,
              })
            }
          >
            <Focus /> Follow
          </button>
          <button
            className={s.camera === "cockpit" ? "accent" : ""}
            onClick={() =>
              set({
                camera: s.camera === "cockpit" ? "orbit" : "cockpit",
                map2d: false,
              })
            }
          >
            Full camera
          </button>
          <button
            className={s.thermal ? "accent" : ""}
            onClick={() => set({ thermal: !s.thermal })}
          >
            Thermal
          </button>
        </div>
        {d.link === "stale" && (
          <p className="warning">
            Telemetry interrupted. Position and camera frozen at T+29:59. Data
            age: {d.age * 96}s in the compressed archive.
          </p>
        )}
        {d.mission === "docked" && (
          <p className="warning">Docked at field base. Camera unavailable.</p>
        )}
      </section>
    </>
  );
}
function DronePanel() {
  const s = useStore(),
    fleet = DRONE_IDS.map((id) => sampleDrone(id, s.time));
  return (
    <>
      <h3 className="section-heading fleet-title">
        Drone Fleet{" "}
        <span>
          {fleet.filter((d) => d.mission !== "docked").length} of 6 airborne
        </span>
      </h3>
      <div className="entity-list">
        {fleet.map((d, i) => (
          <button
            key={d.id}
            onClick={() => s.select(d.id)}
            className={"entity-row " + (s.selected === d.id ? "selected" : "")}
            aria-label={`Select ${d.id}`}
          >
            <Drone />
            <div>
              <strong>
                {d.id} <span>{droneNames[i]}</span>
              </strong>
              <small>{missions[i]}</small>
            </div>
            <div className="entity-status">
              <b className={d.link === "stale" ? "warn" : ""}>
                {d.link === "stale"
                  ? "Link lost"
                  : d.mission === "docked"
                    ? "Docked"
                    : d.mission === "returning"
                      ? "Returning"
                      : "Patrol"}
              </b>
              <span>{Math.round(d.altitudeAglM)} m AGL</span>
            </div>
            <div className="battery">
              <i style={{ width: d.batteryPct + "%" }} />
              <small>{Math.round(d.batteryPct)}%</small>
            </div>
          </button>
        ))}
      </div>
      {s.selected ? (
        <Telemetry id={s.selected} />
      ) : (
        <>
          <h3 className="section-heading">Fleet Overview</h3>
          <section className="panel-card">
            <div className="empty-tip">
              <Crosshair />
              <p>
                Select an aircraft on the map or in the list to open its
                simulated camera and telemetry.
              </p>
            </div>
            <div className="telemetry-grid">
              <div>
                Airborne
                <strong>
                  {fleet.filter((d) => d.mission !== "docked").length}
                </strong>
                <small>of six aircraft</small>
              </div>
              <div>
                Avg. battery
                <strong>
                  {Math.round(fleet.reduce((n, d) => n + d.batteryPct, 0) / 6)}%
                </strong>
                <small>deterministic</small>
              </div>
              <div>
                Connected
                <strong>
                  {fleet.filter((d) => d.link === "connected").length}
                </strong>
                <small>simulated links</small>
              </div>
            </div>
          </section>
        </>
      )}
      <p className="source-note">Simulated fleet · no aircraft control</p>
    </>
  );
}
function ResourcesPanel() {
  const s = useStore(),
    m = resourceMetrics(s.time),
    r = s.selected ? sampleResource(s.selected, s.time) : null;
  return (
    <>
      <h3 className="section-heading">
        Resources <span>13 synthetic units</span>
      </h3>
      <section className="resource-totals">
        <div>
          <strong>6 / 6</strong>
          <small>aircraft</small>
        </div>
        <div>
          <strong>{(m.dropped / 1000).toFixed(1)}k</strong>
          <small>gal dropped</small>
        </div>
        <div>
          <strong>{m.line}</strong>
          <small>m line</small>
        </div>
        <div>
          <strong>{m.personnel}</strong>
          <small>personnel</small>
        </div>
      </section>
      {["aircraft", "engine", "crew"].map((type) => (
        <div key={type}>
          <h4 className="list-heading">
            {type === "aircraft"
              ? "AIRCRAFT"
              : type === "engine"
                ? "ENGINES & TENDERS"
                : "GROUND CREWS"}
          </h4>
          <div className="entity-list">
            {resources
              .filter((r) => r.type === type)
              .map((r) => {
                const d = sampleResource(r.id, s.time);
                return (
                  <button
                    key={r.id}
                    aria-label={`Select ${r.id}`}
                    className={
                      "entity-row resource-row " +
                      (s.selected === r.id ? "selected" : "")
                    }
                    onClick={() => s.select(r.id)}
                  >
                    {type === "aircraft" ? (
                      <Plane />
                    ) : type === "engine" ? (
                      <Truck />
                    ) : (
                      <Users />
                    )}
                    <div>
                      <strong>
                        {r.id} <span>{r.name}</span>
                      </strong>
                      <small>
                        <span className="dot" />
                        {d.status}
                      </small>
                    </div>
                    <span>
                      {Math.round(d.load)}{" "}
                      {type === "aircraft"
                        ? "gal"
                        : type === "crew"
                          ? "pers."
                          : ""}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
      {r ? (
        <>
          <h3 className="section-heading">
            {r.id} · {r.name}
          </h3>
          <section className="panel-card">
            <div className="telemetry-grid">
              <div>
                Ground speed<strong>{r.speedMps.toFixed(1)}</strong>
                <small>m/s</small>
              </div>
              <div>
                Altitude<strong>{r.altitudeAglM}</strong>
                <small>m AGL</small>
              </div>
              <div>
                Heading<strong>{Math.round(r.headingDeg) % 360}°</strong>
                <small>from north</small>
              </div>
            </div>
            <dl>
              <dt>Assignment</dt>
              <dd>{r.status}</dd>
              <dt>Local X / Z</dt>
              <dd>
                {Math.round(r.x)} / {Math.round(r.z)} m
              </dd>
              <dt>Data source</dt>
              <dd>Scripted resource path</dd>
            </dl>
            <div className="action-row">
              <button
                className={s.camera === "follow" ? "accent" : ""}
                onClick={() => set({ camera: "follow", map2d: false })}
              >
                Chase
              </button>
              <button
                className={s.camera === "cockpit" ? "accent" : ""}
                onClick={() => set({ camera: "cockpit", map2d: false })}
              >
                Cockpit
              </button>
              <button onClick={s.resetView}>Overview</button>
            </div>
          </section>
        </>
      ) : (
        <section className="panel-card empty-tip">
          <Plane />
          <p>
            Select a resource for chase or cockpit view. All movements and
            operations are scripted.
          </p>
        </section>
      )}
      <p className="source-note">
        Synthetic response · no dispatch capabilities
      </p>
    </>
  );
}
function Preview() {
  const s = useStore();
  if (!s.selected?.startsWith("KITE")) return null;
  const d = sampleDrone(s.selected, s.time);
  return (
    <div
      className={
        "camera-preview " +
        (s.ir ? "ir " : "") +
        (s.thermal ? "thermal " : "") +
        (d.mission === "docked" ? "docked" : "")
      }
    >
      <div id="preview-mount" />
      <div className="camera-hud">
        <div>
          <span className="rec-dot" /> SIMULATED VIEW{" "}
          <span className="hud-right">{archiveLabel(d.sampledAtSec)}</span>
        </div>
        <p>
          {s.selected} /{" "}
          {d.link === "stale"
            ? "LAST KNOWN"
            : s.thermal
              ? "THERMAL · RELATIVE HEAT"
              : s.ir
                ? "IR · WHITE HOT"
                : "EO OPTICAL"}
        </p>
        <div className="crosshair" />
        <div className="hud-bottom">
          <span>
            ALT {Math.round(d.altitudeAglM)} M AGL
            <br />
            GS {d.speedMps.toFixed(1)} M/S
            <br />
            HDG {Math.round(d.headingDeg) % 360}°
          </span>
          <span>
            BAT {Math.round(d.batteryPct)}%<br />
            LOCAL TERRAIN
            <br />
            {s.thermal ? "THERMAL" : s.ir ? "IR" : "EO"} ·{" "}
            {Math.round(52 / s.cameraZoom)}° FOV
          </span>
        </div>
      </div>
      {(s.ir || s.thermal) && (
        <div className={"heat-scale " + (s.thermal ? "color" : "mono")}>
          <span>COOL</span>
          <i />
          <span>HOT</span>
          <small>RELATIVE · NOT °C</small>
        </div>
      )}
      {d.link === "stale" && (
        <div className="camera-stale">
          LAST KNOWN · T+29:59 · {d.age * 96}s archive age
        </div>
      )}
      {d.mission === "docked" && (
        <div className="camera-stale">DOCKED · CAMERA UNAVAILABLE</div>
      )}
      <div className="camera-controls">
        <strong>{s.selected}</strong>
        <button
          className={!s.ir ? "active" : ""}
          onClick={() => set({ ir: false, thermal: false })}
        >
          EO
        </button>
        <button
          className={s.ir ? "active" : ""}
          onClick={() => set({ ir: true })}
        >
          IR
        </button>
        <button
          aria-label="Optical zoom"
          title="Cycle camera field of view"
          onClick={() =>
            set({
              cameraZoom: s.cameraZoom === 1 ? 2 : s.cameraZoom === 2 ? 4 : 1,
            })
          }
        >
          {s.cameraZoom}×
        </button>
        <span>SIMULATED</span>
        <button
          aria-label="Full camera view"
          onClick={() => set({ camera: "cockpit", map2d: false })}
        >
          <Maximize2 size={13} />
        </button>
        <button aria-label="Close camera" onClick={() => s.select(null)}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
function Chart({
  title,
  unit,
  kind,
  color,
}: {
  title: string;
  unit: string;
  kind: string;
  color: string;
}) {
  const s = useStore();
  const get = (t: number) => {
    if (kind === "area") return selectMetrics(t).area;
    if (kind === "spread")
      return (
        (selectMetrics(t).area - selectMetrics(Math.max(0, t - 60)).area) * 15
      );
    if (kind === "elevation") {
      const p = fireSpine(t);
      return sampleTerrain(p.x, p.z);
    }
    if (kind === "alt")
      return sampleDrone(
        s.selected?.startsWith("KITE") ? s.selected : "KITE-01",
        t,
      ).altitudeAglM;
    if (kind === "battery")
      return sampleDrone(
        s.selected?.startsWith("KITE") ? s.selected : "KITE-01",
        t,
      ).batteryPct;
    if (kind === "speed")
      return sampleDrone(
        s.selected?.startsWith("KITE") ? s.selected : "KITE-01",
        t,
      ).speedMps;
    return resourceMetrics(t)[kind as "dropped" | "line" | "personnel"];
  };
  const values = useMemo(
    () => Array.from({ length: 61 }, (_, i) => get(i * 60)),
    [kind, s.selected],
  );
  const max = Math.max(...values) * 1.15 || 1,
    current = get(s.time);
  const points = values
    .map((v, i) => ({ t: i * 60, v }))
    .filter((p) => p.t < s.time);
  points.push({ t: s.time, v: current });
  const path = points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${28 + (p.t / 3600) * 302},${86 - (p.v / max) * 65}`,
      )
      .join(" "),
    x = 28 + (s.time / 3600) * 302,
    y = 86 - (current / max) * 65;
  return (
    <div className="chart">
      <div className="chart-title">
        {title} <small>({unit})</small>
        <strong>
          {current.toFixed(kind === "area" || kind === "spread" ? 2 : 0)}
        </strong>
      </div>
      <svg
        viewBox="0 0 345 108"
        preserveAspectRatio="none"
        aria-label={`${title}: ${current.toFixed(2)} ${unit}`}
      >
        <defs>
          <linearGradient id={"gradient-" + kind} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".42" />
            <stop offset="1" stopColor={color} stopOpacity=".08" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line
              x1="28"
              x2="330"
              y1={86 - k * 65}
              y2={86 - k * 65}
              className="chart-grid"
            />
            <text x="24" y={89 - k * 65} textAnchor="end">
              {(max * k).toFixed(max > 5 ? 0 : 1)}
            </text>
          </g>
        ))}
        <path d={`${path} L${x},86 L28,86 Z`} fill={`url(#gradient-${kind})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.4" />
        <line x1={x} x2={x} y1="13" y2="88" className="chart-cursor" />
        <circle cx={x} cy={y} r="3" fill={color} stroke="var(--panel)" />
        {[0, 15, 30, 45, 60].map((m, i) => (
          <text key={m} x={28 + i * 75.5} y="102" textAnchor="middle">
            {`Day ${archiveDay(m * 60)}`}
          </text>
        ))}
      </svg>
    </div>
  );
}
function Timeline() {
  const s = useStore(),
    resume = useRef(false);
  const log =
    s.mode === "resources"
      ? [
          {
            t: 0,
            title: "Resources staged",
            detail: "Six aircraft · seven ground units",
          },
          {
            t: 300,
            title: "Ground teams assigned",
            detail: "52 simulated personnel",
          },
          {
            t: 700,
            title: "First drop pass",
            detail: "Scripted tanker operation",
          },
          {
            t: 1040,
            title: "First fleet cycle complete",
            detail: "15,000 gal simulated release",
          },
          {
            t: 1940,
            title: "Second fleet cycle complete",
            detail: "30,000 gal cumulative",
          },
          {
            t: 2840,
            title: "Third fleet cycle complete",
            detail: "45,000 gal cumulative",
          },
          {
            t: 3600,
            title: "Operations recording ends",
            detail: `${resourceMetrics(3600).dropped.toLocaleString()} gal cumulative`,
          },
        ]
      : eventLog;
  const chartConfig =
    s.mode === "incident"
      ? [
          ["Fire Area", "ha", "area", "#b96543"],
          ["Rate of Spread", "ha/day", "spread", "#ad4c3d"],
          ["Elevation Profile", "m", "elevation", "#647250"],
        ]
      : s.mode === "drones"
        ? [
            ["Altitude", "m AGL", "alt", "#7f866a"],
            ["Ground Speed", "m/s", "speed", "#ae6444"],
            ["Battery", "%", "battery", "#748555"],
          ]
        : [
            ["Retardant Dropped", "gal", "dropped", "#b75545"],
            ["Fire Line Built", "m", "line", "#62634c"],
            ["Personnel Assigned", "people", "personnel", "#6b7d53"],
          ];
  return (
    <footer>
      <div className="timeline-main">
        <div className="timeline-header">
          <b>Timeline</b>
          <span>{archiveLabel(s.time)}</span>
          <small>4-day synthetic archive · compressed replay</small>
        </div>
        <div className="transport-row">
          <div className="transport">
            <button aria-label="Go to start" onClick={s.home}>
              <SkipBack />
            </button>
            <button
              aria-label={
                s.time === 3600 ? "Replay" : s.playing ? "Pause" : "Play"
              }
              className="play-btn"
              onClick={s.play}
            >
              {s.playing ? (
                <Pause />
              ) : s.time === 3600 ? (
                <RotateCcw />
              ) : (
                <Play />
              )}
            </button>
            <button
              aria-label="Next checkpoint"
              onClick={() => {
                s.pause();
                s.setTime(checkpoints.find((t) => t > s.time) ?? 3600);
              }}
            >
              <SkipForward />
            </button>
            <select
              aria-label="Playback speed"
              value={s.rate}
              onChange={(e) => set({ rate: +e.target.value })}
            >
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
            </select>
          </div>
          <div className="scrubber">
            <div className="time-float" style={{ left: `${s.time / 36}%` }}>
              {archiveLabel(s.time)}
            </div>
            <input
              aria-label="Scenario timeline"
              type="range"
              min="0"
              max="3600"
              step="1"
              value={s.time}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                resume.current = s.playing;
                s.pause();
              }}
              onPointerUp={() => {
                if (resume.current && useStore.getState().time < 3600)
                  set({ playing: true });
                resume.current = false;
              }}
              onPointerCancel={() => {
                resume.current = false;
              }}
              onChange={(e) => s.setTime(+e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  s.setTime(
                    s.time +
                      (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 60 : 10),
                  );
                }
              }}
            />
            <div className="timeline-ticks">
              {[0, 450, 900, 1350, 1800, 2250, 2700, 3150, 3600].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    s.pause();
                    s.setTime(t);
                  }}
                >
                  {`D${archiveDay(t)} ${clockLabel(t)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="charts">
          {chartConfig.map(([title, unit, kind, color]) => (
            <Chart key={kind} {...{ title, unit, kind, color }} />
          ))}
        </div>
      </div>
      <aside className="event-log">
        <h3>
          {s.mode === "resources"
            ? "Operations Log"
            : s.mode === "drones"
              ? "Telemetry Events"
              : "Key Events"}
          <span>{log.filter((e) => e.t <= s.time).length}</span>
        </h3>
        {log
          .filter((e) => e.t <= s.time)
          .slice(-4)
          .reverse()
          .map((e) => (
            <button
              onClick={() => {
                s.pause();
                s.setTime(e.t);
              }}
              key={e.t}
            >
              <span className="event-dot" />
              <div>
                <strong>{e.title}</strong>
                <small>{e.detail}</small>
              </div>
              <time>
                D{archiveDay(e.t)} {clockLabel(e.t)}
              </time>
            </button>
          ))}
      </aside>
    </footer>
  );
}
function Info() {
  const close = () => set({ info: false });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>("[role=dialog] button"),
        );
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="About this synthetic demo"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={close}
          autoFocus
          aria-label="Close data information"
        >
          <X />
        </button>
        <div className="eyebrow">EMBER SCOPE / DATA NOTES</div>
        <h1>
          A landscape for exploration.
          <br />A completely synthetic event.
        </h1>
        <p>
          本演示使用程序化地形、脚本火势和模拟遥测。时间、范围和数字均不代表真实事件，不用于预测或应急决策。
        </p>
        <p>
          All aircraft, camera imagery and response resources are simulated.
          EO/IR and Thermal are illustrative visualization modes. There are no
          real sensors, forecasts or aircraft controls.
        </p>
        <div className="info-grid">
          <div>
            <b>One clock</b>
            <p>
              Every position, grid cell, metric and chart is derived from the
              same replay position. Four fictional days are compressed into a
              60-minute replay coordinate; telemetry is scripted for that
              archive, not continuous real aircraft endurance. Rewind to
              reproduce any state.
            </p>
          </div>
          <div>
            <b>Artistic terrain</b>
            <p>
              A seeded mountain ridge field, 4 × 4 km. Vertical relief is
              exaggerated. This is not a geographic elevation model.
            </p>
          </div>
        </div>
        <dl>
          <dt>Space</dt>
          <dd>Play / pause, outside controls</dd>
          <dt>Timeline ← / →</dt>
          <dd>16 archive minutes · Shift for 96 minutes</dd>
          <dt>Mouse drag / wheel</dt>
          <dd>Orbit / zoom · right drag to pan</dd>
          <dt>Playback speed</dt>
          <dd>1× = 16 archive minutes / real second</dd>
        </dl>
        <p className="source-note">
          Independent study inspired by FireTrace by Dilum Sanjaya. No
          affiliation. Original code, geometry and generated terrain texture.
        </p>
        <button className="accent" onClick={close}>
          Explore the scenario
        </button>
      </section>
    </div>
  );
}
export default function App() {
  const s = useStore();
  const [settings, showSettings] = useState(false);
  useEffect(() => {
    let last = performance.now(),
      raf = 0;
    const loop = (n: number) => {
      useStore.getState().tick((n - last) / 1000);
      last = n;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const visibility = () => {
      if (document.hidden) pageHidden();
      last = performance.now();
    };
    const keyboard = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.code === "Space" &&
        !el.closest("input,textarea,select,button,[contenteditable]")
      ) {
        e.preventDefault();
        useStore.getState().play();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyboard);
    (window as any).__ember = {
      get: useStore.getState,
      setTime: (t: number) => useStore.getState().setTime(t),
      set: useStore.setState,
      metrics: selectMetrics,
    };
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  return (
    <div className={"app " + (s.dark ? "dark" : "")}>
      <Header />
      <div className="compact-note">
        Compact overview · open on a larger screen for full terrain controls.
      </div>
      <main>
        <div className="workspace">
          <div className="scene-shell">
            <Scene />
            <div className="map-caption">
              ASTER RIDGE / SYNTHETIC ARCHIVE{" "}
              <span>Fictional incident · All data simulated</span>
            </div>
            <Preview />
            {s.selected && s.camera !== "orbit" && (
              <div className="chase-bar">
                <strong>{s.selected}</strong>
                <span>
                  {s.camera === "cockpit" ? "COCKPIT" : "FOLLOW"} · SIMULATED
                  VIEW
                </span>
                <button
                  onClick={() =>
                    set({
                      camera: s.camera === "cockpit" ? "follow" : "cockpit",
                    })
                  }
                >
                  {s.camera === "cockpit" ? "Chase" : "Cockpit"}
                </button>
                <button aria-label="Exit follow view" onClick={s.resetView}>
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="map-toolbar">
              <div className="scale">
                <span>0</span>
                <span>500 m</span>
                <i />
              </div>
              <div className="button-group">
                <button
                  className={s.map2d ? "active" : ""}
                  onClick={() => set({ map2d: true, camera: "orbit" })}
                >
                  2D
                </button>
                <button
                  className={!s.map2d ? "active" : ""}
                  onClick={() => set({ map2d: false, camera: "orbit" })}
                >
                  3D
                </button>
              </div>
              <button
                aria-label="Reset view"
                title="Reset view"
                onClick={s.resetView}
              >
                <Focus size={16} />
              </button>
              <button
                onClick={() => showSettings(!settings)}
                aria-label="Graphics settings"
              >
                <Settings2 size={16} />
              </button>
              <button
                aria-label="Fullscreen terrain"
                onClick={() => {
                  const el = document.querySelector(".scene-shell");
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else void el?.requestFullscreen();
                }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
            {settings && (
              <div className="map-settings">
                <label>
                  Vertical relief <output>{s.relief.toFixed(1)}×</output>
                  <input
                    type="range"
                    aria-label="Vertical relief"
                    min="1"
                    max="3"
                    step=".1"
                    value={s.relief}
                    onChange={(e) => set({ relief: +e.target.value })}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.reduced}
                    onChange={(e) => set({ reduced: e.target.checked })}
                  />{" "}
                  Reduced graphics
                </label>
                <button
                  onClick={() => {
                    s.pause();
                    s.setTime(2700);
                    s.resetView();
                  }}
                >
                  Review T+45:00
                </button>
              </div>
            )}
            {s.reduced && (
              <div className="graphics-badge">Reduced graphics</div>
            )}
            {s.notice && (
              <button className="notice" onClick={() => set({ notice: "" })}>
                {s.notice} ×
              </button>
            )}
          </div>
          <Timeline />
        </div>
        <aside className="sidebar">
          {s.mode === "incident" ? (
            <IncidentPanel />
          ) : s.mode === "drones" ? (
            <DronePanel />
          ) : (
            <ResourcesPanel />
          )}
        </aside>
      </main>
      {s.info && <Info />}
    </div>
  );
}
