# MUSE RIG — Pocket Guitar (Phase 1: FURY)

A touchscreen virtual electric guitar for Android, built as a PWA. Your phone is the
instrument: tap pads to fire heavy riffs, or play a 6-string fretboard yourself.
Everything runs through one shared guitar engine (string model → fuzz → cab → FX).

> **About the sound source.** No original or licensed guitar recordings exist yet, so
> Phase 1 uses a **temporary physically-modelled string** (extended Karplus–Strong)
> driven through a real 2×-oversampled fuzz, cab sim and FX chain. It's tuned to sound
> like an electric guitar, not a synth, but **it is not a finished sampled guitar
> tone**. The app says so in *Settings → Audio engine*. A multisample playback path
> is already wired into the same fuzz stage; see
> [Adding real guitar samples](#adding-real-guitar-samples).
>
> All riffs are original phrases written for this app. No Muse recordings,
> transcriptions or artwork are used.

---

## Quick start

```bash
cd muse-rig
npm install
npm run dev            # http://localhost:5173 on this computer
```

Open it, tap **RIFF A**, and it plays. The first touch anywhere starts the audio
engine, as browsers require. There is no splash screen.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on your LAN (HTTP). Fine on the computer itself. |
| `npm run dev:https` | Dev server with a self-signed HTTPS cert, so a phone on your Wi-Fi can use it. |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build (port 4173) |
| `npm run test:audio` | Headless Chromium smoke test (run `npm run build` first) |

## Play it on your Android phone

The audio engine uses **AudioWorklet**, which Chrome only allows in a *secure context*
(HTTPS or `localhost`). A plain `http://192.168.x.x:5173` URL will load the UI, but
audio won't start. The app shows a banner explaining this. Pick one of these:

**A. Same Wi-Fi, quickest.**
1. `npm run dev:https`
2. Note the `Network: https://<your-computer-ip>:5173/` line it prints.
3. Open that URL in Chrome on the phone. On the certificate warning, tap
   **Advanced → Proceed** (the cert is self-signed).
4. Tap a pad. *Offline install doesn't work in this mode*, because Chrome refuses
   service workers on untrusted certs.

**B. USB cable, full PWA (offline + install).**
1. Enable USB debugging on the phone and connect it.
2. `npm run build && npm run preview`
3. `adb reverse tcp:4173 tcp:4173`
4. On the phone open `http://localhost:4173`. `localhost` counts as secure.
5. Chrome menu → **Add to Home screen / Install app**. After the first load it runs
   offline.

**C. Any static HTTPS host.** Upload `dist/` to GitHub Pages, Netlify, Cloudflare
Pages or similar. All paths are relative, so a sub-path works. This gives the full PWA
with offline use and install.

Tips: use **landscape** for GUITAR and PERFORMANCE (Settings → *Fullscreen / Landscape*).
In Settings, switch **Output** to *Headphones* when you plug some in. The default *Phone
speaker* profile cuts lows that phone speakers can't reproduce anyway.

---

## What's in the app

### RIFFS (opens first, portrait 2×3 / landscape 3×2)
| Pad | Behaviour |
|---|---|
| RIFF A | Driving low-register 16th-note phrase with chromatic pick-ups and a descending power-chord turnaround. Tap to start (looped), tap to stop. |
| RIFF B | Syncopated power-chord stabs over palm-muted chugs, with a slide-down ending. |
| POWER CHORD | E5 (E-B-E). A tap rings out naturally. Hold past ~0.45 s for infinite sustain, then release to mute. |
| CHUG | Palm-muted gallop with an accent hit. |
| SUSTAIN | Endless lead E4. Vibrato fades in after ~0.7 s. Release fades it out. |
| FEEDBACK | Hold to hear the note bloom into a squealing harmonic. Release to fade. |

Controls: BPM ±, LOOP, CLICK (metronome), quantise (OFF / 16th / BEAT / BAR), STOP ALL,
and an FX-intensity slider that scales delay and reverb from 0 to 200%. Riff pads work like
clip launchers: starting one hands over from the current riff on the quantise grid.
Every riff is note events (pitch, start, duration, velocity, articulation, bend, slide,
vibrato), not audio. Tempo and tone changes apply live.

### GUITAR (landscape)
6 strings in E A D G B E, frets 0–12, with position shift up to fret 12–23.
- **TAP** (default): tap = pick. **Hold** = sustain. **Drag sideways** = slide.
  **Drag up/down** = bend (up to 2 semitones). **Wiggle** = vibrato. **2nd finger
  higher on the same string** = hammer-on. **Lift it** = pull-off.
- **STRUM**: hold frets with the left hand, and tap or swipe the red strum zone on the
  right. Velocity follows swipe speed.
- **EASY**: notes snap to E minor pentatonic, out-of-scale frets are dimmed, roots are
  marked in red, the low E/A strings play one-touch power chords, and sustain engages
  sooner.
- **POWER**: every touch plays a power chord. **MUTE**: palm-mute articulation.
  **VIB**: auto-vibrato on held notes.

### PERFORMANCE
Four compact riff pads plus a lead fretboard (frets 7–14, lead voicing with more drive
and mid push). Also:
- **EXPR**: an expression-pedal wah on the lead only.
- **FUZZ**: fuzz intensity.
- **SUSTAIN / FEEDBACK**: hold it to turn the notes you're holding into feedback. With
  nothing held, it sounds the last note you played.
- **Independent RIFF VOL / LEAD VOL**.

Start a looping riff and solo over it.

### Tone, presets, recording
- **EFFECTS** sheet: FUZZ, TONE, SUSTAIN, DELAY, REVERB, OUTPUT. Each one drives real
  engine parameters (see `src/audio/presets.ts`).
- Three presets: **FURY — MAIN**, **FURY — HEAVY** and **FURY — ATMOSPHERIC**. Each has its
  own drive range, pre-clip mid voicing, asymmetry, octave-fuzz blend, cab roll-off, delay
  division and reverb size.
- **RESET TO FURY**. Save custom presets locally (IndexedDB).
- **● REC** records the app's own post-limiter output with all effects. It never uses the
  microphone, and no permission is requested. The recordings list offers play, WAV export,
  compressed WebM/M4A export where `MediaRecorder` supports it, and delete. Recordings stop
  automatically at 10 minutes.

---

## Architecture

```
src/
  audio/
    worklets/guitar-processor.ts  string model + gate + 2× oversampled fuzz (AudioWorklet)
    worklets/recorder-processor.ts  16-bit PCM capture of the master output
    engine.ts      AudioEngine: two worklet instances (rhythm / lead) → shared FX; note API; recording
    fx.ts          tone stack, 4×12 cab sim, ping-pong delay, convolution reverb, output profile, limiter
    transport.ts   look-ahead scheduler, tempo, quantise, loops, metronome
    presets.ts     macros (FUZZ/TONE/…) → DSP + FX parameters
    samples.ts     multisample player feeding the worklet input (unused until samples exist)
    protocol.ts    main-thread ⇄ worklet message types
  packs/
    types.ts       SongPack / Preset / PadDef / Pattern types
    fury/index.ts  FURY presets, pads and original riff patterns
    index.ts       pack registry
  ui/              React components (pads, fretboard, modes, sheets)
  state/store.ts   app state, persistence, engine sync
  storage/idb.ts   IndexedDB helper
public/            manifest, service worker, icons
```

**Signal flow.** Each note is a string voice: filtered-noise pluck with a pick-position comb
→ Hermite-interpolated fractional delay → one-pole loss filter (phase-compensated so high
notes stay in tune) → T60-derived loop gain (AGC-held for sustain/feedback). 24 voices per
engine, oldest/releasing voice stolen first, per-string choke groups, and click-free
releases. Voices are summed, then go through the noise gate → tightness HPF → mid
emphasis → **2× oversampled** asymmetric tanh clip → octave-up blend → interstage filtering
→ second clip. After that come native nodes: bass/mid/treble/presence → cab → delay +
reverb → output profile → compressor-limiter → soft-clip safety → master.

**Why a PWA first.** It's instant to test on a phone with no install step. If on-device
latency turns out unacceptable, the engine's message protocol (`protocol.ts`) and pack
format port directly to a native Kotlin + Oboe engine behind a Capacitor bridge.

### Adding a song pack
Copy `src/packs/fury/`, change the presets, pads and patterns, then add it to
`src/packs/index.ts`. Patterns are plain data (`PatternEvent[]`). Only add real song
material (riffs, transcriptions, recordings) when you have the rights to it.

### Adding real guitar samples
1. Record original DI or amped notes, or license a library. Never extract them from
   commercial recordings.
2. Put the files in `public/samples/fury/`.
3. Fill `samples: SampleZone[]` in the pack with `{ url, rootMidi, loMidi, hiMidi, velLo,
   velHi, art }` for each sample.
4. Notes covered by a zone play the sample through the same fuzz/cab/FX chain. Notes
   with no zone keep using the string model.

> ⚠️ The sample path compiles but **has not been exercised with real recordings**,
> since none exist yet. Expect to tune levels, loop points and release behaviour when
> the first samples arrive. Bends and slides map to `detune`. Infinite sustain and
> feedback currently remain string-model-only.

---

## Status: what works and what doesn't

### Verified in headless Chromium (`npm run test:audio`, desktop Linux, 44.1 kHz)
Verified by driving the real UI and analysing the app's own recording:
- All 6 pads, the fretboard, slides and bends produce sound. Levels are consistent at
  about −7 to −12 dBFS RMS, with no samples ≥ 0.995 (no clipping), negligible DC, and
  no console errors.
- **String tuning**: E2, A2, A3, E4 and E5 measured within **±0.6 cents** of target.
- Feedback pad moves into its harmonic. A fretboard bend measured +1 semitone for a
  partial drag, and slides move pitch continuously.
- Hammer-on and pull-off are legato pitch changes (no re-pick). Two simultaneous touches
  on different strings sound both notes (tested with synthetic multi-pointer events).
- Production build, typecheck, HTTPS dev server.

Worklet DSP load in that headless run was ≈ 5–11 % of real-time. **That number comes
from a desktop machine. It is not a phone measurement.**

### Not yet verified, so don't assume these
- **No physical Android device testing has been done.** Latency, touch feel, speaker
  loudness and CPU/battery use on a phone are all unmeasured. The app shows the
  browser-reported latency (`baseLatency` / `outputLatency`) in the top bar and in
  Settings. Those are the browser's own figures, not end-to-end measurements.
- Whether the tone is "convincing" is a listening judgement nobody has made yet,
  and the source is still the temporary string model.
- Service-worker offline mode and PWA install. They're implemented but were not
  exercised in the headless run.

### Still to build (later milestones)
- Real multisamples (velocity layers, harmonics, string releases).
- Alternative tunings in the UI. The engine already handles them, since `TUNING` is data.
- A riff editor, and more song packs (pack system ready).
- Native Android (Capacitor + Oboe), if browser latency is too high on target phones.
- Pull-off onto a finger that was *re-picked*, rather than one that hammered from it.

---

## Manual test checklist (real Android phone)

Run through this on at least one mid-range and one budget phone, in Chrome.

**Startup & audio**
- [ ] First tap on RIFF A produces sound immediately (no second tap needed)
- [ ] Status shows LIVE. Note the reported latency in ms.
- [ ] Lock the screen or switch apps, then return: status recovers and sound works
- [ ] Incoming call / notification sound: audio resumes afterwards
- [ ] Plug and unplug headphones mid-riff: no crash. Toggle the output profile.

**Riffs**
- [ ] Each of the 6 pads works and gives visual feedback
- [ ] Two pads held with two fingers at once (POWER + SUSTAIN)
- [ ] Rapid repeated taps on POWER CHORD: no clicks, no stuck notes
- [ ] Riff A → Riff B hand-over lands on the beat (Q: BEAT and BAR)
- [ ] BPM change while looping stays in time. LOOP off plays once. CLICK is audible.
- [ ] STOP ALL silences everything

**Guitar**
- [ ] Tap notes on all strings and frets 0–12. Position shift to the upper frets.
- [ ] Slide along a string, bend up and down, wiggle vibrato
- [ ] Hammer-on and pull-off with two fingers
- [ ] Easy Mode: only scale notes sound, low strings give power chords
- [ ] STRUM scheme: fret with one hand, swipe the strum zone with the other
- [ ] Rotate the phone: layout adapts, no stuck notes

**Performance**
- [ ] Loop a riff and solo over it. RIFF VOL and LEAD VOL work independently.
- [ ] EXPR wah sweeps, FUZZ changes gain, SUSTAIN/FEEDBACK blooms held notes

**Tone, presets, recording**
- [ ] All 6 tone sliders audibly change the sound. Preset switching is click-free.
- [ ] Save a custom preset, reload the app, and it's still there
- [ ] Record 20 s, play it back, export WAV and open it in another app
- [ ] Clipping check: everything at max (FUZZ, OUTPUT, VOLUME) stays clean through the limiter

**PWA**
- [ ] Install to home screen (method B or C), turn on airplane mode, and the app still runs
- [ ] Watch battery and heat during 10 minutes of play
