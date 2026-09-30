# Envirotech: 60-second brand film

A cinematic corporate introduction for Envirotech, built in [Remotion](https://www.remotion.dev/)
(React + three.js). It renders to MP4 at 1920×1080, 30 fps, 60 s.

> Envirotech delivers integrated water and wastewater solutions from engineering through operation.

## Render it on your own computer

You need [Node.js](https://nodejs.org/) 22.6 or later (the LTS installer is fine) and Git.

```bash
git clone https://github.com/hs-envirotech/intro-montage.git
cd intro-montage
git checkout claude/laughing-faraday-amnihv
npm install

npm run studio        # preview in the browser at http://localhost:3000
npm run render:gpu    # render out/envirotech_intro_v3.mp4 using your graphics card (fastest)
npm run render        # same, software 3D: slower, works on any machine
npm run render:review # out/envirotech_intro_v3_review.mp4 with VO subtitles + placeholder tags
```

The first render downloads Remotion's own headless Chrome (about 100 MB). With a GPU, a full render
typically takes a few minutes; in software mode it can take about an hour. If `render:gpu` fails or
gives black 3D frames on your machine, use `npm run render`.

## Music: "Confluence" (original score)

The film has its own score, composed and synthesised in code by `scripts/compose_score.mts`
(`npm run score` rebuilds `assets/music/envirotech_score.wav`). It is original, so there are no
licensing issues.

**Concept: tributaries joining into one river.** A single four-note motif, **D – A – E – F**, is
born as the water droplet in the dark: the droplet sounds D, the ripple A, the rebound E, the
settling F. Each movement then adds a voice built from that same motif:

| Time | Picture | Score |
|---|---|---|
| 0–7 s | Droplet, underwater | Low drone. The motif rings out as droplet and bell tones. A sub-bass pulse and two taiko hits lead into the downbeat. |
| 7–17 s | Technology | A braam and taiko open the section. Driving low string 8ths, bass pulse and a plucked motif arpeggio with echo. Hydraulic whooshes mark each process change (UF → RO → desalination → reclamation). |
| 17–24.5 s | Engineering | Full backbeat and taiko. The motif becomes a 16th-note string ostinato. Steel impacts land on ENGINEER, INTEGRATE and DELIVER. |
| 24.5–34.5 s | Delivery lifecycle | Four-on-the-floor, rolling bass and a taiko ensemble. A braam and impact on each phase change (on the bar lines), then a bigger hit on EPCC · O&M · BOT. |
| 34.5–37 s | Industries | A bell tick for each sector as it appears, and a taiko roll building into the projects. |
| 37–47 s | Projects | Choir enters. A wide lead sings the motif over the strings. Glassy ticks play the motif as the PRPC figures count up. A taiko and tom fill leads into the climax. |
| 47–54 s | Silverstreams | The largest moment. The tempo pushes from 96 to ~103 BPM, taiko go to full 16ths, a braam hits every bar, and a riser and snare build run under the data-centre campus reveal. The harmony stays suspended (Dsus4) and never resolves. |
| 54 s | The cut | Everything stops. Reverb and echoes are gated too, so the silence is real (below −60 dB within a tenth of a second). |
| 56–60 s | Logo | Three bell notes, **D – A – E**, follow the aqua light tracing the logo. When the logo lands, the fourth note arrives transformed: **F becomes F♯**. The minor motif resolves to major only this once, with one deep impact (taiko, boom and a D-major braam) and a soft choir under the slogan "Securing water for the next generation". |

Key D minor (Dorian colour), 96 BPM. One bar is 2.5 s (75 frames), so bar lines fall exactly on the
scene boundaries at 7, 17, 24.5, 34.5, 37 and 47 s. If you change scene lengths, keep scenes 2–6 at
multiples of 2.5 s, or the script will stop with an error, then run `npm run score` again.

**Using a different track:** drop any audio file (`.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`) into
`assets/music/` and it replaces the score automatically, faded out over the last 1.5 s. Set
`ASSETS.musicStartSec` in `src/config.ts` to skip into the track. Use only music you're licensed for.

## The film

| Time | Movement | What happens |
|---|---|---|
| 0–7 s | 1 · Water / origin | Darkness, then a rim-lit droplet falls in slow motion onto still water. The ripple spreads, the camera dives under the surface, and suspended particles organise into membrane fibres. "WATER". |
| 7–17 s | 2 · Water technology | **UF**: a hollow fibre retains solids while permeate passes. **RO** (centrepiece): the pressure-vessel rack, high-pressure pump, and feed, permeate and concentrate flows. **Desalination**: a seawater intake leading to a coastal plant. **Water reclamation**: raw water → treatment → purified water → reuse. |
| 17–24.5 s | 3 · Technology to engineering | Equipment assembles outward from the RO trains into one integrated plant. Water flows through the whole system as the camera pulls back to infrastructure scale. ENGINEER · INTEGRATE · DELIVER. |
| 24.5–34.5 s | 4 · Engineering through operation | One continuous tracking shot. The plant moves from DESIGN (blueprint) → ENGINEER → BUILD → OPERATE (lit, flowing, monitored), then resolves to EPCC · O&M · BOT. |
| 34.5–37 s | 5 · Industries we serve | A quick glance: Data centres · Oil, gas & petrochemical · Industrial & process · Municipal water · Desalination · Reuse & ZLD, as brand icon chips. |
| 37–47 s | 6 · Project experience | **EMAS Project**, PMC, MRCSB. Then **PRPC UF**, Pengerang, Johor: a simplified process flow drawn from the project P&ID (multimedia filtration ×8 → 1st-pass RO ×3 → break tanks → 2nd-pass RO ×3 → mixed-bed polishing ×5 → demin water supply), with the delivered figures counting up. |
| 47–54 s | 7 · Silverstreams | A fenced DAF → UF → RO compound, then a crane move up to the data-centre campus it will supply. SILVERSTREAMS · AWARDED CONCESSION · 4 MLD SWRO desalination plant · 20+10-year BOT concession. |
| 54–60 s | 8 · Reveal | The systems become one network, pull back and fall into darkness. An aqua light traces the **official Envirotech logo**, then the slogan "Securing water for the next generation" appears. It holds, then fades to black. |

The camera language recurs throughout, moving from micro to equipment, plant, infrastructure,
campus and network. Each movement pushes through into the next rather than cutting like a
slideshow.

## Accuracy rules (built into the code)

All project facts live in `PROJECTS` in `src/config.ts`, and **only** those facts appear on screen:

- **EMAS Project**: MRCSB · Envirotech role **PMC** only. The visuals show coordination
  (interfaces, programme, documentation, site), not construction, supply or operation.
- **PRPC UF**: Pengerang, Johor · portable demineralised water treatment · ultrapure, low-silica
  water · design, supply, install, commission, O&M · 1.47 million m³ delivered · 3.6 MLD design
  capacity (150 m³/hr) · 4.0 MLD peak (167 m³/hr) · 24/7 operations. These figures come from
  Envirotech's PRPC project spotlight. The process flow follows the project's P&ID
  (HSE-PRPC-PRO-PID-001C) and plant layout (HSE-PRPC-PRO-LYT-001B). It is vendor-neutral:
  "double-pass RO", with no contractor or technology-partner names. In "PRPC UF", UF is the
  client, PRPC Utilities & Facilities, not ultrafiltration.
- **Silverstreams**: 4 MLD SWRO desalination plant (DAF → UF → RO) · 20+10-year BOT concession ·
  **awarded**. It is never labelled completed or operational, and its water routes are drawn as
  planned alignments, with no moving flow.

The capabilities (UF, RO, desalination, reclamation, EPCC, O&M, BOT) are shown as capabilities,
never as completed projects. The only figures in the film are the project facts above. It shows no
dates, values, client logos or technology-partner names. Procedural imagery is captioned honestly on screen: "Illustrative
drawing", "Illustrative diagram" or "Concept visualisation".

## Footage slots

The film is complete without footage: every slot has a procedural fallback. To use real footage,
drop a file into `assets/footage/` with the name below. `.mp4`, `.mov`, `.webm`, `.jpg` and `.png`
are all detected, as long as the name before the extension matches.

| Slot | File | Replaces |
|---|---|---|
| PRPC UF site | `assets/footage/prpc_uf_site.mp4` | the isometric drawing of the containerised units |
| EMAS Project site | `assets/footage/emas_project_site.mp4` | the coordination diagram |
| Silverstreams concept render | `assets/footage/silverstreams_render.jpg` | the 3D compound and campus |

For Silverstreams, use a concept render with no third-party branding visible: crop out, or pick a
frame without, any campus or client signage. The "Concept visualisation" caption stays on because
the plant is not built yet.

Use genuine footage from those projects only. Never use stock or generic plant footage in these
slots. In the Studio (and in `render:review`), a dashed "Footage placeholder" tag marks each empty
slot. Switch it off with the `showPlaceholderLabels` prop.

## Voice-over

There is no VO recording yet. The script and timings are in `VO` in `src/config.ts`. Turn on the
`showSubtitles` prop to review them. The reveal (54–60 s) is left without VO on purpose. If a line
runs long when recorded, shorten the line rather than speeding up the delivery.

## Project structure

```
assets/            Remotion public dir: footage/, music/, fonts/ (Manrope, Source Sans 3), logo/
scripts/           compose_score.mts: the original score "Confluence"
src/config.ts      scene timings, VO, copy, verified project facts, footage slots
src/theme.ts       palette (Deep Navy #0B2239 dominant), fonts, easing
src/three/         3D toolkit: Stage, equipment (vessels, pumps, tanks, pipes, flows), plant, particles
src/scenes/        one component per movement (+ technology/ and projects/ sub-shots)
src/components/    typography (annotations, beat words), transitions, footage slots, subtitles, music
```

Scene lengths are set in `SCENES` in `src/config.ts`. Beats inside a scene are constants at the top
of that scene's file.

## Rendering notes

3D is rendered with software WebGL (`swangle`) by default, so renders work on machines without a
GPU, including CI. `npm run render:gpu` switches to the GPU (`--gl=angle`). To use a Chrome/Chromium that is already installed, set `REMOTION_BROWSER=/path/to/chrome`.

## Known limits of the procedural draft

Everything is generated in code. The water, membrane, plant and campus shots are stylised,
physically motivated visualisations, not photoreal footage. To reach the full photoreal brief, you
can:

- drop real site footage into the slots above;
- replace individual shots with offline 3D renders (for example Blender or Houdini) or filmed
  plates, using the same timings; or
- keep the procedural shots for the technology and network sequences, where scientific
  visualisation suits them best.
