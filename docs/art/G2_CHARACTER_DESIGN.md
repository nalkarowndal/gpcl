# G2 — Original Character Pixel Art & Animation

G2 builds on the completed G1 PNG/JSON atlas pipeline without replacing the existing GPT Monitor, companion window, taskbar geometry or pet behavior. All four residents are **fictional NPCs**. Their actions are autonomous and must never be described as a real agent's tool execution.

## Characters & art direction

| Resident | Silhouette and face | Clothing, accessory, signature |
|---|---|---|
| **Mimi** | Double plum hair buns, ribbon clip | Coral-rose cardigan, cream buttons, rosy cheeks |
| **Nori** | Messy auburn short crop and round glasses | Sage-green hoodie, pale drawstring, slate trousers |
| **Pico** | Mint bob and lavender headphones | Purple overalls with metal buttons and a star charm |
| **Luna** | Honey side braid and asymmetrical beret | Apricot cardigan, pale collar, turquoise cap and pin |

Each original sprite was constructed with hand-specified pixel shapes and materials in `scripts/g2-characters.mjs` (a **code-authored sprite source**), not copied from any commercial game. The generated `*.png` + `*.json` output is fully reproducible using Node.js alone. No Aseprite license is required for this generator. Future hand-painted replacements may use G1's `art:export` CLI.

### Resolution and frame contract

- Each resident: **32×48px** logical RGBA sprite, transparent background.
- Anchor: feet origin `{x:16,y:45}`. No frame may rotate or trim.
- Padding: 2 transparent pixels around every frame, 12 atlas columns.
- Every resident: **66 frames** across **12 named animations**.
- Exactly four character atlases and the G1 cat atlas: 5 total assets.
- This is pixel-art nearest-neighbor scaling, with no linear blur. Room and Taskbar use exactly the same assets.
- A sprite missing, damaged or incompatible with the runtime must fall back to the previous procedural resident *individually*, never crashing the companion.
- The character frame timer is per-resident `actionAge` in simulation time, not 30fps display frames.
- Side/facing is determined from actual movement direction, whereas ChatGPT/Codex state remains separate.

## Animation tag contract

| Tag | Frames | Default per-frame duration | Visual content |
|---|---:|---:|---|
| `idle` | 4 | 230ms | breathing / eye blink and shimmer |
| `walk_down` | 6 | 100ms | alternating feet, facing camera |
| `walk_up` | 6 | 100ms | back-hair view |
| `walk_left` | 6 | 100ms | profile left |
| `walk_right` | 6 | 100ms | profile right |
| `work` | 6 | 145ms | keyboard/notebook gestures |
| `coffee` | 8 | 165ms | mug lifted and lowered |
| `read` | 6 | 175ms | open book, page shift |
| `chat` | 4 | 230ms | wave and tiny speech bubble |
| `rest` | 4 | 340ms | sleeping face and breath |
| `plant` | 6 | 155ms | small watering can |
| `sit` | 4 | 220ms | tucked knees and seated silhouette |

Real movement selects the matching `walk_*` direction; stationary actions select the task tag. If a tag is missing, the runtime falls back to `idle`/legacy pixel resident without treating it as a real GPT event.

## Actual implementation

1. `scripts/g2-characters.mjs`: original pixel drawing source, 4 named profiles, 12 action cycles, PNG encoder and atlas JSON. No internet, no third-party animation assets.
2. `scripts/validate-art.mjs`: assert all four atlases, feet pivots, total frames, required actions and PNG dimensions.
3. `public/engine/character-animation.js`: name/direction/action selection + deterministic elapsed time.
4. `public/mini-scene.js`: draw sprites in Room and Taskbar while retaining per-resident procedural fallback; movement updates facing and action timer.
5. `public/mini.js`: decode all four in parallel without blocking other characters if one sheet fails.
6. `public/art-preview.html`: 6× actual pixel gallery for all four residents, with selectable 12 animation cycles.
7. `test/g2-character-sprites.test.mjs`: decode raw PNG IDAT and compare it to the original pixel matrix; verify no transparent padding bleed, unique silhouettes, expressions, frame tables, direction mapping, scene integration and missing-asset behavior.

## Development and delivery

```powershell
npm run art:build
npm run art:validate
npm test
npm start
```

Visit <http://127.0.0.1:3333/art-preview.html> for real animated sprite visual inspection.
The Windows x64 portable executable is packaged with `npm run build:portable` and is released as v4.2.0.

**G2 QA gate**: Only merge to main when Node tests and Windows portable packaging pass.
Code-level test completion does **not** mean that a human has performed visual inspection at all DPI settings. A Windows desktop screenshot audit on 100%, 125%, 150% and smallest window dimensions is still advised before marking production artwork polished.

## G3 boundary

G2 focuses on the **four residents** and their movement and activity poses.
Furniture rebuild, cutout masks, y-depth furniture occlusion and lighting belong to **G3/G4**. G2 art is generated using a code-authored pixel drawing script; future .aseprite artist originals can replace these images while retaining the same manifest contract.
