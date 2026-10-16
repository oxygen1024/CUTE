"""
Original funny cartoon music for the Prank website ("Photo Show" reveal).
Everything (melody, chords, instruments, sound effects) is synthesised from
scratch with numpy, so the result is an original work with no samples.

The structure is locked to the photo show in script.js (CONFIG.show):
  120 BPM, 1 bar = 2 s
  bar 0        intro        (slide whistle + boing)
  bars 1-8     8 photos     (one photo per bar, a "boing"/"bloop" on each downbeat)
  bars 9-10    flipbook     (double-time stop-motion)
  bar 11       build-up     (collage pops in)
  bar 12       "Gotcha!"    (ta-da + crash)
  bar 13       outro        (run down + rimshot)

Usage:
    python3 tools/compose_funny.py funny.wav
    ffmpeg -i funny.wav -b:a 128k assets/funny.mp3
"""
import sys
import wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)

NOTE_INDEX = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
              "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(name):
    return 12 * (int(name[-1]) + 1) + NOTE_INDEX[name[:-1]]


def freq(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def one_pole_lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


class Track:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, start_sec, pan=0.0, gain=1.0):
        i0 = max(0, int(start_sec * SR))
        if i0 >= self.n:
            return
        sig = sig[: self.n - i0] * gain
        ang = (pan + 1) * np.pi / 4
        self.L[i0:i0 + len(sig)] += sig * np.cos(ang)
        self.R[i0:i0 + len(sig)] += sig * np.sin(ang)


def tvec(seconds):
    return np.arange(int(seconds * SR)) / SR


# ------------------------------------------------------------------ instruments
def marimba(f, vel=1.0, length=0.9):
    t = tvec(length)
    sig = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28)
           + 0.45 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t / 0.05)
           + 0.15 * np.sin(2 * np.pi * 9.9 * f * t) * np.exp(-t / 0.015))
    return sig * np.minimum(1, t / 0.002) * vel


def tuba(f, dur, vel=1.0):
    """Staccato brassy bass with a tiny comic pitch scoop."""
    rel = 0.06
    t = tvec(dur + rel)
    scoop = 1 - 0.035 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f * scoop) / SR
    sig = np.zeros_like(t)
    for h in range(1, 9):
        sig += np.sin(h * ph) / h ** 1.35
    env = np.minimum(1, t / 0.018) * (0.75 + 0.25 * np.exp(-t / 0.08))
    env *= np.clip(1 - (t - dur) / rel, 0, 1)
    return sig * env * vel * 0.6


def pizz(f, vel=1.0):
    """Short plucky chord tone (accordion-ish square)."""
    t = tvec(0.22)
    sig = np.zeros_like(t)
    for h in (1, 3, 5, 7):
        sig += np.sin(2 * np.pi * f * h * t) / h
    return sig * np.minimum(1, t / 0.004) * np.exp(-t / 0.06) * vel


def kick():
    t = tvec(0.35)
    f = 50 + 90 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def clap():
    t = tvec(0.25)
    noise = rng.uniform(-1, 1, len(t))
    band = one_pole_lowpass(noise, 3500) - one_pole_lowpass(noise, 900)
    env = np.exp(-t / 0.05)
    for off in (0.0, 0.01, 0.02):
        env += 0.6 * np.exp(-np.maximum(t - off, 0) / 0.006) * (t >= off)
    return band * env * 3


def snare():
    t = tvec(0.2)
    noise = rng.uniform(-1, 1, len(t))
    hp = noise - one_pole_lowpass(noise, 1800)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03)
    return (hp * np.exp(-t / 0.06) + 0.6 * body)


def woodblock(pitch=1.0):
    t = tvec(0.08)
    return (np.sin(2 * np.pi * 1250 * pitch * t) + 0.5 * np.sin(2 * np.pi * 1900 * pitch * t)) * np.exp(-t / 0.018)


def crash():
    t = tvec(1.6)
    noise = rng.uniform(-1, 1, len(t))
    hp = noise - one_pole_lowpass(noise, 4500)
    return hp * np.exp(-t / 0.5) * np.minimum(1, t / 0.003)


def boing():
    t = tvec(0.55)
    f = 140 * 2 ** (1.3 * (1 - np.exp(-t / 0.12))) * (1 + 0.07 * np.sin(2 * np.pi * 16 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    return sig * np.exp(-t / 0.22) * np.minimum(1, t / 0.004)


def bloop():
    t = tvec(0.18)
    f = 900 * np.exp(-t / 0.05) + 220
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)


def slide_whistle(f0, f1, dur):
    t = tvec(dur + 0.05)
    k = np.clip(t / dur, 0, 1)
    f = f0 * (f1 / f0) ** (k ** 1.2) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    breath = one_pole_lowpass(rng.uniform(-1, 1, len(t)), 3000) * 0.08
    env = np.minimum(1, t / 0.04) * np.clip((dur + 0.05 - t) / 0.08, 0, 1)
    return (np.sin(ph) + 0.12 * np.sin(2 * ph) + breath) * env


# ------------------------------------------------------------------ song data
CHORD_TONES = {
    "C": ["E4", "G4", "C5"], "A7": ["E4", "G4", "C#5"], "Dm": ["F4", "A4", "D5"],
    "G7": ["F4", "B4", "D5"], "D7": ["F#4", "A4", "C5"], "F": ["F4", "A4", "C5"],
}
ROOT = {"C": ("C2", "G2"), "A7": ("A1", "E2"), "Dm": ("D2", "A2"), "G7": ("G1", "D2"),
        "D7": ("D2", "A2"), "F": ("F1", "C2")}

PHOTO_CHORDS = ["C", "A7", "Dm", "G7", "C", "A7", "D7", "G7"]
PHOTO_MELODY = [
    ["E5", None, "G5", None, "A5", "G5", "E5", None],
    ["C#5", None, "E5", None, "G5", "E5", "C#5", None],
    ["D5", "F5", "A5", None, "F5", None, "D5", None],
    ["B4", "D5", "F5", None, "G5", "F5", "D5", "B4"],
    ["E5", None, "G5", None, "C6", None, "G5", None],
    ["A5", "G5", "E5", "C#5", "E5", None, "A5", None],
    ["F#5", None, "A5", None, "C6", "A5", "F#5", "D5"],
    ["G5", None, "F5", None, "D5", None, "B4", None],
]

TOTAL_BARS = 14
total = TOTAL_BARS * BAR + 1.5
mix = Track(total)
send = Track(total)


def hz(name):
    return freq(midi(name))


def bar_start(b):
    return b * BAR


def oompah(b, chord, vel=1.0):
    t0 = bar_start(b)
    root, fifth = ROOT[chord]
    mix.add(tuba(hz(root), 0.22, vel), t0, 0, 0.5)
    mix.add(tuba(hz(fifth), 0.22, vel * 0.9), t0 + 2 * BEAT, 0, 0.5)
    for beat in (1, 3):
        for k, n in enumerate(CHORD_TONES[chord]):
            mix.add(pizz(hz(n), 0.8), t0 + beat * BEAT + k * 0.004, -0.3 + 0.3 * k, 0.07)


def groove(b, woodblocks=True):
    t0 = bar_start(b)
    for beat in (0, 2):
        mix.add(kick(), t0 + beat * BEAT, 0, 0.55)
    for beat in (1, 3):
        mix.add(clap(), t0 + beat * BEAT, 0.1, 0.12)
        send.add(clap(), t0 + beat * BEAT, 0.1, 0.05)
    if woodblocks:
        for e in range(8):
            if e % 2 == 1:
                mix.add(woodblock(1.0 if e % 4 == 1 else 0.82), t0 + e * BEAT / 2, 0.5, 0.12)


# bar 0 — intro: slide whistle up, boing, walk-up bass
mix.add(slide_whistle(500, 1600, 0.75), 0.05, 0.2, 0.22)
send.add(slide_whistle(500, 1600, 0.75), 0.05, 0.2, 0.08)
mix.add(boing(), 0.95, -0.2, 0.32)
for i, n in enumerate(["G2", "A2", "B2"]):
    mix.add(tuba(hz(n), 0.2), 2 * BEAT + i * BEAT * 0.66, 0, 0.5)
for e in range(4, 8):
    mix.add(woodblock(), e * BEAT / 2, 0.5, 0.14)

# bars 1-8 — one photo per bar
for i, chord in enumerate(PHOTO_CHORDS):
    b = 1 + i
    t0 = bar_start(b)
    oompah(b, chord)
    groove(b)
    for e, n in enumerate(PHOTO_MELODY[i]):
        if n:
            vel = rng.uniform(0.85, 1.0)
            mix.add(marimba(hz(n), vel), t0 + e * BEAT / 2, 0.25, 0.3)
            send.add(marimba(hz(n), vel), t0 + e * BEAT / 2, 0.25, 0.08)
    fx = boing() if i % 2 == 0 else bloop()
    mix.add(fx, t0, -0.25, 0.26 if i % 2 == 0 else 0.3)

# bars 9-10 — flipbook: double time
for j, chord in enumerate(["C", "G7"]):
    b = 9 + j
    t0 = bar_start(b)
    root, fifth = ROOT[chord]
    for e in range(8):
        n = root if e % 2 == 0 else fifth
        mix.add(tuba(hz(n), 0.14), t0 + e * BEAT / 2, 0, 0.45)
        mix.add(kick(), t0 + e * BEAT / 2, 0, 0.35 if e % 2 else 0.5)
    for beat in (1, 3):
        mix.add(clap(), t0 + beat * BEAT, 0.1, 0.14)
    arp = ["C5", "E5", "G5", "C6"] if chord == "C" else ["B4", "D5", "F5", "G5"]
    for s in range(16):
        n = arp[s % 4]
        m = midi(n) + (12 if s >= 8 else 0)
        mix.add(marimba(freq(m), 0.75, 0.5), t0 + s * BEAT / 4, 0.3 if s % 2 else -0.3, 0.22)
    if j == 1:
        for s in range(8, 16):
            mix.add(snare(), t0 + s * BEAT / 4, -0.1, 0.08 + 0.02 * (s - 8))
mix.add(slide_whistle(700, 2000, 1.0), bar_start(10) + 2.95 * BEAT - 1.0 + BEAT, 0.2, 0.18)

# bar 11 — build-up (collage pops in): G7, pops on 8ths, snare roll
t0 = bar_start(11)
mix.add(tuba(hz("G1"), 0.22), t0, 0, 0.5)
mix.add(tuba(hz("D2"), 0.22), t0 + 2 * BEAT, 0, 0.5)
pops = ["G4", "B4", "D5", "F5", "G5", "B5", "D6", "F6"]
for e, n in enumerate(pops):
    mix.add(marimba(hz(n), 0.9, 0.5), t0 + e * BEAT / 2, 0.25, 0.26)
    mix.add(bloop(), t0 + e * BEAT / 2, -0.3, 0.08)
for s in range(16):
    mix.add(snare(), t0 + s * BEAT / 4, -0.1, 0.05 + 0.012 * s)

# bar 12 — "Gotcha!": ta-da + crash on C
t0 = bar_start(12)
mix.add(crash(), t0, 0, 0.22)
send.add(crash(), t0, 0, 0.12)
mix.add(kick(), t0, 0, 0.7)
mix.add(tuba(hz("C2"), 1.2), t0, 0, 0.55)
for n in ["C5", "E5", "G5", "C6"]:
    mix.add(marimba(hz(n), 1.0, 1.4), t0, 0.1, 0.25)
    send.add(marimba(hz(n), 1.0, 1.4), t0, 0.1, 0.1)
    for k in range(4):  # tremolo
        mix.add(marimba(hz(n), 0.5, 0.4), t0 + 0.12 * (k + 1), -0.1, 0.12)
for k, n in enumerate(CHORD_TONES["C"]):
    mix.add(pizz(hz(n)), t0 + 2 * BEAT + k * 0.005, 0, 0.08)
mix.add(boing(), t0 + 3 * BEAT, -0.3, 0.25)

# bar 13 — outro: run down, final note and rimshot ("ba-dum-tss")
t0 = bar_start(13)
run = ["C6", "B5", "A5", "G5", "F5", "E5"]
for e, n in enumerate(run):
    mix.add(marimba(hz(n), 0.9, 0.5), t0 + e * BEAT / 3, 0.2, 0.24)
mix.add(tuba(hz("G1"), 0.18), t0 + 2 * BEAT, 0, 0.5)
mix.add(snare(), t0 + 2.5 * BEAT, 0, 0.14)                       # ba
mix.add(kick(), t0 + 2.75 * BEAT, 0, 0.5)                        # dum
mix.add(tuba(hz("C2"), 0.6), t0 + 3 * BEAT, 0, 0.55)
for n in ["C5", "E5", "G5", "C6"]:
    mix.add(marimba(hz(n), 1.0, 1.4), t0 + 3 * BEAT, 0.1, 0.22)
mix.add(snare(), t0 + 3 * BEAT, 0, 0.18)                         # tss
mix.add(crash(), t0 + 3 * BEAT, 0.2, 0.16)


# ------------------------------------------------------------------ reverb + master
def impulse_response(seconds=1.4, tau=0.25, seed=1):
    r = np.random.default_rng(seed)
    t = tvec(seconds)
    ir = r.normal(0, 1, len(t)) * np.exp(-t / tau)
    ir = np.convolve(ir, np.ones(5) / 5, mode="same")
    ir = np.concatenate([np.zeros(int(0.015 * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


L = mix.L + fft_convolve(send.L, impulse_response(seed=1)) * 1.2
R = mix.R + fft_convolve(send.R, impulse_response(seed=2)) * 1.2
out = np.stack([L, R], axis=1)
out /= np.max(np.abs(out)) + 1e-9
out = np.tanh(out * 1.3) / np.tanh(1.3)
fade_in = int(0.01 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(0.6 * SR)
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
out *= 0.89

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print(f"wrote {sys.argv[1]}  {total:.1f}s")
