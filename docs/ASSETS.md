# Generated asset provenance

- File used by the app: `public/assets/alpine-ground.jpg`
- Original: generated PNG, kept in the private working archive; the runtime JPEG is included here.
- Created: 2026-10-16 using the available image-generation tool. The tool did not expose a specific model version; none is invented here.
- Actual original size: 1254 × 1254 pixels (requested a square texture).
- Transparency: opaque.
- Derivative: converted with macOS `sips` to JPEG at quality 80. No third-party photo or reference screenshot was used as input.
- Use: repeating terrain albedo and bump detail, plus a visibly labeled fallback texture when WebGL cannot initialize. Interactive terrain, trees, burn field, models and cameras are code, not the generated image.

Prompt:

> Create a seamless square 1024 x 1024 game environment albedo texture viewed perfectly top down. Fine-grained dry alpine terrain: subdued gray olive rock, weathered slate, small sandy ochre soil patches, very sparse dark moss speckles. Photorealistic fine detail, even diffuse flat lighting, no shadows, no horizon, no objects, no trees, no labels, no text, no roads, no strong patterns. Designed to repeat unobtrusively on a procedural 3D mountain terrain in a dark wildfire analysis visualization. Muted low-contrast earth texture. Opaque background.

No paid services were purchased. No external asset requests occur at app runtime.

## Generated smoke sprite — visual revision 2

- App file: `public/assets/smoke-puff.png` (512 × 512 RGBA).
- Original: 1254 × 1254 RGBA generated PNG, kept in the private working archive; the runtime derivative is included here.
- Created 2026-10-16 with the available image-generation tool; model version not exposed.
- True transparent background; resized with macOS `sips`. No reference screenshot or third-party photo was supplied to the model.
- Used on 48 camera-facing smoke sprites. Position, rise, wind drift, rotation, scale and opacity are deterministic functions of the shared simulation time and active fire cells. This is a visual particle treatment, not volumetric fluid simulation.

Prompt:

> Create a production VFX texture sprite: one isolated soft volumetric wildfire smoke puff, realistic turbulent billowing lobes, wispy irregular feathered outer edges fading completely into transparency, warm pale ash gray, subtly darker interior creases, evenly diffuse lit without cast shadow, no fire, no ground, no scene, no text. Centered single cloud fills 85 percent of square 1024x1024 canvas. This will be used on camera facing particles in a real-time 3D mountainous wildfire simulation. True transparent background.

## Procedural terrain field — visual revision 2

`src/data/terrain-heightfield.json` is original code-generated geometry data, not an image-model asset or real DEM. Regenerate with `node scripts/generate-terrain.mjs`: seed 42, seven noise octaves, 75,000 erosion droplets, 384 × 384 segments. Generated images provide surface detail and smoke only; they do not replace the interactive scene.

## Final reference-scope use

The same generated transparent smoke sprite now also supplies aircraft retardant/water release particles, tinted in the renderer. No new external photographs or models were used. Reservoir, river geometry and ripple shader, irregular fire arrival field, resource models, deposit ribbons and cameras are authored code. No original FireTrace reference screenshots or video are distributed in this repository.
