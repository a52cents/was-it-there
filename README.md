# Was It There?

**Was It There?** is a browser-based 3D observation game built with Vite,
strict TypeScript, and Three.js. The current playable route contains ten
connected rooms, FPS controls, capsule/Octree collisions, deterministic anomaly
baselines, off-scene room preloading, center-screen reporting, blackout
transitions, procedural audio, a development Level Builder, and the standalone
platform adapter.

Current milestone: complete ten-room Story route with three explicit endings

## Prerequisites

- Node.js 24 LTS (`>=24 <25`)
- pnpm 11.11.0

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Tests and static checks

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Build

Create the standalone static build with relative asset paths:

```bash
pnpm build:standalone
```

## Preview

```bash
pnpm preview
```

The production preview serves the generated `dist/` directory. The application
does not require a backend or make platform network requests.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the
standalone site whenever a commit is pushed to `main`. After pushing the
repository, open **Settings > Pages** on GitHub and select **GitHub Actions** as
the publishing source. The workflow can also be started manually from the
**Actions** tab.

## Documentation

The official design, technical, art, asset, and development documents are in
[`docs/`](./docs/). They are the source of truth for future milestones.
The visual and narrative cleanup checklist is maintained in
[`docs/room-detail-audit.md`](./docs/room-detail-audit.md).

## Current state

Phase 3.8 completes the playable greybox loop. After observation and blackout,
the player reports changes with a central raycast, contextual reticle, counters,
feedback, and procedural sounds. Wrong reports and timeouts add errors and time
penalties; late timers progressively erase the room and the third error erases
the player before the reconstruction screen. Finding every change unlocks and
animates the exit door, removes its physical blocker, reveals a small illuminated
landing, and lets the player cross a real threshold. Crossing stops the run and
opens `YOU GOT OUT` with active time, penalties, final time, errors, and a perfect
run indicator. Both replay actions restore the room, door, anomaly, errors,
penalties, player, and timers. Development builds expose these states in the
debug panel; production builds omit the debug UI.

Gate C is accepted with the owner's playtest feedback routed into Phase 5. The
final-room asset selection contains 16 lightweight production GLBs from the
CC0 Kenney Furniture Kit and KayKit Furniture Bits packs. A reusable import
pipeline now loads and caches GLBs,
resolves stable named nodes and materials, builds collision roots, registers
multi-volume anomaly targets, restores initial room state, and releases shared
resources through reference counting. Phase 5.3 now includes the final bedroom
architecture: a lightweight wood floor, reusable baseboards and crown molding,
paneled doors and thresholds, a framed window, radiator, wall fixtures, and a
ceiling fixture. The bed, wardrobe, nightstand, and TV cabinet are loaded as GLB
models and transactionally replace their primitive visuals. Existing gameplay
collisions remain unchanged, and room remounts release then reacquire the shared
assets. The television, chair, plant, picture, lamp, and books now use their
final models while retaining stable anomaly ids and interaction volumes.
Material-filtered color variants affect only the intended parts of each model.
The primitive rug is now replaced by its final model, and a low bookcase holds a
radio and a small KayKit photo frame against the south wall. Material palette
harmonization gives every imported instance consistent muted wood, fabric,
foliage, metal, and textured-atlas treatments while leaving cached sources
untouched. The bedroom now uses a warm shadow-casting ceiling spotlight, soft
ambient and window fills, static shadow invalidation, and lightweight emissive
practical shades. Only the main light casts shadows at 1024 × 1024. Final room
validation shortens observation to 10 seconds, lightens the wood floor, restores
wall shadows for the bookcase vignette, and expands reporting to fourteen
furnishings with deterministic color variants. Final room audio ambience is the
last controlled pass: a lightweight procedural room tone now runs through the
Web Audio mixer, alongside distinct blackout, light-return, report, door-unlock,
and door-opening cues. Phase 5.4 now starts with a development-only 3D Level
Builder: scene picking and hierarchy selection, orbit navigation, transform
gizmos, before/after state capture, variant validation, preview/restore, and a
versioned JSON import/export format. Usage is documented in
[`docs/level-builder.md`](./docs/level-builder.md). Those exports now feed a
checked-in bedroom catalog that is validated against the final scene and merged
into deterministic runtime generation. All six authored kinds are supported;
the authored JSON catalog is currently empty. A complementary automatic catalog
gives all 14 playable objects hide, show, two moves, and two color variants,
plus ±10° rotations where spatially credible. The final room exposes 100
prepared variants, with synchronized collision updates for the bed, wardrobe,
and TV cabinet.

The built route now includes all ten canonical rooms: bedroom, bathroom,
L-shaped corridor, office, kitchen, dining room, living room, laundry room,
entrance corridor, and main hall. Chapter Two traces Noah's recording, the
discarded copies, and the false front door before opening the archive. Three
physical final choices resolve `ESCAPE`, `REMEMBER`, or `REPLACED`; no hidden
score selects the ending. The last two rooms use replaceable procedural layouts
so their visual arrangement can be rebuilt later without rewriting gameplay or
story. Rooms preload off-scene and transfer into gameplay without recreating
their GLB instances.

The audit decisions and validation evidence are recorded in
[`docs/GATE_B_REPORT.md`](./docs/GATE_B_REPORT.md) and
[`docs/GATE_C_REPORT.md`](./docs/GATE_C_REPORT.md), with the three-room route
validation in [`docs/GATE_E_REPORT.md`](./docs/GATE_E_REPORT.md). External asset provenance is
tracked in [`docs/ASSET_LICENSES.md`](./docs/ASSET_LICENSES.md).
