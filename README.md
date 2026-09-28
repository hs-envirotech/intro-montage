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
