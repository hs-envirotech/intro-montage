#!/usr/bin/env python3
"""
Original synthesised score for the Envirotech concert visual.

Cinematic electronic: pulsing synth arpeggios and bass, industrial drums,
big synth-brass leads and swells. Written bar-by-bar against the visual
timeline in src/concert/timeline.ts (120 BPM, 102 bars, 3:24). The render is
circular: every tail that runs past the end wraps into the start, so the
track loops seamlessly with the picture.

    pip install numpy scipy
    python3 tools/compose_concert_score.py            # writes assets/concert_music/envirotech_concert_score.wav
"""
import os
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 102
T = BARS * BAR  # 204 s, equal to the visual loop
N = int(round(T * SR))
rng = np.random.default_rng(20260929)

L = np.zeros(N)
R = np.zeros(N)
VERB_L = np.zeros(N)
VERB_R = np.zeros(N)
DELAY_L = np.zeros(N)
DELAY_R = np.zeros(N)
KICKS = []  # (time, strength) for side-chain ducking
DUCKED_L = np.zeros(N)
DUCKED_R = np.zeros(N)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    f = min(max(f, 20), SR * 0.45)
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def circ(fn, x, *a, **k):
    """Run a filter as if the signal were periodic (no click at the loop point)."""
    pad = min(len(x), 5 * SR)
    return fn(np.concatenate([x[-pad:], x]), *a, **k)[pad:]


def saw(freq, n, phase=0.0):
    """Band-limited (polyBLEP) sawtooth; freq may be a scalar or an array."""
    dt = np.broadcast_to(np.asarray(freq, float) / SR, (n,))
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt[m]
    y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt[m]
    y[m] -= t * t + t + t + 1
    return y


def env(n, a, d, s, r, hold):
    """ADSR in seconds; `hold` is the gate length."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    dec = np.clip((t - a) / max(d, 1e-4), 0, 1)
    e = np.where(t >= a, 1 - (1 - s) * dec, e)
    rel = np.clip((t - hold) / max(r, 1e-4), 0, 1)
    return e * np.where(t > hold, (1 - rel) ** 2, 1.0)


def put(sig, start, gain=1.0, pan=0.0, verb=0.0, delay=0.0, duck=False):
    """Circularly mix a mono or stereo signal into the buses at `start` seconds."""
    if sig.ndim == 1:
        l, r = sig * np.sqrt(0.5 * (1 - pan)), sig * np.sqrt(0.5 * (1 + pan))
    else:
        l, r = sig[0], sig[1]
    i0 = int(round(start * SR)) % N
    idx = (i0 + np.arange(len(l))) % N
    if duck:
        np.add.at(DUCKED_L, idx, l * gain)
        np.add.at(DUCKED_R, idx, r * gain)
    else:
        np.add.at(L, idx, l * gain)
        np.add.at(R, idx, r * gain)
    if verb:
        np.add.at(VERB_L, idx, l * gain * verb)
        np.add.at(VERB_R, idx, r * gain * verb)
    if delay:
        np.add.at(DELAY_L, idx, l * gain * delay)
        np.add.at(DELAY_R, idx, r * gain * delay)


def curve(keys, t):
    ks = np.array(keys, float)
    return np.interp(t, ks[:, 0], ks[:, 1])


# ── Harmony ──────────────────────────────────────────────────────────────────
# Pad voicings (MIDI) and bass roots, D minor.
CH = {
    "Dm": ([50, 53, 57, 62], 38),
    "Dm9": ([50, 53, 57, 64], 38),
    "Bb": ([50, 53, 58, 62], 34),
    "Bbmaj7": ([50, 53, 57, 58], 34),
    "F": ([48, 53, 57, 60], 41),
    "C": ([48, 52, 55, 60], 36),
    "Gm": ([50, 55, 58, 62], 43),
    "A": ([49, 52, 57, 61], 33),
}


def chord_at(bar):
    if bar < 38:  # raw water → build: slow and dark, 2 bars per chord
        return ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A", "A"][bar % 8]
    if bar < 54:  # RO drop: driving, one chord per bar
        return ["Dm", "Bb", "F", "C"][bar % 4]
    if bar < 62:  # ion exchange
        return ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A", "A"][(bar - 54) % 8]
    if bar < 69:  # polishing: suspended
        return ["Dm9", "Dm9", "Dm9", "Dm9", "Bbmaj7", "Bbmaj7", "Bbmaj7"][bar - 62]
    if bar < 82:  # climax: VI III VII i
        return ["Bb", "F", "C", "Dm"][(bar - 69) % 4]
    if bar < 89:  # network
        return ["Dm", "Dm", "Bb", "Bb", "F", "F", "C"][bar - 82]
    if bar < 97:  # brand: resolve onto D minor
        return ["Bb", "Bb", "C", "Dm9", "Dm9", "Dm9", "Dm9", "Dm9"][bar - 89]
    return "Dm9"


# Global intensity (mirrors ENERGY_KEYS in the timeline), in seconds.
ENERGY = [(0, .08), (10, .2), (20, .45), (23, .62), (36, .6), (40, .45), (52, .55), (62, .6), (70, .78),
          (75.9, .95), (76, 1), (92, .85), (108, .6), (124, .35), (138, .28), (146, .85), (158, 1),
          (164, .7), (178, .5), (190, .3), (T, .08)]


def energy(t):
    return float(curve(ENERGY, t))


# ── Instruments ──────────────────────────────────────────────────────────────
def pad_chord(notes, start, dur, gain, cutoff):
    n = int((dur + 2.5) * SR)
    out = np.zeros((2, n))
    e = env(n, 1.2, 0.5, 0.85, 2.3, dur)
    for k, m in enumerate(notes):
        for j, det in enumerate((-0.07, 0.0, 0.07)):
            f = mtof(m) * 2 ** (det / 12)
            v = saw(f * (1 + 0.002 * np.sin(2 * np.pi * (0.2 + 0.05 * j) * np.arange(n) / SR)), n, rng.random())
            pan = (j - 1) * 0.6 + (k - 1.5) * 0.1
            out[0] += v * np.sqrt(0.5 * (1 - pan))
            out[1] += v * np.sqrt(0.5 * (1 + pan))
    out[0] = lp(out[0], cutoff) * e
    out[1] = lp(out[1], cutoff) * e
    put(out / 6, start, gain, verb=0.55, duck=True)


def pluck(m, start, gain, cutoff, pan, dur=0.22, soft=False):
    n = int((dur + 0.1) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    if soft:
        v = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    else:
        v = saw(f, n) * 0.7 + (saw(f, n) - saw(f, n, 0.5)) * 0.3
    fe = np.exp(-t / 0.06)
    # two passes: bright attack, darker body
    v = 0.6 * lp(v, cutoff * 2.5) * fe + 0.4 * lp(v, cutoff * 0.6)
    v *= np.exp(-t / (dur * 0.45)) * np.minimum(t / 0.003, 1)
    put(v, start, gain, pan=pan, verb=0.25, delay=0.35, duck=True)


def bass_note(m, start, dur, gain, cutoff, drive):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = saw(f, n) + saw(f * 1.004, n, 0.3) + 0.5 * np.sin(2 * np.pi * f * 0.5 * t)
    fe = np.exp(-t / 0.08)
    v = lp(v, cutoff * 3, order=4) * fe + lp(v, cutoff, order=4) * (1 - fe)
    v = np.tanh(v * drive) / np.tanh(drive)
    v *= env(n, 0.004, 0.1, 0.8, 0.04, dur)
    put(v, start, gain * 0.85, verb=0.05, duck=True)


def lead_note(m, start, dur, gain, octave_double=False):
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.3) / 0.5, 0, 1)
    out = np.zeros((2, n))
    notes = [m, m - 12] if octave_double else [m]
    for mm in notes:
        for j, det in enumerate((-0.1, 0.0, 0.1)):
            v = saw(mtof(mm) * 2 ** (det / 12) * vib, n, rng.random())
            pan = (j - 1) * 0.5
            out[0] += v * np.sqrt(0.5 * (1 - pan))
            out[1] += v * np.sqrt(0.5 * (1 + pan))
    e = env(n, 0.07, 0.3, 0.75, 0.9, dur)
    bright = 1400 + 2600 * np.minimum(t / 0.25, 1) * np.exp(-t / 3)
    for c in range(2):
        out[c] = (0.6 * lp(out[c], 1800) + 0.4 * lp(out[c], float(bright.mean()))) * e
    put(out / (3 * len(notes)), start, gain, verb=0.5, delay=0.12)


def kick(start, gain):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    v = np.sin(ph) * np.exp(-t / 0.28) + 0.3 * np.exp(-t / 0.004) * rng.standard_normal(n) * 0.3
    v = np.tanh(v * 1.6)
    put(v, start, gain, verb=0.03)
    KICKS.append((start, gain))


def snare(start, gain, verb=0.35):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 250, 9000) * np.exp(-t / 0.16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06)
    put(np.tanh((noise * 0.9 + tone * 0.8) * 1.4), start, gain, verb=verb)


def hat(start, gain, open_=False, pan=0.2):
    d = 0.24 if open_ else 0.045
    n = int((d * 3) * SR)
    t = np.arange(n) / SR
    v = hp(rng.standard_normal(n), 7000, order=4) * np.exp(-t / d)
    put(v, start, gain * 1.4, pan=pan, verb=0.1)


def tom(start, gain, base=110, pan=0.0):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f = base * (0.65 + 0.5 * np.exp(-t / 0.08))
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
    put(np.tanh(v * 1.3), start, gain, pan=pan, verb=0.3)


def impact(start, gain):
    """Big hit: sub boom, crash and a burst of reverb."""
    n = int(4.5 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t / 0.15)) / SR) * np.exp(-t / 1.1)
    crash = hp(rng.standard_normal(n), 3500) * np.exp(-t / 1.4) * 0.35
    put(np.tanh(boom * 1.5) * 0.9 + crash, start, gain, verb=0.6)
    KICKS.append((start, gain * 1.2))


def crash(start, gain):
    n = int(3 * SR)
    t = np.arange(n) / SR
    put(hp(rng.standard_normal(n), 4000) * np.exp(-t / 1.1), start, gain, verb=0.35, pan=-0.3)


def riser(start, dur, gain):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # sweep a band-pass upward in blocks
    blocks = 48
    for b in range(blocks):
        a, z = b * n // blocks, (b + 1) * n // blocks
        fc = 300 * (40 ** (b / blocks))
        out[a:z] = bp(noise[max(0, a - 2000):z], fc * 0.7, fc * 1.4)[-(z - a):]
    tone = saw(110 * 2 ** (2 * u), n) * 0.15
    v = (out + lp(tone, 3000)) * u ** 2.2
    put(v, start, gain, verb=0.4, pan=0.0)


def bell(m, start, gain, pan=0.0):
    n = int(5 * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = (np.sin(2 * np.pi * f * t) * np.exp(-t / 1.8) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.6)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.25))
    put(v * np.minimum(t / 0.002, 1), start, gain, pan=pan, verb=0.7, delay=0.3)


def drone():
    """Low D that carries the loop point: identical at the start and end."""
    t = np.arange(N) / SR
    f1 = round(mtof(26) * T) / T  # whole cycles over the loop → no click at the seam
    f2 = round(mtof(38) * T) / T
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * (round(0.07 * T) / T) * t)
    v = np.sin(2 * np.pi * f1 * t) * 0.8 + circ(lp, saw(f2, N), 260) * 0.35 * lfo
    lvl = curve([(0, .4), (14, .38), (30, .1), (60, .06), (124, .12), (138, .08), (180, .12), (192, .32), (T, .4)], t)
    put(v * lvl, 0, 0.22, verb=0.2)


# ── Score ────────────────────────────────────────────────────────────────────
def compose():
    drone()

    # pads: one chord per change, level/brightness follow the energy
    bar = 0
    while bar < BARS:
        name = chord_at(bar)
        span = 1
        while bar + span < BARS and chord_at(bar + span) == name and span < 4:
            span += 1
        t0 = bar * BAR
        e = energy(t0)
        g = 0.22 + 0.25 * e
        if 62 <= bar < 69:
            g = 0.24
        if 89 <= bar < 97:
            g = 0.42
        if bar < 11:
            g *= 0.35 + 0.65 * bar / 11
        if bar >= 97:
            g = 0.25 * (BARS - bar) / 5
        pad_chord(CH[name][0], t0, span * BAR, g, 500 + 2600 * e)
        bar += span

    # arpeggio
    pattern = [0, 1, 2, 3, 2, 1, 4, 2, 0, 1, 2, 3, 5, 3, 2, 1]
    for b in range(6, 97):
        if 62 <= b < 69:
            continue
        notes = CH[chord_at(b)][0]
        tones = notes + [notes[0] + 12, notes[2] + 12]
        t0 = b * BAR
        e = energy(t0)
        cutoff = 350 + 4200 * e ** 1.5
        g = 0.1 + 0.12 * e
        if b < 12:
            g *= (b - 5) / 6
        step = BEAT / 4 if b < 89 else BEAT / 2
        steps = 16 if b < 89 else 8
        for s in range(steps):
            m = tones[pattern[s % 16] % len(tones)] + 12
            pluck(m, t0 + s * step, g * (1.0 if s % 4 == 0 else 0.75), cutoff, pan=0.35 * np.sin(s * 1.3))

    # polishing: glassy bell motif over the suspended chords
    motif = [(0, 74), (2, 69), (3, 76), (6, 72), (8, 74), (10, 81), (11, 76), (14, 69)]
    for rep in range(2):
        for beat, m in motif:
            bell(m, 62 * BAR + rep * 16 * BEAT + beat * BEAT, 0.12, pan=0.4 * np.sin(beat))
    for beat, m in [(0, 74), (4, 69), (8, 76), (12, 74)]:
        bell(m, 92 * BAR + beat * BEAT, 0.1, pan=0.3 * np.cos(beat))

    # bass
    for b in range(11, 97):
        if 62 <= b < 69:
            continue
        root = CH[chord_at(b)][1]
        t0 = b * BAR
        e = energy(t0)
        heavy = 38 <= b < 54 or 73 <= b < 82
        if b >= 89:
            bass_note(root, t0, BAR * 0.95, 0.35, 300, 1.2)
            continue
        if 82 <= b < 89:
            for q in range(4):
                bass_note(root, t0 + q * BEAT, BEAT * 0.8, 0.32, 500, 1.5)
            continue
        for s in range(8):
            m = root + (12 if heavy and s % 2 == 1 else 0)
            bass_note(m, t0 + s * BEAT / 2, BEAT / 2 * 0.85, 0.34 + (0.08 if heavy else 0),
                      250 + (1400 if heavy else 900 * e), 2.5 if heavy else 1.6)

    # leads: drop (bars 38–53) and climax (bars 73–81)
    p1 = [(0, 3, 69), (3, 1, 72), (4, 3, 74), (7, 1, 72), (8, 2, 69), (10, 2, 72), (12, 4, 67)]
    p2 = [(0, 3, 69), (3, 1, 72), (4, 3, 74), (7, 1, 77), (8, 3, 76), (11, 1, 74), (12, 4, 72)]
    for k, ph in enumerate([p1, p2, p1, p2]):
        base = (38 + 4 * k) * BAR
        for beat, dur, m in ph:
            lead_note(m + (12 if k == 3 and beat >= 8 else 0), base + beat * BEAT, dur * BEAT * 0.95, 0.2)
    pc = [(0, 2, 74), (2, 2, 77), (4, 3, 72), (7, 1, 74), (8, 4, 76), (12, 4, 74)]
    for k in range(2):
        base = (73 + 4 * k) * BAR
        for beat, dur, m in pc:
            lead_note(m, base + beat * BEAT, dur * BEAT * 0.95, 0.24, octave_double=True)
    lead_note(74, 81 * BAR, 2 * BAR, 0.2, octave_double=True)
    # the brand: one long, restrained statement as the logo resolves
    for beat, dur, m in [(0, 4, 69), (4, 4, 72), (8, 8, 74)]:
        lead_note(m, 90 * BAR + beat * BEAT, dur * BEAT * 0.95, 0.12)

    # drums
    for b in range(11, 89):
        t0 = b * BAR
        full = 38 <= b < 54 or 73 <= b < 82
        for q in range(4):
            tq = t0 + q * BEAT
            if 11 <= b < 19:
                if q in (0, 2):
                    kick(tq, 0.45)
                hat(tq + BEAT / 2, 0.05)
                if q == 3 and b % 2 == 1:
                    tom(tq, 0.25, 90)
            elif 19 <= b < 26:
                kick(tq, 0.5)
                hat(tq + BEAT / 2, 0.07)
                if q in (1, 3):
                    snare(tq, 0.12, verb=0.5)
            elif 26 <= b < 35 or full:
                kick(tq, 0.62 if full else 0.55)
                if q in (1, 3):
                    snare(tq, 0.36 if full else 0.28)
                for s in range(4):
                    hat(tq + s * BEAT / 4, 0.07 if s % 2 == 0 else 0.04, pan=0.25)
                if full:
                    hat(tq + BEAT / 2, 0.08, open_=True, pan=-0.2)
            elif 35 <= b < 38:
                # the build: snare roll accelerates into the drop, then a breath of silence
                kick(tq, 0.55)
                div = {35: 2, 36: 4, 37: 8}[b]
                for s in range(div):
                    ts = tq + s * BEAT / div
                    if ts >= 37.75 * BAR:
                        continue
                    snare(ts, 0.08 + 0.25 * (ts - 35 * BAR) / (3 * BAR), verb=0.3)
            elif 54 <= b < 61:
                kick(tq, 0.45 * (1 - (b - 54) / 8))
                hat(tq + BEAT / 2, 0.05)
            elif 69 <= b < 73:
                if q == 0:
                    kick(tq, 0.4 + 0.1 * (b - 69))
                if b == 72:
                    for s in range(4):
                        snare(tq + s * BEAT / 4, 0.08 + 0.06 * q, verb=0.3)
            elif 82 <= b < 89:
                if q == 0 or (q == 2 and b % 2 == 0):
                    kick(tq, 0.45)
                if q == 2:
                    snare(tq, 0.25, verb=0.6)
                hat(tq + BEAT / 2, 0.05)
        if full and b % 4 == 0:
            crash(t0, 0.18)
        if full and b % 4 == 3:
            for s, base in enumerate((140, 120, 100, 85)):
                tom(t0 + 3 * BEAT + s * BEAT / 4, 0.3, base, pan=0.5 - s * 0.33)

    riser(70, 5.75, 0.22)
    impact(76, 0.8)
    riser(138, 8, 0.2)
    impact(146, 0.85)
    impact(184, 0.45)  # the logo lands


def reverb_ir(seconds, decay):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    irs = []
    for _ in range(2):
        noise = rng.standard_normal(n) * np.exp(-t * 6.9 / decay)
        noise = 0.5 * lp(noise, 6000) + 0.5 * lp(noise, 1500)
        noise[: int(0.012 * SR)] = 0  # pre-delay
        irs.append(noise / np.sqrt(np.sum(noise ** 2)))
    return irs


def circular_conv(x, ir):
    y = fftconvolve(x, ir)
    out = y[:N].copy()
    tail = y[N:]
    out[: len(tail)] += tail  # wrap the tail into the start: seamless loop
    return out


def render(path):
    """Mix the buses (ducking, delay, reverb, master) and write a 16-bit WAV."""

    # side-chain pump: pads, bass and arps breathe with the kick
    duck = np.ones(N)
    for k_t, g in KICKS:
        i0 = int(k_t * SR)
        n = int(0.35 * SR)
        idx = (i0 + np.arange(n)) % N
        shape = 1 - min(0.55, g) * np.exp(-np.arange(n) / SR / 0.11)
        duck[idx] = np.minimum(duck[idx], shape)
    L[:] += DUCKED_L * duck
    R[:] += DUCKED_R * duck

    # ping-pong delay, dotted eighth, circular
    d = int(BEAT * 0.75 * SR)
    dl, dr = np.zeros(N), np.zeros(N)
    src_l, src_r = DELAY_L.copy(), DELAY_R.copy()
    for k in range(1, 7):
        g = 0.42 ** k
        if k % 2:
            dl += np.roll(src_r, k * d) * g
            dr += np.roll(src_l, k * d) * g
        else:
            dl += np.roll(src_l, k * d) * g
            dr += np.roll(src_r, k * d) * g
    dl, dr = circ(lp, dl, 4000), circ(lp, dr, 4000)

    irl, irr = reverb_ir(4.5, 3.6)
    wl = circular_conv(VERB_L + dl * 0.3, irl)
    wr = circular_conv(VERB_R + dr * 0.3, irr)

    mix_l = L + dl * 0.5 + wl * 0.9
    mix_r = R + dr * 0.5 + wr * 0.9
    mix_l, mix_r = circ(hp, mix_l, 28), circ(hp, mix_r, 28)
    # glue: gentle tanh bus saturation, then normalise to -1 dBFS
    drive = 1.3
    mix_l = np.tanh(mix_l * drive)
    mix_r = np.tanh(mix_r * drive)
    peak = max(np.abs(mix_l).max(), np.abs(mix_r).max())
    g = 10 ** (-1 / 20) / peak
    out = np.stack([mix_l * g, mix_r * g], axis=1)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype("<i2").tobytes())
    print(f"wrote {path}  {T:.1f}s  peak -1 dBFS")


def main(path):
    compose()
    render(path)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/concert_music/envirotech_concert_score.wav")
