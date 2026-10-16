import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// Records the application itself, with no external footage or logged-in profile.
execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
fs.mkdirSync('artifacts/demo', { recursive: true });
fs.mkdirSync('docs/media', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1, recordVideo: { dir: 'artifacts/demo', size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.EMBER_BASE_URL || 'http://127.0.0.1:5173');
await page.waitForFunction(() => window.__ember && document.querySelector('canvas'));
await page.waitForTimeout(1200);
await page.getByRole('slider', { name: 'Scenario timeline' }).fill('2700');
await page.waitForTimeout(600);
await page.screenshot({ path: 'docs/media/overview.png' });
const startMs = Date.now();
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(6000);
await page.getByRole('button', { name: 'Pause', exact: true }).click();
await page.getByRole('slider', { name: 'Scenario timeline' }).fill('2700');
await page.getByRole('button', { name: 'Drones', exact: false }).first().click();
await page.getByRole('button', { name: 'Select KITE-01', exact: true }).first().click();
await page.waitForTimeout(3500);
await page.getByRole('button', { name: 'IR', exact: true }).click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Thermal', exact: true }).click();
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Resources', exact: false }).first().click();
await page.getByRole('slider', { name: 'Scenario timeline' }).fill('760');
await page.getByRole('button', { name: 'Select T-101', exact: true }).first().click();
await page.locator('.sidebar').getByRole('button', { name: 'Chase', exact: true }).click();
await page.getByLabel('Playback speed').selectOption('1');
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(6000);
await page.getByRole('button', { name: 'Pause', exact: true }).click();
await page.getByRole('button', { name: 'Incident', exact: true }).click();
await page.getByRole('button', { name: 'Reset view', exact: true }).click();
await page.getByRole('slider', { name: 'Scenario timeline' }).fill('2700');
await page.getByRole('button', { name: '2D', exact: true }).click();
await page.waitForTimeout(4000);
const elapsed = (Date.now() - startMs) / 1000;
const video = page.video();
await context.close();
const raw = await video.path();
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
// Trim browser startup; preserve all four actual app interactions.
const duration = Number(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',raw], { encoding: 'utf8' }));
const start = Math.max(0, duration - elapsed - 0.4).toFixed(3);
execFileSync('ffmpeg', ['-y','-ss',start,'-i',raw,'-an','-c:v','libx264','-preset','medium','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','docs/media/demo.mp4'], { stdio: ['ignore','ignore','pipe'] });
execFileSync('ffmpeg', ['-y','-i','docs/media/demo.mp4','-filter_complex','fps=6,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0','docs/media/demo.gif'], { stdio: ['ignore','ignore','pipe'] });
console.log(JSON.stringify({ raw, seconds: elapsed, errors, outputs: ['docs/media/demo.mp4','docs/media/demo.gif','docs/media/overview.png'] }, null, 2));
