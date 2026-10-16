// Original fictional reservoir and connected channel, in meters.
export const LAKE = { x: -1000, z: -1570, rx: 680, rz: 330, level: 410 };
export const riverX = (z: number) =>
  -1510 + 150 * Math.sin((z + 1450) / 390) + 65 * Math.sin(z / 150);
export const riverLevel = (z: number) => 410 - ((z + 1400) / 3400) * 180;
export const shoreRadius = (theta: number) =>
  1 + 0.09 * Math.sin(theta * 5) + 0.055 * Math.sin(theta * 9 + 0.7);
export function lakeRadius(x: number, z: number) {
  const dx = (x - LAKE.x) / LAKE.rx,
    dz = (z - LAKE.z) / LAKE.rz;
  return Math.hypot(dx, dz) / shoreRadius(Math.atan2(dz, dx));
}
export function waterSurface(x: number, z: number): number | null {
  if (lakeRadius(x, z) < 1) return LAKE.level;
  if (
    z >= -1400 &&
    z <= 2100 &&
    Math.abs(x - riverX(z)) < 19 + 5 * Math.sin(z / 110)
  )
    return riverLevel(z);
  return null;
}
export function carveWater(x: number, z: number, h: number) {
  const q = lakeRadius(x, z);
  if (q < 1.28) {
    const blend = Math.min(1, Math.max(0, (1.28 - q) / 0.28));
    h = h * (1 - blend) + (LAKE.level - 12 - 15 * Math.max(0, 1 - q)) * blend;
  }
  if (z >= -1470 && z <= 2200) {
    const distance = Math.abs(x - riverX(z)),
      blend = Math.max(0, Math.min(1, (125 - distance) / 100));
    const edge = Math.min(1, (z + 1470) / 70, (2200 - z) / 100);
    h = h * (1 - blend * edge) + (riverLevel(z) - 6) * blend * edge;
  }
  return h;
}
