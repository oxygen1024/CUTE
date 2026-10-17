/* ==========================================================================
   Prank Website – script.js
   --------------------------------------------------------------------------
   Flow: Welcome → consent → camera → move challenge (1 photo per move) →
         "Challenge Complete!" → pink flash → ONE cute picture: every pose
         joined together on a pink background, each with cat ears, while
         very cute music plays → Watch Again / Try Again / Save My Picture.

   Privacy: photos only ever live in this browser's memory (canvas elements).
   Face detection (for placing the cat ears) runs locally in the browser.
   Nothing is uploaded anywhere.
   ========================================================================== */
(() => {
  "use strict";

  /* ========================================================================
     1. CONFIG — everything you are likely to customise lives here
     ======================================================================== */
  const CONFIG = {
    /** Seconds of "get into the frame" before the first move (0 = skip). */
    introSeconds: 2,

    /** Countdown (3‑2‑1) shown before every move. */
    prepSeconds: 3,

    /** Default seconds for each move (a move can override with `seconds`). */
    actionSeconds: 5,

    /** When the photo is taken, as a fraction of the move's time (0.7 = 70 %). */
    snapAt: 0.7,

    /**
     * The moves, in order. One photo is taken for each move.
     *  pose     – cartoon demo (raise-right, raise-left, wave, heart, point, smile, kiss, cup)
     *  caption  – text written under the photo in the final picture
     *  sticker  – emoji stuck on the corner of the photo in the final picture
     */
    actions: [
      { pose: "wave", emoji: "👋", title: "Wave BOTH hands", hint: "Say hi to the camera!", seconds: 5, caption: "Hiii cutie!", sticker: "👋" },
      { pose: "heart", emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you", seconds: 5, caption: "My heart", sticker: "💗" },
      { pose: "kiss", emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!", seconds: 5, caption: "Mwah!", sticker: "💋" },
      { pose: "cup", emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!", seconds: 5, caption: "Too cute!", sticker: "🌸" },
    ],

    /** "Preparing Your Results..." loading time (seconds). */
    loadingSeconds: 2,

    /** Very cute background music (loops while the picture is shown). */
    music: {
      src: "assets/cute.mp3",
      volume: 0.8, // starting volume (0–1)
    },

    /** Little "nya~" when the picture is complete (set enabled: false to turn off). */
    meow: { src: "assets/meow.mp3", enabled: true },

    /** Cat filter drawn on every photo. */
    catFace: {
      ears: true,
      nose: true, // needs face detection
      whiskers: true, // needs face detection
      blush: true, // needs face detection
      earColor: "#ffd3e6",
      earOutline: "#ff7eb6",
      earInner: "#ff5fa2",
    },

    /** Face detection (MediaPipe, runs locally) so the ears sit on the head. */
    faceDetection: {
      enabled: true,
      path: "assets/vendor/mediapipe/",
      minConfidence: 0.4,
      maxWaitSeconds: 6, // extra time allowed at the end if it is still loading
    },

    /** The final picture (height is automatic: 2:3 for phone photos, 4:5 for webcam photos). */
    picture: {
      width: 1080,
      title: "Surprise! 💘",
      subtitle: "POV: You just fell in love 💗",
      gotcha: "Gotcha! 💕",
      gotchaSub: "You're so adorable!",
      footer: "💗 Can You Follow My Moves? 💗",
    },

    /** Small beeps, shutter and pop sounds (Web Audio, no files). */
    beeps: true,

    downloadName: "my-cute-picture",
  };

  /* ========================================================================
     2. DOM
     ======================================================================== */
  const $ = (id) => document.getElementById(id);
  const els = {
    body: document.body,
    themeMeta: document.querySelector('meta[name="theme-color"]'),
    welcomeBuddy: $("welcome-buddy"),
    metaMoves: $("meta-moves"),
    metaTime: $("meta-time"),
    btnStart: $("btn-start"),
    consentModal: $("consent-modal"),
    btnConsentAgree: $("btn-consent-agree"),
    btnConsentCancel: $("btn-consent-cancel"),
    errorModal: $("error-modal"),
    errorIcon: $("error-icon"),
    errorTitle: $("error-title"),
    errorMessage: $("error-message"),
    errorTips: $("error-tips"),
    btnErrorBack: $("btn-error-back"),
    btnErrorRetry: $("btn-error-retry"),
    challenge: $("screen-challenge"),
    progress: $("ch-progress"),
    progressFill: $("ch-progress-fill"),
    counter: $("ch-counter"),
    snapCount: $("snap-count"),
    snapTotal: $("snap-total"),
    btnQuit: $("btn-quit"),
    moveCard: $("move-card"),
    moveEmoji: $("move-emoji"),
    phaseLabel: $("phase-label"),
    moveTitle: $("move-title"),
    moveHint: $("move-hint"),
    timerFill: $("timer-fill"),
    timerNum: $("timer-num"),
    challengeBuddy: $("challenge-buddy"),
    camPreview: $("cam-preview"),
    countNum: $("count-num"),
    shutter: $("shutter"),
    snapPop: $("snap-pop"),
    snapStrip: $("snap-strip"),
    completeCard: document.querySelector(".complete-card"),
    flash: $("flash"),
    loveHearts: $("love-hearts"),
    loveSparkles: $("love-sparkles"),
    soundControls: $("sound-controls"),
    btnMute: $("btn-mute"),
    volume: $("volume"),
    showFrame: $("show-frame"),
    pictureCanvas: $("picture-canvas"),
    pictureImg: $("picture-img"),
    btnPlaySurprise: $("btn-play-surprise"),
    actions: $("reveal-actions"),
    btnWatchAgain: $("btn-watch-again"),
    btnTryAgain: $("btn-try-again"),
    btnSave: $("btn-save"),
    saveStatus: $("save-status"),
    toast: $("toast"),
    music: $("music"),
    meow: $("meow"),
    buddyTemplate: $("buddy-template"),
  };

  /* ========================================================================
     3. Environment helpers
     ======================================================================== */
  const UA = navigator.userAgent || "";
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IS_MOBILE = IS_IOS || /Android|Mobi/i.test(UA);
  const IS_IN_APP = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Snapchat|TikTok|musical_ly/i.test(UA);
  const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /** Small deterministic random generator so the picture's decorations are stable. */
  function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, sleep(ms).then(() => undefined)]);
  }

  function once(target, event, ms) {
    return new Promise((resolve) => {
      let timer = 0;
      const done = (ok) => {
        clearTimeout(timer);
        target.removeEventListener(event, onEvent);
        resolve(ok);
      };
      const onEvent = () => done(true);
      target.addEventListener(event, onEvent);
      if (ms) timer = setTimeout(() => done(false), ms);
    });
  }

  function canSetMediaVolume() {
    try {
      const a = document.createElement("audio");
      a.volume = 0.5;
      return Math.abs(a.volume - 0.5) < 0.01;
    } catch (_) {
      return false;
    }
  }

  /* ========================================================================
     4. State
     ======================================================================== */
  const state = {
    phase: "welcome",
    stream: null,
    buddy: null,
    photos: [], // [{ canvas, action, index, face }]
    timeline: null,
    segIndex: -1,
    lastCount: -1,
    rafId: 0,
    revealRaf: 0,
    wakeLock: null,
    audioCtx: null,
    musicOk: true,
    volume: CONFIG.music.volume,
    muted: false,
    volumeControllable: canSetMediaVolume(),
    pictureBlob: null,
    pictureURL: "",
    toastTimer: 0,
    sessionId: 0,
  };

  /* ========================================================================
     5. Small UI helpers
     ======================================================================== */
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.toggle("is-active", s.id === `screen-${name}`);
    });
    els.body.dataset.screen = name;
    state.phase = name;
  }

  let lastFocused = null;
  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    const focusTarget = modal.querySelector(".btn-primary") || modal.querySelector("button");
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
  }
  function closeModal(modal) {
    modal.hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  function toast(message, ms = 3500) {
    els.toast.textContent = message;
    els.toast.classList.add("is-on");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.remove("is-on"), ms);
  }

  function setSaveStatus(text) {
    els.saveStatus.textContent = text || "";
  }

  function restartAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // force reflow so the animation can play again
    el.classList.add(className);
  }

  function setLoveTheme(on) {
    els.body.classList.toggle("mode-love", on);
    if (els.themeMeta) els.themeMeta.setAttribute("content", on ? "#ff8fc1" : "#0e1124");
    try {
      // iOS 17+: let music play even when the ring/silent switch is on.
      if (navigator.audioSession) navigator.audioSession.type = on ? "playback" : "auto";
    } catch (_) { /* ignore */ }
  }

  function createBuddy(holder, pose) {
    const svg = els.buddyTemplate.content.firstElementChild.cloneNode(true);
    svg.setAttribute("data-pose", pose);
    holder.textContent = "";
    holder.appendChild(svg);
    return svg;
  }

  /* ========================================================================
     6. Audio (Web Audio context for little sounds, <audio> for music)
     ======================================================================== */
  function ensureAudioContext() {
    if (!state.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        state.audioCtx = new AC();
      } catch (_) {
        return null;
      }
    }
    const ctx = state.audioCtx;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx;
  }

  /** "Primes" an <audio> element with a muted play so it may play later without a tap. */
  function primeMedia(el) {
    if (!el || !el.getAttribute("src") || !el.paused) return;
    try {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (state.phase !== "reveal") {
            el.pause();
            el.currentTime = 0;
          }
          el.muted = state.muted;
        }).catch(() => {
          el.muted = state.muted;
        });
      }
    } catch (_) {
      el.muted = state.muted;
    }
  }

  /** Must be called inside a click/tap handler: unlocks audio on iOS/Safari. */
  function unlockAudio() {
    const ctx = ensureAudioContext();
    if (ctx) {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start(0);
      } catch (_) { /* ignore */ }
    }
    if (state.musicOk) primeMedia(els.music);
    if (CONFIG.meow.enabled) primeMedia(els.meow);
  }

  function tone(freq, duration, volume, type = "sine", sweepTo = 0) {
    if (!CONFIG.beeps) return;
    const ctx = state.audioCtx;
    if (!ctx || ctx.state !== "running") return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    } catch (_) { /* ignore */ }
  }

  const beep = (freq = 660, duration = 0.09, volume = 0.07, type = "sine") => tone(freq, duration, volume, type);

  function goChime() {
    beep(880, 0.12, 0.07, "triangle");
    setTimeout(() => beep(1320, 0.16, 0.06, "triangle"), 90);
  }

  function finishJingle() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 0.06, "triangle"), i * 110));
  }

  /** Cute bubbly "pop" when a photo lands in the picture. */
  function popSound(i) {
    if (state.muted) return;
    const notes = [784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760];
    tone(notes[i % notes.length] * 0.5, 0.12, 0.09, "sine", notes[i % notes.length] * 1.4);
  }

  function shutterSound() {
    if (!CONFIG.beeps) return;
    const ctx = state.audioCtx;
    if (!ctx || ctx.state !== "running") return;
    try {
      const len = Math.floor(ctx.sampleRate * 0.09);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const click = t < 0.012 || (t > 0.045 && t < 0.055) ? 1 : 0.25;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.025) * click;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.value = 0.22;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (_) { /* ignore */ }
  }

  function playMeow() {
    if (!CONFIG.meow.enabled || state.muted) return;
    const m = els.meow;
    try {
      m.currentTime = 0;
      const p = m.play();
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function applyVolume() {
    [els.music, els.meow].forEach((m) => {
      m.muted = state.muted;
      if (state.volumeControllable) m.volume = state.volume;
    });
    const silent = state.muted || state.volume === 0;
    els.btnMute.textContent = silent ? "🔇" : "🔊";
    els.btnMute.setAttribute("aria-pressed", String(state.muted));
    els.btnMute.setAttribute("aria-label", state.muted ? "Unmute music" : "Mute music");
  }

  /* ========================================================================
     7. Camera
     ======================================================================== */
  const ERRORS = {
    insecure: {
      icon: "🔐",
      title: "Secure connection needed",
      message: "Browsers only allow the camera on secure pages (https:// or localhost).",
      tips: ["Open the site through its https:// address (e.g. GitHub Pages).", "Testing on your computer? Run a local server and open http://localhost (see README)."],
    },
    unsupported: {
      icon: "🧭",
      title: "Camera not supported here",
      message: "This browser can't access the camera.",
      tips: ["Please use the latest Chrome, Safari, Edge or Firefox.", "On iPhone, use Safari (iOS 14.3 or newer)."],
    },
    denied: {
      icon: "🚫",
      title: "Camera access was blocked",
      message: "We need your camera to play the challenge. Nothing is uploaded — your photos stay on your device.",
      tips: [
        "Chrome / Edge (computer): click the camera or 🔒 icon in the address bar → Allow camera → Try Again.",
        "iPhone Safari: tap \"aA\" in the address bar → Website Settings → Camera → Allow.",
        "Android Chrome: tap ⋮ → Settings → Site settings → Camera → allow this site.",
        "Also check your device settings allow the browser to use the camera.",
      ],
    },
    notfound: {
      icon: "📷",
      title: "No camera found",
      message: "We couldn't find a camera on this device.",
      tips: ["Plug in or enable a webcam, then tap Try Again.", "Or open this page on your phone."],
    },
    busy: {
      icon: "⏳",
      title: "Camera is busy",
      message: "Another app or tab is using the camera.",
      tips: ["Close apps like Zoom, Teams, FaceTime or other browser tabs using the camera.", "Then tap Try Again."],
    },
    snapfail: {
      icon: "😵",
      title: "No photos were taken",
      message: "The camera didn't give us any pictures.",
      tips: ["Tap Try Again to play once more.", "If it keeps happening, reload the page or try another browser."],
    },
    generic: {
      icon: "😕",
      title: "Couldn't start the camera",
      message: "Something went wrong while starting the camera.",
      tips: ["Tap Try Again.", "If it keeps happening, reload the page or try another browser."],
    },
  };

  function showError(kind, detail) {
    const e = ERRORS[kind] || ERRORS.generic;
    els.errorIcon.textContent = e.icon;
    els.errorTitle.textContent = e.title;
    els.errorMessage.textContent = e.message;
    els.errorTips.textContent = "";
    const tips = e.tips.slice();
    if (IS_IN_APP && kind !== "snapfail") tips.unshift("You seem to be inside an app's built-in browser. Open this link in Safari or Chrome instead.");
    tips.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      els.errorTips.appendChild(li);
    });
    if (detail) console.warn("[camera]", kind, detail);
    openModal(els.errorModal);
  }

  function errorKindFor(err) {
    const name = (err && err.name) || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "denied";
    if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "notfound";
    if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
    return "generic";
  }

  async function startCameraFlow() {
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (window.isSecureContext === false && !isLocalhost) return showError("insecure");
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") return showError("unsupported");

    showScreen("permission");
    const videoConstraints = {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (err) {
      let lastErr = err;
      if (err && err.name === "OverconstrainedError") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err2) {
          lastErr = err2;
        }
      }
      if (!stream) {
        showScreen("welcome");
        return showError(errorKindFor(lastErr), lastErr);
      }
    }

    state.stream = stream;
    const video = els.camPreview;
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
    } catch (_) { /* autoplay muted video should work; ignore */ }
    if (video.readyState < 2) await once(video, "loadeddata", 4000);
    updatePanelAspect();
    video.addEventListener("resize", updatePanelAspect);

    FaceAI.load(); // warm up face detection in the background while playing
    runChallenge();
  }

  function updatePanelAspect() {
    const v = els.camPreview;
    if (!v.videoWidth || !v.videoHeight) return;
    // Portrait phone cameras get slightly taller panels (a little side crop);
    // wide webcams are shown as 4:3 so the panels stay big.
    const cam = v.videoWidth / v.videoHeight;
    const ar = cam < 1 ? clamp(cam * 0.9, 0.5, 1) : clamp(cam, 1, 4 / 3);
    els.challenge.style.setProperty("--panel-ar", ar.toFixed(4));
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) { /* ignore */ }
      });
    }
    state.stream = null;
    els.camPreview.removeEventListener("resize", updatePanelAspect);
    try {
      els.camPreview.pause();
    } catch (_) { /* ignore */ }
    els.camPreview.srcObject = null;
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && !state.wakeLock) {
        state.wakeLock = await navigator.wakeLock.request("screen");
        state.wakeLock.addEventListener("release", () => {
          state.wakeLock = null;
        });
      }
    } catch (_) { /* not allowed / not supported */ }
  }

  function releaseWakeLock() {
    try {
      if (state.wakeLock) state.wakeLock.release();
    } catch (_) { /* ignore */ }
    state.wakeLock = null;
  }

  /* ========================================================================
     8. Challenge (moves, countdowns, photos)
     ======================================================================== */
  function buildTimeline() {
    const segs = [];
    let t = 0;
    if (CONFIG.introSeconds > 0) {
      segs.push({ type: "intro", index: -1, start: t, end: t + CONFIG.introSeconds });
      t += CONFIG.introSeconds;
    }
    CONFIG.actions.forEach((action, index) => {
      const prep = action.prepSeconds != null ? action.prepSeconds : CONFIG.prepSeconds;
      if (prep > 0) {
        segs.push({ type: "prep", index, start: t, end: t + prep });
        t += prep;
      }
      const dur = action.seconds != null ? action.seconds : CONFIG.actionSeconds;
      const snapTime = t + dur * clamp(CONFIG.snapAt, 0.2, 0.95);
      segs.push({ type: "action", index, start: t, end: t + dur, snapTime, snapped: false });
      t += dur;
    });
    return { segs, total: t };
  }

  function buildSnapStrip() {
    els.snapStrip.textContent = "";
    CONFIG.actions.forEach((a, i) => {
      const li = document.createElement("li");
      li.textContent = String(i + 1);
      li.setAttribute("aria-label", `Photo ${i + 1}: not taken yet`);
      els.snapStrip.appendChild(li);
    });
  }

  function updateStrip(currentIndex) {
    [...els.snapStrip.children].forEach((li, i) => {
      li.classList.toggle("current", i === currentIndex);
    });
  }

  function popCount(text, isGo) {
    const n = els.countNum;
    n.textContent = text;
    n.classList.toggle("go", !!isGo);
    restartAnimation(n, "pop");
  }

  function setTimerRing(fraction, label) {
    const circumference = 125.66;
    els.timerFill.style.strokeDashoffset = String(circumference * (1 - clamp(fraction, 0, 1)));
    els.timerNum.textContent = label;
  }

  /** Grabs the current camera frame (mirrored, like a selfie) into a canvas. */
  function snapPhoto(index) {
    const v = els.camPreview;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    if (!vw || !vh || v.readyState < 2) return false;
    const scale = Math.min(1, 960 / Math.max(vw, vh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    try {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.warn("[photo] could not capture", err);
      return false;
    }
    state.photos.push({ canvas, action: CONFIG.actions[index], index, face: null });

    // feedback: flash, shutter sound, thumbnail
    restartAnimation(els.shutter, "is-on");
    restartAnimation(els.snapPop, "is-on");
    shutterSound();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (_) { /* ignore */ }
    }
    els.snapCount.textContent = String(state.photos.length);
    const li = els.snapStrip.children[index];
    if (li) {
      const thumb = document.createElement("canvas");
      const th = 96;
      thumb.height = th;
      thumb.width = Math.round((th * canvas.width) / canvas.height);
      thumb.getContext("2d").drawImage(canvas, 0, 0, thumb.width, thumb.height);
      li.textContent = "";
      li.appendChild(thumb);
      li.classList.add("got");
      li.setAttribute("aria-label", `Photo ${index + 1}: taken`);
    }
    return true;
  }

  function enterSegment(seg) {
    const screen = els.challenge;
    screen.classList.toggle("is-intro", seg.type === "intro");
    screen.classList.toggle("is-prep", seg.type === "prep");
    screen.classList.toggle("is-action", seg.type === "action");
    state.lastCount = -1;

    if (seg.type === "intro") {
      els.counter.textContent = "Get ready";
      els.moveEmoji.textContent = "📸";
      els.phaseLabel.textContent = "Get ready…";
      els.moveTitle.textContent = "Get into the frame!";
      els.moveHint.textContent = "Make sure your face and both hands are visible";
      state.buddy.setAttribute("data-pose", "hello");
      updateStrip(-1);
      return;
    }

    const action = CONFIG.actions[seg.index];
    const total = CONFIG.actions.length;
    els.counter.textContent = `Move ${seg.index + 1} / ${total}`;
    els.moveEmoji.textContent = action.emoji || "⭐";
    els.moveTitle.textContent = action.title;
    els.moveHint.textContent = action.hint || "";
    state.buddy.setAttribute("data-pose", action.pose);
    updateStrip(seg.index);

    if (seg.type === "prep") {
      els.phaseLabel.textContent = seg.index === 0 ? "First move · get ready" : "Next move · get ready";
      restartAnimation(els.moveCard, "bump");
    } else {
      els.phaseLabel.textContent = "Go! Hold the pose for the photo 📸";
      popCount("GO!", true);
      goChime();
    }
  }

  function runChallenge() {
    state.timeline = buildTimeline();
    state.segIndex = -1;
    state.photos = [];
    buildSnapStrip();
    els.snapCount.textContent = "0";
    els.snapTotal.textContent = String(CONFIG.actions.length);
    els.progressFill.style.width = "0%";
    showScreen("challenge");
    requestWakeLock();
    const startedAt = performance.now();
    const sessionId = ++state.sessionId;

    const tick = () => {
      if (state.phase !== "challenge" || sessionId !== state.sessionId) return;
      const t = (performance.now() - startedAt) / 1000;
      const { segs, total } = state.timeline;

      const pct = clamp(t / total, 0, 1) * 100;
      els.progressFill.style.width = `${pct.toFixed(2)}%`;
      els.progress.setAttribute("aria-valuenow", String(Math.round(pct)));

      let idx = state.segIndex < 0 ? 0 : state.segIndex;
      while (idx < segs.length && t >= segs[idx].end) {
        // Never skip a photo, even if the tab was in the background.
        const s = segs[idx];
        if (s.type === "action" && !s.snapped) {
          s.snapped = true;
          snapPhoto(s.index);
        }
        idx++;
      }
      if (idx >= segs.length) {
        finishChallenge();
        return;
      }
      const seg = segs[idx];
      if (idx !== state.segIndex) {
        state.segIndex = idx;
        enterSegment(seg);
      }

      if (seg.type === "action") {
        if (!seg.snapped && t >= seg.snapTime) {
          seg.snapped = true;
          snapPhoto(seg.index);
          els.phaseLabel.textContent = "Got it! ✨";
        }
        if (seg.snapped) {
          setTimerRing(1, "📸");
        } else {
          const left = seg.snapTime - t;
          setTimerRing(left / (seg.snapTime - seg.start), String(Math.max(1, Math.ceil(left - 0.001))));
        }
      } else {
        const remaining = seg.end - t;
        const secs = Math.ceil(remaining - 0.001);
        setTimerRing(remaining / (seg.end - seg.start), String(Math.max(secs, 0)));
        if (seg.type === "prep" && secs !== state.lastCount) {
          state.lastCount = secs;
          if (secs > 0) {
            popCount(String(secs), false);
            beep(560, 0.08);
          }
        }
      }
      state.rafId = requestAnimationFrame(tick);
    };
    state.rafId = requestAnimationFrame(tick);
  }

  async function finishChallenge() {
    cancelAnimationFrame(state.rafId);
    releaseWakeLock();
    els.progressFill.style.width = "100%";
    updateStrip(-1);
    finishJingle();
    stopCamera(); // all photos are taken → camera off right away

    if (!state.photos.length) {
      showScreen("welcome");
      showError("snapfail");
      return;
    }

    const sessionId = state.sessionId;
    showScreen("complete");
    els.completeCard.classList.remove("is-loading");
    els.completeCard.style.setProperty("--load-dur", `${CONFIG.loadingSeconds}s`);

    await sleep(900);
    if (sessionId !== state.sessionId) return;
    els.completeCard.classList.add("is-loading"); // "Preparing Your Results..."
    const minWait = sleep(CONFIG.loadingSeconds * 1000);
    await Promise.all([minWait, preloadFonts(), withTimeout(FaceAI.load(), (CONFIG.loadingSeconds + CONFIG.faceDetection.maxWaitSeconds) * 1000)]);
    if (sessionId !== state.sessionId || state.phase !== "complete") return;

    findFaces(state.photos);
    Picture.prepare(state.photos);
    pinkFlash(startReveal);
  }

  function preloadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return withTimeout(
      Promise.all([
        document.fonts.load('400 48px "Pacifico"'),
        document.fonts.load('700 48px "Fredoka"'),
        document.fonts.load('600 48px "Fredoka"'),
      ]).catch(() => {}),
      2500
    );
  }

  /* ========================================================================
     9. Face detection (local, MediaPipe) → where to put the cat ears
     ======================================================================== */
  const FaceAI = {
    detector: null,
    loading: null,

    /** Loads the detector once; resolves to null if it can't (the ears then use a best guess). */
    load() {
      if (this.loading) return this.loading;
      if (!CONFIG.faceDetection.enabled) {
        this.loading = Promise.resolve(null);
        return this.loading;
      }
      const base = new URL(CONFIG.faceDetection.path, location.href).href;
      this.loading = import(`${base}vision_bundle.mjs`)
        .then(async (mp) => {
          const files = await mp.FilesetResolver.forVisionTasks(`${base}wasm`);
          this.detector = await mp.FaceDetector.createFromOptions(files, {
            baseOptions: { modelAssetPath: `${base}blaze_face_short_range.tflite`, delegate: "CPU" },
            runningMode: "IMAGE",
            minDetectionConfidence: CONFIG.faceDetection.minConfidence,
          });
          return this.detector;
        })
        .catch((err) => {
          console.warn("[face] Face detection unavailable — cat ears will use a best guess.", err);
          return null;
        });
      return this.loading;
    },

    /** Returns { M, d, theta, nose } for the biggest face in the canvas, or null. */
    detect(canvas) {
      if (!this.detector) return null;
      try {
        const res = this.detector.detect(canvas);
        const list = (res && res.detections) || [];
        let best = null;
        list.forEach((det) => {
          const b = det.boundingBox;
          if (b && (!best || b.width * b.height > best.boundingBox.width * best.boundingBox.height)) best = det;
        });
        if (!best || !best.keypoints || best.keypoints.length < 3) return null;
        const W = canvas.width;
        const H = canvas.height;
        const k = best.keypoints.map((p) => ({ x: p.x * W, y: p.y * H }));
        const [a, b] = k[0].x < k[1].x ? [k[0], k[1]] : [k[1], k[0]];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (!(d > 4)) return null;
        return {
          M: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          d,
          theta: clamp(Math.atan2(b.y - a.y, b.x - a.x), -0.7, 0.7),
          nose: k[2],
          detected: true,
        };
      } catch (err) {
        console.warn("[face] detection failed", err);
        return null;
      }
    },
  };

  /** Finds the face in every photo; photos without a face borrow a sensible guess. */
  function findFaces(photos) {
    photos.forEach((p) => {
      p.face = FaceAI.detect(p.canvas);
    });
    const found = photos.filter((p) => p.face);
    photos.forEach((p) => {
      if (p.face) return;
      const W = p.canvas.width;
      const H = p.canvas.height;
      if (found.length) {
        // average of the photos where a face was found (same camera, same person)
        const avg = (fn) => found.reduce((s, q) => s + fn(q.face), 0) / found.length;
        p.face = { M: { x: avg((f) => f.M.x), y: avg((f) => f.M.y) }, d: avg((f) => f.d), theta: 0, nose: null, detected: false };
      } else {
        const portrait = W < H;
        p.face = { M: { x: W * 0.5, y: H * (portrait ? 0.36 : 0.38) }, d: W * (portrait ? 0.16 : 0.085), theta: 0, nose: null, detected: false };
      }
    });
    console.info(`[face] found ${found.length}/${photos.length} faces`);
  }

  /**
   * Draws the cat filter in photo coordinates.
   * part = "ears" → only the ears; part = "face" → nose, whiskers, blush.
   */
  function drawCatFace(g, face, part) {
    const cfg = CONFIG.catFace;
    const { M, d, theta } = face;
    const up = { x: Math.sin(theta), y: -Math.cos(theta) };
    const rt = { x: Math.cos(theta), y: Math.sin(theta) };
    const at = (u, r) => ({ x: M.x + up.x * u * d + rt.x * r * d, y: M.y + up.y * u * d + rt.y * r * d });

    if (part === "ears" && cfg.ears) {
      for (const side of [-1, 1]) {
        const b = at(1.36, side * 0.98);
        const h = 1.35 * d;
        const w = 1.1 * d;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(theta + side * 0.38);
        const ear = (s, dy) => {
          g.beginPath();
          g.moveTo((-w * s) / 2, dy);
          g.quadraticCurveTo(-w * s * 0.42, -h * s * 0.62 + dy, -w * s * 0.07, -h * s * 0.97 + dy);
          g.quadraticCurveTo(0, -h * s * 1.04 + dy, w * s * 0.07, -h * s * 0.97 + dy);
          g.quadraticCurveTo(w * s * 0.42, -h * s * 0.62 + dy, (w * s) / 2, dy);
          g.quadraticCurveTo(0, h * 0.16 * s + dy, (-w * s) / 2, dy);
          g.closePath();
        };
        g.shadowColor = "rgba(120,20,70,0.35)";
        g.shadowBlur = d * 0.25;
        g.shadowOffsetY = d * 0.05;
        ear(1, 0);
        g.fillStyle = cfg.earColor;
        g.fill();
        g.shadowColor = "transparent";
        g.lineWidth = d * 0.07;
        g.strokeStyle = cfg.earOutline;
        g.stroke();
        ear(0.6, -h * 0.06);
        const gr = g.createLinearGradient(0, -h, 0, 0);
        gr.addColorStop(0, cfg.earInner);
        gr.addColorStop(1, "#ff9cc8");
        g.fillStyle = gr;
        g.fill();
        g.beginPath();
        g.moveTo(-w * 0.3, -h * 0.25);
        g.quadraticCurveTo(-w * 0.28, -h * 0.62, -w * 0.1, -h * 0.84);
        g.lineWidth = d * 0.05;
        g.lineCap = "round";
        g.strokeStyle = "rgba(255,255,255,0.75)";
        g.stroke();
        g.restore();
      }
    }

    if (part !== "face" || !face.detected) return; // nose/whiskers/blush need a real detection

    if (cfg.blush) {
      for (const side of [-1, 1]) {
        const c = at(-0.62, side * 0.72);
        g.save();
        g.translate(c.x, c.y);
        g.rotate(theta);
        g.fillStyle = "rgba(255, 92, 150, 0.33)";
        g.beginPath();
        g.ellipse(0, 0, d * 0.3, d * 0.17, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }

    if (face.nose && (cfg.nose || cfg.whiskers)) {
      const n = face.nose;
      g.save();
      g.translate(n.x + up.x * 0.02 * d, n.y + up.y * 0.02 * d);
      g.rotate(theta);
      if (cfg.nose) {
        g.beginPath();
        g.moveTo(-d * 0.15, -d * 0.07);
        g.quadraticCurveTo(0, -d * 0.14, d * 0.15, -d * 0.07);
        g.quadraticCurveTo(d * 0.05, d * 0.09, 0, d * 0.1);
        g.quadraticCurveTo(-d * 0.05, d * 0.09, -d * 0.15, -d * 0.07);
        g.closePath();
        g.fillStyle = "#ff6f9f";
        g.fill();
        g.lineWidth = d * 0.03;
        g.strokeStyle = "#d93d7a";
        g.stroke();
      }
      if (cfg.whiskers) {
        g.lineCap = "round";
        for (const side of [-1, 1]) {
          for (const a of [-0.18, 0, 0.18]) {
            const sx = side * d * 0.42;
            const sy = d * 0.08 + a * d * 0.25;
            const ang = (side > 0 ? 0 : Math.PI) + a * side;
            const ex = sx + Math.cos(ang) * d * 0.75;
            const ey = sy + Math.sin(ang) * d * 0.75;
            [
              ["rgba(90,30,60,0.45)", d * 0.06],
              ["#ffffff", d * 0.032],
            ].forEach(([col, lw]) => {
              g.beginPath();
              g.moveTo(sx, sy);
              g.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 - d * 0.04, ex, ey);
              g.strokeStyle = col;
              g.lineWidth = lw;
              g.stroke();
            });
          }
        }
      }
      g.restore();
    }
  }

  /* ========================================================================
     10. The cute picture (Canvas): pink background + every pose with cat ears
     ======================================================================== */
  const EMOJI_FONTS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
  const HEART_COLORS = ["#ff2d87", "#ff4f9a", "#ff6fae", "#ff8fc1", "#ffc2dc", "#ffffff", "#e8457f", "#ffd1e6"];

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function heartPath(ctx, cx, cy, size) {
    const s = size / 32;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 13 * s);
    ctx.bezierCurveTo(cx - 1.4 * s, cy + 11.9 * s, cx - 15 * s, cy + 3.1 * s, cx - 15 * s, cy - 6 * s);
    ctx.bezierCurveTo(cx - 15 * s, cy - 10.8 * s, cx - 11.2 * s, cy - 14.6 * s, cx - 6.6 * s, cy - 14.6 * s);
    ctx.bezierCurveTo(cx - 3.8 * s, cy - 14.6 * s, cx - 1.4 * s, cy - 13.2 * s, cx, cy - 11.1 * s);
    ctx.bezierCurveTo(cx + 1.4 * s, cy - 13.2 * s, cx + 3.8 * s, cy - 14.6 * s, cx + 6.6 * s, cy - 14.6 * s);
    ctx.bezierCurveTo(cx + 11.2 * s, cy - 14.6 * s, cx + 15 * s, cy - 10.8 * s, cx + 15 * s, cy - 6 * s);
    ctx.bezierCurveTo(cx + 15 * s, cy + 3.1 * s, cx + 1.4 * s, cy + 11.9 * s, cx, cy + 13 * s);
    ctx.closePath();
  }

  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.28;
      const a = (Math.PI / 4) * i - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  function pawPath(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2);
    [
      [-0.42, -0.2],
      [-0.15, -0.45],
      [0.15, -0.45],
      [0.42, -0.2],
    ].forEach(([px, py]) => {
      ctx.moveTo(px * s + s * 0.15, py * s);
      ctx.ellipse(px * s, py * s, s * 0.15, s * 0.19, 0, 0, Math.PI * 2);
    });
    ctx.restore();
  }

  const ease = {
    outBack(x) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
  };

  /** Sets ctx.font from a template like `700 {s}px Fredoka`, shrinking until it fits. */
  function fitFont(ctx, text, template, maxSize, maxWidth) {
    let size = Math.max(10, Math.round(maxSize));
    ctx.font = template.replace("{s}", size);
    while (size > 10 && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = template.replace("{s}", size);
    }
    return size;
  }

  class PictureRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }

    setup(photos) {
      this.photos = photos;
      const p0 = photos[0].canvas;
      const portrait = p0.width < p0.height;
      this.tileAR = portrait ? 0.8 : 1; // photo window shape inside each card
      const W = CONFIG.picture.width;
      const H = Math.round(W * (portrait ? 1.5 : 1.25));
      this.W = W;
      this.H = H;
      this.canvas.width = W;
      this.canvas.height = H;

      // Two layouts are tried and the one with the biggest photos wins:
      //  "cell":   photos + the "Gotcha!" badge share one grid (e.g. 8 photos → 3×3)
      //  "banner": photos fill a full grid, the badge is a banner below it (e.g. 4 photos → 2×2)
      const n = photos.length;
      const area = { x: W * 0.04, y: H * 0.175, w: W * 0.92, h: H * 0.765 };
      const bannerH = H * 0.12;
      const fit = (cells, areaH, exact) => {
        let best = null;
        for (let cols = 1; cols <= cells; cols++) {
          const rows = Math.ceil(cells / cols);
          if (exact && (cols * rows !== cells || cols < 2)) continue;
          const L = this.layoutCard((area.w / cols) * 0.9, (areaH / rows) * 0.9);
          if (!best || L.pw > best.L.pw) best = { cols, rows, L, areaH };
        }
        return best;
      };
      const asCell = fit(n + 1, area.h, false);
      const asBanner = n >= 2 ? fit(n, area.h - bannerH - H * 0.02, true) : null;
      const useBanner = !!asBanner && asBanner.L.pw >= asCell.L.pw;
      const { cols, rows, L, areaH } = useBanner ? asBanner : asCell;
      const cells = useBanner ? n : n + 1;
      this.card = L;
      const cellW = area.w / cols;
      const cellH = Math.min(areaH / rows, L.h / 0.86);
      const gridH = cellH * rows;
      const blockH = gridH + (useBanner ? bannerH + H * 0.02 : 0);
      const top = area.y + (area.h - blockH) / 2;
      // in "cell" mode the badge takes the centre cell if there is one, else the last
      const badgeIndex = useBanner ? -1 : cols % 2 === 1 && rows % 2 === 1 && cols * rows === cells ? Math.floor(cells / 2) : cells - 1;
      this.slots = [];
      for (let i = 0; i < cells; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? cells - row * cols : cols;
        const offset = ((cols - inRow) * cellW) / 2; // centre a short last row
        this.slots.push({
          x: area.x + offset + col * cellW + cellW / 2,
          y: top + row * cellH + cellH / 2,
          rot: ((i * 7919) % 5 - 2) * 0.022,
          badge: i === badgeIndex,
        });
      }

      this.prerenderBackground();
      this.cards = photos.map((p) => this.prerenderPhotoCard(p));
      if (useBanner) {
        this.badge = this.prerenderBanner(W * 0.86, bannerH);
        this.badgePos = { x: W / 2, y: top + gridH + H * 0.02 + bannerH / 2, rot: -0.03 };
      } else {
        this.badge = this.prerenderBadge();
        const b = this.slots[badgeIndex];
        this.badgePos = { x: b.x, y: b.y, rot: -0.06 };
      }

      // timing of the build-up animation
      this.order = this.slots.map((sl, i) => i).filter((i) => !this.slots[i].badge);
      this.cardAt = (k) => 0.75 + k * 0.28;
      this.badgeAt = this.cardAt(this.order.length) + 0.2;
      this.total = this.badgeAt + 0.7;
    }

    layoutCard(maxW, maxH) {
      const bRatio = 0.055; // border relative to photo width
      const stripRatio = 0.2; // caption strip relative to photo height
      const ar = this.tileAR;
      let pw = maxW / (1 + 2 * bRatio);
      let ph = pw / ar;
      if (ph * (1 + stripRatio) + pw * bRatio > maxH) {
        ph = maxH / (1 + stripRatio + ar * bRatio);
        pw = ph * ar;
      }
      const b = pw * bRatio;
      const strip = ph * stripRatio;
      return { pw, ph, b, strip, w: pw + 2 * b, h: ph + b + strip };
    }

    /** Crop window around the face, so every card shows the pose with room for the ears. */
    cropFor(photo) {
      const c = photo.canvas;
      const W = c.width;
      const H = c.height;
      const ar = this.tileAR;
      let cw;
      let ch;
      if (W / H < ar) {
        cw = W;
        ch = W / ar;
      } else {
        ch = H;
        cw = H * ar;
      }
      const f = photo.face;
      const fx = f.M.x;
      const fy = f.M.y + f.d * 0.3;
      return {
        x: clamp(fx - cw / 2, 0, W - cw),
        y: clamp(fy - ch * 0.47, 0, H - ch),
        w: cw,
        h: ch,
      };
    }

    prerenderPhotoCard(photo) {
      const L = this.card;
      const pad = Math.round(L.w * 0.12);
      const crop = this.cropFor(photo);
      const s = L.pw / crop.w;
      // The ears may pop out above the polaroid — make room for them.
      const earTop = (photo.face.M.y - crop.y - 2.85 * photo.face.d) * s + L.b; // relative to card top
      const padTop = Math.round(pad + clamp(-earTop, 0, L.h * 0.4));
      const c = document.createElement("canvas");
      c.width = Math.round(L.w + pad * 2);
      c.height = Math.round(L.h + padTop + pad);
      c.offsetY = (padTop - pad) / 2; // keeps the polaroid itself centred when drawn
      const g = c.getContext("2d");
      // white polaroid with soft shadow
      g.save();
      g.shadowColor = "rgba(150, 20, 80, 0.33)";
      g.shadowBlur = pad * 0.6;
      g.shadowOffsetY = pad * 0.18;
      g.fillStyle = "#ffffff";
      roundRectPath(g, pad, padTop, L.w, L.h, L.b * 0.8);
      g.fill();
      g.restore();
      const toPhoto = () => {
        g.translate(pad + L.b, padTop + L.b);
        g.scale(s, s);
        g.translate(-crop.x, -crop.y);
      };
      // photo + cat nose/whiskers/blush, clipped to the photo window
      g.save();
      roundRectPath(g, pad + L.b, padTop + L.b, L.pw, L.ph, L.b * 0.45);
      g.clip();
      toPhoto();
      g.drawImage(photo.canvas, 0, 0);
      drawCatFace(g, photo.face, "face");
      g.restore();
      // cat ears: not clipped, so they can pop out of the frame
      g.save();
      g.beginPath();
      g.rect(pad - L.b, 0, L.w + 2 * L.b, padTop + L.b + L.ph);
      g.clip();
      toPhoto();
      drawCatFace(g, photo.face, "ears");
      g.restore();
      // caption
      const action = photo.action || {};
      if (action.caption) {
        g.fillStyle = "#ff2d87";
        g.textAlign = "center";
        g.textBaseline = "middle";
        fitFont(g, action.caption, `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`, L.strip * 0.5, L.pw * 0.92);
        g.fillText(action.caption, c.width / 2, padTop + L.b + L.ph + L.strip * 0.5);
      }
      // sticker on the top-right corner
      if (action.sticker) {
        g.save();
        g.translate(pad + L.w - L.b * 0.6, padTop + L.b * 0.6);
        g.rotate(0.25);
        g.font = `400 ${Math.round(L.w * 0.2)}px ${EMOJI_FONTS}, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = "rgba(255,255,255,0.95)";
        g.shadowBlur = 8;
        g.fillText(action.sticker, 0, 0);
        g.restore();
      }
      return c;
    }

    prerenderBadge() {
      const L = this.card;
      const P = CONFIG.picture;
      const pad = Math.round(L.w * 0.12);
      const c = document.createElement("canvas");
      c.width = Math.round(L.w + pad * 2);
      c.height = Math.round(L.h + pad * 2);
      const g = c.getContext("2d");
      const x = pad;
      const y = pad;
      g.save();
      g.shadowColor = "rgba(150, 20, 80, 0.35)";
      g.shadowBlur = pad * 0.6;
      g.shadowOffsetY = pad * 0.18;
      const bg = g.createLinearGradient(x, y, x + L.w, y + L.h);
      bg.addColorStop(0, "#ff7eb6");
      bg.addColorStop(1, "#ff4f9a");
      g.fillStyle = bg;
      roundRectPath(g, x, y, L.w, L.h, L.b * 1.2);
      g.fill();
      g.restore();
      g.lineWidth = L.b * 0.45;
      g.strokeStyle = "#ffffff";
      g.setLineDash([L.b * 0.9, L.b * 0.6]);
      roundRectPath(g, x + L.b * 0.6, y + L.b * 0.6, L.w - L.b * 1.2, L.h - L.b * 1.2, L.b);
      g.stroke();
      g.setLineDash([]);

      this.drawBadgeCat(g, x + L.w / 2, y + L.h * 0.36, Math.min(L.w, L.h) * 0.2);
      const cx = x + L.w / 2;

      // text
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(160,10,80,0.55)";
      g.shadowBlur = 10;
      fitFont(g, P.gotcha, `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`, L.w * 0.2, L.w * 0.86);
      g.fillText(P.gotcha, cx, y + L.h * 0.7);
      fitFont(g, P.gotchaSub, `700 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`, L.w * 0.085, L.w * 0.86);
      g.fillText(P.gotchaSub, cx, y + L.h * 0.86);
      return c;
    }

    /** A little white cartoon cat face (used on the "Gotcha!" badge). */
    drawBadgeCat(g, cx, cy, r) {
      g.save();
      for (const side of [-1, 1]) {
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.moveTo(cx + side * r * 0.95, cy - r * 0.15);
        g.lineTo(cx + side * r * 0.85, cy - r * 1.25);
        g.lineTo(cx + side * r * 0.25, cy - r * 0.85);
        g.closePath();
        g.fill();
        g.fillStyle = "#ffb3d4";
        g.beginPath();
        g.moveTo(cx + side * r * 0.8, cy - r * 0.4);
        g.lineTo(cx + side * r * 0.76, cy - r * 1.0);
        g.lineTo(cx + side * r * 0.42, cy - r * 0.8);
        g.closePath();
        g.fill();
      }
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#5a2340";
      g.lineWidth = r * 0.09;
      g.lineCap = "round";
      for (const side of [-1, 1]) {
        g.beginPath();
        g.arc(cx + side * r * 0.38, cy - r * 0.05, r * 0.16, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
        g.fillStyle = "rgba(255,105,160,0.45)";
        g.beginPath();
        g.ellipse(cx + side * r * 0.55, cy + r * 0.3, r * 0.17, r * 0.1, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.moveTo(cx - r * 0.22, cy + r * 0.32);
      g.quadraticCurveTo(cx - r * 0.11, cy + r * 0.45, cx, cy + r * 0.32);
      g.quadraticCurveTo(cx + r * 0.11, cy + r * 0.45, cx + r * 0.22, cy + r * 0.32);
      g.stroke();
      g.fillStyle = "#ff6f9f";
      g.beginPath();
      g.moveTo(cx - r * 0.08, cy + r * 0.16);
      g.lineTo(cx + r * 0.08, cy + r * 0.16);
      g.lineTo(cx, cy + r * 0.26);
      g.closePath();
      g.fill();
      g.restore();
    }

    /** Wide "Gotcha!" ribbon used under a full grid of photos. */
    prerenderBanner(bw, bh) {
      const P = CONFIG.picture;
      const pad = Math.round(bh * 0.3);
      const c = document.createElement("canvas");
      c.width = Math.round(bw + pad * 2);
      c.height = Math.round(bh + pad * 2);
      const g = c.getContext("2d");
      const x = pad;
      const y = pad;
      g.save();
      g.shadowColor = "rgba(150, 20, 80, 0.35)";
      g.shadowBlur = pad * 0.8;
      g.shadowOffsetY = pad * 0.2;
      const grad = g.createLinearGradient(x, y, x + bw, y + bh);
      grad.addColorStop(0, "#ff7eb6");
      grad.addColorStop(1, "#ff4f9a");
      g.fillStyle = grad;
      roundRectPath(g, x, y, bw, bh, bh / 2);
      g.fill();
      g.restore();
      g.lineWidth = bh * 0.035;
      g.strokeStyle = "#ffffff";
      g.setLineDash([bh * 0.09, bh * 0.06]);
      roundRectPath(g, x + bh * 0.08, y + bh * 0.08, bw - bh * 0.16, bh - bh * 0.16, bh / 2);
      g.stroke();
      g.setLineDash([]);
      // cat faces on both ends
      const r = bh * 0.27;
      [x + bh * 0.62, x + bw - bh * 0.62].forEach((cx) => this.drawBadgeCat(g, cx, y + bh * 0.56, r));
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(160,10,80,0.55)";
      g.shadowBlur = 10;
      fitFont(g, P.gotcha, `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`, bh * 0.42, bw - bh * 2.6);
      g.fillText(P.gotcha, x + bw / 2, y + bh * 0.4);
      fitFont(g, P.gotchaSub, `700 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`, bh * 0.19, bw - bh * 2.6);
      g.fillText(P.gotchaSub, x + bw / 2, y + bh * 0.78);
      return c;
    }

    prerenderBackground() {
      const { W, H } = this;
      const bg = document.createElement("canvas");
      bg.width = W;
      bg.height = H;
      const c = bg.getContext("2d");
      const lg = c.createLinearGradient(0, 0, W * 0.35, H);
      lg.addColorStop(0, "#ff7eb6");
      lg.addColorStop(0.45, "#ffa6cf");
      lg.addColorStop(1, "#ffc7e0");
      c.fillStyle = lg;
      c.fillRect(0, 0, W, H);
      const glow = (x, y, r, color) => {
        const rg = c.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, color);
        rg.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = rg;
        c.fillRect(0, 0, W, H);
      };
      glow(W * 0.5, H * 0.52, Math.max(W, H) * 0.6, "rgba(255,255,255,0.45)");
      glow(W * 0.08, H * 0.95, W * 0.6, "rgba(255,45,135,0.3)");
      glow(W * 0.92, H * 0.05, W * 0.5, "rgba(255,255,255,0.45)");
      // polka dots
      c.fillStyle = "rgba(255,255,255,0.16)";
      const step = W / 10;
      for (let y = step / 2, row = 0; y < H; y += step, row++) {
        for (let x = (row % 2 ? step / 2 : 0) + step / 4; x < W; x += step) {
          c.beginPath();
          c.arc(x, y, W * 0.01, 0, Math.PI * 2);
          c.fill();
        }
      }
      // paw prints, hearts and sparkles (same every time)
      const r = seededRandom(20261017);
      c.fillStyle = "rgba(255,255,255,0.32)";
      for (let i = 0; i < 16; i++) {
        pawPath(c, r() * W, r() * H, W * (0.03 + r() * 0.025), (r() - 0.5) * 1.2);
        c.fill();
      }
      for (let i = 0; i < 26; i++) {
        c.globalAlpha = 0.5 + r() * 0.45;
        c.fillStyle = HEART_COLORS[Math.floor(r() * HEART_COLORS.length)];
        heartPath(c, r() * W, r() * H, W * (0.02 + r() * 0.035));
        c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = "#ffffff";
      for (let i = 0; i < 30; i++) {
        c.globalAlpha = 0.45 + r() * 0.55;
        starPath(c, r() * W, r() * H, W * (0.006 + r() * 0.012));
        c.fill();
      }
      c.globalAlpha = 1;
      this.bg = bg;
    }

    drawText(text, x, y, { template, size, maxWidth, color = "#ffffff", glow = "rgba(255,45,135,0.9)", blur = 18, scale = 1, alpha = 1 }) {
      if (alpha <= 0 || scale <= 0) return;
      const g = this.ctx;
      g.save();
      g.globalAlpha = clamp(alpha, 0, 1);
      g.translate(x, y);
      g.scale(scale, scale);
      fitFont(g, text, template, size, maxWidth);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = glow;
      g.shadowBlur = blur;
      g.fillStyle = color;
      g.fillText(text, 0, 0);
      g.restore();
    }

    drawPill(text, x, y, { scale = 1, alpha = 1 } = {}) {
      if (alpha <= 0 || scale <= 0) return;
      const g = this.ctx;
      const { W } = this;
      g.save();
      g.globalAlpha = clamp(alpha, 0, 1);
      g.translate(x, y);
      g.scale(scale, scale);
      const fs = fitFont(g, text, `700 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`, W * 0.042, W * 0.8);
      const bw = g.measureText(text).width + fs * 1.6;
      const bh = fs * 1.9;
      g.shadowColor = "rgba(255,45,135,0.45)";
      g.shadowBlur = 18;
      g.fillStyle = "rgba(255,255,255,0.96)";
      roundRectPath(g, -bw / 2, -bh / 2, bw, bh, bh / 2);
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = Math.max(3, fs * 0.09);
      g.strokeStyle = "rgba(255,143,193,0.9)";
      g.stroke();
      g.fillStyle = "#ff2d87";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 0, fs * 0.04);
      g.restore();
    }

    /** Draws the picture as it looks `t` seconds into the build-up (Infinity = final). */
    draw(t) {
      const g = this.ctx;
      const { W, H } = this;
      const P = CONFIG.picture;
      const k = (start, dur) => clamp((t - start) / dur, 0, 1);
      g.drawImage(this.bg, 0, 0);

      const kt = k(0.05, 0.5);
      this.drawText(P.title, W / 2, H * 0.068, {
        template: `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`,
        size: W * 0.085,
        maxWidth: W * 0.9,
        scale: ease.outBack(kt),
        alpha: kt * 2,
      });
      const ks = k(0.35, 0.45);
      this.drawPill(P.subtitle, W / 2, H * 0.135, { scale: ease.outBack(ks), alpha: ks * 2 });

      this.order.forEach((slotIndex, n) => {
        const kc = k(this.cardAt(n), 0.38);
        if (kc <= 0) return;
        const s = this.slots[slotIndex];
        const card = this.cards[n];
        g.save();
        g.translate(s.x, s.y);
        g.rotate(s.rot + (1 - kc) * 0.5);
        const sc = ease.outBack(kc);
        g.scale(sc, sc);
        g.drawImage(card, -card.width / 2, -card.height / 2 - (card.offsetY || 0));
        g.restore();
      });

      const kb = k(this.badgeAt, 0.4);
      if (kb > 0) {
        const bp = this.badgePos;
        g.save();
        g.translate(bp.x, bp.y);
        g.rotate(bp.rot);
        const sc = 2.2 - 1.2 * ease.outBack(kb); // stamp: big → normal
        g.scale(sc, sc);
        g.globalAlpha = clamp(kb * 2, 0, 1);
        g.drawImage(this.badge, -this.badge.width / 2, -this.badge.height / 2);
        g.restore();
      }

      this.drawText(P.footer, W / 2, H * 0.968, {
        template: `600 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`,
        size: W * 0.03,
        maxWidth: W * 0.9,
        color: "rgba(255,255,255,0.97)",
        glow: "rgba(200,20,100,0.5)",
        blur: 8,
        alpha: k(0.3, 0.4),
      });
    }
  }

  /* ---------- picture playback (build-up animation + music) ---------- */
  const Picture = {
    renderer: null,
    rafId: 0,

    prepare(photos) {
      if (!this.renderer) this.renderer = new PictureRenderer(els.pictureCanvas);
      this.renderer.setup(photos);
      els.showFrame.style.setProperty("--ar", (this.renderer.W / this.renderer.H).toFixed(4));
      // Render the finished picture once, off-screen, for saving / long-press.
      state.pictureBlob = null;
      if (state.pictureURL) URL.revokeObjectURL(state.pictureURL);
      state.pictureURL = "";
      const out = document.createElement("canvas");
      const finalRenderer = new PictureRenderer(out);
      finalRenderer.setup(photos);
      finalRenderer.draw(Infinity);
      out.toBlob((blob) => {
        if (!blob) return;
        state.pictureBlob = blob;
        state.pictureURL = URL.createObjectURL(blob);
        els.pictureImg.src = state.pictureURL;
      }, "image/png");
    },

    poster() {
      if (this.renderer) this.renderer.draw(0);
      els.pictureImg.hidden = true;
    },

    stop() {
      cancelAnimationFrame(this.rafId);
    },

    play() {
      this.stop();
      const r = this.renderer;
      const startedAt = performance.now();
      const sessionId = state.sessionId;
      let popped = 0;
      let meowed = false;
      els.pictureImg.hidden = true;
      const frame = (now) => {
        if (sessionId !== state.sessionId || state.phase !== "reveal") return;
        const t = (now - startedAt) / 1000;
        r.draw(t);
        while (popped < r.order.length && t >= r.cardAt(popped)) popSound(popped++);
        if (!meowed && t >= r.badgeAt) {
          meowed = true;
          playMeow();
          LoveFX.burst(24);
        }
        if (t >= r.total) {
          r.draw(Infinity);
          if (state.pictureURL) els.pictureImg.hidden = false; // real <img>: long-press to save
          showActions();
          return;
        }
        this.rafId = requestAnimationFrame(frame);
      };
      this.rafId = requestAnimationFrame(frame);
    },
  };

  /* ========================================================================
     11. Transition + reveal screen
     ======================================================================== */
  function pinkFlash(onPeak) {
    const f = els.flash;
    f.classList.remove("is-on");
    void f.offsetWidth;
    f.classList.add("is-on");
    setTimeout(onPeak, 520);
    setTimeout(() => f.classList.remove("is-on"), 1300);
  }

  function startReveal() {
    setLoveTheme(true);
    showScreen("reveal");
    LoveFX.start();
    LoveFX.burst(22);
    applyVolume();
    hideActions();
    setSaveStatus("");
    Picture.poster();
    startPlayback();
  }

  function showPlaySurprise() {
    els.btnPlaySurprise.hidden = false;
    els.btnPlaySurprise.focus({ preventScroll: true });
  }

  /**
   * Starts the music and the picture build-up. Keep this synchronous up to
   * the play() call so it also works inside click handlers on iOS.
   */
  function startPlayback() {
    const m = els.music;
    Picture.stop();
    Picture.poster();
    els.btnPlaySurprise.hidden = true;
    hideActions();
    ensureAudioContext();
    applyVolume();
    try {
      m.pause();
      m.currentTime = 0;
    } catch (_) { /* ignore */ }

    const musicPlay = state.musicOk ? m.play() : Promise.resolve();
    const sessionId = state.sessionId;
    Promise.resolve(musicPlay)
      .then(() => "ok")
      .catch((err) => err)
      .then((result) => {
        if (sessionId !== state.sessionId || state.phase !== "reveal") return;
        if (result !== "ok") {
          if (result && result.name === "NotAllowedError") {
            m.pause();
            showPlaySurprise();
            return;
          }
          console.warn("[music] could not play", result); // missing file etc. → carry on silently
          state.musicOk = false;
        }
        LoveFX.burst(14);
        Picture.play();
      });
  }

  function showActions() {
    els.actions.classList.add("is-visible");
  }

  function hideActions() {
    els.actions.classList.remove("is-visible");
  }

  /* ---------- floating hearts & sparkles around the picture (DOM) ---------- */
  const HEART_SVG =
    '<svg viewBox="0 0 32 29" aria-hidden="true"><path fill="currentColor" d="M16 28.6C14.6 27.5 1 18.7 1 9.6 1 4.8 4.8 1 9.4 1c2.8 0 5.2 1.4 6.6 3.5C17.4 2.4 19.8 1 22.6 1 27.2 1 31 4.8 31 9.6c0 9.1-13.6 17.9-15 19z"/></svg>';

  const LoveFX = {
    timer: 0,
    start() {
      this.stop();
      this.buildSparkles();
      const prefill = REDUCED_MOTION ? 4 : 14;
      for (let i = 0; i < prefill; i++) this.spawn(true);
      const every = REDUCED_MOTION ? 1100 : IS_MOBILE ? 330 : 220;
      this.timer = setInterval(() => this.spawn(false), every);
    },
    spawn(prefill) {
      const layer = els.loveHearts;
      if (layer.childElementCount > (IS_MOBILE ? 34 : 50)) return;
      const el = document.createElement("span");
      el.className = "float-heart";
      if (!IS_MOBILE && Math.random() < 0.35) el.classList.add("glow");
      const dur = rand(6, 11);
      el.style.setProperty("--x", `${rand(-3, 97).toFixed(1)}%`);
      el.style.setProperty("--s", `${Math.round(rand(14, 46))}px`);
      el.style.setProperty("--c", pick(HEART_COLORS));
      el.style.setProperty("--d", `${dur.toFixed(2)}s`);
      el.style.setProperty("--sw", `${rand(1.4, 3).toFixed(2)}s`);
      el.style.setProperty("--drift", `${Math.round(rand(8, 30))}px`);
      el.style.setProperty("--o", rand(0.6, 0.95).toFixed(2));
      if (prefill) el.style.setProperty("--delay", `${(-rand(0, dur * 0.85)).toFixed(2)}s`);
      el.innerHTML = HEART_SVG;
      el.addEventListener("animationend", (e) => {
        if (e.target === el) el.remove();
      });
      layer.appendChild(el);
    },
    burst(count = 18) {
      if (REDUCED_MOTION) count = Math.min(count, 6);
      const layer = els.loveHearts;
      for (let i = 0; i < count; i++) {
        const el = document.createElement("span");
        el.className = "burst-heart";
        const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
        const dist = rand(120, Math.min(window.innerWidth, 700) * 0.6);
        el.style.setProperty("--bx", `${Math.round(Math.cos(angle) * dist)}px`);
        el.style.setProperty("--by", `${Math.round(Math.sin(angle) * dist)}px`);
        el.style.setProperty("--br", `${Math.round(rand(-40, 40))}deg`);
        el.style.setProperty("--s", `${Math.round(rand(18, 40))}px`);
        el.style.setProperty("--c", pick(HEART_COLORS));
        el.innerHTML = HEART_SVG;
        el.addEventListener("animationend", () => el.remove());
        layer.appendChild(el);
      }
    },
    buildSparkles() {
      const layer = els.loveSparkles;
      layer.textContent = "";
      const n = IS_MOBILE ? 16 : 26;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = Math.random() < 0.3 ? "sparkle gold" : "sparkle";
        s.style.setProperty("--x", `${rand(2, 96).toFixed(1)}%`);
        s.style.setProperty("--y", `${rand(2, 96).toFixed(1)}%`);
        s.style.setProperty("--s", `${Math.round(rand(8, 22))}px`);
        s.style.setProperty("--d", `${rand(1.6, 3.6).toFixed(2)}s`);
        s.style.setProperty("--delay", `${(-rand(0, 3)).toFixed(2)}s`);
        layer.appendChild(s);
      }
    },
    stop() {
      clearInterval(this.timer);
      this.timer = 0;
      els.loveHearts.textContent = "";
      els.loveSparkles.textContent = "";
    },
  };

  /* ========================================================================
     12. Saving the picture
     ======================================================================== */
  function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  }

  /** iPhone/iPad: share sheet ("Save Image" → Photos). Elsewhere: normal download. */
  function onSaveClick() {
    const blob = state.pictureBlob;
    if (!blob) {
      toast("Your picture is still being made — try again in a second 💗");
      return;
    }
    const filename = `${CONFIG.downloadName}-${timestamp()}.png`;
    if (IS_IOS && navigator.canShare && typeof File === "function") {
      try {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({ files: [file], title: "My cute picture 💗" })
            .then(() => setSaveStatus("💕 Saved! Choose “Save Image” to keep it in Photos."))
            .catch((err) => {
              if (err && err.name === "AbortError") return;
              downloadBlob(blob, filename);
              setSaveStatus("📥 Saved! Check your Downloads.");
            });
          return;
        }
      } catch (_) { /* fall through to download */ }
    }
    downloadBlob(blob, filename);
    setSaveStatus("📥 Saved! Check your Downloads folder.");
  }

  /* ========================================================================
     13. Reset / navigation
     ======================================================================== */
  function resetToWelcome() {
    state.sessionId++;
    cancelAnimationFrame(state.rafId);
    Picture.stop();
    releaseWakeLock();
    stopCamera();
    LoveFX.stop();

    [els.music, els.meow].forEach((m) => {
      try {
        m.pause();
        m.currentTime = 0;
      } catch (_) { /* ignore */ }
    });

    state.photos = [];
    state.timeline = null;
    state.pictureBlob = null;
    if (state.pictureURL) URL.revokeObjectURL(state.pictureURL);
    state.pictureURL = "";
    els.pictureImg.hidden = true;
    els.pictureImg.removeAttribute("src");
    const pc = els.pictureCanvas;
    pc.getContext("2d").clearRect(0, 0, pc.width, pc.height);

    els.btnPlaySurprise.hidden = true;
    hideActions();
    setSaveStatus("");
    els.challenge.classList.remove("is-intro", "is-prep", "is-action");
    els.completeCard.classList.remove("is-loading");
    [els.consentModal, els.errorModal].forEach((m) => {
      m.hidden = true;
    });
    setLoveTheme(false);
    showScreen("welcome");
  }

  /* ========================================================================
     14. Event wiring
     ======================================================================== */
  function wireEvents() {
    els.btnStart.addEventListener("click", () => openModal(els.consentModal));
    els.btnConsentCancel.addEventListener("click", () => closeModal(els.consentModal));

    els.btnConsentAgree.addEventListener("click", () => {
      unlockAudio(); // must happen inside the tap
      els.consentModal.hidden = true;
      startCameraFlow();
    });

    els.btnErrorRetry.addEventListener("click", () => {
      els.errorModal.hidden = true;
      unlockAudio();
      startCameraFlow();
    });

    els.btnErrorBack.addEventListener("click", () => {
      els.errorModal.hidden = true;
      resetToWelcome();
    });

    els.btnQuit.addEventListener("click", () => {
      if (window.confirm("Quit the challenge? Your photos will be deleted.")) resetToWelcome();
    });

    els.btnPlaySurprise.addEventListener("click", () => {
      if (state.audioCtx && state.audioCtx.state !== "running") state.audioCtx.resume().catch(() => {});
      if (CONFIG.meow.enabled) primeMedia(els.meow);
      startPlayback();
    });

    els.btnWatchAgain.addEventListener("click", () => {
      LoveFX.burst(20);
      startPlayback();
    });

    els.btnTryAgain.addEventListener("click", () => {
      resetToWelcome();
      // Ask for consent again right away so the new photos are clearly agreed to.
      setTimeout(() => openModal(els.consentModal), 350);
    });

    els.btnSave.addEventListener("click", onSaveClick);

    els.btnMute.addEventListener("click", () => {
      state.muted = !state.muted;
      if (!state.muted && state.volume === 0) {
        state.volume = 0.6;
        els.volume.value = "0.6";
      }
      applyVolume();
    });

    els.volume.addEventListener("input", () => {
      state.volume = parseFloat(els.volume.value) || 0;
      if (state.volume > 0) state.muted = false;
      applyVolume();
    });

    els.music.addEventListener("error", () => {
      state.musicOk = false;
      console.warn(`[music] Could not load ${CONFIG.music.src}. The picture will show without music.`);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.consentModal.hidden) closeModal(els.consentModal);
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.phase === "challenge") requestWakeLock();
    });

    window.addEventListener("pagehide", stopCamera);
  }

  /* ========================================================================
     15. Init
     ======================================================================== */
  function init() {
    // Audio sources come from CONFIG so there is only one place to change them.
    els.music.src = CONFIG.music.src;
    els.music.loop = true;
    if (CONFIG.meow.enabled) els.meow.src = CONFIG.meow.src;
    els.volume.value = String(state.volume);
    if (!state.volumeControllable) {
      els.soundControls.classList.add("no-volume");
      els.btnMute.title = "Use your device's volume buttons to change the volume";
    }

    state.buddy = createBuddy(els.challengeBuddy, "hello");
    createBuddy(els.welcomeBuddy, "hello");

    const { total } = buildTimeline();
    const minutes = Math.max(1, Math.round(total / 60));
    els.metaMoves.textContent = String(CONFIG.actions.length);
    els.metaTime.textContent = total < 50 ? String(Math.round(total)) : String(minutes);
    els.metaTime.parentElement.lastChild.textContent = total < 50 ? " sec" : " min";
    document.querySelectorAll(".js-total-time").forEach((n) => {
      n.textContent = total < 50 ? `${Math.round(total)} seconds` : `${minutes} minute${minutes > 1 ? "s" : ""}`;
    });
    document.querySelectorAll(".js-photo-count").forEach((n) => {
      n.textContent = String(CONFIG.actions.length);
    });
    els.snapTotal.textContent = String(CONFIG.actions.length);

    applyVolume();
    wireEvents();
  }

  init();
})();
