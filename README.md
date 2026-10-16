# Ember Scope

**An interactive, open-source wildfire visualization built with React, TypeScript and Three.js.**

[English](README.md) · [简体中文](docs/i18n/README.zh-CN.md) · [Español](docs/i18n/README.es.md) · [Français](docs/i18n/README.fr.md) · [日本語](docs/i18n/README.ja.md)

[![CI](https://github.com/JesseQin123/ember-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/JesseQin123/ember-scope/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Explore a fictional mountain incident from the first ignition to a four-day fire archive. Scrub time, inspect a drone's simulated camera, switch between 2D and 3D, and follow aircraft as they make scripted drops. The map, telemetry, fire coverage and charts all read the same deterministic playhead.

> **SYNTHETIC DEMO:** All terrain, incidents, telemetry, sensor views and resource operations are simulated. This is not a live monitor, physical fire predictor, rescue dispatcher or emergency decision tool.

## Watch the demo

[![Ember Scope interactive demo](docs/media/demo.gif)](https://github.com/JesseQin123/ember-scope/blob/main/docs/media/demo.mp4)

**[Watch/download the MP4 walkthrough](https://github.com/JesseQin123/ember-scope/blob/main/docs/media/demo.mp4)** · [Full-resolution overview](docs/media/overview.png) · [Video introduction and recording guide](docs/VIDEO.md)

This recording shows the application itself: incident playback, a selected drone's EO/IR/Thermal view, a tanker release and the topographic map. It contains no footage from the original FireTrace video.

**Video introduction:** “Meet Ember Scope, an open-source, interactive wildfire visualization. Explore a fictional mountain landscape, replay four days of fire progression, inspect six simulated drones, and follow thirteen response resources. One shared timeline keeps every scene and chart in sync. Everything you see is synthetic, reproducible and ready to explore locally.”

## What you can explore

| Mode | Features |
| --- | --- |
| **Incident** | Eroded terrain, forest, connected reservoir and river, irregular fire perimeter, burn scars, day markers, layer controls, opacity and three linked charts |
| **Drones** | Six selectable drones, battery/altitude/status, valid telemetry tracks, frozen last-known state, same-scene EO camera, relative IR/Thermal shaders, zoom and follow views |
| **Resources** | Thirteen aircraft, vehicles and crews; differentiated procedural models; chase/cockpit views; scripted loads, airborne releases and rewindable ground deposits |
| **Playback** | Pause/play, seek, replay, speed selection, keyboard controls, 2D/3D, light/dark themes and reduced graphics |

The UI uses English. The five README editions document the same application; they are not five localized UI builds.

## Run locally

Requires **Node.js 22.12 or newer**, npm, and a browser with WebGL2.

```sh
git clone https://github.com/JesseQin123/ember-scope.git
cd ember-scope
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The development server binds to loopback.

```sh
npm test               # deterministic simulation and state tests
npm run build          # TypeScript checks and static production build
npm run preview        # serve dist at http://127.0.0.1:4173/
```

For browser tests, install Google Chrome, leave the development server running and use another terminal:

```sh
npm run test:e2e
npm run verify         # screenshots and performance samples in artifacts/
```

To test a different local port, set `EMBER_BASE_URL`, for example `EMBER_BASE_URL=http://127.0.0.1:5180 npm run test:e2e`. Dependencies are installed once; the running app needs no API keys, backend, external maps, fonts or telemetry services.

## Controls

- Drag the terrain to orbit; right-drag to pan; scroll to zoom.
- Use the bottom playhead or day markers to seek. Space toggles playback outside input controls.
- Timeline arrows advance 16 archive minutes; Shift + arrows advances 96 minutes.
- Select a drone or resource from its list or scene marker. Follow and cockpit are simulated cameras, not commands to real vehicles.
- Toggle layers without changing time. Reset view resets only the camera.
- Opening another tab pauses playback. Reduced graphics and a labeled WebGL fallback are available.

## Deterministic by design

A single integer playhead spans 0–3600. Each unit represents 96 archive seconds, mapping fictional Day 01 12:00 through Day 05 12:00. At 1×, a real second advances 16 archive minutes; at 4× the archive takes about 90 real seconds.

Fire area is derived from a fixed 128 × 128 arrival-time grid. Water never ignites. Forest placement, erosion, telemetry, releases and effects use fixed rules. Seeking backward reconstructs the same state. Drone paths represent compressed archive snapshots, not physically possible four-day flights.

Read [the scenario rules and exact checkpoints](docs/SCENARIO.md).

## Architecture

```text
src/
  App.tsx                 panels, timeline, local SVG charts
  Scene.tsx               Three.js scene, camera, sensors and rendering
  store.ts                one shared clock and UI state
  simulation.ts           fire, terrain, drones, resources and selectors
  hydrology.ts            connected reservoir and river
  resourceModels.ts       original aircraft, vehicles and crew geometry
  data/                   deterministic generated terrain field
public/
  assets/                 generated terrain texture and smoke sprite
  licenses/               runtime dependency notices
tests/                    data/state and browser regression tests
scripts/                  terrain generation and demo recording
```

React + TypeScript + Vite + Three.js + Zustand. Charts use local SVG. No screenshot replaces the interactive terrain.

## Validation and limits

The initial release passes **23 simulation/state tests and 14 browser tests**. Checks include exact fire checkpoints, time invariance, stale telemetry, docking, layers, entity selection, sensors, paused-frame equality, releases, responsive layout and WebGL fallback.

A prior 60-second local benchmark measured 59.95 fps on an Apple M5 Pro with a drone preview open. That result describes one machine, not a performance guarantee. See [validation details](docs/VALIDATION.md).

The terrain and event are independently authored. Models are stylized; smoke and drops use particles; IR/Thermal show relative heat; deposits do not suppress the scripted fire. This is a creative software demo, not a physical simulator or a pixel-identical copy of its inspiration.

## Inspiration and credit

Inspired by [Dilum Sanjaya's FireTrace demonstration](https://x.com/DilumSanjaya/status/2108241054298415258). Ember Scope is an independent implementation with no affiliation or endorsement. The original source code, branding, video, screenshots, map data and models are not included.

The terrain texture and transparent smoke sprite were generated for this project. Their prompts and processing are recorded in [asset provenance](docs/ASSETS.md). All interactive terrain, fire, vehicle geometry and cameras are code.

## Contribute

Issues, translations and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Preserve deterministic replay and the synthetic-data labels. Include tests for changes to the scenario rules and screenshots from this app for visual changes.

## License

Project code, original data and project-created assets are offered under the [MIT License](LICENSE), to the extent applicable rights are held. Third-party dependencies retain their own licenses; see [LICENSES.md](LICENSES.md) and the bundled notices. No exclusive rights are claimed over AI-generated imagery.
