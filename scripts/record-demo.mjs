import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// Recording-only titles surround the real app; application code is unchanged.
// Accelerated seeks use the same public playhead as every metric and scene layer.
execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
fs.mkdirSync('artifacts/demo', { recursive: true });
fs.mkdirSync('docs/media', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1060 },
  deviceScaleFactor: 1, recordVideo: { dir: 'artifacts/demo', size: { width: 1600, height: 1060 } } });
const page = await context.newPage();
const errors = [], chapters = [], checkpoints = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.EMBER_BASE_URL || 'http://127.0.0.1:5173');
await page.waitForFunction(() => window.__ember && document.querySelector('canvas'));
await page.waitForTimeout(1000);
await page.addStyleTag({ content: `
body{background:#10171b!important}
#root{position:absolute!important;left:40px!important;top:128px!important;width:1520px!important;height:850px!important;border:1px solid #52635a;border-radius:9px;overflow:hidden;box-shadow:0 14px 36px #0007}
#film-title{position:fixed;left:40px;top:24px;right:40px;color:#f1f4ed;font-family:Arial,sans-serif;pointer-events:none}
#film-title .kicker{color:#f59b67;font-size:14px;letter-spacing:2.3px;font-weight:bold;margin-bottom:9px}
#film-title h1{font-size:34px;line-height:1.1;margin:0;font-weight:700;letter-spacing:-.7px}
#film-title .steps{position:absolute;right:0;top:22px;display:flex;gap:20px;font-size:15px;color:#748780}
#film-title .steps b{color:#f5a06c;border-bottom:2px solid #f5a06c;padding-bottom:9px}
#film-caption{position:fixed;left:40px;right:40px;bottom:23px;color:#f0f3ea;font-family:Arial,sans-serif;display:flex;justify-content:space-between;align-items:center;gap:30px}
#film-caption .explain{font-size:21px;line-height:1.4;max-width:1080px}
#film-caption .fact{font-size:26px;color:#f4a26d;font-weight:bold;white-space:nowrap}
#film-transition{position:fixed;inset:128px 40px 82px;background:#10191bf5;z-index:10000;color:#f4f4e8;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .18s}
#film-transition.show{opacity:1}#film-transition small{color:#ec9a69;font-size:16px;letter-spacing:3px}#film-transition strong{font-size:44px;margin-top:20px}
body[data-focus=timeline] .scrubber,body[data-focus=fleet] .entity-list:first-of-type,body[data-focus=layers] .map-toolbar .button-group{outline:3px solid #ee8a4b;outline-offset:2px}
body[data-focus=sensor] .camera-preview{outline:3px solid #ee8a4b;width:600px!important}
body[data-focus=resources] .chase-bar{outline:3px solid #ee8a4b;outline-offset:3px}
` });
await page.evaluate(() => {
  const title = document.createElement('div'); title.id='film-title';
  title.innerHTML='<div class="kicker">EMBER SCOPE / SYNTHETIC DEMO</div><h1></h1><div class="steps"></div>';
  const caption=document.createElement('div'); caption.id='film-caption';
  caption.innerHTML='<div class="explain"></div><div class="fact"></div>';
  const transition=document.createElement('div');transition.id='film-transition';
  transition.innerHTML='<small>WHAT TO LOOK AT NEXT</small><strong></strong>';
  document.body.append(title,caption,transition);
});
const labels=['01 FIRE','02 DRONES','03 AIRCRAFT','04 MAP'];
const caption=async(explain,fact='',focus='') => page.evaluate(({explain,fact,focus})=>{
  document.querySelector('#film-caption .explain').textContent=explain;
  document.querySelector('#film-caption .fact').textContent=fact;
  document.body.dataset.focus=focus;
},{explain,fact,focus});
const startMs=Date.now();
const chapter=async(index,title,transitionText,action) => {
  if(transitionText){
    await page.evaluate(t=>{document.querySelector('#film-transition strong').textContent=t;document.querySelector('#film-transition').classList.add('show');},transitionText);
    await page.waitForTimeout(600);
  }
  await action();
  await page.evaluate(({index,title,labels})=>{
    document.querySelector('#film-title h1').textContent=title;
    document.querySelector('#film-title .steps').innerHTML=labels.map((s,i)=>i===index?'<b>'+s+'</b>':'<span>'+s+'</span>').join('');
  },{index,title,labels});
  if(transitionText){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('#film-transition').classList.remove('show'));}
  chapters.push({index,title,seconds:(Date.now()-startMs)/1000});
};
const seek=async(t)=>page.getByRole('slider',{name:'Scenario timeline'}).fill(String(t));
const evidence=async(name)=>{
  const state=await page.evaluate(()=>({time:window.__ember.get().time,area:document.querySelector('.metric-area')?.textContent,mode:window.__ember.get().mode,selected:window.__ember.get().selected}));
  checkpoints.push({name,...state});
  await page.screenshot({path:'artifacts/demo/'+name+'.png'});
};
// Wall time paces the recording only. Each frame rebuilds from the one scenario time.
const sweep=async(from,to,milliseconds,onSample)=>{
  const started=Date.now();
  while(true){
    const f=Math.min(1,(Date.now()-started)/milliseconds),t=Math.round(from+(to-from)*f);
    await seek(t);
    if(onSample)await onSample(t);
    if(f===1)break;
    await page.waitForTimeout(55);
  }
};
await chapter(0,'Watch four days of fire advance in eight seconds.',null,async()=>{await seek(0);});
await caption('Accelerated timeline sweep. Watch the orange perimeter and affected area grow together.','DAY 01 · 1.95 ha','timeline');
await evidence('01-fire-start');
await page.waitForTimeout(1200);
await sweep(0,3600,8000,async t=>{
  const area=await page.locator('.metric-area').innerText();
  await caption('Accelerated timeline sweep · the map, area and charts share one playhead.',`DAY ${String(Math.floor((t*96+43200)/86400)+1).padStart(2,'0')} · ${area}`,'timeline');
});
await evidence('02-fire-end');
await caption('From 1.95 to 444.82 hectares. The full fire history is now visible.','4 DAYS REPLAYED','timeline');
await page.waitForTimeout(1500);
await chapter(1,'Inspect the fire through a selected drone.','Next: camera + telemetry',async()=>{
  await page.getByRole('button',{name:'Drones',exact:false}).first().click();await seek(2700);
  await page.getByRole('button',{name:'Select KITE-01',exact:true}).first().click();
});
await caption('Select KITE-01. Its position, telemetry and optical camera show the same instant.','EO · OPTICAL','sensor');
await page.waitForTimeout(2700);await evidence('03-drone-eo');
await page.getByRole('button',{name:'IR',exact:true}).click();
await caption('Switch to infrared: brighter surfaces represent greater relative heat.','IR · WHITE HOT','sensor');
await page.waitForTimeout(2300);await evidence('04-drone-ir');
await page.getByRole('button',{name:'Thermal',exact:true}).click();
await caption('Thermal adds heat colors. This is a simulated sensor view, not measured temperature.','THERMAL · RELATIVE','sensor');
await page.waitForTimeout(2300);await evidence('05-drone-thermal');
await chapter(2,'Follow a tanker from approach to release.','Next: aircraft in action',async()=>{
  await page.getByRole('button',{name:'Resources',exact:false}).first().click();await seek(650);
  await page.getByRole('button',{name:'Select T-101',exact:true}).first().click();
  await page.locator('.sidebar').getByRole('button',{name:'Chase',exact:true}).click();
});
await caption('Chase view follows T-101 as it lines up for a scripted drop.','T-101 · APPROACH','resources');
await sweep(650,705,2200);
await caption('The red plume is retardant. Watch the load fall and the ground trail appear.','T-101 · RELEASING','resources');
await sweep(705,875,5500);await evidence('06-tanker-release');
await page.locator('.sidebar').getByRole('button',{name:'Cockpit',exact:true}).click();
await caption('Switch to the cockpit to see the same operation from the aircraft.','COCKPIT VIEW','resources');
await page.waitForTimeout(2000);await evidence('07-cockpit');
await chapter(3,'Compare the same fire on a 2D map.','Finally: map + rewind',async()=>{
  await page.getByRole('button',{name:'Incident',exact:true}).click();
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await seek(3600);
  await page.getByRole('button',{name:'2D',exact:true}).click();
});
await caption('Same event, topographic view. Rivers, past perimeters and dates remain linked.','DAY 05 · 444.82 ha','layers');
await page.waitForTimeout(1800);await evidence('08-map-end');
await caption('Rewind the timeline: the map and area return to the earlier fire.','REWIND TO DAY 02','timeline');
await sweep(3600,900,1400);await page.waitForTimeout(800);await evidence('09-map-rewind');
await caption('Scrub forward again. The same time always reconstructs the same state.','ONE SHARED TIMELINE','timeline');
await sweep(900,3600,1800);
await caption('Explore Ember Scope locally · open source on GitHub · all data simulated.','MIT / OPEN SOURCE');
await page.waitForTimeout(2000);
const elapsed=(Date.now()-startMs)/1000;
const video=page.video();await context.close();const raw=await video.path();await browser.close();
if(errors.length)throw new Error(errors.join('\n'));
const probe=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',raw],{encoding:'utf8'}));
const trim=Math.max(0,probe-elapsed-.15).toFixed(3);
execFileSync('ffmpeg',['-y','-ss',trim,'-i',raw,'-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','docs/media/demo.mp4'],{stdio:['ignore','ignore','pipe']});
// A short, legible GIF focuses on the strongest before/after: the whole fire progression.
execFileSync('ffmpeg',['-y','-i','docs/media/demo.mp4','-t','11','-filter_complex','fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0','docs/media/demo.gif'],{stdio:['ignore','ignore','pipe']});
const report={seconds:elapsed,chapters,checkpoints,errors,raw,video:'docs/media/demo.mp4',gif:'docs/media/demo.gif'};
fs.writeFileSync('artifacts/demo/storyboard-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
