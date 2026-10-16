# Guided video introduction

## The story

Start with the fire. Watch four fictional days unfold in an eight-second timeline sweep, from 1.95 to 444.82 hectares. Then select a drone to inspect that same event through optical, infrared and thermal views. Follow a tanker as it releases retardant and switch to its cockpit. Finally, compare the 2D map and rewind the archive to show that the scene and its metrics reconstruct together.

The full clip is approximately **40 seconds**, with English chapter titles, transition cards, control highlights and explanatory captions. It has no spoken narration or music. The **11-second GIF** focuses on the complete fire progression and links to the full MP4.

## Chapters and visual cues

| Time | Chapter | Explanation |
| --- | --- | --- |
| 00:00–00:12 | Fire progression | The orange timeline highlight directs attention to the scrubber. The large date/area readout is copied from the app. The full 0–3600 playhead is swept in about eight seconds. |
| 00:12–00:21 | Drone inspection | A transition card introduces camera + telemetry. KITE-01 is selected; its enlarged, highlighted preview shows EO, white-hot IR and then Thermal. Captions explain relative heat. |
| 00:21–00:32 | Aircraft response | A transition card introduces the aircraft. Chase view shows T-101 lining up and releasing the red plume, with the falling load and visible ground trace. The last shot switches to cockpit. |
| 00:32–00:40 | Map + rewind | A transition card explains the move to 2D. The final fire rewinds to Day 2 (47.46 ha), then returns to Day 5 (444.82 ha). |

All terrain, incidents, sensor views and operations are synthetic. The large fire readout uses the app's exact area selector. The recording accelerates timeline scrubbing; it does not imply an extra application playback speed or physically realistic fire spread. The tanker sequence also seeks through the same deterministic archive. No independent fire animation, fake metrics or replacement scene images are added.

Titles and highlights are recording-only presentation elements surrounding the real interactive app. They do not modify the application's normal UI. The main view, timeline, sidebar and charts remain visible.

## Record it again

Install Google Chrome and FFmpeg, run the development server, then:

```sh
npx playwright install ffmpeg
npm run demo:record
```

Override the local server with EMBER_BASE_URL when necessary. The recorder writes raw WebM, nine checkpoint screenshots and a storyboard report under ignored artifacts/demo/. It encodes the full MP4 and the short fire-progression GIF into docs/media/. The overview PNG is a separate, unannotated application screenshot.

The storyboard report records the actual chapter start times, scenario coordinates and relevant area values. The recorder fails if a browser page error occurs. Application regression tests remain separate from media capture.

## Inspiration and provenance

The application was inspired by [Dilum Sanjaya's FireTrace video](https://x.com/DilumSanjaya/status/2108241054298415258). That video is an external reference only. This recording uses only Ember Scope running locally, with no original footage, reference frames, third-party music, branding or endorsement.
