import fs from "node:fs";
// Offline, deterministic hydraulic erosion. No runtime clock or random source.
const N = 384,
  S = N + 1,
  cell = 4000 / N;
let seed = 42;
const rand = () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + 42) * 43758.5453;
  return n - Math.floor(n);
};
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z),
    u = smooth(x - i),
    v = smooth(z - j);
  return (
    (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) +
    (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v
  );
}
function height(x, z) {
  let f = 1 / 700,
    a = 190,
    n = 0;
  for (let i = 0; i < 7; i++) {
    n += (1 - Math.abs(noise(x * f, z * f) * 2 - 1)) * a;
    f *= 2.12;
    a *= 0.51;
  }
  const p = (x + z) / Math.SQRT2,
    q = (x - z) / Math.SQRT2;
  return (
    220 +
    110 * Math.exp(-((x + 700) ** 2 + (z + 300) ** 2) / 900000) +
    70 * Math.sin(x / 700) * Math.cos(z / 900) +
    35 * Math.sin((x + z) / 350) +
    n +
    390 *
      Math.exp(-((p + 140) ** 2) / 300000) *
      (0.72 + 0.28 * Math.sin(q / 420)) -
    65 *
      Math.abs(Math.sin((p + 70 * Math.sin(q / 170)) / 95)) *
      Math.exp((-p * p) / 650000)
  );
}
const h = Float64Array.from({ length: S * S }, (_, i) =>
  height((i % S) * cell - 2000, Math.floor(i / S) * cell - 2000),
);
function sample(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z),
    u = x - i,
    v = z - j,
    k = j * S + i,
    a = h[k],
    b = h[k + 1],
    c = h[k + S],
    d = h[k + S + 1];
  return {
    h: a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v,
    gx: (b - a) * (1 - v) + (d - c) * v,
    gz: (c - a) * (1 - u) + (d - b) * u,
    k,
    u,
    v,
  };
}
function deposit(p, a) {
  h[p.k] += a * (1 - p.u) * (1 - p.v);
  h[p.k + 1] += a * p.u * (1 - p.v);
  h[p.k + S] += a * (1 - p.u) * p.v;
  h[p.k + S + 1] += a * p.u * p.v;
}
for (let drop = 0; drop < 75000; drop++) {
  let x = 2 + rand() * (N - 4),
    z = 2 + rand() * (N - 4),
    dx = 0,
    dz = 0,
    speed = 1,
    water = 1,
    sediment = 0;
  for (let age = 0; age < 65; age++) {
    const p = sample(x, z);
    dx = dx * 0.18 - p.gx * 0.82;
    dz = dz * 0.18 - p.gz * 0.82;
    const len = Math.hypot(dx, dz);
    if (len < 1e-8) break;
    dx /= len;
    dz /= len;
    x += dx;
    z += dz;
    if (x < 2 || z < 2 || x > N - 2 || z > N - 2) break;
    const q = sample(x, z),
      dh = q.h - p.h,
      capacity = Math.max(-dh * speed * water * 3, 0.02);
    if (sediment > capacity || dh > 0) {
      const amount =
        dh > 0 ? Math.min(dh, sediment) : (sediment - capacity) * 0.28;
      deposit(p, amount);
      sediment -= amount;
    } else {
      const amount = Math.min((capacity - sediment) * 0.24, -dh, 3.5);
      deposit(p, -amount);
      sediment += amount;
    }
    speed = Math.sqrt(Math.max(0.01, speed * speed - dh * 0.55));
    water *= 0.97;
  }
}
// Blend the perimeter to the unmodified analytic exterior.
for (let j = 0; j < S; j++)
  for (let i = 0; i < S; i++) {
    const edge = Math.min(i, j, N - i, N - j),
      blend = Math.min(1, edge / 18),
      k = j * S + i;
    h[k] =
      Math.round(
        (h[k] * blend +
          height(i * cell - 2000, j * cell - 2000) * (1 - blend)) *
          100,
      ) / 100;
  }
fs.writeFileSync(
  "src/data/terrain-heightfield.json",
  JSON.stringify({ segments: N, heights: Array.from(h) }),
);
console.log(`Generated ${S * S} height samples; seed 42, 75,000 droplets.`);
