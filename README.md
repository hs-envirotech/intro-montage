# Envirotech: 60-second brand film

A cinematic corporate introduction for Envirotech, built in [Remotion](https://www.remotion.dev/)
(React + three.js). It renders to MP4 at 1920×1080, 30 fps, 60 s.

> Envirotech delivers integrated water and wastewater solutions from engineering through operation.

## Quick start

```bash
npm install
npm run studio         # Remotion Studio at http://localhost:3000
npm run render         # out/envirotech_intro_v1.mp4 (clean)
npm run render:review  # out/envirotech_intro_v1_review.mp4 (VO subtitles + footage tags)
npm run score          # regenerates the temp score from the scene timings
```

## The film

| Time | Movement | What happens |
|---|---|---|
| 0–7 s | 1 · Water / origin | Darkness, then a rim-lit droplet falls in slow motion onto still water. The ripple spreads, the camera dives under the surface, and suspended particles organise into membrane fibres. "WATER". |
| 7–17 s | 2 · Water technology | **UF**: a hollow fibre retains solids while permeate passes. **RO** (centrepiece): the pressure-vessel rack, high-pressure pump, and feed, permeate and concentrate flows. **Desalination**: a seawater intake leading to a coastal plant. **Water reclamation**: raw water → treatment → purified water → reuse. |
| 17–27 s | 3 · Technology to engineering | Equipment assembles outward from the RO trains into one integrated plant. Water flows through the whole system as the camera pulls back to infrastructure scale. ENGINEER · INTEGRATE · DELIVER. |
| 27–37 s | 4 · Engineering through operation | One continuous tracking shot. The plant moves from DESIGN (blueprint) → ENGINEER → BUILD → OPERATE (lit, flowing, monitored), then resolves to EPCC · O&M · BOT. |
| 37–47 s | 5 · Project experience | **PRPC UF**, Pengerang, Johor, portable demineralised water treatment. **EMAS Project**, PMC, MRCSB. |
| 47–54 s | 6 · Silverstreams | Wide aerial of a water facility integrated with a data-centre campus. SILVERSTREAMS · AWARDED CONCESSION · WATER INFRASTRUCTURE. |
| 54–60 s | 7 · Reveal | The systems become one network, pull back and fall into darkness. An aqua light traces **ENVIROTECH**. It holds, then fades to black. No tagline. |

The camera language recurs throughout, moving from micro to equipment, plant, infrastructure,
campus and network. Each movement pushes through into the next rather than cutting like a
slideshow.

## Accuracy rules (built into the code)

All project facts live in `PROJECTS` in `src/config.ts`, and **only** those facts appear on screen:

- **PRPC UF**: Pengerang, Johor · portable demineralised water treatment · delivered.
- **EMAS Project**: MRCSB · Envirotech role **PMC** only. The visuals show coordination
  (interfaces, programme, documentation, site), not construction, supply or operation.
- **Silverstreams**: **awarded concession**. It is never labelled completed or operational, and its
  water routes are drawn as planned alignments, with no moving flow.

The capabilities (UF, RO, desalination, reclamation, EPCC, O&M, BOT) are shown as capabilities,
never as completed projects. The film shows no capacities, dates, values, statistics, client logos
or technology-partner names. Procedural imagery is captioned honestly on screen: "Illustrative
drawing", "Illustrative diagram" or "Concept visualisation".

## Footage slots

The film is complete without footage: every slot has a procedural fallback. To use real footage,
drop a file into `assets/footage/` with the name below. `.mp4`, `.mov`, `.webm`, `.jpg` and `.png`
are all detected, as long as the name before the extension matches.

| Slot | File | Replaces |
|---|---|---|
| PRPC UF site | `assets/footage/prpc_uf_site.mp4` | the isometric drawing of the containerised units |
| EMAS Project site | `assets/footage/emas_project_site.mp4` | the coordination diagram |

Use genuine footage from those projects only. Never use stock or generic plant footage in these
slots. In the Studio (and in `render:review`), a dashed "Footage placeholder" tag marks each empty
slot. Switch it off with the `showPlaceholderLabels` prop.

## Voice-over

There is no VO recording yet. The script and timings are in `VO` in `src/config.ts`. Turn on the
`showSubtitles` prop to review them. The reveal (54–60 s) is left without VO on purpose. If a line
runs long when recorded, shorten the line rather than speeding up the delivery.

## Sound

`assets/music/envirotech_temp_score.wav` is a **temp score**. It is synthesised by
`scripts/generate_temp_score.mts` and locked to the scene timings:

- 0–10 s: atmosphere, the droplet and a sub-bass pulse.
- 10–25 s: the rhythm arrives, with hydraulic swells.
- 25–40 s: a bass ostinato and mechanical impacts.
- 40–54 s: the largest scale: pads, a faster pulse and a riser.
- At 54 s: a sudden drop, then one deep tonal impact on the wordmark before the fade.

Replace it with a composed or licensed track for release. The first audio file in `assets/music/`,
alphabetically, is used. If you change the scene timings, run `npm run score` again.

## Project structure

```
assets/            Remotion public dir: footage/, music/, fonts/ (Manrope, Source Sans 3), logo/
scripts/           temp score generator
src/config.ts      scene timings, VO, copy, verified project facts, footage slots
src/theme.ts       palette (Deep Navy #0B2239 dominant), fonts, easing
src/three/         3D toolkit: Stage, equipment (vessels, pumps, tanks, pipes, flows), plant, particles
src/scenes/        one component per movement (+ technology/ and projects/ sub-shots)
src/components/    typography (annotations, beat words), transitions, footage slots, subtitles, music
```

Scene lengths are set in `SCENES` in `src/config.ts`. Beats inside a scene are constants at the top
of that scene's file.

## Rendering notes

3D is rendered with software WebGL (`swangle`, set in `remotion.config.ts`), so renders work on
machines without a GPU, including CI. On a workstation with a GPU you can pass `--gl=angle` for
faster renders. To use a Chrome/Chromium that is already installed, set `REMOTION_BROWSER=/path/to/chrome`.

## Known limits of the procedural draft

Everything is generated in code. The water, membrane, plant and campus shots are stylised,
physically motivated visualisations, not photoreal footage. To reach the full photoreal brief, you
can:

- drop real site footage into the slots above;
- replace individual shots with offline 3D renders (for example Blender or Houdini) or filmed
  plates, using the same timings; or
- keep the procedural shots for the technology and network sequences, where scientific
  visualisation suits them best.
