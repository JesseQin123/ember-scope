import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__ember);
});
const jump = async (page: any, t: number) => {
  await page.evaluate((n: number) => (window as any).__ember.setTime(n), t);
};
test("initial pause, source labels, six drones, exact metrics", async ({
  page,
}) => {
  await expect(page.getByText("SYNTHETIC DEMO", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".metric-area")).toHaveText("1.95 ha");
  expect(
    await page.getByRole("slider", { name: "Scenario timeline" }).inputValue(),
  ).toBe("0");
  await page
    .getByRole("button", { name: "Drones", exact: false })
    .first()
    .click();
  await expect(page.locator(".entity-list .entity-row")).toHaveCount(6);
});
test("scrubbing while paused, keyboard increments, replay", async ({
  page,
}) => {
  const slider = page.getByRole("slider", { name: "Scenario timeline" });
  await slider.fill("1800");
  await expect(page.locator(".metric-area")).toHaveText("126.56 ha");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1810");
  await slider.press("Shift+ArrowLeft");
  await expect(slider).toHaveValue("1750");
  await jump(page, 3600);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect.poll(() => slider.inputValue()).not.toBe("3600");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});
test("pointer drag preserves prior playback state", async ({ page }) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Scenario timeline" }),
    box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  expect(await page.evaluate(() => (window as any).__ember.get().playing)).toBe(
    false,
  );
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__ember.get().playing)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});
test("layers and theme preserve shared time and metrics", async ({ page }) => {
  await jump(page, 2700);
  await page.getByLabel("Forest canopy").uncheck();
  await page.getByLabel("Burn scar & active area").uncheck();
  await expect(page.locator(".metric-area")).toHaveText("260.06 ha");
  await expect(
    page.getByRole("slider", { name: "Scenario timeline" }),
  ).toHaveValue("2700");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".app")).toHaveClass("app dark");
});
test("drone selection, EO/IR and stale preview are linked", async ({
  page,
}) => {
  await jump(page, 1800);
  await page
    .getByRole("button", { name: "Drones", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Select KITE-02", exact: true })
    .first()
    .click();
  await expect(page.locator(".camera-preview")).toBeVisible();
  await expect(page.locator(".camera-stale")).toContainText("T+29:59");
  await page.waitForTimeout(500);
  const a = await page
    .locator("#preview-mount canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await jump(page, 2099);
  await page.waitForTimeout(350);
  const b = await page
    .locator("#preview-mount canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(b).toBe(a);
  await jump(page, 2100);
  await expect(page.locator(".camera-stale")).toHaveCount(0);
  await page.getByRole("button", { name: "IR", exact: true }).click();
  await expect(page.locator(".camera-preview")).toHaveClass(/ir/);
  await page
    .getByRole("button", { name: "Select KITE-06", exact: true })
    .first()
    .click();
  await expect(page.locator(".camera-controls strong")).toHaveText("KITE-06");
});
test("resource list, chase and cockpit are usable", async ({ page }) => {
  await jump(page, 2700);
  await page
    .getByRole("button", { name: "Resources", exact: false })
    .first()
    .click();
  await expect(page.locator(".entity-list .entity-row")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Select T-101", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Chase", exact: true }).click();
  await expect(page.locator(".chase-bar")).toContainText("FOLLOW");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Cockpit", exact: true })
    .click();
  await expect(page.locator(".chase-bar")).toContainText("COCKPIT");
  await page.getByRole("button", { name: "Exit follow view" }).click();
  await expect(page.locator(".chase-bar")).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Scenario timeline" }),
  ).toHaveValue("2700");
});
test("2D, reset, help and keyboard Space", async ({ page }) => {
  await jump(page, 900);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  expect(await page.evaluate(() => (window as any).__ember.get().map2d)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(
    page.getByRole("slider", { name: "Scenario timeline" }),
  ).toHaveValue("900");
  await page.getByRole("button", { name: "Data and keyboard help" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("body").click({ position: { x: 400, y: 70 } });
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => (window as any).__ember.get().playing)).toBe(
    true,
  );
});
test("WebGL unavailable shows usable fallback and timeline", async ({
  page,
}) => {
  await page.goto("/?noWebGL=1");
  await expect(page.locator(".scene-error")).toContainText("3D unavailable");
  await page.getByRole("slider", { name: "Scenario timeline" }).fill("1800");
  await expect(page.locator(".metric-area")).toHaveText("126.56 ha");
});
test("context loss pauses and offers rebuild", async ({ page }) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page
    .locator(".scene>canvas")
    .evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".scene-error")).toContainText("context was lost");
  expect(await page.evaluate(() => (window as any).__ember.get().playing)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Retry 3D" }).click();
  await expect(page.locator(".scene-error")).toHaveCount(0);
});
test("all viewports keep playback visible without horizontal overflow", async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("no runtime errors, shader errors or external asset dependencies", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1") && !r.url().startsWith("data:"))
      external.push(r.url());
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ember);
  await jump(page, 2700);
  await page
    .getByRole("button", { name: "Drones", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Select KITE-01", exact: true })
    .first()
    .click();
  await page.waitForTimeout(1200);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("paused rendered canvas is deterministic and background hide pauses playback", async ({
  page,
}) => {
  await jump(page, 2700);
  await page.waitForTimeout(700);
  const a = await page
    .locator(".scene>canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(1100);
  const b = await page
    .locator(".scene>canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(b).toBe(a);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".notice")).toContainText("paused");
  expect(await page.evaluate(() => (window as any).__ember.get().playing)).toBe(
    false,
  );
});

test("sensor shaders produce white-hot and false-color frames, zoom changes projection", async ({
  page,
}) => {
  await jump(page, 2700);
  await page.evaluate(() => {
    const e = (window as any).__ember;
    e.get().setMode("drones");
    e.get().select("KITE-01");
  });
  const pixels = async () =>
    page.locator("#preview-mount canvas").evaluate((c: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = c.width;
      copy.height = c.height;
      const ctx = copy.getContext("2d")!;
      ctx.drawImage(c, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let colored = 0,
        hot = 0;
      for (let i = 0; i < d.length; i += 16) {
        if (
          Math.max(d[i], d[i + 1], d[i + 2]) -
            Math.min(d[i], d[i + 1], d[i + 2]) >
          15
        )
          colored++;
        if (d[i] > 200) hot++;
      }
      return { colored, hot, image: c.toDataURL() };
    });
  await page.waitForTimeout(600);
  const eo = await pixels();
  await page.getByRole("button", { name: "IR", exact: true }).click();
  await page.waitForTimeout(500);
  const ir = await pixels();
  expect(ir.image).not.toBe(eo.image);
  expect(ir.colored).toBeLessThan(10);
  expect(ir.hot).toBeGreaterThan(100);
  await page.evaluate(() => (window as any).__ember.set({ thermal: true }));
  await page.waitForTimeout(500);
  const thermal = await pixels();
  expect(thermal.colored).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "EO", exact: true }).click();
  await page.getByRole("button", { name: "Optical zoom", exact: true }).click();
  await page.waitForTimeout(500);
  expect((await pixels()).image).not.toBe(eo.image);
  expect(await page.evaluate(() => (window as any).__ember.get().time)).toBe(
    2700,
  );
});

test("four-day archive, active drops and rewind use the same clock", async ({
  page,
}) => {
  await jump(page, 800);
  await page.evaluate(() => {
    const e = (window as any).__ember;
    e.get().setMode("resources");
    e.get().select("T-101");
    e.set({ camera: "follow" });
  });
  await page.waitForTimeout(500);
  await expect(page.locator(".timeline-header")).toContainText("Day 02");
  await expect(page.locator(".sidebar")).toContainText("Drop pass");
  expect(
    await page.evaluate(() => (window as any).__sceneStats.dropParticles),
  ).toBeGreaterThan(30);
  const read = () =>
    page
      .locator("canvas")
      .first()
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const a = await read();
  await page.waitForTimeout(300);
  expect(await read()).toBe(a);
  await jump(page, 600);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => (window as any).__sceneStats.dropParticles),
  ).toBe(0);
  await jump(page, 800);
  await page.waitForTimeout(300);
  expect(await read()).toBe(a);
  await jump(page, 3600);
  await expect(page.locator(".timeline-header")).toContainText("Day 05");
});
