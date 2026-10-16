# Validation

## Initial open-source release

The local source release is checked with `npm ci`, `npm test`, `npm run build` and `npm run test:e2e`.

- 23 simulation/state tests cover exact grid checkpoints, rewind determinism, water exclusion, clock invariance, drone state boundaries, archive timing and resource coupling.
- 14 browser tests cover selection, layers, playback/dragging, same-scene sensors, stale views, release pause/rewind equality, responsive layout, fallback and context restoration.
- CI runs a clean install, simulation tests and production build on Node.js 22. Browser tests are a separate local check requiring Google Chrome and a running app.
- Workflow setup follows [GitHub's Node.js CI documentation](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).

## Existing performance measurement

The app before documentation-only open-source packaging was measured on an Apple M5 Pro (18 CPU / 20 GPU cores), 64 GB memory, Chrome 155.0.8059.82, 1440 × 900, device scale 1, standard graphics.

A 60-second continuous replay with KITE-01 preview averaged 59.95 fps. A 20-second paused active-release drawing sample averaged approximately 60 fps. Five repeated time/selection cycles left geometry counts at 456 and texture counts at 6; no console/page/shader errors were captured.

These are measurements from one laptop. They are not minimum hardware requirements, browser heap-leak proof, a WAN-load benchmark or a full accessibility audit.

## Reproduce

Run the app, then `npm run verify`. The script creates fixed screenshots and a machine-readable report under ignored `artifacts/`. It takes more than 80 seconds because it includes the timed samples.

All media distributed in docs/media is captured from Ember Scope itself. Original reference footage and comparison boards are intentionally absent.
