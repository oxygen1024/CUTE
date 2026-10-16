/* ==========================================================================
   Prank Website – script.js
   --------------------------------------------------------------------------
   Flow: Welcome → consent → camera → move challenge (1 photo per move) →
         "Challenge Complete!" → pink flash → photo show (your photos animated
         together on a pink background with funny cartoon music) →
         Watch Again / Try Again / Save My Video.

   Privacy: photos only ever live in this browser's memory (canvas elements).
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
     *  caption  – text written under the photo in the final animation
     *  sticker  – emoji that pops next to the photo in the final animation
     */
    actions: [
      { pose: "raise-right", emoji: "🙋", title: "Raise your RIGHT hand", hint: "Reach up high — like you know the answer!", seconds: 5, caption: "Pick me, pick me!", sticker: "✋" },
      { pose: "raise-left", emoji: "🙋", title: "Raise your LEFT hand", hint: "Now the other one — nice and high!", seconds: 5, caption: "Me again, hehe", sticker: "🙌" },
      { pose: "wave", emoji: "👋", title: "Wave BOTH hands", hint: "Say hi to the camera!", seconds: 5, caption: "Hiii cutie!", sticker: "👋" },
      { pose: "heart", emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you", seconds: 5, caption: "Here's my heart", sticker: "💗" },
      { pose: "point", emoji: "👉", title: "Point both index fingers at your face", hint: "Who, me? 👉😊👈", seconds: 5, caption: "Who, me?", sticker: "🥺" },
      { pose: "smile", emoji: "😁", title: "Smile at the camera", hint: "Your biggest smile!", seconds: 4, caption: "Smiling for you", sticker: "✨" },
      { pose: "kiss", emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!", seconds: 4, caption: "Mwah!", sticker: "💋" },
      { pose: "cup", emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!", seconds: 5, caption: "Too cute!", sticker: "🌸" },
    ],

    /** "Preparing Your Results..." loading time (seconds). */
    loadingSeconds: 2,

    /** Music for the photo show. Replace the file to change the song. */
    music: {
      src: "assets/funny.mp3",
      volume: 0.8, // starting volume (0–1)
      videoVolume: 0.9, // music level inside the downloaded video (0–1)
      fadeOutSeconds: 1.2,
    },

    /**
     * The final photo animation. Times are in seconds. The default music is
     * 120 BPM (1 bar = 2 s) and is written so every photo lands on a bar.
     */
    show: {
      bpm: 120,
      introSeconds: 2, // "Surprise!" title
      photoSeconds: 2, // each photo pops in with a cartoon animation
      flipbookSeconds: 4, // all photos flicker in order like a stop-motion dance
      flipbookFrameSeconds: 0.25,
      finaleSeconds: 4, // collage of all photos + "Gotcha!" stamp
      outroSeconds: 2,
      title: "Surprise! 💘",
      introCaption: "POV: You just fell in love 💗",
      flipbookCaption: "Look how cute you are!",
      finaleCaption: "You're so adorable!",
      gotcha: "Gotcha! 💕",
      gotchaSub: "You just got pranked 😘",
      footer: "💗 Can You Follow My Moves? 💗",
    },

    /** Longest side of each photo in pixels. */
    photo: { maxSize: 960 },

    /** Downloaded video. */
    composite: { fps: 30, videoBitsPerSecond: 4_000_000 },

    /** Small beeps & shutter sound during the challenge (Web Audio, no files). */
    beeps: true,

    downloadName: "my-prank-show",
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
    showCanvas: $("show-canvas"),
    btnPlaySurprise: $("btn-play-surprise"),
    actions: $("reveal-actions"),
    btnWatchAgain: $("btn-watch-again"),
    btnTryAgain: $("btn-try-again"),
    btnSave: $("btn-save"),
    btnSaveCollage: $("btn-save-collage"),
    saveStatus: $("save-status"),
    saveModal: $("save-modal"),
    saveReason: $("save-reason"),
    btnSaveClose: $("btn-save-close"),
    btnSavePhoto: $("btn-save-photo"),
    toast: $("toast"),
    music: $("music"),
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

  // The downloadable video prefers MP4 (plays everywhere & uploads to social apps).
  const COMPOSITE_TYPES = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const isMp4 = (mime) => /mp4/i.test(mime || "");

  function pickMimeType(candidates) {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") return "";
    for (const type of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch (_) { /* ignore */ }
    }
    return "";
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

  function decodeAudio(ctx, arrayBuffer) {
    // Supports both the promise and the older callback form (old Safari).
    return new Promise((resolve, reject) => {
      try {
        const p = ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (p && typeof p.then === "function") p.then(resolve, reject);
      } catch (err) {
        reject(err);
      }
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
    photos: [], // [{ canvas, action, index }]
    timeline: null,
    segIndex: -1,
    lastCount: -1,
    rafId: 0,
    wakeLock: null,
    audioCtx: null,
    musicOk: true,
    musicBuffer: null,
    musicBufferPromise: null,
    volume: CONFIG.music.volume,
    muted: false,
    volumeControllable: canSetMediaVolume(),
    fadeTimer: 0,
    endTimers: [],
    saveRequested: false,
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
     6. Audio (Web Audio context, beeps, music)
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

  async function resumeAudioContext(ms = 400) {
    const ctx = state.audioCtx;
    if (!ctx) return false;
    if (ctx.state === "running") return true;
    try {
      await withTimeout(ctx.resume(), ms);
    } catch (_) { /* ignore */ }
    return ctx.state === "running";
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
    // "Prime" the <audio> element with a muted play so the browser allows it
    // to play with sound later, when the show starts automatically.
    const m = els.music;
    if (state.musicOk && m.paused) {
      try {
        m.muted = true;
        const p = m.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (state.phase !== "reveal") {
              m.pause();
              m.currentTime = 0;
            }
            m.muted = state.muted;
          }).catch(() => {
            m.muted = state.muted;
          });
        }
      } catch (_) {
        m.muted = state.muted;
      }
    }
    loadMusicBuffer();
  }

  /** Decodes the song into memory so it can be mixed into the downloadable video. */
  function loadMusicBuffer() {
    if (state.musicBufferPromise) return state.musicBufferPromise;
    const ctx = state.audioCtx;
    if (!ctx || !window.fetch) return Promise.resolve(null);
    state.musicBufferPromise = fetch(CONFIG.music.src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => decodeAudio(ctx, buf))
      .then((audioBuffer) => {
        state.musicBuffer = audioBuffer;
        return audioBuffer;
      })
      .catch((err) => {
        console.warn("[music] Could not load the song for the video export (open the site via http(s), not file://).", err);
        state.musicBufferPromise = null;
        return null;
      });
    return state.musicBufferPromise;
  }

  function beep(freq = 660, duration = 0.09, volume = 0.07, type = "sine") {
    if (!CONFIG.beeps) return;
    const ctx = state.audioCtx;
    if (!ctx || ctx.state !== "running") return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    } catch (_) { /* ignore */ }
  }

  function goChime() {
    beep(880, 0.12, 0.07, "triangle");
    setTimeout(() => beep(1320, 0.16, 0.06, "triangle"), 90);
  }

  function finishJingle() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 0.06, "triangle"), i * 110));
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

  function applyVolume() {
    const m = els.music;
    m.muted = state.muted;
    if (state.volumeControllable) m.volume = state.volume;
    const silent = state.muted || state.volume === 0;
    els.btnMute.textContent = silent ? "🔇" : "🔊";
    els.btnMute.setAttribute("aria-pressed", String(state.muted));
    els.btnMute.setAttribute("aria-label", state.muted ? "Unmute music" : "Mute music");
  }

  function stopMusicFade() {
    clearInterval(state.fadeTimer);
    state.fadeTimer = 0;
  }

  function fadeOutMusic(seconds) {
    const m = els.music;
    stopMusicFade();
    if (m.paused) return;
    if (!state.volumeControllable) {
      state.fadeTimer = setTimeout(() => m.pause(), seconds * 1000);
      return;
    }
    const startVolume = m.volume;
    const t0 = performance.now();
    state.fadeTimer = setInterval(() => {
      const k = (performance.now() - t0) / (seconds * 1000);
      if (k >= 1) {
        stopMusicFade();
        m.pause();
        m.volume = state.volume;
        return;
      }
      m.volume = clamp(startVolume * (1 - k), 0, 1);
    }, 50);
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
    const scale = Math.min(1, CONFIG.photo.maxSize / Math.max(vw, vh));
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
    state.photos.push({ canvas, action: CONFIG.actions[index], index });

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

    showScreen("complete");
    els.completeCard.classList.remove("is-loading");
    els.completeCard.style.setProperty("--load-dur", `${CONFIG.loadingSeconds}s`);

    loadMusicBuffer();
    const fontsReady = preloadFonts();
    await sleep(900);
    els.completeCard.classList.add("is-loading"); // "Preparing Your Results..."
    await Promise.all([sleep(CONFIG.loadingSeconds * 1000), fontsReady]);
    if (state.phase !== "complete") return;
    Show.prepare(state.photos);
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
     9. Transition + reveal screen
     ======================================================================== */
  function pinkFlash(onPeak) {
    const f = els.flash;
    f.classList.remove("is-on");
    void f.offsetWidth;
    f.classList.add("is-on");
    setTimeout(onPeak, 520);
    setTimeout(() => f.classList.remove("is-on"), 1300);
  }

  async function startReveal() {
    setLoveTheme(true);
    showScreen("reveal");
    LoveFX.start();
    LoveFX.burst(22);
    applyVolume();
    hideActions();
    setSaveStatus("");
    els.showFrame.style.setProperty("--ar", (Show.renderer.W / Show.renderer.H).toFixed(4));
    Show.showPoster();

    const ctxReady = await resumeAudioContext(400);
    // If audio can't run yet (common on iPhone after using the camera) the
    // downloadable video would be silent → ask for one tap first.
    if (!ctxReady && state.audioCtx && Composite.supported && state.musicBuffer) {
      showPlaySurprise();
      return;
    }
    startPlayback();
  }

  function showPlaySurprise() {
    els.btnPlaySurprise.hidden = false;
    els.btnPlaySurprise.focus({ preventScroll: true });
  }

  /**
   * Starts the show + music from the beginning. Keep this function synchronous
   * up to the play() call so it also works inside click handlers on iOS.
   */
  function startPlayback() {
    const m = els.music;
    clearEndTimers();
    stopMusicFade();
    Composite.abortIfRecording();
    Show.stop();
    Show.showPoster();
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
          // Music file missing / unsupported: carry on without music.
          console.warn("[music] could not play", result);
          state.musicOk = false;
        }
        // Anchor the show clock to the music so every photo lands on the beat.
        const offset = state.musicOk && !m.paused ? m.currentTime || 0 : 0;
        Show.start(offset);
        LoveFX.burst(14);
        if (!Composite.valid && Composite.supported) {
          const started = Composite.start(offset);
          if (!started && state.saveRequested) {
            state.saveRequested = false;
            els.btnSave.disabled = false;
            setSaveStatus("");
            openSaveFallback("This browser couldn't start building the video.");
          }
        }
      });
  }

  function onShowEnded() {
    fadeOutMusic(CONFIG.music.fadeOutSeconds);
    LoveFX.burst(26);
    const sessionId = state.sessionId;
    state.endTimers.push(
      setTimeout(async () => {
        if (Composite.recording) {
          Composite.completedPlayback = true;
          await Composite.stop();
        }
        if (sessionId !== state.sessionId || state.phase !== "reveal") return;
        showActions();
      }, 400)
    );
  }

  function clearEndTimers() {
    state.endTimers.forEach(clearTimeout);
    state.endTimers = [];
  }

  function showActions() {
    els.actions.classList.add("is-visible");
    els.btnSave.disabled = false;
  }

  function hideActions() {
    els.actions.classList.remove("is-visible");
  }

  /* ---------- floating hearts & sparkles around the show (DOM) ---------- */
  const HEART_SVG =
    '<svg viewBox="0 0 32 29" aria-hidden="true"><path fill="currentColor" d="M16 28.6C14.6 27.5 1 18.7 1 9.6 1 4.8 4.8 1 9.4 1c2.8 0 5.2 1.4 6.6 3.5C17.4 2.4 19.8 1 22.6 1 27.2 1 31 4.8 31 9.6c0 9.1-13.6 17.9-15 19z"/></svg>';
  const HEART_COLORS = ["#ff2d87", "#ff4f9a", "#ff6fae", "#ff8fc1", "#ffc2dc", "#ffffff", "#e8457f", "#ffd1e6"];

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
     10. Photo show renderer (Canvas)
         Pink background, floating hearts & sparkles, and the photos animated
         together: cartoon pop-ins → stop-motion flipbook → collage + "Gotcha!".
         The same canvas is shown on screen and recorded for the download.
     ======================================================================== */
  const EMOJI_FONTS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
  const TRANSITIONS = ["pop", "slide", "drop", "spin", "zoom", "flip", "rise", "jelly"];

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

  const ease = {
    outBack(x) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    outBounce(x) {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
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

  class ShowRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.hearts = [];
      this.sparkles = [];
      this.sprites = [];
      this.bursts = [];
      this.lastTs = 0;
      this.lastSegKey = "";
      this.stamped = false;
    }

    setup(photos, timeline) {
      this.photos = photos;
      this.timeline = timeline;
      const p0 = photos[0].canvas;
      const ar = p0.width / p0.height;
      const portrait = ar < 0.9;
      const W = portrait ? 720 : 960;
      const H = portrait ? 1280 : 960;
      this.W = W;
      this.H = H;
      this.canvas.width = W;
      this.canvas.height = H;
      this.titleH = H * (portrait ? 0.1 : 0.12);

      // single photo "polaroid" layout
      this.big = this.layoutCard(ar, W * (portrait ? 0.74 : 0.7), H * (portrait ? 0.56 : 0.54), true);
      this.cardCenterY = H * 0.5;

      // collage grid: pick the column count that gives the biggest photos
      const n = photos.length;
      const areaW = W * 0.9;
      const areaH = H * (portrait ? 0.66 : 0.6);
      let best = null;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const L = this.layoutCard(ar, (areaW / cols) * 0.88, (areaH / rows) * 0.88, false);
        if (!best || L.pw * L.ph > best.L.pw * best.L.ph) best = { cols, rows, L };
      }
      const cellW = best.L.w / 0.88;
      const cellH = best.L.h / 0.88;
      this.grid = { cols: best.cols, rows: best.rows, cellW, cellH, areaTop: H * 0.5 - (best.rows * cellH) / 2 + H * 0.01 };
      this.small = best.L;

      this.prerenderBackground();
      this.prerenderSprites();
      this.cardsBig = photos.map((p) => this.prerenderCard(p.canvas, this.big, p.action && p.action.caption));
      this.cardsSmall = photos.map((p) => this.prerenderCard(p.canvas, this.small, null));
      this.initParticles();
      this.lastTs = 0;
      this.lastSegKey = "";
      this.bursts = [];
      this.stamped = false;
    }

    layoutCard(ar, maxW, maxH, withStrip) {
      // card = white border + photo + caption strip, fitted inside maxW × maxH
      const bRatio = 0.05; // border, relative to photo width
      const stripRatio = withStrip ? 0.2 : 0.06; // caption strip, relative to photo height
      let pw = maxW / (1 + 2 * bRatio);
      let ph = pw / ar;
      const cardH = (h) => h * (1 + stripRatio) + h * ar * bRatio;
      if (cardH(ph) > maxH) {
        ph = maxH / (1 + stripRatio + ar * bRatio);
        pw = ph * ar;
      }
      const b = pw * bRatio;
      const strip = ph * stripRatio;
      return { pw, ph, b, strip, w: pw + 2 * b, h: ph + b + strip };
    }

    prerenderCard(photo, L, caption) {
      const pad = Math.round(L.w * 0.08);
      const c = document.createElement("canvas");
      c.width = Math.round(L.w + pad * 2);
      c.height = Math.round(L.h + pad * 2);
      const g = c.getContext("2d");
      g.save();
      g.shadowColor = "rgba(150, 20, 80, 0.35)";
      g.shadowBlur = pad * 0.8;
      g.shadowOffsetY = pad * 0.25;
      g.fillStyle = "#ffffff";
      roundRectPath(g, pad, pad, L.w, L.h, L.b * 0.7);
      g.fill();
      g.restore();
      g.save();
      roundRectPath(g, pad + L.b, pad + L.b, L.pw, L.ph, L.b * 0.35);
      g.clip();
      g.drawImage(photo, pad + L.b, pad + L.b, L.pw, L.ph);
      g.restore();
      if (caption) {
        g.fillStyle = "#ff2d87";
        g.textAlign = "center";
        g.textBaseline = "middle";
        fitFont(g, caption, `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`, L.strip * 0.48, L.pw * 0.92);
        g.fillText(caption, c.width / 2, pad + L.b + L.ph + L.strip * 0.48);
      }
      return { canvas: c };
    }

    prerenderBackground() {
      const { W, H } = this;
      const bg = document.createElement("canvas");
      bg.width = W;
      bg.height = H;
      const c = bg.getContext("2d");
      const lg = c.createLinearGradient(0, 0, W * 0.3, H);
      lg.addColorStop(0, "#ff6fae");
      lg.addColorStop(0.4, "#ff9fcb");
      lg.addColorStop(0.72, "#ffc2dc");
      lg.addColorStop(1, "#ffa8cf");
      c.fillStyle = lg;
      c.fillRect(0, 0, W, H);
      const glow = (x, y, r, color) => {
        const rg = c.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, color);
        rg.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = rg;
        c.fillRect(0, 0, W, H);
      };
      glow(W * 0.5, H * 0.48, Math.max(W, H) * 0.55, "rgba(255,255,255,0.5)");
      glow(W * 0.1, H * 0.9, W * 0.6, "rgba(255,45,135,0.35)");
      glow(W * 0.9, H * 0.08, W * 0.5, "rgba(255,255,255,0.45)");
      // polka dots for a cute cartoon feel
      c.fillStyle = "rgba(255,255,255,0.14)";
      const step = W / 9;
      for (let y = step / 2, row = 0; y < H; y += step, row++) {
        for (let x = (row % 2 ? step / 2 : 0) + step / 4; x < W; x += step) {
          c.beginPath();
          c.arc(x, y, W * 0.012, 0, Math.PI * 2);
          c.fill();
        }
      }
      this.bg = bg;
    }

    prerenderSprites() {
      this.sprites = HEART_COLORS.map((color) => {
        const size = 64;
        const pad = 14;
        const sp = document.createElement("canvas");
        sp.width = size + pad * 2;
        sp.height = size + pad * 2;
        const c = sp.getContext("2d");
        c.shadowColor = color === "#ffffff" ? "rgba(255,105,180,0.6)" : "rgba(255,255,255,0.8)";
        c.shadowBlur = 10;
        c.fillStyle = color;
        heartPath(c, sp.width / 2, sp.height / 2, size);
        c.fill();
        return sp;
      });
    }

    initParticles() {
      const { W, H } = this;
      this.hearts = [];
      const n = Math.round((W * H) / 40000);
      for (let i = 0; i < n; i++) this.hearts.push(this.newHeart(true));
      this.sparkles = [];
      for (let i = 0; i < 26; i++) {
        this.sparkles.push({ x: rand(0, W), y: rand(0, H), r: rand(6, 16), sp: rand(1.5, 3.5), ph: rand(0, 6.28) });
      }
    }

    newHeart(anywhere) {
      const { W, H } = this;
      const size = rand(W * 0.025, W * 0.065);
      return {
        x: rand(0, W),
        y: anywhere ? rand(0, H) : H + size,
        size,
        vy: rand(H * 0.05, H * 0.1),
        sway: rand(8, 26),
        freq: rand(0.6, 1.4),
        ph: rand(0, 6.28),
        rot: rand(-0.3, 0.3),
        alpha: rand(0.5, 0.9),
        sprite: pick(this.sprites),
      };
    }

    burst(x, y, count) {
      const { W } = this;
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(W * 0.25, W * 0.6);
        this.bursts.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - W * 0.15,
          life: 0,
          max: rand(0.6, 1.1),
          size: rand(W * 0.03, W * 0.06),
          sprite: pick(this.sprites),
          rot: rand(-1, 1),
        });
      }
    }

    drawBackground(wall, dt) {
      const { ctx, H } = this;
      ctx.drawImage(this.bg, 0, 0);
      ctx.fillStyle = "#ffffff";
      this.sparkles.forEach((s) => {
        const a = Math.abs(Math.sin(wall * s.sp + s.ph));
        ctx.globalAlpha = 0.15 + a * 0.85;
        starPath(ctx, s.x, s.y, s.r * (0.5 + a * 0.6));
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      for (let i = 0; i < this.hearts.length; i++) {
        const h = this.hearts[i];
        h.y -= h.vy * dt;
        if (h.y < -h.size * 1.5) {
          this.hearts[i] = this.newHeart(false);
          continue;
        }
        const x = h.x + Math.sin(wall * h.freq + h.ph) * h.sway;
        ctx.globalAlpha = h.alpha * clamp((h.y / H) * 4, 0, 1);
        const s = h.size * 1.4;
        ctx.save();
        ctx.translate(x, h.y);
        ctx.rotate(h.rot + Math.sin(wall * h.freq + h.ph) * 0.2);
        ctx.drawImage(h.sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    drawBursts(dt) {
      const { ctx, W } = this;
      this.bursts = this.bursts.filter((p) => {
        p.life += dt;
        if (p.life > p.max) return false;
        p.vy += W * 0.9 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        ctx.globalAlpha = 1 - k;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * k * 3);
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        return true;
      });
      ctx.globalAlpha = 1;
    }

    /** Draws a pre-rendered polaroid centred on (x, y). */
    drawCard(card, x, y, { rot = 0, scale = 1, sx = 1, sy = 1, alpha = 1 } = {}) {
      if (alpha <= 0 || scale <= 0) return;
      const { ctx } = this;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale * sx, scale * sy);
      ctx.drawImage(card.canvas, -card.canvas.width / 2, -card.canvas.height / 2);
      ctx.restore();
    }

    drawText(text, x, y, opts) {
      const { ctx } = this;
      const { font, size, color = "#ffffff", glow = "rgba(255,45,135,0.9)", blur = 20, alpha = 1, scale = 1, rot = 0, maxWidth = 0 } = opts;
      if (alpha <= 0 || scale <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      if (maxWidth) fitFont(ctx, text, font, size, maxWidth);
      else ctx.font = font.replace("{s}", Math.round(size));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = glow;
      ctx.shadowBlur = blur;
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    drawPill(text, x, y, { alpha = 1, scale = 1, rot = 0 } = {}) {
      if (alpha <= 0 || scale <= 0) return;
      const { ctx, W } = this;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      const fs = fitFont(ctx, text, `700 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`, W * 0.05, W * 0.78);
      const tw = ctx.measureText(text).width;
      const bw = tw + fs * 1.5;
      const bh = fs * 1.9;
      ctx.shadowColor = "rgba(255,45,135,0.5)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(3, fs * 0.09);
      ctx.strokeStyle = "rgba(255,143,193,0.9)";
      ctx.stroke();
      ctx.fillStyle = "#ff2d87";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, fs * 0.04);
      ctx.restore();
    }

    /** Cartoon entrance for a photo; p goes 0 → 1. */
    enterTransform(kind, p) {
      const { W, H } = this;
      const e = clamp(p, 0, 1);
      switch (kind) {
        case "slide":
          return { dx: (1 - ease.outBack(e)) * W, rot: (1 - e) * 0.5 };
        case "drop":
          return { dy: -(1 - ease.outBounce(e)) * H };
        case "spin":
          return { rot: (1 - ease.outCubic(e)) * Math.PI * 2, scale: ease.outBack(e) };
        case "zoom":
          return { scale: 1 + (1 - ease.outCubic(e)) * 2.2, alpha: e * 1.5 };
        case "flip":
          return { sx: Math.max(0.02, ease.outBack(e)) };
        case "rise":
          return { dy: (1 - ease.outBack(e)) * H * 0.9, rot: (1 - e) * -0.4 };
        case "jelly": {
          const w = Math.sin(e * Math.PI * 5) * (1 - e) * 0.35;
          return { scale: 0.6 + 0.4 * ease.outCubic(e), sx: 1 + w, sy: 1 - w };
        }
        case "pop":
        default:
          return { scale: ease.outBack(e), rot: (1 - e) * -0.6 };
      }
    }

    beatPulse(u) {
      const beat = 60 / CONFIG.show.bpm;
      const ph = (u % beat) / beat;
      return 1 + 0.03 * Math.exp(-ph * 7);
    }

    drawTopTitle(wall) {
      this.drawText(CONFIG.show.title, this.W / 2, this.titleH * 0.6 + Math.sin(wall * 2.4) * 4, {
        font: `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`,
        size: this.W * 0.075,
      });
    }

    drawFooter() {
      this.drawText(CONFIG.show.footer, this.W / 2, this.H * 0.965, {
        font: `600 {s}px "Fredoka", ${EMOJI_FONTS}, sans-serif`,
        size: this.W * 0.03,
        color: "rgba(255,255,255,0.95)",
        glow: "rgba(200,20,100,0.45)",
        blur: 8,
      });
    }

    drawSticker(emoji, x, y, u, size, wall) {
      const k = clamp((u - 0.25) / 0.35, 0, 1);
      if (k <= 0) return;
      this.drawText(emoji, x, y, {
        font: `400 {s}px ${EMOJI_FONTS}, sans-serif`,
        size,
        glow: "rgba(255,255,255,0.9)",
        blur: 12,
        scale: ease.outBack(k),
        rot: Math.sin(wall * 6) * 0.2,
      });
    }

    /**
     * @param {number} t   seconds since the show started
     * @param {number} now performance.now()
     */
    draw(t, now) {
      const { W, H } = this;
      const dt = this.lastTs ? clamp((now - this.lastTs) / 1000, 0, 0.1) : 0;
      this.lastTs = now;
      const tl = this.timeline;
      const time = clamp(t, 0, tl.total);
      let seg = tl.segs[tl.segs.length - 1];
      for (const s of tl.segs) {
        if (time < s.end) {
          seg = s;
          break;
        }
      }
      const u = time - seg.start;
      const D = seg.end - seg.start;
      const wall = now / 1000;

      this.drawBackground(wall, dt);

      // confetti bursts when a segment begins
      const key = `${seg.type}:${seg.index != null ? seg.index : ""}`;
      if (key !== this.lastSegKey) {
        this.lastSegKey = key;
        if (seg.type === "photo") this.burst(W / 2, this.cardCenterY, 14);
        if (seg.type === "intro") this.burst(W / 2, H * 0.45, 18);
      }

      if (seg.type === "intro") this.drawIntro(u, D, wall);
      else if (seg.type === "photo") this.drawPhoto(seg.index, u, wall);
      else if (seg.type === "flipbook") this.drawFlipbook(u, wall);
      else this.drawFinale(seg.type === "finale" ? u : CONFIG.show.finaleSeconds + u, wall);

      this.drawBursts(dt);
      this.drawFooter();
    }

    drawIntro(u, D, wall) {
      const { W, H } = this;
      const k = clamp(u / 0.6, 0, 1);
      const out = clamp((u - (D - 0.25)) / 0.25, 0, 1);
      this.drawText(CONFIG.show.title, W / 2, H * 0.42, {
        font: `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`,
        size: W * 0.14,
        scale: ease.outBack(k) * (1 - out * 0.3),
        rot: Math.sin(wall * 3) * 0.05 - (1 - k) * 0.4,
        alpha: 1 - out,
        blur: 30,
        maxWidth: W * 0.9,
      });
      const k2 = clamp((u - 0.55) / 0.45, 0, 1);
      if (k2 > 0) this.drawPill(CONFIG.show.introCaption, W / 2, H * 0.58, { scale: ease.outBack(k2), alpha: k2 * (1 - out) });
    }

    drawPhoto(i, u, wall) {
      const { W } = this;
      const cy = this.cardCenterY;
      this.drawTopTitle(wall);

      // previous photo gets tossed away
      if (i > 0 && u < 0.4) {
        const q = ease.inCubic(clamp(u / 0.4, 0, 1));
        const dir = i % 2 ? -1 : 1;
        this.drawCard(this.cardsBig[i - 1], W / 2 + dir * q * W * 1.1, cy - q * W * 0.2, {
          rot: ((i - 1) % 2 ? 0.05 : -0.05) + dir * q * 0.8,
          scale: 1 - q * 0.3,
        });
      }

      const tr = this.enterTransform(TRANSITIONS[i % TRANSITIONS.length], u / 0.45);
      const baseRot = i % 2 ? 0.05 : -0.05;
      this.drawCard(this.cardsBig[i], W / 2 + (tr.dx || 0), cy + (tr.dy || 0), {
        rot: baseRot + Math.sin(wall * 2.2 + i) * 0.015 + (tr.rot || 0),
        scale: (tr.scale != null ? tr.scale : 1) * this.beatPulse(u),
        sx: tr.sx || 1,
        sy: tr.sy || 1,
        alpha: tr.alpha != null ? tr.alpha : 1,
      });

      const L = this.big;
      const action = this.photos[i].action || {};
      if (action.sticker) this.drawSticker(action.sticker, W / 2 + L.w * 0.44, cy - L.h * 0.45, u, W * 0.13, wall);
      const kc = clamp((u - 0.2) / 0.3, 0, 1);
      this.drawText(`${i + 1} / ${this.photos.length}`, W / 2 - L.w * 0.36, cy - L.h * 0.5 - W * 0.012, {
        font: `700 {s}px "Fredoka", sans-serif`,
        size: W * 0.04,
        glow: "rgba(200,20,100,0.6)",
        blur: 10,
        alpha: kc,
        scale: ease.outBack(kc),
      });
    }

    drawFlipbook(u, wall) {
      const { W, H } = this;
      const n = this.photos.length;
      const frameSec = CONFIG.show.flipbookFrameSeconds;
      const f = Math.floor(u / frameSec);
      const idx = f % n;
      const local = (u % frameSec) / frameSec;
      const jitterX = Math.sin(f * 12.9898) * W * 0.012;
      const jitterY = Math.cos(f * 78.233) * W * 0.012;
      const bump = 1 + 0.05 * (1 - ease.outCubic(local));
      const enter = clamp(u / 0.3, 0, 1);
      this.drawTopTitle(wall);
      this.drawCard(this.cardsBig[idx], W / 2 + jitterX, this.cardCenterY + jitterY, {
        rot: f % 2 ? 0.045 : -0.045,
        scale: bump * (0.6 + 0.4 * ease.outBack(enter)),
      });
      this.drawText("🎞️", W / 2 - this.big.w * 0.44, this.cardCenterY - this.big.h * 0.45, {
        font: `400 {s}px ${EMOJI_FONTS}, sans-serif`,
        size: W * 0.1,
        glow: "rgba(255,255,255,0.9)",
        blur: 10,
        rot: Math.sin(wall * 8) * 0.15,
      });
      const kp = clamp((u - 0.2) / 0.4, 0, 1);
      this.drawPill(CONFIG.show.flipbookCaption, W / 2, Math.min(H * 0.9, this.cardCenterY + this.big.h / 2 + H * 0.055), {
        scale: ease.outBack(kp) * (1 + 0.04 * Math.sin(wall * 8)),
        alpha: kp,
      });
    }

    drawFinale(u, wall) {
      const { W, H } = this;
      const g = this.grid;
      const n = this.photos.length;
      this.drawTopTitle(wall);
      const stampAt = CONFIG.show.finaleSeconds * 0.5;
      const stampK = clamp((u - stampAt) / 0.35, 0, 1);
      // a little screen shake right after the stamp lands
      const since = u - stampAt;
      const shake = stampK > 0 && since < 0.45 ? (1 - since / 0.45) * W * 0.012 : 0;
      const ox = shake ? Math.sin(u * 90) * shake : 0;
      const oy = shake ? Math.cos(u * 77) * shake : 0;

      const left = (W - g.cols * g.cellW) / 2;
      for (let j = 0; j < n; j++) {
        const col = j % g.cols;
        const row = Math.floor(j / g.cols);
        const inRow = row === g.rows - 1 ? n - row * g.cols : g.cols;
        const rowOffset = ((g.cols - inRow) * g.cellW) / 2; // centre a short last row
        const x = left + rowOffset + col * g.cellW + g.cellW / 2 + ox;
        const y = g.areaTop + row * g.cellH + g.cellH / 2 + oy;
        const k = clamp((u - j * 0.14) / 0.35, 0, 1);
        if (k <= 0) continue;
        const rot = (j % 2 ? 0.07 : -0.06) + Math.sin(wall * 2 + j) * 0.02;
        this.drawCard(this.cardsSmall[j], x, y, { rot: rot + (1 - k) * 0.8, scale: ease.outBack(k) * this.beatPulse(u) });
      }

      const kc = clamp((u - 1.2) / 0.4, 0, 1);
      if (kc > 0 && stampK < 1) {
        const py = Math.min(H * 0.9, g.areaTop + g.rows * g.cellH + H * 0.045);
        this.drawPill(CONFIG.show.finaleCaption, W / 2, py, { scale: ease.outBack(kc), alpha: kc * (1 - stampK) });
      }

      if (stampK > 0) {
        if (!this.stamped) {
          this.stamped = true;
          this.burst(W / 2, H * 0.47, 30);
        }
        this.drawText(CONFIG.show.gotcha, W / 2 + ox, H * 0.47 + oy, {
          font: `400 {s}px "Pacifico", ${EMOJI_FONTS}, cursive`,
          size: W * 0.17,
          scale: 2.6 - 1.6 * ease.outBack(stampK),
          rot: -0.12,
          alpha: stampK * 1.5,
          blur: 34,
          maxWidth: W * 0.92,
        });
        const ks = clamp((since - 0.4) / 0.4, 0, 1);
        if (ks > 0) this.drawPill(CONFIG.show.gotchaSub, W / 2, H * 0.47 + W * 0.17, { scale: ease.outBack(ks), alpha: ks });
      } else {
        this.stamped = false;
      }
    }
  }

  /* ---------- show playback engine ---------- */
  function buildShowTimeline(count) {
    const s = CONFIG.show;
    const segs = [];
    let t = 0;
    const add = (type, dur, extra) => {
      if (dur > 0) segs.push({ type, start: t, end: t + dur, ...extra });
      t += Math.max(0, dur);
    };
    add("intro", s.introSeconds);
    for (let i = 0; i < count; i++) add("photo", s.photoSeconds, { index: i });
    if (count > 1) add("flipbook", s.flipbookSeconds);
    add("finale", s.finaleSeconds);
    add("outro", s.outroSeconds);
    return { segs, total: t };
  }

  const Show = {
    renderer: null,
    timeline: null,
    ended: false,
    startAt: 0,
    rafId: 0,

    prepare(photos) {
      if (!this.renderer) this.renderer = new ShowRenderer(els.showCanvas);
      this.timeline = buildShowTimeline(photos.length);
      this.renderer.setup(photos, this.timeline);
    },

    /** Draws a still frame while waiting to start (e.g. behind "Play Surprise"). */
    showPoster() {
      if (!this.renderer || !this.timeline) return;
      this.renderer.lastSegKey = "intro:";
      this.renderer.draw(0.9, performance.now());
    },

    start(offsetSeconds = 0) {
      this.stop();
      this.ended = false;
      this.renderer.lastSegKey = "";
      this.renderer.stamped = false;
      this.startAt = performance.now() - offsetSeconds * 1000;
      const sessionId = state.sessionId;
      const frame = (now) => {
        if (sessionId !== state.sessionId || state.phase !== "reveal") return;
        const t = (now - this.startAt) / 1000;
        this.renderer.draw(t, now);
        if (!this.ended && t >= this.timeline.total) {
          this.ended = true;
          onShowEnded();
        }
        this.rafId = requestAnimationFrame(frame); // hearts keep floating after the end
      };
      this.rafId = requestAnimationFrame(frame);
    },

    stop() {
      cancelAnimationFrame(this.rafId);
      this.ended = false;
    },
  };

  /* ========================================================================
     11. Video export (show canvas + music → downloadable file)
     ======================================================================== */
  const Composite = {
    supported: false,
    mime: "",
    recording: false,
    stopping: null,
    recorder: null,
    stream: null,
    chunks: [],
    blob: null,
    valid: false,
    audio: null,
    hiddenDuringRecord: false,
    completedPlayback: false,
    musicIncluded: false,

    detect() {
      const hasRecorder = typeof window.MediaRecorder === "function";
      const hasCapture = typeof els.showCanvas.captureStream === "function";
      this.mime = pickMimeType(COMPOSITE_TYPES);
      const typeCheckAvailable = hasRecorder && typeof MediaRecorder.isTypeSupported === "function";
      this.supported = hasRecorder && hasCapture && (!!this.mime || !typeCheckAvailable);
    },

    reset() {
      this.abortIfRecording();
      this.blob = null;
      this.valid = false;
      this.musicIncluded = false;
      els.btnSave.classList.remove("is-ready");
    },

    buildAudio(offset) {
      const ctx = state.audioCtx;
      if (!ctx || typeof ctx.createMediaStreamDestination !== "function" || ctx.state !== "running") return null;
      if (!state.musicBuffer) return null;
      try {
        const dest = ctx.createMediaStreamDestination();
        const src = ctx.createBufferSource();
        src.buffer = state.musicBuffer;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = CONFIG.music.videoVolume;
        src.connect(gain);
        gain.connect(dest);
        src.start(0, offset % state.musicBuffer.duration);
        // fade out together with the show
        const fadeAt = ctx.currentTime + Math.max(0, Show.timeline.total - offset);
        gain.gain.setValueAtTime(CONFIG.music.videoVolume, fadeAt);
        gain.gain.linearRampToValueAtTime(0.0001, fadeAt + CONFIG.music.fadeOutSeconds);
        return { dest, nodes: [src, gain] };
      } catch (err) {
        console.warn("[export] audio setup failed", err);
        return null;
      }
    },

    cleanupAudio() {
      if (!this.audio) return;
      this.audio.nodes.forEach((n) => {
        try {
          if (typeof n.stop === "function") n.stop();
        } catch (_) { /* ignore */ }
        try {
          n.disconnect();
        } catch (_) { /* ignore */ }
      });
      this.audio = null;
    },

    start(offset) {
      if (!this.supported || this.recording) return false;
      try {
        const stream = els.showCanvas.captureStream(CONFIG.composite.fps);
        this.audio = this.buildAudio(offset);
        this.musicIncluded = !!this.audio;
        if (this.audio) this.audio.dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

        const options = { videoBitsPerSecond: CONFIG.composite.videoBitsPerSecond };
        if (this.audio) options.audioBitsPerSecond = 128000;
        if (this.mime) options.mimeType = this.mime;
        let recorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch (_) {
          recorder = new MediaRecorder(stream);
        }
        this.chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) this.chunks.push(e.data);
        };
        recorder.onerror = (e) => console.warn("[export] recorder error", e.error || e);
        this.stream = stream;
        this.recorder = recorder;
        this.hiddenDuringRecord = document.hidden;
        this.completedPlayback = false;
        this.recording = true;
        this.stopping = null;
        const mime = recorder.mimeType || this.mime;
        // Safari's MP4 recorder is most reliable without a timeslice.
        if (isMp4(mime)) recorder.start();
        else recorder.start(1000);
        return true;
      } catch (err) {
        console.warn("[export] cannot build the video in this browser", err);
        this.cleanupAudio();
        this.recording = false;
        this.supported = false;
        return false;
      }
    },

    /** Finishes the recording; resolves once the file is ready. */
    stop() {
      if (!this.recording) return Promise.resolve(this.valid);
      if (this.stopping) return this.stopping;
      const recorder = this.recorder;
      this.stopping = new Promise((resolve) => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          const type = ((recorder && recorder.mimeType) || this.mime || "video/webm").split(";")[0];
          const blob = new Blob(this.chunks, { type });
          const ok = this.completedPlayback && !this.hiddenDuringRecord && blob.size > 20000;
          // A full, visible playback that still produced no usable file means
          // this browser can't really build the video → use the fallback next time.
          if (!ok && this.completedPlayback && !this.hiddenDuringRecord) this.supported = false;
          this.teardown();
          if (ok) {
            this.blob = blob;
            this.valid = true;
          }
          onCompositeFinished(ok);
          resolve(ok);
        };
        if (!recorder || recorder.state === "inactive") return finish();
        recorder.onstop = finish;
        try {
          recorder.stop();
        } catch (_) {
          finish();
        }
        setTimeout(finish, 4000);
      });
      return this.stopping;
    },

    abortIfRecording() {
      if (!this.recording) return;
      const recorder = this.recorder;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        try {
          recorder.stop();
        } catch (_) { /* ignore */ }
      }
      this.teardown();
    },

    teardown() {
      this.recording = false;
      this.stopping = null;
      this.chunks = [];
      this.recorder = null;
      if (this.stream) {
        this.stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (_) { /* ignore */ }
        });
      }
      this.stream = null;
      this.cleanupAudio();
    },
  };

  function onCompositeFinished(ok) {
    if (!state.saveRequested) return;
    state.saveRequested = false;
    els.btnSave.disabled = false;
    if (ok) {
      els.btnSave.classList.add("is-ready");
      setSaveStatus("✅ Your video is ready! Tap “Save My Video” to download it.");
    } else if (!Composite.supported) {
      setSaveStatus("");
      openSaveFallback("This browser couldn't finish building the video file.");
    } else {
      setSaveStatus("The video couldn't be finished (was the tab in the background?). Tap “Save My Video” to try again.");
    }
  }

  /* ========================================================================
     12. Saving
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

  /** iPhone/iPad: open the share sheet ("Save Video"/"Save Image" → Photos). Elsewhere: download. */
  function deliverFile(blob, filename, successText) {
    if (IS_IOS && navigator.canShare && typeof File === "function") {
      try {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({ files: [file], title: "My prank show 💗" })
            .then(() => setSaveStatus("💕 Saved! Choose “Save Video” / “Save Image” to keep it in Photos."))
            .catch((err) => {
              if (err && err.name === "AbortError") return;
              downloadBlob(blob, filename);
              setSaveStatus(successText);
            });
          return;
        }
      } catch (_) { /* fall through to download */ }
    }
    downloadBlob(blob, filename);
    setSaveStatus(successText);
  }

  async function onSaveClick() {
    if (Composite.recording && Composite.stopping) {
      els.btnSave.disabled = true;
      setSaveStatus("Finishing your video… 💗");
      await Composite.stopping;
      els.btnSave.disabled = false;
    }
    if (Composite.valid && Composite.blob) {
      const ext = isMp4(Composite.blob.type) ? "mp4" : "webm";
      const note = Composite.musicIncluded ? "" : " (music couldn't be added in this browser)";
      deliverFile(Composite.blob, `${CONFIG.downloadName}-${timestamp()}.${ext}`, `📥 Downloaded! Check your Downloads folder${note}.`);
      return;
    }
    if (!Composite.supported) {
      openSaveFallback();
      return;
    }
    if (Composite.recording) {
      state.saveRequested = true;
      setSaveStatus("Your video is being created while it plays… 💗");
      return;
    }
    // The first viewing couldn't be captured (e.g. the tab was hidden):
    // replay once while recording.
    state.saveRequested = true;
    els.btnSave.disabled = true;
    setSaveStatus("🎬 Creating your video — it will replay once. Please keep this tab open.");
    toast("🎬 Creating your video — keep this tab open until it finishes 💗", 6000);
    startPlayback();
  }

  function openSaveFallback(reason) {
    els.saveReason.textContent = reason || "This browser can't turn your photo animation into a video file.";
    openModal(els.saveModal);
  }

  /** One picture with every photo: the show's final "Gotcha!" collage. */
  async function saveCollage() {
    if (!state.photos.length || !Show.timeline) return;
    await preloadFonts();
    const canvas = document.createElement("canvas");
    const renderer = new ShowRenderer(canvas);
    renderer.setup(state.photos, Show.timeline);
    renderer.lastSegKey = "outro:";
    renderer.stamped = true;
    renderer.draw(Show.timeline.total, performance.now());
    canvas.toBlob((blob) => {
      if (blob) deliverFile(blob, `${CONFIG.downloadName}-collage-${timestamp()}.png`, "🖼️ Photo collage saved!");
      else toast("Sorry, the collage couldn't be created in this browser.");
    }, "image/png");
  }

  /* ========================================================================
     13. Reset / navigation
     ======================================================================== */
  function abortChallenge() {
    state.sessionId++;
    cancelAnimationFrame(state.rafId);
    releaseWakeLock();
    stopCamera();
  }

  function resetToWelcome() {
    state.sessionId++;
    cancelAnimationFrame(state.rafId);
    Show.stop();
    clearEndTimers();
    stopMusicFade();
    releaseWakeLock();
    stopCamera();
    Composite.reset();
    LoveFX.stop();

    const m = els.music;
    try {
      m.pause();
      m.currentTime = 0;
    } catch (_) { /* ignore */ }
    if (state.volumeControllable) m.volume = state.volume;

    state.photos = [];
    state.saveRequested = false;
    state.timeline = null;
    const sc = els.showCanvas;
    sc.getContext("2d").clearRect(0, 0, sc.width, sc.height);

    els.btnPlaySurprise.hidden = true;
    els.btnSave.disabled = false;
    hideActions();
    setSaveStatus("");
    els.challenge.classList.remove("is-intro", "is-prep", "is-action");
    els.completeCard.classList.remove("is-loading");
    [els.consentModal, els.errorModal, els.saveModal].forEach((m2) => {
      m2.hidden = true;
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
      if (window.confirm("Quit the challenge? Your photos will be deleted.")) {
        abortChallenge();
        resetToWelcome();
      }
    });

    els.btnPlaySurprise.addEventListener("click", () => {
      if (state.audioCtx && state.audioCtx.state !== "running") state.audioCtx.resume().catch(() => {});
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
    els.btnSaveCollage.addEventListener("click", saveCollage);
    els.btnSaveClose.addEventListener("click", () => closeModal(els.saveModal));
    els.btnSavePhoto.addEventListener("click", () => {
      closeModal(els.saveModal);
      saveCollage();
    });

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
      console.warn(`[music] Could not load ${CONFIG.music.src}. The show will play without music.`);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!els.consentModal.hidden) closeModal(els.consentModal);
      else if (!els.saveModal.hidden) closeModal(els.saveModal);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (Composite.recording) Composite.hiddenDuringRecord = true;
        return;
      }
      if (state.phase === "challenge") requestWakeLock();
    });

    window.addEventListener("pagehide", stopCamera);
  }

  /* ========================================================================
     15. Init
     ======================================================================== */
  function init() {
    // Music source comes from CONFIG so there is only one place to change it.
    els.music.src = CONFIG.music.src;
    els.music.loop = true;
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

    Composite.detect();
    applyVolume();
    wireEvents();
  }

  init();
})();
