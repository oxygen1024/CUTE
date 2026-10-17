"""
Original cute cartoon kitten "nyaa~" sound effect for the Prank website.
It plays once when the final picture with the cat ears appears.

Everything is synthesised from scratch with numpy (no samples):
  * a harmonic "voice" source (sum of harmonics, about -9 dB/octave rolloff,
    jitter-free 6 Hz vibrato) that follows a kitten-like pitch contour
    (~650 Hz -> ~950 Hz at about 35 % -> ~600 Hz at the end),
  * a moving vowel "n -> i/e -> a -> u/o" made by weighting every harmonic
    with Gaussian formant bumps whose centres glide over time,
  * a very quiet breathy noise layer shaped by the same formants,
  * a soft 40 ms attack, a gentle swell and a 150 ms release,
  * a tiny, short room reverb so it sits sweetly over the background music.

Usage:
    python3 tools/compose_meow.py meow.wav
    ffmpeg -i meow.wav -c:a libmp3lame -b:a 128k -ar 44100 assets/meow.mp3
"""
import sys
import wave
import numpy as np

SR = 44100
VOICE_DUR = 0.78          # seconds of "nyaa~"
TAIL_DUR = 0.22           # tiny reverb tail
PEAK_DBFS = -3.0


# ------------------------------------------------------------------ helpers
def pchip(xk, yk, x):
    """Shape-preserving cubic interpolation (Fritsch-Carlson), no overshoot."""
    xk = np.asarray(xk, float)
    yk = np.asarray(yk, float)
    h = np.diff(xk)
    d = np.diff(yk) / h
    m = np.zeros_like(yk)
    for i in range(1, len(yk) - 1):
        if d[i - 1] * d[i] > 0:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    m[0], m[-1] = d[0], d[-1]
    idx = np.clip(np.searchsorted(xk, x) - 1, 0, len(xk) - 2)
    t = (x - xk[idx]) / h[idx]
    h00 = 2 * t ** 3 - 3 * t ** 2 + 1
    h10 = t ** 3 - 2 * t ** 2 + t
    h01 = -2 * t ** 3 + 3 * t ** 2
    h11 = t ** 3 - t ** 2
    return (h00 * yk[idx] + h10 * h[idx] * m[idx]
            + h01 * yk[idx + 1] + h11 * h[idx] * m[idx + 1])


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


# Vowel keyframes over normalised time u = t / VOICE_DUR
#            n      i/e    (y-glide) a      a/o    u/o
VOWEL_U = [0.00, 0.10, 0.22, 0.40, 0.66, 1.00]
F1_K = [300, 420, 600, 900, 760, 500]
F2_K = [1900, 2200, 1950, 1500, 1150, 900]
F3_K = [2800, 3050, 2950, 2700, 2600, 2500]
A1 = 0.50                                      # level of F1
A2_K = [0.50, 1.30, 1.25, 1.20, 1.00, 0.80]   # relative level of F2
A3_K = [0.15, 0.60, 0.55, 0.45, 0.30, 0.20]   # relative level of F3
SIG1, SIG2, SIG3 = 250.0, 350.0, 450.0         # Gaussian widths (Hz)
FLOOR = 0.35                                   # keeps every harmonic a little alive


def formant_gain(freq, F1, F2, F3, A2, A3):
    g = (A1 * np.exp(-0.5 * ((freq - F1) / SIG1) ** 2)
         + A2 * np.exp(-0.5 * ((freq - F2) / SIG2) ** 2)
         + A3 * np.exp(-0.5 * ((freq - F3) / SIG3) ** 2))
    return FLOOR + g


# ------------------------------------------------------------------ voice
n = int(VOICE_DUR * SR)
t = np.arange(n) / SR
u = t / VOICE_DUR

# Pitch contour (interpolated in log-frequency so the glides sound natural)
F0_U = [0.00, 0.10, 0.35, 0.55, 0.80, 1.00]
F0_K = [650, 760, 950, 880, 690, 570]
f0 = np.exp(pchip(F0_U, np.log(F0_K), u))

# Jitter-free vibrato: 6 Hz, fades in on the falling "aa~", about +/-2.2 %
vib_depth = 0.022 * smoothstep((u - 0.38) / 0.32)
f0 = f0 * (1.0 + vib_depth * np.sin(2 * np.pi * 6.0 * t))

phase = 2 * np.pi * np.cumsum(f0) / SR

F1 = pchip(VOWEL_U, F1_K, u)
F2 = pchip(VOWEL_U, F2_K, u)
F3 = pchip(VOWEL_U, F3_K, u)
A2 = pchip(VOWEL_U, A2_K, u)
A3 = pchip(VOWEL_U, A3_K, u)

# "n" onset: nasal murmur = upper harmonics muffled, opening up over ~90 ms
openness = smoothstep((t - 0.025) / 0.075)

voice = np.zeros(n)
power = np.zeros(n)          # instantaneous power of the harmonic sum
K = int(11000 // 600)
for k in range(1, K + 1):
    fk = k * f0
    amp = k ** -1.5                                         # ~ -9 dB / octave
    amp = amp * formant_gain(fk, F1, F2, F3, A2, A3)
    amp = amp * (0.12 + 0.88 * openness) ** (0.5 * (k - 1))  # nasal muffling
    amp = amp * np.clip((9500.0 - fk) / 2500.0, 0.0, 1.0)  # soft band limit
    voice += amp * np.sin(k * phase + np.pi * k * k / K)    # low-crest phases
    power += 0.5 * amp ** 2

# Breathy noise shaped by the same moving formants (STFT filtering)
rng = np.random.default_rng(2024)
noise = rng.normal(0.0, 1.0, n + 2048)
win_len, hop = 1024, 256
win = np.hanning(win_len)
freqs = np.fft.rfftfreq(win_len, 1 / SR)
breath = np.zeros(len(noise))
norm = np.zeros(len(noise))
for start in range(0, len(noise) - win_len, hop):
    centre = min(start + win_len // 2, n - 1)
    spec = np.fft.rfft(noise[start:start + win_len] * win)
    g = formant_gain(freqs, F1[centre], F2[centre], F3[centre], A2[centre], A3[centre]) - FLOOR
    g *= np.clip((freqs - 300.0) / 400.0, 0.0, 1.0)         # no rumble
    breath[start:start + win_len] += np.fft.irfft(spec * g, win_len) * win
    norm[start:start + win_len] += win ** 2
breath = breath[:n] / np.maximum(norm[:n], 1e-6)

# Constant loudness before enveloping, so the envelope below is what you hear
# (otherwise the moving formants would make the level drift by several dB).
voice /= np.sqrt(power)
breath /= np.sqrt(np.mean(breath ** 2))
# a touch more air on the release ("~"), almost none in the nasal onset
breath_level = 0.028 * (0.4 + 0.6 * smoothstep((u - 0.55) / 0.40)) * openness

# Amplitude envelope: 40 ms attack, gentle swell to ~45 %, 150 ms release
attack = smoothstep(t / 0.040)
swell = 0.72 + 0.28 * np.exp(-0.5 * ((u - 0.45) / 0.22) ** 2)
release = smoothstep((VOICE_DUR - t) / 0.150)
nasal_dip = 0.75 + 0.25 * openness            # the "n" is a bit softer than "ya"
env = attack * swell * release * nasal_dip

dry = env * (voice + breath_level * breath)

# ------------------------------------------------------------------ tiny reverb
total = int((VOICE_DUR + TAIL_DUR) * SR)
dry = np.concatenate([dry, np.zeros(total - n)])


def impulse_response(seed, seconds=0.30, tau=0.055, predelay=0.011):
    r = np.random.default_rng(seed)
    tt = np.arange(int(seconds * SR)) / SR
    ir = r.normal(0, 1, len(tt)) * np.exp(-tt / tau)
    ir = np.convolve(ir, np.ones(6) / 6, mode="same")      # soften the highs
    ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    size = 1 << (len(x) + len(h) - 2).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


# The reverb send grows towards the release so the body of the "nyaa" stays
# clean (a reverb under a gliding, nearly pure tone makes it wobble) while the
# ending gets a soft little tail.
tt = np.arange(total) / SR
send = dry * (0.3 + 0.7 * smoothstep((tt - 0.45 * VOICE_DUR) / (0.5 * VOICE_DUR)))
WET = 0.12
L = dry + WET * fft_convolve(send, impulse_response(11))
R = dry + WET * fft_convolve(send, impulse_response(12))
out = np.stack([L, R], axis=1)

# ------------------------------------------------------------------ master
out -= out.mean(axis=0, keepdims=True)                     # no DC offset
fade = int(0.010 * SR)
ramp = np.linspace(0.0, 1.0, fade)[:, None]
out[:fade] *= ramp
out[-fade:] *= ramp[::-1]
out *= 10 ** (PEAK_DBFS / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1] if len(sys.argv) > 1 else "meow.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(np.round(out * 32767).astype(np.int16).tobytes())
print(f"wrote {sys.argv[1] if len(sys.argv) > 1 else 'meow.wav'}  {total / SR:.2f}s")
