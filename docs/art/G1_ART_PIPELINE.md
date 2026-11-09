# G1 · Pixel Art Production Pipeline / 아트 규격

Status: **G1 implementation** · Owner: GPT Pixel Office · Repository: `nalkarowndal/gpcl`

## Scope and completion criteria

G1 builds **the tools and standards** for G2 (real character sprite replacement), G3 (furniture), G4 (effects), and G5 (taskbar-scale graphics). It does **not** claim completion of character illustration or room redesign. The existing procedural scene remains a fully functional fallback.

**Acceptance checks**
1. All 3 palette files parse and have identical semantic roles, unique valid #RRGGBB colors per theme.
2. A versioned atlas JSON format validates source rectangles, pivot, duration, animation references and PNG IHDR dimensions; paths cannot escape the asset folder.
3. A reproducible, **original** 32px cat test sprite sheet is generated together with manifest and PNG by `npm run art:build`; `art:validate` must reject missing, out-of-bounds or malformed assets.
4. `public/engine/atlas.js` can load the asset, pick frame by elapsed milliseconds, and render with nearest-neighbor and integer coordinates. If asset loading fails, the procedural cat still appears.
5. Simulation time and paint FPS are separate: fixed-step updates prevent slow-motion movement on 30fps capped windows.
6. HTTP asset paths, browser compatibility, older dashboard, Windows portable build and VSIX build stay intact. Unit tests + CI + Windows portable package must pass.

## Style bible

| Property | G1 contract |
|---|---|
| Projection | Room: 2:1 isometric, tile footprint 32×16px; taskbar: frontal pixel side-view |
| Scene logical resolution | 480×290 (room) / 480×122 (taskbar). CSS scales to fit; logical pixels are integers |
| Character target | ~24×40px, consistently aligned to bottom-center feet pivot |
| Companion target | Cat 32×32px with origin at (16,29); animations independently from GPT activity |
| Objects | Semantic layer groups: Background / Floor / Furniture-Back / NPC / Furniture-Front / Lighting-FX / UI |
| Palette | Fixed semantic roles below (outline, wood, textile, skin, foliage, light). Limit local ramps to 3–5 colors |
| Edge treatment | 1px colored outlines, no auto-smoothed outlines; hard shadows only, optional restrained light overlays |
| Source of truth | Keep layered `.aseprite` source in `assets-source/`; output PNG and manifest under `public/assets/generated/` |
| License | Originals only or documented explicit commercial redistribution permission, never scrape commercial game sprites |
| Performance | Canvas 2D first, update in fixed steps, draw ≤30fps while visible; render via nearest-neighbor, atlas caching |

## Color roles

The three theme JSON files under `public/assets/palettes/` implement the same role interface:
`outline`, `shadow`, `wallLight`, `wallShade`, `floor`, `woodDark`,
`woodMid`, `woodLight`, `textile`, `skin`, `foliage`,
`foliageShade`, `lamp`, `window`, `highlight`.
Always call these semantic keys rather than scattering independent palette constants through new art code.
Each theme must remain readable with the room at its **smallest supported desktop window size**.

## Manifest `gpcl-atlas/v1` (canonical generated format)

```json
{
  "format": "gpcl-atlas/v1",
  "image": "cat-demo.png",
  "size": {"w": 128, "h": 32},
  "frameSize": {"w": 32, "h": 32},
  "origin": {"x": 16, "y": 29},
  "frames": [
    {"name": "idle_0", "rect": {"x": 0, "y": 0, "w": 32, "h": 32}, "duration": 200}
  ],
  "animations": {"idle": {"frames": ["idle_0"], "loop": true}},
  "credit": {"creator": "GPT Pixel Office", "license": "original-project"}
}
```

All frames are unrotated and untrimmed in G1, `duration` uses integer **milliseconds** in [50,2000],
`origin` uses pixels from frame top-left and is inclusive inside the frame dimensions.
Per-frame rectangle must be fully inside the image. Matching names and valid animation references are mandatory.
Use PNG RGBA (8-bit color type 6), with frame padding ≥1px for newly authored atlas sheets.

Runtime load uses `/assets/generated/cat-demo.json`. If it cannot load or fails validation, the existing
`mini-scene.js` procedural cat remains visible; missing assets cannot break the UI.

## Aseprite source authoring

Original files go in `assets-source/{characters,pets,environment}/`, e.g. `assets-source/pets/cat.aseprite`.
For new work, use frame tags (`idle`, `walk_front`, `walk_back`, `work`, `rest`), specify the bottom-center
pivot, and keep palette ramps consistent.
Layer names: `base`, `shadow`, `details`, `highlights` (optional `fx` for temporary particles).

Export with Aseprite CLI (requires a licensed local installation, **not needed** by CI):

```powershell
npm run art:export -- assets-source/pets/cat.aseprite public/assets/generated/cat --pivot 16,29
```

The export wrapper calls `aseprite -b --list-tags --format json-array --sheet-type rows --data ... --sheet ...`
and converts the raw Aseprite metadata to the canonical G1 manifest. Set `ASEPRITE_BIN` to the real
Aseprite executable path if it is not in PATH. Raw Aseprite metadata remains alongside the generated atlas
for auditing, and the normalized manifest is validated. This command is for **real source artwork**; the
`cat-demo` programmatic fixture is only a proof of the pipeline and is not a final G2-quality illustration.

## Repeatable local commands

```powershell
npm run art:build
npm run art:validate
npm test
npm run build:portable
```

`art:build` emits self-contained PNG+JSON test art without external NPM packages.
`npm test`, `npm start`, and the portable package build prepare generated proof assets.
`art:validate` tests every canonical atlas under `public/assets/generated/` and palette files.
No third-party commercial sprites are included.

## G1 visual verification gallery

Run `npm start` then open <http://127.0.0.1:3333/art-preview.html>. The page fetches the real
3 palette JSONs, the generated cat PNG/JSON atlas, and displays the same animated frames at
2×/4×/8× scaling with integer grid nearest-neighbor. It reports missing/malformed art instead of
silently pretending success. This gallery is a **human visual QA aid**, not automated Windows GUI validation.

## Rendering and QA requirements

- Do not use CSS `filter: blur` for sprite source pixels. A **separate** soft lighting overlay is permitted.
- Quantize to integer world-pixel coordinates before `drawImage`, round frame origins, `imageSmoothingEnabled=false`.
- No frame may be drawn outside atlas bounds; 125%/150% Windows DPI can produce uneven scaling, so visual QA is required.
- Detect flipped x/y and cropped wrong sprite through deterministic frame test screenshots (future G2/G3).
- Make the `room` and `bar` variants share assets and one validated manifest instead of duplicate sprite code.
- Do not claim visual quality acceptance based on CI alone. Windows GUI screenshot checks should be added in G2.
- **G1 gate:** only call G1 complete after validator + unit suite + Windows packaging pass. G2 starts separately.
