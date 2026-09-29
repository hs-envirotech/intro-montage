# Envirotech intro video

A 60-second corporate intro for Envirotech (engineered water treatment, reuse & supply), built with
[Remotion](https://www.remotion.dev/) (React). Renders to MP4 at 1920×1080, 30 fps.

## Quick start

```bash
npm install
npm run studio      # opens Remotion Studio at http://localhost:3000
npm run render      # renders out/envirotech_intro_v1.mp4
npm run render:subs # renders out/envirotech_intro_v1_subtitled.mp4 (VO subtitles on)
```

## Previewing in Remotion Studio

`npm run studio` opens the Studio in your browser.

- **EnvirotechIntro** is the full 60-second film.
- The **Scenes** folder has each scene as its own composition, so you can review one scene at a time.
- **VO subtitles**: select `EnvirotechIntro` and switch on `showSubtitles` in the props panel on the
  right. The subtitles are for checking timing only. They are off by default and are not part of the
  final film.

## Project structure

```
assets/                  Remotion's public folder (see remotion.config.ts)
  footage/               drop real clips here (see "Swapping in footage")
  logo/                  envirotech_logo_white.png: used automatically
  music/                 drop one music track here: used automatically
  fonts/                 Manrope + Source Sans 3 (downloaded from Google Fonts)
src/
  config.ts              scene timings, VO lines, on-screen copy, footage shot list
  theme.ts               brand colours, fonts, easing, type scale
  EnvirotechIntro.tsx    main composition: lays the scenes out end to end
  Root.tsx               registers the compositions
  scenes/                one component per scene
  components/            Logo, Ripple, Footage (placeholder or real clip), Subtitles, Music
out/                     rendered videos
```

### Adjusting timing

Every timing lives in `src/config.ts`. Change a scene's `durationSec` and everything after it moves
along automatically, including the total length and the subtitle cues. `voInSec` and `voOutSec` set
when each VO subtitle appears, relative to the start of its scene. Animation beats inside a scene are
constants at the top of that scene's file.

## Swapping in footage

Every footage slot is listed in `SHOTS` in `src/config.ts`. To replace a placeholder, put a clip in
`assets/footage/` using the file name shown on the placeholder frame (for example
`assets/footage/swro_membrane_racks.mp4`). The clip replaces the placeholder the next time the Studio
refreshes or you render. `.mp4`, `.mov`, `.webm`, `.jpg` and `.png` are all recognised, as long as the
file name before the extension matches. Clips play muted, are cropped to fill the frame, and get a slow
push-in.

Clips should be at least 1080p, cool and clean in grade, and a few seconds longer than their slot.

## Logo and music

- **Logo:** the first file found from `ASSETS.logoCandidates` in `src/config.ts` is used, and it is
  recoloured for each background (white on navy, navy on Paper). If no logo file is present, an
  "ENVIROTECH" wordmark set in Manrope is used instead. The file supplied here is the official white
  logo from the Envirotech brand kit. Its alpha channel has been normalised so it renders at full
  opacity.
- **Music:** if `assets/music/` has an audio file (`.mp3`, `.wav`, `.m4a`, `.aac` or `.ogg`), the
  first one alphabetically is used. It fades out over the last 2.5 seconds (`ASSETS.musicFadeOutSec`).
  If the folder is empty, the video is silent.

## Fonts

The brand fonts, Manrope (headings) and Source Sans 3 (body), are the Google Fonts variable fonts.
They are stored in `assets/fonts/` and loaded with `@remotion/fonts`, so renders work without network
access and every frame uses the same font version.

## Rendering

```bash
npm run render
# or, with explicit options:
npx remotion render src/index.ts EnvirotechIntro out/envirotech_intro_v1.mp4 --crf=18
```

Remotion downloads its own headless Chrome the first time you render. To use a Chrome/Chromium that
is already installed, set `REMOTION_BROWSER=/path/to/chrome`.

## Brand rules followed

- Brand name is "Envirotech" only. No client names appear anywhere; the film shows capacities only.
- Palette: Navy `#21528A`, Sea-green `#14B096`, Aqua `#16B1C4`, Slate `#4A5C6A`, Paper `#F4F7FB`.
- Motion uses smooth easing and line sweeps only: no bounce, springs or flashy transitions.
- File names use underscores.

---

# Envirotech concert visual (LED backdrop loop)

A second, separate piece lives in `src/concert/`: **a seamless 3 min 24 s loop** designed as a
large-format LED / projection backdrop with the scale and rhythm of a stadium-concert visual. It
follows one journey of water through treatment and out into infrastructure, then resolves on
the Envirotech mark and returns to darkness. The last frame flows into the first, so it can run on
repeat for as long as the event needs.

Everything is generated procedurally with GLSL shaders (no stock footage). Each frame is a pure
function of time, so renders are deterministic and can be split across machines.

## Running it

```bash
npm run studio                 # pick EnvirotechConcert, or a single shot under "ConcertShots"
npm run render:concert:preview # quick 960×540 preview (half-resolution shaders)
npm run render:concert         # 1920×1080 master → out/envirotech_concert_loop_1080p.mp4
npm run render:concert:wide    # 3840×1080 (32:9) for unusually wide LED walls
```

Compositions:

| id | size | use |
| --- | --- | --- |
| `EnvirotechConcert` | 1920×1080 | the main 16:9 loop |
| `EnvirotechConcertUltrawide` | 3840×1080 | same loop, wider world; the brand stays centred and the same size |
| `ConcertShots/Concert-<shot>` | 1920×1080 | one shot on its own, for review |

Props (Studio props panel, or `--props`): `shaderScale` (1 = full resolution, 0.5 for fast drafts),
`labels` (`"descriptors"` = process name plus a one-line plain-English description, the default;
`"names"` = names only; `"off"`), `music` and `score` (see below), `only` (render one shot).

**Render speed.** The scripts use `--gl=swangle` (software WebGL), which works on any machine,
including servers without a GPU, but is slow: allow roughly 1–3 s per 1080p frame per CPU core.
On a machine with a GPU, swap it for `--gl=angle` (or `--gl=vulkan` on Linux) for a large speed-up.
Frame ranges can be rendered in parallel on several machines with `--frames=0-1999` etc.

## The loop

Times are from the start of the loop. 120 BPM, one bar = 2 s; the loop is exactly 102 bars.

| # | shot | start | length | beat in the music |
| --- | --- | --- | --- | --- |
| 1 | Raw water: darkness, sediment, bubbles; light rises; particles gather into a stream | 0:00 | 22 s | low energy → rising |
| 2 | Screening: monumental bar screens backlit through mist; into the intake pipe | 0:22 | 16 s | rising |
| 3 | Coagulation / flocculation: particles collide and gather into flocs inside the pipe | 0:38 | 14 s | steady |
| 4 | Ultrafiltration: flight through a forest of hollow fibres | 0:52 | 10 s | steady |
| 5 | Inside one fibre: water escaping through the porous wall | 1:02 | 8 s | building |
| 6 | UF array pull-back while pressure pulses double (the build-up) | 1:10 | 6 s | **build** |
| 7 | Reverse osmosis: hundreds of pressure vessels, stage beams, crane up and over | 1:16 | 16 s | **drop** |
| 8 | RO membrane: turbulent feed → thin membrane → calm luminous permeate | 1:32 | 16 s | high |
| 9 | Ion exchange: resin-bead landscape, ions locking onto the beads | 1:48 | 16 s | easing |
| 10 | Polishing: darkness, one clean luminous flow; noise falls away | 2:04 | 14 s | calm |
| 11 | Clean water → the whole facility: pull-back, low-angle track, orbital sweep | 2:18 | 26 s | **climax** |
| 12 | The network: sites and pipelines join and settle into a ring | 2:44 | 14 s | resolving |
| 13 | ENVIROTECH: the ring flows into the logo, holds, dissolves into a stream | 2:58 | 16 s | resolution |
| 14 | Return: into the stream, down to microscopic darkness → frame 1 | 3:14 | 10 s | restart |

All shot lengths live in `src/concert/timeline.ts`; change a `durationSec` and everything after it
moves. The musical intensity curve (`ENERGY_KEYS`) drives the light pulses (beat and downbeat
flashes through the water, beams and pipe networks). To sync to a track, set `bpm` in `CONCERT`
and keep shot lengths on whole bars; the build and the drop are at 1:10 and 1:16.

## Music

`assets/concert_music/envirotech_concert_score.mp3` is an original score written for this loop
(cinematic electronic: synth arpeggios, pulsing bass, industrial drums, synth-brass swells). It is
exactly the loop length, on the same 120 BPM grid, with the build at 1:10, the drop at 1:16, the
breakdown at 2:04, the climax hit at 2:26 and the logo landing at 3:04, and it loops seamlessly.
It plays in the `EnvirotechConcert` compositions; set `music: false` to render silent picture for a
separate playback system.

A second, arena-rock score (fuzz-guitar gallop riffs, octave-fuzz bass, stadium drums, a classical
piano breakdown, choir and a wordless falsetto lead) is in `envirotech_concert_score_rock.mp3`; pick
it with the `score` prop (`"electronic"` or `"rock"`). Its generator is
`tools/compose_concert_score_rock.py`.

The electronic score is generated by `tools/compose_concert_score.py` (Python, numpy + scipy). Edit the score there
and re-run `python3 tools/compose_concert_score.py`, then convert the WAV it writes to MP3.

## Files

```
src/concert/
  timeline.ts            shot list, BPM, energy curve
  shots.ts               per-shot camera paths and shader parameters
  EnvirotechConcert.tsx  layers the shots, crossfades, loop wrap
  BrandReveal.tsx        particles sampled from the official logo
  ProcessLabel.tsx       process names and one-line descriptors (copy lives in timeline.ts)
  camera.ts              spline helpers
  gl/ShaderCanvas.tsx    WebGL2 full-frame shader layer
  glsl/                  one shader per environment, plus common.ts (palette, noise, film finish)
```

The brand palette is defined once, in linear light, at the top of `glsl/common.ts`: Deep Navy
`#0B2239` and Envirotech Blue `#21528A` carry the darkness, Slate `#4A5C6A` the steel, and Sea Green
`#14B096` / Aqua `#16B1C4` are kept for water, light and energy. The only typography is the
ENVIROTECH logo (from `assets/logo/`) and the process labels. The labels name each stage and say in
one plain line what it does, for audiences outside the water industry; the copy is in the `label`
field of each shot in `src/concert/timeline.ts`. They appear after each environment has had a
moment on its own, and the drop, the climax hit and the logo stay free of text.

The facility, vessels and network are a stylised composite of modern water infrastructure, not any
real Envirotech site.
