# Contributing to Ember Scope

Thanks for helping improve this independent synthetic visualization.

## Local setup

Use Node.js 22.12+ and npm. Run `npm ci`, then `npm run dev`. Before submitting a change, run `npm test` and `npm run build`. For interaction changes, install Google Chrome and run `npm run test:e2e` while the development server is running.

## Pull requests

1. Open an issue for a substantial change, explaining the problem and proposed behavior.
2. Keep changes focused and describe what changed, why, and how it was checked.
3. Add or update meaningful tests when simulation rules or interaction behavior changes.
4. Include before/after captures from Ember Scope for visual work. Do not upload unlicensed reference media.
5. Keep README translations aligned when changing setup instructions or features.

## Project contracts

- Keep one shared deterministic clock. Never drive scene state with unseeded randomness or independent wall-clock animation.
- Preserve the permanent synthetic-data labels and explain new simulated metrics.
- Do not add real emergency guidance, vehicle commands or unsupported predictive claims.
- Record asset provenance and retain third-party license notices.
- Keep secrets, private data, reference footage, dependencies and generated build output out of Git.
- Respect others. Critique ideas and code constructively, and avoid harassment or personal attacks.

By submitting a contribution, you agree that your contribution can be distributed under the project's MIT License. Only contribute material you have the right to share.
