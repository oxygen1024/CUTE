"""
"Kitty Snapshot" -- original kawaii background loop for the Cute photo page.

Everything (melody, chords, instruments, reverb) is synthesised from scratch
with numpy, so the result is an original work with no samples. CC0.

Form: 116 BPM, F major, exactly 16 bars of 4/4 (about 33.1 s), loops seamlessly.
  bars 1-8   A section  F  Dm Bb C  | F  Dm Gm7 C7
  bars 9-16  B section  Bb C  Am Dm | Gm7 C  Bb  C7   (C7 turns back to bar 1)

Instruments: music-box lead, celesta harmony (B section), glockenspiel
sparkles, Karplus-Strong ukulele strums on the off-beats, soft round bass,
shaker, finger snaps and the odd bubbly "bloop".

The piece is rendered past the loop end; the tail (ringing notes + reverb)
is folded back onto the start and the result is cut to exactly 16 bars, so
the loop point has no fade and no click.

Usage:
    python3 tools/compose_cute.py cute.wav && ffmpeg -i cute.wav -b:a 128k assets/cute.mp3
"""
import sys
import wave
import numpy as np

SR = 44100
BPM = 116
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 16
LOOP_N = int(round(BARS * BAR * SR))       # exact loop length in samples
TAIL = 4.0                                 # seconds rendered past the loop end
SWING = 0.555                              # gentle bounce on the off-beat 8ths
rng = np.random.default_rng(2026)

NOTE_INDEX = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
              "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(name):
    return 12 * (int(name[-1]) + 1) + NOTE_INDEX[name[:-1]]


def freq(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def hz(name):
    return freq(midi(name))


def tvec(seconds):
    return np.arange(int(seconds * SR)) / SR


def when(bar, beat):
    """Time in seconds of (bar index 0-15, beat position) with a light swing."""
    whole = np.floor(beat)
    frac = beat - whole
    if frac < 0.5:
        frac = frac * 2 * SWING
    else:
        frac = SWING + (frac - 0.5) * 2 * (1 - SWING)
    return bar * BAR + (whole + frac) * BEAT


def spectral_filter(x, lo=None, hi=None, slope=1.5):
    """Smooth band-limiting in the frequency domain (for short one-shots)."""
    n = len(x)
    size = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1 / SR)
    g = np.ones_like(f)
    if lo is not None:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** (2 * slope))
    if hi is not None:
        g *= 1 / (1 + (f / hi) ** (2 * slope))
    return np.fft.irfft(X * g, size)[:n]


class Track:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, start_sec, pan=0.0, gain=1.0):
        i0 = int(round(start_sec * SR))
        if i0 < 0:                # a humanised hit just before bar 1 belongs to the loop end
            i0 += LOOP_N
        if i0 >= self.n:
            return
        sig = sig[: self.n - i0] * gain
        ang = (pan + 1) * np.pi / 4
        self.L[i0:i0 + len(sig)] += sig * np.cos(ang)
        self.R[i0:i0 + len(sig)] += sig * np.sin(ang)


# ------------------------------------------------------------------ instruments
def partial_sum(f, t, partials):
    sig = np.zeros_like(t)
    for ratio, amp, tau in partials:
        if f * ratio < 15000:
            sig += amp * np.sin(2 * np.pi * f * ratio * t + rng.uniform(0, 0.3)) * np.exp(-t / tau)
    return sig


def music_box(f, vel=1.0, length=1.8):
    """Comb-tine music box: bright attack, sweet ringing fundamental."""
    t = tvec(length)
    tau = 1.05 * (880.0 / f) ** 0.5
    sig = partial_sum(f, t, [
        (1.0, 1.0, tau),
        (1.0035, 0.22, tau * 0.8),          # tiny detune = shimmering beat
        (2.0, 0.16, tau * 0.35),
        (4.07, 0.07, 0.07),
        (5.40, 0.06, 0.035),
    ])
    tick = spectral_filter(rng.normal(0, 1, len(t)), lo=3000, hi=9000) * np.exp(-t / 0.003)
    sig = sig + 0.05 * tick
    sig *= np.minimum(1, t / 0.0015)
    sig *= np.clip((length - t) / 0.05, 0, 1)
    return sig * vel


def celesta(f, vel=1.0, length=1.4):
    """Soft hammered celesta, rounder than the music box (used for harmony)."""
    t = tvec(length)
    sig = partial_sum(f, t, [
        (1.0, 1.0, 0.75),
        (2.0, 0.22, 0.18),
        (3.0, 0.04, 0.08),
        (4.0, 0.05, 0.05),
    ])
    sig *= np.minimum(1, t / 0.004)
    sig *= np.clip((length - t) / 0.05, 0, 1)
    return sig * vel


def glock(f, vel=1.0, length=1.6):
    """Glockenspiel bar: free-bar partials 1, 2.76, 5.40, 8.93."""
    t = tvec(length)
    sig = partial_sum(f, t, [
        (1.0, 1.0, 0.9),
        (2.76, 0.30, 0.20),
        (5.40, 0.10, 0.06),
        (8.93, 0.04, 0.025),
    ])
    sig *= np.minimum(1, t / 0.0008)
    sig *= np.clip((length - t) / 0.05, 0, 1)
    return sig * vel


_ks_cache = {}


def ks_pluck(m, variant=0, length=0.9):
    """Karplus-Strong nylon string. Rendered at an internal rate chosen so the
    loop length is an integer, then resampled, so it is perfectly in tune."""
    key = (m, variant)
    if key in _ks_cache:
        return _ks_cache[key]
    f = freq(m)
    N = 110
    fs_int = f * (N + 1)                     # 3-tap loop filter adds 1 sample delay
    t60 = 1.6
    g = 10 ** (-3.0 / (t60 * f))             # loss per period
    r = np.random.default_rng(1000 + m * 7 + variant)
    # initial string shape: a triangle plucked at ~1/5 of the length (warm,
    # strong fundamental) plus a little smoothed noise for a natural attack
    pos = 0.2 + 0.02 * variant
    x = np.arange(N) / N
    exc = np.where(x < pos, x / pos, (1 - x) / (1 - pos))
    noise = np.convolve(r.uniform(-1, 1, N), np.ones(8) / 8, mode="same")
    exc = exc + 0.35 * noise
    exc -= exc.mean()
    total = int(length * fs_int) + 2 * N
    total = (total // N + 1) * N
    G = 2                                    # guard samples for y[-1], y[-2] = 0
    y = np.zeros(total + G)
    y[G:G + N] = exc
    for s in range(N, total, N):
        y0 = y[G + s - N: G + s]
        y1 = y[G + s - N - 1: G + s - 1]
        y2 = y[G + s - N - 2: G + s - 2]
        y[G + s: G + s + N] = g * (0.25 * y0 + 0.5 * y1 + 0.25 * y2)
    y = y[G:]
    t_int = np.arange(total) / fs_int
    t_out = tvec(length)
    out = np.interp(t_out, t_int, y)
    out *= np.clip((length - t_out) / 0.08, 0, 1)
    out /= np.max(np.abs(out)) + 1e-9
    _ks_cache[key] = out
    return out


# ukulele voicings in string order G C E A (re-entrant tuning)
UKE = {
    "F":   ["A4", "C4", "F4", "A4"],
    "Dm":  ["A4", "D4", "F4", "A4"],
    "Bb":  ["Bb4", "D4", "F4", "Bb4"],
    "C":   ["G4", "C4", "E4", "C5"],
    "C7":  ["G4", "C4", "E4", "Bb4"],
    "Gm7": ["G4", "D4", "F4", "Bb4"],
    "Am":  ["A4", "C4", "E4", "A4"],
}
CHORD_TONES = {
    "F": [5, 9, 0], "Dm": [2, 5, 9], "Bb": [10, 2, 5], "C": [0, 4, 7],
    "C7": [0, 4, 7, 10], "Gm7": [7, 10, 2, 5], "Am": [9, 0, 4],
}
ROOT = {"F": "F2", "Dm": "D2", "Bb": "Bb2", "C": "C3", "C7": "C3", "Gm7": "G2", "Am": "A2"}
F_MAJOR = [5, 7, 9, 10, 0, 2, 4]


def strum(chord, down=True, vel=1.0, variant=0):
    notes = UKE[chord] if down else UKE[chord][::-1]
    length = 0.9
    out = np.zeros(int((length + 0.08) * SR))
    for k, n in enumerate(notes):
        off = int((k * 0.011 + rng.uniform(0, 0.003)) * SR)
        s = ks_pluck(midi(n), variant) * (0.85 + 0.15 * (k == 0)) * rng.uniform(0.85, 1.0)
        out[off:off + len(s)] += s
    return out * vel * 0.3


def soft_bass(f, dur, vel=1.0):
    """Round bass: sine with a whisper of 2nd/3rd harmonic for small speakers."""
    rel = 0.06
    t = tvec(dur + rel)
    ph = 2 * np.pi * f * t
    sig = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    env = np.minimum(1, t / 0.012) * (0.55 + 0.45 * np.exp(-t / 0.25))
    env *= np.clip(1 - (t - dur) / rel, 0, 1)
    return sig * env * vel


def shaker_hit(seed):
    r = np.random.default_rng(seed)
    t = tvec(0.09)
    noise = spectral_filter(r.normal(0, 1, len(t)), lo=4500, hi=11000)
    env = np.minimum(1, t / 0.009) * np.exp(-t / 0.022)
    sig = noise * env
    return sig / (np.max(np.abs(sig)) + 1e-9)


def finger_snap(seed):
    r = np.random.default_rng(seed)
    t = tvec(0.12)
    noise = spectral_filter(r.normal(0, 1, len(t)), lo=1600, hi=6000)
    sig = noise * np.exp(-t / 0.012) * np.minimum(1, t / 0.0006)
    sig += 0.5 * np.sin(2 * np.pi * 2350 * t) * np.exp(-t / 0.018)
    return sig / (np.max(np.abs(sig)) + 1e-9)


def bloop(f0=380.0, f1=1150.0, dur=0.16):
    """Bubbly water-drop 'bloop': fast upward pitch glide."""
    t = tvec(dur)
    f = f0 * (f1 / f0) ** np.minimum(1, t / (dur * 0.55))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.15 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.003) * np.exp(-t / (dur * 0.3))
    return sig * env


# ------------------------------------------------------------------ the score
CHORDS = ["F", "Dm", "Bb", "C", "F", "Dm", "Gm7", "C7",
          "Bb", "C", "Am", "Dm", "Gm7", "C", "Bb", "C7"]

# melody: (note or None for a rest, length in 8th notes); each bar sums to 8
MELODY = [
    # A section
    [(None, 1), ("C6", 1), ("F6", 1), ("E6", 1), ("F6", 2), ("C6", 2)],
    [(None, 1), ("D6", 1), ("A6", 1), ("G6", 1), ("F6", 2), ("D6", 2)],
    [(None, 1), ("D6", 1), ("F6", 1), ("D6", 1), ("Bb5", 2), ("C6", 1), ("D6", 1)],
    [("E6", 2), ("D6", 1), ("C6", 1), ("G5", 3), (None, 1)],
    [(None, 1), ("C6", 1), ("F6", 1), ("E6", 1), ("F6", 2), ("A6", 2)],
    [("G6", 1), ("F6", 1), ("D6", 2), ("A5", 2), ("F6", 2)],
    [(None, 1), ("G6", 1), ("F6", 1), ("D6", 1), ("Bb5", 2), ("D6", 2)],
    [("E6", 1), ("F6", 1), ("G6", 1), ("Bb6", 1), ("A6", 2), ("G6", 2)],
    # B section
    [("D6", 1), ("D6", .5), ("F6", .5), ("D6", 1), ("Bb5", 1), ("F6", 2), ("D6", 2)],
    [("E6", 1), ("E6", .5), ("G6", .5), ("E6", 1), ("C6", 1), ("G6", 2), ("E6", 2)],
    [("C6", 1), ("E6", 1), ("A6", 2), ("G6", 1), ("E6", 1), ("C6", 2)],
    [("D6", 1), ("F6", 1), ("A6", 2), ("G6", 1), ("F6", 1), ("D6", 2)],
    [("Bb6", 2), ("A6", 1), ("G6", 1), ("F6", 1), ("G6", 1), ("D6", 2)],
    [("E6", 1), ("F6", 1), ("G6", 1), ("C6", 1), ("E6", 2), (None, 1), ("C6", 1)],
    [("D6", 1), ("F6", 1), ("Bb6", 2), ("A6", 1), ("F6", 1), ("D6", 1), ("F6", 1)],
    [("G6", 2), ("E6", 1), ("C6", 1), ("D6", 1), ("E6", 1), ("G6", 1), (None, 1)],
]
for _b in MELODY:
    assert abs(sum(d for _, d in _b) - 8) < 1e-9


def harmony_below(m, chord):
    """Highest chord tone at least a minor third below the melody note."""
    pcs = CHORD_TONES[chord]
    for c in range(m - 3, m - 10, -1):
        if c % 12 in pcs:
            return c
    return None


def approach(next_root_m):
    """Diatonic neighbour just below the next bar's bass root."""
    for c in range(next_root_m - 1, next_root_m - 3, -1):
        if c % 12 in F_MAJOR:
            return c
    return next_root_m - 1


total = BARS * BAR + TAIL
dry = Track(total)       # direct sound
send = Track(total)      # reverb send


def place(track_dry, sig, t0, pan, gain, wet):
    track_dry.add(sig, t0, pan, gain)
    if wet > 0:
        send.add(sig, t0, pan, gain * wet)


shakers = [shaker_hit(s) for s in range(6)]
snaps = [finger_snap(s) for s in range(3)]

for b in range(BARS):
    chord = CHORDS[b]
    nxt = CHORDS[(b + 1) % BARS]
    section_b = b >= 8

    # --- music-box lead (+ celesta thirds in B, + glock doubles in bars 5-8 / 13-16)
    pos = 0.0
    for note, d in MELODY[b]:
        if note is not None:
            beat = pos / 2
            t0 = when(b, beat) + rng.normal(0, 0.003)
            accent = 1.0 if beat == int(beat) else 0.86
            v = accent * rng.uniform(0.9, 1.0)
            m = midi(note)
            place(dry, music_box(freq(m), v), t0, 0.05, 0.30, 0.45)
            if section_b and d >= 2:
                h = harmony_below(m, chord)
                if h is not None:
                    place(dry, celesta(freq(h), v), t0 + 0.004, -0.25, 0.17, 0.5)
            if (4 <= b < 8 or b >= 12) and d >= 2:
                place(dry, glock(freq(m), v), t0 + 0.002, 0.35, 0.085, 0.6)
        pos += d

    # --- glockenspiel twinkles: a high ding every other bar, arpeggio at phrase ends
    if b % 2 == 0:
        ding = max(c for c in range(89, 101) if c % 12 in CHORD_TONES[chord][:3])   # F6..E7
        place(dry, glock(freq(ding), 0.8), when(b, 0), 0.45, 0.075, 0.8)
    if b % 4 == 3:
        tones = sorted({72 + pc if 72 + pc >= 77 else 84 + pc for pc in CHORD_TONES[chord][:3]})
        arp = (tones + [tones[0] + 12])[:4]
        for k, n in enumerate(arp):
            place(dry, glock(freq(n), 0.6 + 0.1 * k, 1.2), when(b, 3 + 0.25 * k), 0.4, 0.075, 0.8)

    # --- ukulele strums on the off-beats (down-up, light)
    for k, beat in enumerate((0.5, 1.5, 2.5, 3.5)):
        down = k % 2 == 0
        v = (1.0 if k in (0, 2) else 0.8) * rng.uniform(0.9, 1.0)
        place(dry, strum(chord, down, v, variant=k % 3), when(b, beat), -0.3, 0.75, 0.25)

    # --- soft bass: root, octave bounce, fifth, walk into the next chord
    r = midi(ROOT[chord])
    fifth = r + 7 if r + 7 <= midi("D3") else r - 5
    nr = midi(ROOT[nxt])
    for beat, m, dur, v in ((0, r, BEAT * 1.1, 1.0), (1.5, r + 12, BEAT * 0.35, 0.55),
                            (2, fifth, BEAT * 0.9, 0.85), (3.5, approach(nr), BEAT * 0.4, 0.7)):
        dry.add(soft_bass(freq(m), dur, v), when(b, beat), 0.0, 0.24)

    # --- shaker 16ths, accent on the off-beat 8th
    for beat in range(4):
        for k, acc in enumerate((0.45, 0.22, 0.8, 0.3)):
            hit = shakers[rng.integers(len(shakers))]
            dry.add(hit, when(b, beat + 0.25 * k) + rng.normal(0, 0.002), 0.35,
                    0.095 * acc * rng.uniform(0.85, 1.1))

    # --- finger snaps on 2 and 4
    for beat in (1, 3):
        place(dry, snaps[rng.integers(len(snaps))], when(b, beat), -0.2, 0.09, 0.3)

    # --- occasional bubbly bloops
    if b % 4 == 1:
        place(dry, bloop(360 + 40 * (b // 4), 1100 + 80 * (b // 4)), when(b, 3.75), 0.3, 0.13, 0.4)
    if b in (3, 11):
        place(dry, bloop(500, 1500, 0.11), when(b, 3.5), -0.35, 0.10, 0.4)
        place(dry, bloop(650, 1900, 0.10), when(b, 3.75), 0.35, 0.09, 0.4)


# ------------------------------------------------------------------ reverb
def impulse_response(seconds=1.8, tau=0.42, seed=1):
    r = np.random.default_rng(seed)
    t = tvec(seconds)
    ir = r.normal(0, 1, len(t)) * np.exp(-t / tau)
    ir = spectral_filter(ir, lo=250, hi=6500)
    ir *= np.clip(t / 0.01, 0, 1)
    ir = np.concatenate([np.zeros(int(0.018 * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


L = dry.L + 0.55 * fft_convolve(send.L, impulse_response(seed=11))
R = dry.R + 0.55 * fft_convolve(send.R, impulse_response(seed=12))
mix = np.stack([L, R], axis=1)

# ------------------------------------------------------------------ seamless loop
loop = mix[:LOOP_N].copy()
tail = mix[LOOP_N:]
loop[: len(tail)] += tail                 # ringing notes + reverb wrap onto the start
loop -= loop.mean(axis=0)


# ------------------------------------------------------------------ master
def circular_limiter(x, thresh, block=64, hold=2, release=0.12):
    """Look-ahead peak limiter whose gain curve wraps around, so the loop
    point stays seamless."""
    n = len(x)
    nb = -(-n // block)
    pad = np.zeros((nb * block, x.shape[1]))
    pad[:n] = x
    peaks = np.abs(pad).max(axis=1).reshape(nb, block).max(axis=1)
    req = np.minimum(1.0, thresh / (peaks + 1e-12))
    g = req.copy()
    for k in range(1, hold + 1):
        g = np.minimum(g, np.minimum(np.roll(req, k), np.roll(req, -k)))
    coef = np.exp(-block / (release * SR))
    sm = np.empty(nb)
    state = 1.0
    for _ in range(2):                    # second pass settles the wrap-around state
        for i in range(nb):
            gi = g[i]
            state = gi if gi < state else gi + (state - gi) * coef
            sm[i] = state
    centres = (np.arange(nb) + 0.5) * block
    xs = np.arange(nb * block)
    gain = np.interp(xs, np.concatenate([[centres[-1] - nb * block], centres, [centres[0] + nb * block]]),
                     np.concatenate([[sm[-1]], sm, [sm[0]]]))
    return x * gain[:n, None]


PEAK_DB = -1.05           # WAV sample peak; the 128k LAME encode comes out ~0.45 dB
                          # quieter, so assets/cute.mp3 peaks at about -1.5 dBFS
TARGET_RMS_DB = -15.5     # gentle, background-music loudness


def master(x, thresh_db):
    y = circular_limiter(x, 10 ** (thresh_db / 20))      # tame the music-box transients
    return y * 10 ** (PEAK_DB / 20) / (np.max(np.abs(y)) + 1e-12)


loop /= np.max(np.abs(loop)) + 1e-12
for thresh_db in np.arange(0.0, -9.01, -0.25):            # least limiting that reaches the target
    out = master(loop, thresh_db)
    if 10 * np.log10(np.mean(out ** 2)) >= TARGET_RMS_DB:
        break
loop = out

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(np.round(loop * 32767).astype(np.int16).tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(loop ** 2)))
print(f"wrote {sys.argv[1]}  {LOOP_N / SR:.3f}s  {LOOP_N} samples  {BPM} BPM  {BARS} bars  "
      f"peak {PEAK_DB} dBFS  rms {rms:.1f} dBFS  limiter threshold {thresh_db:.2f} dB")
