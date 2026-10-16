import { carveWater, waterSurface } from "./hydrology";
import heightfield from "./data/terrain-heightfield.json";
export const DURATION = 3600,
  GRID = 128,
  CELL = 4000 / GRID,
  CELL_HA = (CELL * CELL) / 10000;
export const DRONE_IDS = [
  "KITE-01",
  "KITE-02",
  "KITE-03",
  "KITE-04",
  "KITE-05",
  "KITE-06",
];
export const droneNames = [
  "Kestrel",
  "Harrier",
  "Swift",
  "Osprey",
  "Condor",
  "Wren",
];
export const missions = [
  "Perimeter mapping",
  "Head fire watch",
  "Flank & spot watch",
  "Structure patrol",
  "Hotspot survey",
  "Communications relay",
];
export const clamp = (v: number, a = 0, b = DURATION) =>
  Math.max(a, Math.min(b, v));
export const timeLabel = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t) % 60).padStart(2, "0")}`;
// A fixed 3,600-unit replay addresses a four-day fictional archive.
// This keeps all views on one playhead; no independent calendar clock exists.
export const archiveSeconds = (t: number) =>
  Math.floor(clamp(t) * 96) + 12 * 3600;
export const archiveDay = (t: number) =>
  Math.floor(archiveSeconds(t) / 86400) + 1;
export const clockLabel = (t: number) => {
  const sec = archiveSeconds(t) % 86400;
  return `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}`;
};
export const archiveLabel = (t: number) =>
  `Day ${String(archiveDay(t)).padStart(2, "0")} · ${clockLabel(t)}`;
export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const baseTerrain = (x: number, z: number) =>
  220 +
  110 * Math.exp(-((x + 700) ** 2 + (z + 300) ** 2) / 900000) +
  70 * Math.sin(x / 700) * Math.cos(z / 900) +
  35 * Math.sin((x + z) / 350);
const smooth = (t: number) => t * t * (3 - 2 * t);
const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 42) * 43758.5453;
  return n - Math.floor(n);
};
function noise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = smooth(x - ix),
    v = smooth(z - iz);
  return (
    (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) +
    (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v
  );
}
// Artistic reference terrain: PRD base plus deterministic eroded ridges. Not DEM.
function analyticTerrain(x: number, z: number) {
  let f = 1 / 700,
    amp = 190,
    n = 0;
  for (let i = 0; i < 7; i++) {
    n += (1 - Math.abs(noise(x * f, z * f) * 2 - 1)) * amp;
    f *= 2.12;
    amp *= 0.51;
  }
  const p = (x + z) / Math.SQRT2,
    q = (x - z) / Math.SQRT2;
  const ridge =
    390 *
    Math.exp(-((p + 140) ** 2) / 300000) *
    (0.72 + 0.28 * Math.sin(q / 420));
  const gullies =
    65 *
    Math.abs(Math.sin((p + 70 * Math.sin(q / 170)) / 95)) *
    Math.exp((-p * p) / 650000);
  return baseTerrain(x, z) + n + ridge - gullies;
}
export const TERRAIN_SEGMENTS = heightfield.segments;
const terrainCell = 4000 / TERRAIN_SEGMENTS;
export function terrainVertex(x: number, z: number): number {
  if (Math.abs(x) > 2000 || Math.abs(z) > 2000)
    return carveWater(x, z, analyticTerrain(x, z));
  const a = clamp((x + 2000) / terrainCell, 0, TERRAIN_SEGMENTS - 0.000001),
    b = clamp((z + 2000) / terrainCell, 0, TERRAIN_SEGMENTS - 0.000001),
    i = Math.floor(a),
    j = Math.floor(b),
    u = a - i,
    v = b - j,
    k = j * (TERRAIN_SEGMENTS + 1) + i;
  const xx = i * terrainCell - 2000,
    zz = j * terrainCell - 2000;
  const h00 = carveWater(xx, zz, heightfield.heights[k]),
    h10 = carveWater(xx + terrainCell, zz, heightfield.heights[k + 1]),
    h01 = carveWater(
      xx,
      zz + terrainCell,
      heightfield.heights[k + TERRAIN_SEGMENTS + 1],
    ),
    h11 = carveWater(
      xx + terrainCell,
      zz + terrainCell,
      heightfield.heights[k + TERRAIN_SEGMENTS + 2],
    );
  return u + v <= 1
    ? h00 + (h10 - h00) * u + (h01 - h00) * v
    : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}
export const sampleTerrain = terrainVertex;
export const worldY = (x: number, z: number, agl = 0, relief = 1.8) =>
  ((sampleTerrain(x, z) - 200) * relief + agl) / 1000;
export const fireOrigin = { x: -850, z: 650 };
export function arrival(x: number, z: number) {
  if (waterSurface(x, z) !== null) return 100000;
  const dx = x - fireOrigin.x,
    dz = z - fireOrigin.z,
    u = (dx - dz) / Math.SQRT2,
    v = (dx + dz) / Math.SQRT2;
  const warp = 95 * Math.sin(u / 240) + 55 * Math.sin(u / 105 + 0.6);
  const base = Math.hypot(u / (u >= 0 ? 30 : 9), (v - warp) / 14) - 7;
  const texture =
    (noise(x / 190, z / 190) - 0.5) * 11 + (noise(x / 70, z / 70) - 0.5) * 3;
  const eastSpot = 23 + Math.hypot((x - 310) / 20, (z + 180) / 13);
  const northSpot = 37 + Math.hypot((x + 50) / 16, (z + 1050) / 18);
  return Math.min(
    base + texture,
    eastSpot + texture * 0.7,
    northSpot + texture * 0.6,
  );
}
// Progression labels follow the main branch, never a separate data clock.
export function fireSpine(t: number) {
  const u = (t / 60 + 7) * 30 * 0.9,
    v = 95 * Math.sin(u / 240) + 55 * Math.sin(u / 105 + 0.6);
  return {
    x: fireOrigin.x + (u + v) / Math.SQRT2,
    z: fireOrigin.z + (-u + v) / Math.SQRT2,
  };
}
// Marching squares on the same sampled field as coverage; display interpolation only.
export function fireContour(t: number) {
  const edges: Array<[number, number, number, number]> = [],
    level = t / 60;
  for (let z = 0; z < GRID - 1; z++)
    for (let x = 0; x < GRID - 1; x++) {
      const idx = z * GRID + x,
        vs = [
          arrivals[idx],
          arrivals[idx + 1],
          arrivals[idx + GRID + 1],
          arrivals[idx + GRID],
        ],
        pts = [
          [x + 0.5, z + 0.5],
          [x + 1.5, z + 0.5],
          [x + 1.5, z + 1.5],
          [x + 0.5, z + 1.5],
        ],
        cross: Array<[number, number]> = [];
      for (let e = 0; e < 4; e++) {
        const n = (e + 1) % 4;
        if (vs[e] <= level !== vs[n] <= level) {
          const f = (level - vs[e]) / (vs[n] - vs[e]);
          cross.push([
            (pts[e][0] + f * (pts[n][0] - pts[e][0])) * CELL - 2000,
            (pts[e][1] + f * (pts[n][1] - pts[e][1])) * CELL - 2000,
          ]);
        }
      }
      for (let k = 0; k + 1 < cross.length; k += 2)
        edges.push([...cross[k], ...cross[k + 1]]);
    }
  return edges;
}
export const arrivals = Float32Array.from({ length: GRID * GRID }, (_, i) =>
  arrival(
    ((i % GRID) + 0.5) * CELL - 2000,
    (Math.floor(i / GRID) + 0.5) * CELL - 2000,
  ),
);
export function sampleFire(t: number) {
  const minute = clamp(Math.floor(t)) / 60;
  return Uint8Array.from(arrivals, (a) =>
    a > minute ? 0 : minute - a < 12 ? 1 : 2,
  );
}
export function selectMetrics(t: number) {
  const fire = sampleFire(t);
  let affectedCells = 0,
    activeCells = 0,
    exposedEdges = 0;
  for (let i = 0; i < fire.length; i++) {
    if (!fire[i]) continue;
    affectedCells++;
    if (fire[i] === 1) activeCells++;
    const x = i % GRID,
      z = Math.floor(i / GRID);
    if (x === 0 || !fire[i - 1]) exposedEdges++;
    if (x === 127 || !fire[i + 1]) exposedEdges++;
    if (z === 0 || !fire[i - GRID]) exposedEdges++;
    if (z === 127 || !fire[i + GRID]) exposedEdges++;
  }
  return {
    affectedCells,
    activeCells,
    burnedCells: affectedCells - activeCells,
    exposedEdges,
    area: affectedCells * CELL_HA,
    active: activeCells * CELL_HA,
    perimeter: (exposedEdges * CELL) / 1000,
    availableDrones: DRONE_IDS.filter((id) => {
      const d = sampleDrone(id, t);
      return d.link === "connected" && d.mission !== "docked";
    }).length,
  };
}
export function sampleDrone(id: string, t: number) {
  const i = DRONE_IDS.indexOf(id);
  if (i < 0) throw new Error("Unknown drone");
  const requestedAtSec = Math.floor(clamp(t)),
    stale = i === 1 && requestedAtSec >= 1800 && requestedAtSec < 2100,
    sampledAtSec = stale ? 1799 : requestedAtSec,
    m = sampledAtSec / 60;
  let x: number,
    z: number,
    dx: number,
    dz: number,
    altitudeAglM: number,
    batteryPct: number,
    mission: "patrol" | "returning" | "docked" = "patrol";
  const p = [
    [-450, 250, 650, 450, 20, 0, 120, 96, 0.6],
    [250, -350, 500, 350, 24, Math.PI / 2, 150, 91, 0.65],
    [-950, -400, 300, 500, 15, Math.PI, 100, 88, 0.5],
    [750, 400, 430, 650, 22, 0.6, 180, 94, 0.45],
    [-100, -1100, 700, 300, 28, 1.8, 240, 86, 0.4],
    [-1200, 700, 240, 320, 18, 2.4, 160, 98, 0.35],
  ][i];
  const [cx, cz, rx, rz, period, phase, alt, bat, drain] = p,
    theta = (2 * Math.PI * m) / period + phase,
    omega = (2 * Math.PI) / (period * 60);
  x = cx + rx * Math.cos(theta);
  z = cz + rz * Math.sin(theta);
  dx = -rx * Math.sin(theta) * omega;
  dz = rz * Math.cos(theta) * omega;
  altitudeAglM = alt;
  batteryPct = bat - drain * (i === 2 ? Math.min(m, 50) : m);
  if (i === 2 && sampledAtSec >= 2700) {
    const f = clamp((sampledAtSec - 2700) / 300, 0, 1);
    x = -1250 - 350 * f;
    z = -400 + 1800 * f;
    altitudeAglM = 100 * (1 - f);
    mission = f === 1 ? "docked" : "returning";
    dx = f === 1 ? 0 : -350 / 300;
    dz = f === 1 ? 0 : 6;
  }
  return {
    id,
    requestedAtSec,
    sampledAtSec,
    x,
    z,
    altitudeAglM,
    groundElevationM: sampleTerrain(x, z),
    batteryPct: clamp(batteryPct, 0, 100),
    speedMps: Math.hypot(dx, dz),
    headingDeg: ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360,
    mission,
    link: stale ? ("stale" as const) : ("connected" as const),
    age: requestedAtSec - sampledAtSec,
  };
}
export const resources = [
  { id: "T-101", name: "Atlas · Air tanker", type: "aircraft", capacity: 4000 },
  {
    id: "T-204",
    name: "Cinder · Air tanker",
    type: "aircraft",
    capacity: 3000,
  },
  { id: "H-31", name: "Sierra · Helicopter", type: "aircraft", capacity: 1800 },
  { id: "H-52", name: "Heron · Helicopter", type: "aircraft", capacity: 1200 },
  { id: "T-310", name: "Ember · Air tanker", type: "aircraft", capacity: 5000 },
  {
    id: "A-08",
    name: "Scout · Air supervision",
    type: "aircraft",
    capacity: 0,
  },
  { id: "E-11", name: "Type 3 Engine", type: "engine", capacity: 4 },
  { id: "E-12", name: "Type 1 Engine", type: "engine", capacity: 5 },
  { id: "E-23", name: "Patrol Engine", type: "engine", capacity: 4 },
  { id: "WT-04", name: "Water Tender", type: "engine", capacity: 2500 },
  { id: "C-07", name: "Ridge hand crew", type: "crew", capacity: 20 },
  { id: "C-14", name: "Valley hand crew", type: "crew", capacity: 17 },
  { id: "DZ-03", name: "Dozer team", type: "crew", capacity: 2 },
];
function resourcePosition(id: string, t: number) {
  const i = resources.findIndex((r) => r.id === id),
    r = resources[i],
    air = r.type === "aircraft",
    s = Math.max(0, t - i * 35),
    phase = s % 900,
    a = s / 150 + i * 2;
  if (!air) {
    const z = 1300 - (s / 3600) * 2500 + (i - 6) * 65;
    return { x: -1300 + 200 * Math.sin(z / 470) + 80 * Math.cos(z / 160), z };
  }
  const orbit = { x: -250 + 1200 * Math.cos(a), z: 100 + 850 * Math.sin(a) };
  if (r.capacity === 0) return orbit;
  const offset = (i - 2) * 65,
    start = { x: fireOrigin.x + offset, z: fireOrigin.z + offset },
    end = { x: fireOrigin.x + 1485 + offset, z: fireOrigin.z - 1485 + offset };
  const lerp = (
    a: { x: number; z: number },
    b: { x: number; z: number },
    k: number,
  ) => ({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k });
  if (phase >= 700) return lerp(start, end, (phase - 700) / 200);
  if (phase >= 630) {
    const k = (phase - 630) / 70;
    return lerp(orbit, start, k * k * (3 - 2 * k));
  }
  if (phase < 80 && s >= 900) {
    const k = phase / 80;
    return lerp(end, orbit, k * k * (3 - 2 * k));
  }
  return orbit;
}
export function sampleResource(id: string, t: number) {
  const i = resources.findIndex((r) => r.id === id);
  if (i < 0) throw new Error("Unknown resource");
  const r = resources[i],
    air = r.type === "aircraft",
    s = Math.floor(clamp(t)),
    operation = Math.max(0, s - i * 35),
    p = resourcePosition(id, s),
    before = resourcePosition(id, Math.max(0, s - 0.5)),
    after = resourcePosition(id, s + 0.5),
    delta = s === 0 ? 0.5 : 1,
    dx = (after.x - before.x) / delta,
    dz = (after.z - before.z) / delta;
  return {
    ...r,
    ...p,
    altitudeAglM: air ? (id.startsWith("H-") ? 95 + i * 10 : 190 + i * 25) : 1,
    headingDeg: ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360,
    speedMps: Math.hypot(dx, dz),
    batteryPct: 100 - s / 100,
    status: air
      ? r.capacity === 0
        ? "Air supervision"
        : operation % 900 > 700
          ? "Drop pass"
          : operation % 900 >= 630
            ? "On final"
            : operation % 900 < 80 && operation >= 900
              ? "Return to orbit"
              : "Patrol orbit"
      : r.type === "engine"
        ? "Structure protection"
        : "Building line",
    load: air
      ? r.capacity * (1 - Math.max(0, (operation % 900) - 700) / 200)
      : r.capacity,
  };
}
export function resourceMetrics(t: number) {
  const s = Math.floor(clamp(t));
  return {
    dropped: resources
      .filter((r) => r.type === "aircraft" && r.capacity > 0)
      .reduce((sum, r) => {
        const i = resources.indexOf(r),
          op = Math.max(0, s - i * 35);
        return (
          sum +
          Math.floor(op / 900) * r.capacity +
          (Math.max(0, (op % 900) - 700) / 200) * r.capacity
        );
      }, 0),
    line: Math.round((s / 3600) * 680),
    personnel: s < 300 ? Math.floor((s / 300) * 52) : 52,
  };
}
export const checkpoints = [0, 900, 1800, 2100, 2700, 3000, 3600];
export const eventLog = [
  { t: 0, title: "Ignition detected", detail: "Aster Ridge · scripted origin" },
  {
    t: 900,
    title: "Eastern flank expands",
    detail: "Cumulative perimeter sampled",
  },
  {
    t: 1800,
    title: "KITE-02 telemetry lost",
    detail: "Last known sample at 29:59",
  },
  {
    t: 2100,
    title: "KITE-02 link restored",
    detail: "Current telemetry available",
  },
  { t: 2700, title: "KITE-03 returning", detail: "Scripted return to base" },
  { t: 3000, title: "KITE-03 docked", detail: "Mission completed" },
  { t: 3600, title: "Scenario complete", detail: "End of synthetic recording" },
];

export function dropSamples(t: number) {
  const out: Array<{
    id: string;
    emitted: number;
    age: number;
    x: number;
    z: number;
    originX: number;
    originZ: number;
    agl: number;
    water: boolean;
  }> = [];
  for (const r of resources.filter(
    (r) => r.type === "aircraft" && r.capacity > 0,
  ))
    for (let j = 0; j < 44; j++) {
      const age = j * 0.23,
        emitted = Math.floor(t - age);
      if (emitted < 0 || sampleResource(r.id, emitted).status !== "Drop pass")
        continue;
      const d = sampleResource(r.id, emitted);
      out.push({
        id: r.id,
        emitted,
        age,
        x: d.x + age * 1.2,
        z: d.z - age * 0.6,
        originX: d.x,
        originZ: d.z,
        agl: d.altitudeAglM - 4.9 * age * age,
        water: r.id.startsWith("H-"),
      });
    }
  return out;
}
