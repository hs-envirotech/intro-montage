#!/usr/bin/env python3
"""
Alternative original score for the Envirotech concert visual: arena rock.

Stadium-rock ingredients — fuzz-guitar gallop riffs, octave-fuzz bass, big
live drums, classical piano arpeggios in the breakdown, choir pads and a
soaring wordless falsetto lead, in D harmonic minor. All themes are original.
Same timeline, tempo and seamless loop as tools/compose_concert_score.py,
whose synth engine and mixer it reuses.

    python3 tools/compose_concert_score_rock.py   # writes assets/concert_music/envirotech_concert_score_rock.wav
"""
import sys

import numpy as np

import compose_concert_score as S
from compose_concert_score import (BAR, BARS, BEAT, SR, bp, crash, drone, env, hp, impact, kick, lp, mtof, pluck,
                                   put, riser, saw, snare, tom)

rng = np.random.default_rng(314)

# Power-chord roots and chord tones (D harmonic minor: i VI iv V)
ROOT = {"Dm": 38, "Bb": 34, "Gm": 31, "A": 33, "F": 29, "C": 36}
TONES = {"Dm": [50, 53, 57], "Bb": [50, 53, 58], "Gm": [50, 55, 58], "A": [49, 52, 57], "F": [48, 53, 57], "C": [48, 52, 55]}


def chord_at(bar):
    if bar < 38:
        return ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A", "A"][bar % 8]
    if bar < 54:
        return ["Dm", "Bb", "Gm", "A"][bar % 4]
    if bar < 62:
        return ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A", "A"][(bar - 54) % 8]
    if bar < 73:
        return ["Dm", "Bb", "Gm", "A"][(bar - 62) % 4]
    if bar < 82:
        return ["Bb", "F", "Gm", "A"][(bar - 73) % 4]
    if bar < 89:
        return ["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "A"][bar - 82]
    if bar < 97:
        return ["Bb", "Bb", "A", "Dm", "Dm", "Dm", "Dm", "Dm"][bar - 89]
    return "Dm"


# ── Instruments ──────────────────────────────────────────────────────────────
def guitar(root, start, dur, gain, mute=False, voicing=(0, 7, 12), bright=4800):
    """Double-tracked fuzz guitar power chord, hard-panned."""
    n = int((dur + (0.06 if mute else 0.6)) * SR)
    t = np.arange(n) / SR
    for take, pan in ((0, -0.8), (1, 0.8)):
        det = 1 + (0.0025 if take else -0.0025)
        sig = np.zeros(n)
        for iv in voicing:
            f = mtof(root + 12 + iv) * det
            sig += saw(f, n, rng.random()) + 0.5 * (saw(f, n) - saw(f, n, 0.37))
        sig = hp(sig, 110)
        sig = sig + 1.5 * hp(sig, 900)
        sig = np.tanh(sig * 7 + 0.3) - np.tanh(0.3)
        sig = lp(sig, 1100 if mute else bright, order=4)
        sig -= 0.35 * bp(sig, 380, 650)  # mid scoop
        if mute:
            e = np.exp(-t / 0.075) * np.minimum(t / 0.002, 1)
        else:
            e = env(n, 0.004, 0.4, 0.8, 0.25, dur)
        put(sig * e, start + take * 0.009, gain, pan=pan, verb=0.12)


def fuzz_bass(m, start, dur, gain):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = saw(f, n) + 0.6 * np.sin(2 * np.pi * f * t) + 0.35 * saw(2 * f, n)
    v = np.tanh(v * 5)
    v = lp(v, 1700, order=4) + 0.5 * np.sin(2 * np.pi * f * t)
    put(v * env(n, 0.003, 0.1, 0.85, 0.04, dur), start, gain * 0.8, verb=0.03, duck=True)


def piano(m, start, gain, dur=3.0, pan=None):
    n = int((dur + 0.5) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = np.zeros(n)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > SR * 0.45:
            break
        v += np.sin(2 * np.pi * fk * t + rng.random()) * np.exp(-t / (3.2 / k ** 0.7)) / k ** 1.3
    v += bp(rng.standard_normal(n), 1000, 5000) * np.exp(-t / 0.01) * 0.05
    v *= np.minimum(t / 0.002, 1) * np.clip((dur + 0.5 - t) / 0.5, 0, 1)
    put(v, start, gain, pan=(m - 60) / 30 if pan is None else pan, verb=0.45)


def choir(notes, start, dur, gain):
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for k, m in enumerate(notes):
        for j in range(3):
            vib = 1 + 0.003 * np.sin(2 * np.pi * (5 + 0.3 * j) * t + j)
            v = saw(mtof(m) * (1 + (j - 1) * 0.003) * vib, n, rng.random())
            pan = (j - 1) * 0.7
            out[0] += v * np.sqrt(0.5 * (1 - pan))
            out[1] += v * np.sqrt(0.5 * (1 + pan))
    e = env(n, 1.0, 0.5, 0.9, 2.2, dur)
    for c in range(2):
        x = out[c]
        # "ah" vowel formants
        out[c] = (bp(x, 650, 950) + 0.5 * bp(x, 1000, 1300) + 0.25 * bp(x, 2500, 3100)) * e
    put(out / (3 * len(notes)), start, gain, verb=0.7, duck=True)


def falsetto(m, start, dur, gain):
    n = int((dur + 1.0) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.25) / 0.4, 0, 1)
    ph = 2 * np.pi * np.cumsum(mtof(m) * vib) / SR
    v = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    v += bp(rng.standard_normal(n), 2000, 6000) * 0.04  # breath
    v = bp(v, 300, 5000) * env(n, 0.09, 0.3, 0.85, 0.7, dur)
    put(v, start, gain, verb=0.6, delay=0.2)


def feedback_swell(root, start, dur, gain):
    """Sustained guitar chord swelling up like amp feedback, into a hit."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    for take, pan in ((0, -0.8), (1, 0.8)):
        sig = np.zeros(n)
        for iv in (0, 7, 12, 19):
            f = mtof(root + 12 + iv) * (1 + take * 0.003)
            sig += saw(f * (1 + 0.004 * np.sin(2 * np.pi * 6 * t)), n, rng.random())
        sig = lp(np.tanh(hp(sig, 120) * 6), 4200, order=4)
        put(sig * (t / dur) ** 2.5, start, gain, pan=pan, verb=0.3)


# ── Score ────────────────────────────────────────────────────────────────────
def gallop(bar, gain, mute=True, last_stab=True):
    """Gallop rhythm (8th, 16th, 16th) on the chord's power chord."""
    c = chord_at(bar)
    r = ROOT[c]
    t0 = bar * BAR
    for q in range(4):
        tq = t0 + q * BEAT
        if q == 3 and last_stab:
            guitar(r + 7, tq, BEAT * 0.9, gain * 1.1, mute=False)
            continue
        for off, d in ((0, 0.5), (0.5, 0.25), (0.75, 0.25)):
            guitar(r, tq + off * BEAT, d * BEAT * 0.9, gain * (1 if off == 0 else 0.8), mute=mute)


def drums_full(bar, big=1.0):
    t0 = bar * BAR
    for q in range(4):
        tq = t0 + q * BEAT
        kick(tq, 0.6 * big)
        if q == 1:
            kick(tq + BEAT / 2, 0.45 * big)
        if q in (1, 3):
            snare(tq, 0.42 * big, verb=0.45)
        for s in range(2):
            S.hat(tq + s * BEAT / 2, 0.06, pan=0.3)
    if bar % 4 == 0:
        crash(t0, 0.22 * big)
    if bar % 4 == 3:
        for s, base in enumerate((150, 130, 110, 95, 85, 75, 70, 65)):
            tom(t0 + 2 * BEAT + s * BEAT / 4, 0.32 * big, base, pan=0.6 - s * 0.17)


def compose():
    drone()

    # choir pads
    bar = 0
    while bar < BARS:
        c = chord_at(bar)
        span = 1
        while bar + span < BARS and chord_at(bar + span) == c and span < 4:
            span += 1
        e = S.energy(bar * BAR)
        g = 0.12 + 0.3 * e
        if bar < 11:
            g *= 0.3 + 0.7 * bar / 11
        if 89 <= bar < 97:
            g = 0.45
        if bar >= 97:
            g = 0.2 * (BARS - bar) / 5
        choir(TONES[c], bar * BAR, span * BAR, g)
        bar += span

    # opening: sparse, resonant piano notes over the drone
    for k, (b, m) in enumerate([(3, 62), (4, 69), (5, 65), (6, 64), (7, 61), (8, 62), (9, 69), (10, 74)]):
        piano(m, b * BAR, 0.1, dur=4)

    # synth arpeggio (16ths), a stadium-rock staple
    pattern = [0, 1, 2, 3, 2, 1, 4, 2]
    for b in list(range(11, 38)) + list(range(82, 89)):
        tones = TONES[chord_at(b)] + [TONES[chord_at(b)][0] + 12, TONES[chord_at(b)][2] + 12]
        e = S.energy(b * BAR)
        for s in range(16):
            pluck(tones[pattern[s % 8]] + 12, b * BAR + s * BEAT / 4, 0.08 + 0.08 * e, 400 + 3000 * e ** 1.5,
                  pan=0.4 * np.sin(s))

    # fuzz bass
    for b in range(11, 97):
        if 62 <= b < 69:
            continue
        r = ROOT[chord_at(b)]
        r = r + 12 if r < 33 else r
        t0 = b * BAR
        if b < 19 or b >= 89:
            fuzz_bass(r, t0, BAR * 0.95, 0.3)
        elif 54 <= b < 62 or 82 <= b < 89:
            for q in range(4):
                fuzz_bass(r, t0 + q * BEAT, BEAT * 0.85, 0.3)
        else:
            for s in range(8):
                fuzz_bass(r, t0 + s * BEAT / 2, BEAT / 2 * 0.85, 0.3)

    # guitars
    for b in range(19, 26):
        gallop(b, 0.05 + 0.01 * (b - 19), last_stab=False)
    for b in range(26, 35):
        gallop(b, 0.16)
    for b in (35, 36):
        guitar(ROOT[chord_at(b)], b * BAR, BAR * 0.95, 0.09, voicing=(0, 7, 12))
    feedback_swell(ROOT["A"], 37 * BAR, BAR * 0.88, 0.1)
    for b in range(38, 54):
        gallop(b, 0.26)
    for b in range(54, 61):
        guitar(ROOT[chord_at(b)], b * BAR, BAR * 0.9, 0.1 * (1 - (b - 54) / 9))
    feedback_swell(ROOT["A"], 69 * BAR, 4 * BAR, 0.09)
    for b in range(73, 82):
        gallop(b, 0.28)
    for b in (89, 90, 91):
        guitar(ROOT[chord_at(b)], b * BAR, BAR * 0.95, 0.1)
    guitar(ROOT["Dm"], 92 * BAR, 4 * BAR, 0.11, voicing=(0, 7, 12, 15))  # final D minor, left to ring

    # piano breakdown: classical arpeggios (polishing) that carry on into the climax build
    arp = {
        "Dm": [38, 45, 50, 53, 57, 53, 50, 45],
        "Bb": [34, 41, 46, 50, 53, 50, 46, 41],
        "Gm": [31, 38, 43, 46, 50, 46, 43, 38],
        "A": [33, 40, 45, 49, 52, 49, 45, 40],
    }
    for b in range(62, 73):
        seq = arp[chord_at(b)]
        for s in range(16):
            piano(seq[s % 8] + 12, b * BAR + s * BEAT / 4, 0.045 + (0.015 if s % 4 == 0 else 0), dur=1.2)
    right = [(62, 0, 74), (62, 3, 77), (63, 0, 74), (63, 2, 70), (64, 0, 70), (64, 2, 74), (65, 0, 73), (65, 3, 69),
             (66, 0, 81), (66, 2, 77), (67, 0, 77), (67, 2, 74), (68, 0, 74), (68, 2, 79), (69, 0, 76)]
    for b, beat, m in right:
        piano(m, b * BAR + beat * BEAT, 0.08, dur=3)

    # falsetto lead (wordless), from mid-drop and over the climax
    drop_mel = [(0, 2, 69), (2, 2, 74), (4, 3, 77), (7, 1, 76), (8, 2, 74), (10, 2, 70), (12, 3, 73), (15, 1, 69)]
    for k in range(2):
        for beat, dur, m in drop_mel:
            falsetto(m + (12 if k == 1 and beat >= 8 else 0), (46 + 4 * k) * BAR + beat * BEAT, dur * BEAT * 0.95, 0.2)
    climax_mel = [(0, 2, 74), (2, 2, 77), (4, 3, 81), (7, 1, 79), (8, 2, 77), (10, 2, 74), (12, 3, 76), (15, 1, 73)]
    for k in range(2):
        for beat, dur, m in climax_mel:
            falsetto(m, (73 + 4 * k) * BAR + beat * BEAT, dur * BEAT * 0.95, 0.22)
    falsetto(74, 81 * BAR, 2 * BAR, 0.2)
    for beat, dur, m in [(0, 4, 69), (4, 4, 73), (8, 8, 74)]:
        falsetto(m, 90 * BAR + beat * BEAT, dur * BEAT * 0.95, 0.13)
    for beat, m in [(0, 74), (2, 69), (4, 77), (8, 74)]:
        piano(m, 93 * BAR + beat * BEAT, 0.12, dur=4)

    # drums
    for b in range(11, 19):
        for q in range(4):
            tom(b * BAR + q * BEAT, 0.2 if q % 2 else 0.28, 75)  # floor-tom heartbeat
    for b in range(19, 26):
        for q in range(4):
            kick(b * BAR + q * BEAT, 0.5)
            S.hat(b * BAR + q * BEAT + BEAT / 2, 0.06)
    for b in range(26, 35):
        drums_full(b, 0.85)
    for b in range(35, 38):
        div = {35: 2, 36: 4, 37: 8}[b]
        for q in range(4):
            kick(b * BAR + q * BEAT, 0.55)
            for s in range(div):
                ts = b * BAR + q * BEAT + s * BEAT / div
                if ts < 37.75 * BAR:
                    snare(ts, 0.1 + 0.28 * (ts - 35 * BAR) / (3 * BAR), verb=0.3)
    for b in range(38, 54):
        drums_full(b, 1.0)
    for b in range(54, 61):  # half-time
        kick(b * BAR, 0.5)
        snare(b * BAR + 2 * BEAT, 0.3 * (1 - (b - 54) / 9), verb=0.7)
    for b in range(69, 73):
        for q in range(4):
            if q == 0 or b >= 71:
                tom(b * BAR + q * BEAT, 0.2 + 0.05 * (b - 69), 80)
    for b in range(73, 82):
        drums_full(b, 1.1)
    for b in range(82, 89):
        kick(b * BAR, 0.45)
        snare(b * BAR + 2 * BEAT, 0.25, verb=0.6)
        S.hat(b * BAR + BEAT, 0.05)
        S.hat(b * BAR + 3 * BEAT, 0.05)

    riser(70, 5.75, 0.18)
    impact(76, 0.9)
    riser(138, 8, 0.16)
    impact(146, 0.9)
    impact(184, 0.5)


if __name__ == "__main__":
    compose()
    S.render(sys.argv[1] if len(sys.argv) > 1 else "assets/concert_music/envirotech_concert_score_rock.wav")
