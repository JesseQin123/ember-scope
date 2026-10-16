import { waterSurface, LAKE, riverX, riverLevel } from "../src/hydrology";
import { describe, it, expect, beforeEach } from "vitest";
import {
  selectMetrics,
  archiveLabel,
  archiveSeconds,
  dropSamples,
  sampleResource,
  resourceMetrics,
  arrivals,
  fireContour,
  sampleDrone,
  sampleFire,
  baseTerrain,
  sampleTerrain,
  terrainVertex,
  CELL,
} from "../src/simulation";
import { useStore, pageHidden } from "../src/store";
describe("authoritative fire grid", () => {
  it.each([
    [0, 20, 20, 0, 32],
    [900, 486, 397, 89, 120],
    [1800, 1296, 678, 618, 222],
    [2100, 1713, 892, 821, 246],
    [2700, 2663, 1112, 1551, 322],
    [3000, 3208, 1233, 1975, 360],
    [3600, 4555, 1579, 2976, 418],
  ])("golden checkpoint %i", (t, affected, active, burned, edges) => {
    const m = selectMetrics(t);
    expect(m.affectedCells).toBe(affected);
    expect(m.activeCells).toBe(active);
    expect(m.burnedCells).toBe(burned);
    expect(m.exposedEdges).toBe(edges);
    expect(m.area).toBe(m.active + (m.burnedCells * CELL * CELL) / 10000);
    expect(sampleFire(t)).toEqual(sampleFire(t));
  });
  it("is monotonic and reproducible when scrubbing backwards", () => {
    let prev = 0;
    for (let t = 0; t <= 3600; t += 37) {
      const m = selectMetrics(t);
      expect(m.area).toBeGreaterThanOrEqual(prev);
      prev = m.area;
    }
    expect(selectMetrics(900)).toEqual(selectMetrics(900));
  });
});
describe("telemetry contract", () => {
  it("freezes entire KITE-02 telemetry at 1799 until 2100", () => {
    const a = sampleDrone("KITE-02", 1799);
    for (const t of [1800, 1900, 2099]) {
      const d = sampleDrone("KITE-02", t);
      for (const key of [
        "x",
        "z",
        "batteryPct",
        "headingDeg",
        "speedMps",
        "sampledAtSec",
      ] as const)
        expect(d[key]).toBe(a[key]);
      expect(d.age).toBe(t - 1799);
      expect(d.link).toBe("stale");
    }
    expect(sampleDrone("KITE-02", 2100).link).toBe("connected");
    expect(sampleDrone("KITE-02", 2100).sampledAtSec).toBe(2100);
  });
  it("resolves returning and docking boundary exactly", () => {
    expect(sampleDrone("KITE-03", 2699).mission).toBe("patrol");
    expect(sampleDrone("KITE-03", 2700).mission).toBe("returning");
    expect(sampleDrone("KITE-03", 2999).mission).toBe("returning");
    const d = sampleDrone("KITE-03", 3000);
    expect(d).toMatchObject({
      mission: "docked",
      x: -1600,
      z: 1400,
      altitudeAglM: 0,
      speedMps: 0,
      batteryPct: 63,
    });
    expect(selectMetrics(1800).availableDrones).toBe(5);
    expect(selectMetrics(2100).availableDrones).toBe(6);
    expect(selectMetrics(3000).availableDrones).toBe(5);
  });
  it("samples the rendered triangulation at terrain vertices", () => {
    expect(sampleTerrain(-1000, 0)).toBeCloseTo(terrainVertex(-1000, 0), 9);
    expect(baseTerrain(0, 0)).toBeGreaterThan(200);
  });
});
describe("shared clock", () => {
  beforeEach(() => {
    useStore.getState().home();
    useStore.setState({ rate: 4 });
  });
  it.each([30, 60, 120])(
    "advances 80 seconds over 2 real seconds at %i fps",
    (fps) => {
      useStore.getState().play();
      for (let i = 0; i < fps * 2; i++) useStore.getState().tick(1 / fps);
      expect(useStore.getState().time).toBe(80);
    },
  );
  it("pause freezes all elapsed time", () => {
    useStore.getState().setTime(900);
    useStore.getState().tick(5);
    expect(useStore.getState().time).toBe(900);
  });
  it("clamps, stops, replays and keeps camera reset independent", () => {
    useStore.getState().setTime(3599);
    useStore.getState().play();
    useStore.getState().tick(2);
    expect(useStore.getState()).toMatchObject({ time: 3600, playing: false });
    useStore.getState().play();
    expect(useStore.getState()).toMatchObject({ time: 0, playing: true });
    useStore.getState().setTime(900);
    useStore.getState().resetView();
    expect(useStore.getState().time).toBe(900);
  });
  it("pauses on page hide without catching up", () => {
    useStore.getState().play();
    pageHidden();
    useStore.getState().tick(100);
    expect(useStore.getState()).toMatchObject({ time: 0, playing: false });
  });
  it("layers and entity selection cannot affect metrics or clock", () => {
    useStore.getState().setTime(2700);
    const before = selectMetrics(2700);
    useStore.getState().toggleLayer("trees");
    useStore.getState().select("KITE-04");
    expect(useStore.getState().time).toBe(2700);
    expect(selectMetrics(2700)).toEqual(before);
  });
});

describe("four-day archive and hydrology", () => {
  it("derives four days from the single replay playhead", () => {
    expect(archiveLabel(0)).toBe("Day 01 · 12:00");
    expect(archiveLabel(900)).toBe("Day 02 · 12:00");
    expect(archiveSeconds(3600) - archiveSeconds(0)).toBe(4 * 86400);
  });
  it("keeps lake and river beds below their surfaces and fire out of water", () => {
    expect(sampleTerrain(LAKE.x, LAKE.z)).toBeLessThan(LAKE.level);
    for (const z of [-1200, 0, 1200])
      expect(sampleTerrain(riverX(z), z)).toBeLessThan(riverLevel(z));
    for (let i = 0; i < arrivals.length; i++) {
      const x = ((i % 128) + 0.5) * CELL - 2000,
        z = (Math.floor(i / 128) + 0.5) * CELL - 2000;
      if (waterSurface(x, z) !== null) expect(arrivals[i]).toBeGreaterThan(60);
    }
  });
  it("builds deterministic irregular contours with finite terrain-attached coordinates", () => {
    const a = fireContour(2700);
    expect(a.length).toBeGreaterThan(200);
    expect(a).toEqual(fireContour(2700));
    expect(a.flat().every(Number.isFinite)).toBe(true);
  });
  it("links active release, loads, particles, cumulative curves and rewind", () => {
    expect(dropSamples(600)).toEqual([]);
    const p = dropSamples(800);
    expect(p.length).toBeGreaterThan(100);
    expect(p).toEqual(dropSamples(800));
    expect(sampleResource("T-101", 800).status).toBe("Drop pass");
    expect(sampleResource("T-101", 800).load).toBe(2000);
    expect(resourceMetrics(800).dropped).toBe(3245);
    expect(dropSamples(600)).toEqual([]);
    expect(sampleResource("A-08", 800).status).toBe("Air supervision");
  });
  it("keeps aircraft continuous at approach/drop/cycle boundaries", () => {
    for (const t of [630, 700, 899, 900, 980]) {
      const a = sampleResource("T-101", t - 1),
        b = sampleResource("T-101", t);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(30);
    }
  });
});
