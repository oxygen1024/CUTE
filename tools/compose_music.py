"""
Original romantic instrumental for the Romantic Prank website.
Everything here (melody, chords, sounds) is synthesised from scratch with numpy,
so the resulting audio is an original work with no third-party samples.

Usage:
    python3 tools/compose_music.py romantic.wav
    ffmpeg -i romantic.wav -b:a 128k assets/romantic.mp3
"""
import sys
import numpy as np

SR = 44100
BPM = 88
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(14)

# ---------------------------------------------------------------- helpers
NOTE_INDEX = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
              "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(name):
    """'C#5' -> midi number"""
    pitch, octave = name[:-1], int(name[-1])
    return 12 * (octave + 1) + NOTE_INDEX[pitch]


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
        # equal-power pan, pan in [-1, 1]
        ang = (pan + 1) * np.pi / 4
        self.L[i0:i0 + len(sig)] += sig * np.cos(ang)
        self.R[i0:i0 + len(sig)] += sig * np.sin(ang)


# ---------------------------------------------------------------- instruments
def electric_piano(f, dur, vel):
    rel = 0.7
    t = np.arange(int((dur + rel) * SR)) / SR
    index = (0.6 + 1.6 * vel) * np.exp(-t / 0.22) + 0.25
    mod = np.sin(2 * np.pi * f * t)
    car = np.sin(2 * np.pi * f * t + index * mod)
    tine = 0.06 * vel * np.exp(-t / 0.03) * np.sin(2 * np.pi * f * 7.0 * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 1.6)
    release = np.clip(1 - (t - dur) / rel, 0, 1) ** 2
    return (car + tine) * env * release * vel


def music_box(f, vel, length=2.2):
    t = np.arange(int(length * SR)) / SR
    sig = (np.exp(-t / 1.1) * np.sin(2 * np.pi * f * t)
           + 0.28 * np.exp(-t / 0.45) * np.sin(2 * np.pi * 2 * f * t)
           + 0.10 * np.exp(-t / 0.22) * np.sin(2 * np.pi * 3 * f * t)
           + 0.06 * np.exp(-t / 0.08) * np.sin(2 * np.pi * 5.43 * f * t))
    env = np.minimum(1, t / 0.0015)
    fade = np.clip((length - t) / 0.2, 0, 1)
    return sig * env * fade * vel


def bass(f, dur, vel):
    rel = 0.12
    t = np.arange(int((dur + rel) * SR)) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.012) * (0.65 + 0.35 * np.exp(-t / 0.25))
    release = np.clip(1 - (t - dur) / rel, 0, 1)
    return sig * env * release * vel


def pad(f, dur, vel, detune_cents=6):
    att, rel = 0.9, 1.2
    t = np.arange(int((dur + rel) * SR)) / SR
    sig = np.zeros_like(t)
    for d in (-detune_cents, 0, detune_cents):
        ff = f * 2 ** (d / 1200)
        phase = rng.uniform(0, 2 * np.pi)
        for h in range(1, 7):
            sig += np.sin(2 * np.pi * ff * h * t + phase * h) / (h ** 1.6)
    env = np.minimum(1, t / att)
    release = np.clip(1 - (t - dur) / rel, 0, 1)
    return sig * env * release * vel / 3


def make_kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 48 + 75 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * np.minimum(1, t / 0.002)


def make_snap():
    t = np.arange(int(0.35 * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    band = one_pole_lowpass(noise, 3200) - one_pole_lowpass(noise, 1100)
    # little clap flutter
    env = np.exp(-t / 0.06)
    for k, off in enumerate((0.0, 0.009, 0.018)):
        env += 0.5 * np.exp(-np.maximum(t - off, 0) / 0.008) * (t >= off)
    return band * env * 3.5


def make_shaker():
    t = np.arange(int(0.12 * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    hp = noise - one_pole_lowpass(noise, 5000)
    env = np.minimum(1, t / 0.012) * np.exp(-t / 0.03)
    return hp * env


KICK, SNAP, SHAKER = make_kick(), make_snap(), make_shaker()

# ---------------------------------------------------------------- song data
CHORDS = {
    "Cmaj7": ["C4", "E4", "G4", "B4"], "Am7": ["A3", "C4", "E4", "G4"],
    "Dm7": ["A3", "C4", "D4", "F4"], "G7": ["B3", "D4", "F4", "G4"],
    "Fmaj7": ["A3", "C4", "E4", "G4"], "G": ["B3", "D4", "G4"],
    "G6": ["B3", "D4", "E4", "G4"], "Em7": ["G3", "B3", "D4", "E4"],
}
ROOT = {"Cmaj7": "C2", "Am7": "A1", "Dm7": "D2", "G7": "G1", "Fmaj7": "F1", "G": "G1",
        "G6": "G1", "Em7": "E2"}

INTRO = ["Fmaj7", "G6"]
A = ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Fmaj7", "G7"]
B = ["Fmaj7", "G", "Em7", "Am7", "Dm7", "G7", "Cmaj7", "G7"]
END = ["Cmaj7", "Cmaj7"]
PROGRESSION = INTRO + A + B + A + END

# melody: list of bars, each a list of (note or None, beats)
MEL_A = [
    [("E5", 1), ("G5", 1), ("B5", 1.5), ("A5", 0.5)],
    [("G5", 1), ("E5", 1), ("C6", 1.5), ("B5", 0.5)],
    [("A5", 1), ("F5", 1), ("A5", 0.5), ("C6", 0.5), ("D6", 1)],
    [("B5", 2), ("G5", 1), (None, 1)],
    [("E5", 0.5), ("G5", 0.5), ("B5", 0.5), ("D6", 0.5), ("E6", 1.5), ("D6", 0.5)],
    [("C6", 1), ("A5", 1), ("E6", 1), ("D6", 1)],
    [("C6", 0.5), ("A5", 0.5), ("F5", 1), ("E5", 0.5), ("F5", 0.5), ("A5", 1)],
    [("G5", 3), (None, 1)],
]
MEL_B = [
    [("A5", 1.5), ("G5", 0.5), ("A5", 1), ("C6", 1)],
    [("B5", 1.5), ("A5", 0.5), ("B5", 1), ("D6", 1)],
    [("E6", 2), ("D6", 1), ("B5", 1)],
    [("C6", 1.5), ("B5", 0.5), ("A5", 1), ("E5", 1)],
    [("F5", 1), ("A5", 1), ("D6", 1), ("F6", 1)],
    [("E6", 1), ("D6", 1), ("B5", 1), ("G5", 1)],
    [("C6", 1), ("E6", 1), ("G6", 2)],
    [("F6", 1), ("E6", 1), ("D6", 1), ("B5", 1)],
]
MEL_INTRO = [
    [("A4", .5), ("C5", .5), ("E5", .5), ("G5", .5), ("A5", .5), ("G5", .5), ("E5", .5), ("C5", .5)],
    [("B4", .5), ("D5", .5), ("E5", .5), ("G5", .5), ("B5", .5), ("G5", .5), ("E5", .5), ("D5", .5)],
]
MEL_END = [
    [("C5", .5), ("E5", .5), ("G5", .5), ("B5", .5), ("D6", .5), ("E6", .5), ("G6", 1)],
    [("C7", 4)],
]
MELODY = MEL_INTRO + MEL_A + MEL_B + MEL_A + MEL_END

SCALE = [0, 2, 4, 5, 7, 9, 11]


def third_below(m):
    """Diatonic third below in C major."""
    pc, octave = m % 12, m // 12
    idx = SCALE.index(pc) if pc in SCALE else 0
    j = idx - 2
    oct_shift = 0
    if j < 0:
        j += 7
        oct_shift = -1
    return (octave + oct_shift) * 12 + SCALE[j]


# ---------------------------------------------------------------- render
n_bars = len(PROGRESSION)
total = n_bars * BAR + 4.0
dry = Track(total)
send = Track(total)  # reverb send


def humanize():
    return rng.normal(0, 0.006)


a_start, b_start, a2_start = len(INTRO), len(INTRO) + len(A), len(INTRO) + len(A) + len(B)
end_start = a2_start + len(A)

for bar, chord in enumerate(PROGRESSION):
    t0 = bar * BAR
    notes = CHORDS[chord]
    is_end = bar >= end_start

    # electric piano comping
    if is_end:
        hits = [(0, 3.8, 0.75)] if bar == end_start else []
    else:
        hits = [(0, 1.4, 0.8), (1.5, 0.9, 0.55), (3.0, 0.9, 0.62)]
    for beat, dur, vel in hits:
        for k, nn in enumerate(notes):
            v = vel * rng.uniform(0.9, 1.05)
            sig = electric_piano(freq(midi(nn)), dur * BEAT, v)
            pan = -0.35 + 0.7 * k / max(1, len(notes) - 1)
            st = t0 + beat * BEAT + humanize() + k * 0.004
            dry.add(sig, st, pan, 0.16)
            send.add(sig, st, pan, 0.05)

    # bass (from A section, not in the very last bar)
    if a_start <= bar < end_start or bar == end_start:
        r = midi(ROOT[chord])
        pattern = [(0, 1.4, r), (1.5, 0.9, r), (2.5, 0.9, r + 7), (3.5, 0.45, r + 12)]
        if bar == end_start:
            pattern = [(0, 3.5, r)]
        for beat, dur, m in pattern:
            sig = bass(freq(m), dur * BEAT, rng.uniform(0.85, 1.0))
            dry.add(sig, t0 + beat * BEAT + humanize(), 0, 0.30)

    # pad in B section and second A for warmth
    if b_start <= bar < end_start + 1:
        for nn in notes:
            m = midi(nn) + 12
            sig = pad(freq(m), BAR * (2.2 if bar == end_start else 1.0), 0.5)
            dry.add(sig, t0, rng.uniform(-0.6, 0.6), 0.035)
            send.add(sig, t0, 0, 0.03)

    # drums
    if a_start <= bar < end_start:
        for beat in (0, 2.5):
            dry.add(KICK, t0 + beat * BEAT, 0, 0.42)
        for beat in (1, 3):
            st = t0 + beat * BEAT + humanize()
            dry.add(SNAP, st, 0.15, 0.13)
            send.add(SNAP, st, 0.15, 0.09)
        for e in range(8):
            acc = 1.0 if e % 2 else 0.55
            dry.add(SHAKER, t0 + e * BEAT / 2 + humanize(), 0.45, 0.035 * acc)

# melody: music box (+ third below in the second A section)
cursor = 0.0
for bar_idx, bar_notes in enumerate(MELODY):
    beat_pos = 0.0
    for name, beats in bar_notes:
        if name is not None:
            st = bar_idx * BAR + beat_pos * BEAT + humanize()
            m = midi(name)
            vel = rng.uniform(0.85, 1.0)
            length = 4.5 if bar_idx == len(MELODY) - 1 else 2.2
            sig = music_box(freq(m), vel, length)
            dry.add(sig, st, 0.2, 0.20)
            send.add(sig, st, 0.2, 0.12)
            if a2_start <= bar_idx < end_start:
                h = music_box(freq(third_below(m)), vel * 0.6)
                dry.add(h, st + 0.008, -0.25, 0.14)
                send.add(h, st + 0.008, -0.25, 0.08)
        beat_pos += beats


# ---------------------------------------------------------------- reverb
def impulse_response(seconds=2.4, tau=0.42, seed=1):
    r = np.random.default_rng(seed)
    t = np.arange(int(seconds * SR)) / SR
    ir = r.normal(0, 1, len(t)) * np.exp(-t / tau)
    # darken: moving average smoothing grows over time
    kernel = np.ones(6) / 6
    ir = np.convolve(ir, kernel, mode="same")
    predelay = np.zeros(int(0.025 * SR))
    ir = np.concatenate([predelay, ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)
    return y[: len(x)]


wetL = fft_convolve(send.L, impulse_response(seed=1))
wetR = fft_convolve(send.R, impulse_response(seed=2))

# Rhodes-style stereo tremolo on the dry bus (gentle)
t_all = np.arange(dry.n) / SR
trem = 0.06 * np.sin(2 * np.pi * 4.2 * t_all)
L = dry.L * (1 + trem) + wetL * 1.6
R = dry.R * (1 - trem) + wetR * 1.6

mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15)

# fades
fade_in = int(0.05 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(3.5 * SR)
mix[-fade_out:] *= (np.linspace(1, 0, fade_out) ** 1.5)[:, None]
mix *= 0.89

out = (mix * 32767).astype(np.int16)

import wave
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print(f"wrote {sys.argv[1]}  {total:.1f}s  bars={n_bars}")
