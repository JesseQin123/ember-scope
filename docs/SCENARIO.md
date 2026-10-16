# Deterministic four-day scenario

Ember Scope / Aster Ridge Demo is an independent synthetic archive. It is not an operational monitor, physical fire predictor, real aircraft controller or original FireTrace dataset.

## One playhead, explicit archive compression

The single stored playhead remains an integer in 0..3600. One coordinate unit represents 96 archived seconds. The archive therefore spans fictional Day 01 12:00 to Day 05 12:00. At 1×, each real second advances 10 replay units (16 archive minutes); 4× finishes the four days in about 90 real seconds. The old `T+mm:ss` telemetry coordinate is explicitly a replay coordinate, not aircraft endurance. Sensor HUDs and the timeline show the derived archive day/time. No component has its own calendar clock.

All vehicle positions and telemetry are scripted snapshots of this fictional compressed archive. Speeds describe the scripted local path parameter, not a physical continuous four-day flight. There is no endurance, refueling, suppression or weather dynamics model. Battery values must not be interpreted as a real multi-day mission.

## Fire model

The current model uses an irregular four-day arrival field. The following checkpoints define the current implementation.

The current domain remains 4 × 4 km with 128² cells, 31.25 m edges and 0.09765625 ha per cell. A fixed noise-warped main arrival field starts at (-850,650), extends northeast, and merges two later scripted ignition fields. Water cells never ignite. Active burning lasts 12 replay minutes (19.2 archive hours); this duration is an artistic rule. Four-neighbor exposed edges define the reported grid perimeter. Marching squares and bilinear texture sampling smooth the display only.

| Replay coordinate | Archive time | Affected cells | Active | Burned | Area ha | Exposed edges |
|---|---|---:|---:|---:|---:|---:|
| 0 | Day 01 12:00 | 20 | 20 | 0 | 1.953125 | 32 |
| 900 | Day 02 12:00 | 486 | 397 | 89 | 47.4609375 | 120 |
| 1800 | Day 03 12:00 | 1296 | 678 | 618 | 126.5625 | 222 |
| 2100 | Day 03 20:00 | 1713 | 892 | 821 | 167.28515625 | 246 |
| 2700 | Day 04 12:00 | 2663 | 1112 | 1551 | 260.05859375 | 322 |
| 3000 | Day 04 20:00 | 3208 | 1233 | 1975 | 313.28125 | 360 |
| 3600 | Day 05 12:00 | 4555 | 1579 | 2976 | 444.82421875 | 418 |

Area and charts read the same grid selector. Spread is the affected-area increment over 60 replay units, converted to ha/archive-day. Future curves remain empty. Historical perimeters and clickable day labels derive from this same field.

## Terrain, lake and river

A 384-segment heightfield is generated offline by `scripts/generate-terrain.mjs`: seed 42, seven noise octaves, 75,000 hydraulic-erosion droplets. `src/hydrology.ts` carves a fictional reservoir and a connected meandering channel. Every terrain-grid vertex uses this carving; all positions sample the same rendered triangulation. Reservoir surface is level, river surface slopes downstream, and shore trees are excluded. Water ripples use playhead time and freeze on pause.

World units are kilometers. Default height exaggeration is 1.8 above the 200 m baseline. This is not a real DEM or hydrological survey. The main forest has 12,000 instances, plus 18,000 decorative distant trees; burned crowns become charred stems.

## Drones and camera

Six selectable drones retain the deterministic local patrol scripts. KITE-02 freezes its telemetry and camera at replay 1799 during [1800,2100); archive data age is 96 times replay age. KITE-03 returns during [2700,3000), then remains docked at 63% battery. Other drones use fixed ellipses. Speeds and headings derive from the scripted local paths.

One additional low-resolution camera renders the same scene, up to 5 fps (1 fps reduced). The camera chooses a nearby active cell with a terrain line-of-sight check, falling back to the progression branch when no visible candidate exists. IR and Thermal use the same sampled arrival-age field and are explicitly relative-heat illustrations, not radiometry. Optical framing changes FOV at 1×/2×/4×. A direct seek into the outage rebuilds fire, forest, water and deposit timing at 1799 for the frozen view.

## Resources and visible releases

Thirteen entities comprise six aircraft, four engines/tenders, two crews and one dozer. Models are original geometry. Aircraft have distinct jet/propeller/supervision and helicopter/bucket forms; ground vehicles include wheels/tank/ladders or tracks/blade; crews have helmets and tools.

Each capable aircraft follows orbit → approach → straight drop pass → return, with staggered 35-unit offsets. Each 900-unit sortie releases over its last 200 units. The 15,000-gallon total fleet capacity is not independently hardcoded into the release curve: current loads, release status, particle emission and cumulative totals derive from per-aircraft capacity and phase. The supervision plane emits nothing.

Airborne particles use the generated transparent smoke sprite, tinted for retardant or water. Gravity and drift place the visible trail; terrain intersection hides landed particles. Ground ribbons reveal after their scripted impact time and disappear when rewound; water traces fade, retardant traces persist. These visual deposits do not alter the fire field. Ground units move along the access road and conform to its local terrain slope.

At replay 800, T-101 has 2,000 gal remaining and the fleet has released 3,245 gal. Replay pause and rewind reproduce the same particles, models, traces and counters. All randomness is fixed-seed; no wall clock or `Math.random()` drives scene content.
