import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
fs.mkdirSync("artifacts", { recursive: true });
await page.goto(process.env.EMBER_BASE_URL || "http://127.0.0.1:5173");
await page.waitForTimeout(1500);
const capture = async (
  name,
  t,
  mode = "incident",
  selected = null,
  extra = {},
) => {
  await page.evaluate(
    ({ t, mode, selected, extra }) => {
      window.__ember.get().setMode(mode);
      window.__ember.setTime(t);
      window.__ember.set({ selected, ...extra });
      window.__ember.get().resetView();
    },
    { t, mode, selected, extra },
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: `artifacts/${name}.png` });
};
await capture("V00", 0);
await capture("V15", 900);
await capture("V30", 1800, "drones", "KITE-02");
await capture("V45", 2700, "drones", "KITE-01");
await capture("drone-ir", 2700, "drones", "KITE-01", {
  ir: true,
  thermal: false,
});
await capture("drone-thermal", 2700, "drones", "KITE-01", {
  ir: true,
  thermal: true,
});
await page.evaluate(() => window.__ember.set({ ir: false, thermal: false }));
await capture("V60", 3600);
await capture("incident-45", 2700);
await page.getByRole("button", { name: "2D", exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/map-2d.png" });
await capture("resources-overview", 2700, "resources", "T-101");
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Chase", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resources-chase.png" });
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Cockpit", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resources-cockpit.png" });
await capture("resources-drop", 800, "resources", "T-101", {
  camera: "follow",
});
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Chase", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resources-drop.png" });
await capture("resource-helicopter", 900, "resources", "H-52");
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Chase", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resource-helicopter.png" });
await capture("resource-tender", 2700, "resources", "WT-04");
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Chase", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resource-tender.png" });
await capture("resource-dozer", 2700, "resources", "DZ-03");
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Chase", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/resource-dozer.png" });
await capture("dark-incident", 2700, "incident", null, { dark: true });
await page.evaluate(() => window.__ember.set({ dark: false }));
for (const [width, height] of [
  [1280, 800],
  [1024, 768],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `artifacts/viewport-${width}.png`,
    fullPage: true,
  });
}
if (process.argv.includes("--screens-only")) {
  await browser.close();
  process.exit(0);
}
await page.setViewportSize({ width: 1440, height: 900 });
await capture("performance-start", 900, "drones", "KITE-01");
await page.evaluate(() => {
  window.__ember.set({ rate: 1, playing: true });
  window.__sceneStats.profile.length = 0;
});
await page.waitForTimeout(60000);
await page.evaluate(() => window.__ember.get().pause());
const performance = await page.evaluate(() => ({
  stats: window.__sceneStats,
  time: window.__ember.get().time,
  userAgent: navigator.userAgent,
}));
const before = performance.stats;
for (let i = 0; i < 5; i++) {
  for (const t of [1800, 2700, 900]) {
    await page.evaluate(
      ({ t, i }) => {
        window.__ember.setTime(t);
        window.__ember.set({ selected: "KITE-0" + ((i % 6) + 1) });
      },
      { t, i },
    );
    await page.waitForTimeout(200);
  }
}
const after = await page.evaluate(() => window.__sceneStats);
await page.evaluate(() => {
  const e = window.__ember;
  e.get().setMode("resources");
  e.setTime(800);
  e.set({ selected: "T-101", camera: "follow", playing: false });
  window.__sceneStats.profile.length = 0;
});
await page.waitForTimeout(20000);
const resourcePerformance = await page.evaluate(() => ({
  profile: [...window.__sceneStats.profile],
  dropParticles: window.__sceneStats.dropParticles,
  drawCalls: window.__sceneStats.drawCalls,
  triangles: window.__sceneStats.triangles,
}));

fs.writeFileSync(
  "artifacts/browser-report.json",
  JSON.stringify(
    {
      browserVersion: browser.version(),
      resourcePerformance,
      errors,
      performance,
      resourceStability: {
        before: { geometries: before.geometries, textures: before.textures },
        after: { geometries: after.geometries, textures: after.textures },
      },
      averageFps:
        performance.stats.profile.reduce((a, b) => a + b, 0) /
        performance.stats.profile.length,
    },
    null,
    2,
  ),
);
console.log(
  "Verification complete",
  errors,
  performance.stats.profile.length,
  "samples",
);
await browser.close();
