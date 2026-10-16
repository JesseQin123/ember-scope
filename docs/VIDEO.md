# Video introduction

## Short English introduction

Meet Ember Scope, an open-source, interactive wildfire visualization. Explore a fictional mountain landscape, replay four days of fire progression, inspect six simulated drones, and follow thirteen response resources. One shared timeline keeps every scene and chart in sync. Everything you see is synthetic, reproducible and ready to explore locally.

## Walkthrough

The bundled clip is a screen recording of this repository's application. It has no narration, music or original FireTrace footage.

1. **Incident:** play an irregular fire forward through the mountain scene.
2. **Drone:** select KITE-01, inspect its optical camera, then switch to IR and Thermal.
3. **Resources:** follow T-101 through a scripted retardant release.
4. **Map:** return to Incident and switch to the 2D topographic view.

The preview GIF is a reduced-resolution excerpt of the same recording. The MP4 is the clearer full clip. All visible numbers and operational states are synthetic.

## Record it again

Install Google Chrome and FFmpeg, run the development server, then:

```sh
npx playwright install ffmpeg
npm run demo:record
```

The script records a local browser interaction sequence and writes its raw WebM to ignored `artifacts/demo/`. It saves an overview image and automatically encodes the MP4 and GIF in `docs/media/` using FFmpeg. Override the server with `EMBER_BASE_URL` when necessary.

## Inspiration

The design study was inspired by [Dilum Sanjaya's FireTrace video](https://x.com/DilumSanjaya/status/2108241054298415258). That video is an external reference only. This repository contains no copy of the original footage, frames, code or branding, and claims no affiliation.
