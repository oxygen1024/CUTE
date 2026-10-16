/* ==========================================================================
   Romantic Prank Website – script.js
   --------------------------------------------------------------------------
   Flow: Welcome → consent → camera → move challenge (recorded) →
         "Challenge Complete!" → pink flash → romantic reveal (video + music +
         captions + hearts) → Watch Again / Try Again / Save My Video.

   Privacy: the webcam recording only ever lives in this browser's memory
   (Blob + object URL). Nothing is uploaded anywhere.
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

    /**
     * The moves, in order. `pose` must be one of the cartoon poses defined in
     * style.css: raise-right, raise-left, wave, heart, point, smile, kiss, cup.
     */
    actions: [
      { pose: "raise-right", emoji: "🙋", title: "Raise your RIGHT hand", hint: "Reach up high — like you know the answer!", seconds: 5 },
      { pose: "raise-left", emoji: "🙋", title: "Raise your LEFT hand", hint: "Now the other one — nice and high!", seconds: 5 },
      { pose: "wave", emoji: "👋", title: "Wave BOTH hands", hint: "Say hi to the camera!", seconds: 5 },
      { pose: "heart", emoji: "❤️", title: "Make a heart with both hands", hint: "Hold it in front of you", seconds: 5 },
      { pose: "point", emoji: "👉", title: "Point both index fingers at your face", hint: "Who, me? 👉😊👈", seconds: 5 },
      { pose: "smile", emoji: "😁", title: "Smile at the camera", hint: "Your biggest smile!", seconds: 4 },
      { pose: "kiss", emoji: "😘", title: "Blow a kiss to the camera", hint: "Mwah!", seconds: 4 },
      { pose: "cup", emoji: "🥺", title: "Hold your face with both hands", hint: "Make your cutest face!", seconds: 5 },
    ],

    /** "Preparing Your Results..." loading time (seconds). */
    loadingSeconds: 2,

    /** Background music for the romantic reveal. Replace the file to change the song. */
    music: {
      src: "assets/romantic.mp3",
      volume: 0.8, // starting volume (0–1)
      videoVolume: 0.9, // music level inside the downloaded video (0–1)
      fadeOutSeconds: 2,
    },

    /**
     * Captions shown while your recording plays.
     * `from` / `to` are fractions of the video length (0 = start, 1 = end),
     * so they keep working if you change the number or length of the moves.
     */
    captions: [
      { text: "POV: You just fell in love 💗", from: 0.0, to: 0.27 },
      { text: "Look how cute you are!", from: 0.27, to: 0.52 },
      { text: "You're so adorable!", from: 0.52, to: 0.78 },
      { text: "Gotcha! 💕", from: 0.78, to: 1.0 },
    ],

    revealTitle: "Surprise! 💘",
    endCard: { title: "Gotcha! 💕", subtitle: "You just got romantically pranked 😘", seconds: 2.2 },
    videoFooter: "💗 Can You Follow My Moves? 💗",
    photoCaption: "POV: You just fell in love 💗",

    /** Webcam recording quality. */
    recording: { videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 },

    /** Downloaded "romantic edit" video. */
    composite: { fps: 30, videoBitsPerSecond: 4_000_000 },

    /** Small beeps during the countdown (Web Audio, no files needed). */
    beeps: true,

    downloadName: "my-romantic-surprise",
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
    consentAudio: $("consent-audio"),
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
    recTime: $("rec-time"),
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
    stepDots: $("step-dots"),
    completeCard: document.querySelector(".complete-card"),
    loadbarFill: $("loadbar-fill"),
    flash: $("flash"),
    reveal: $("screen-reveal"),
    revealTitle: $("reveal-title"),
    loveHearts: $("love-hearts"),
    loveSparkles: $("love-sparkles"),
    soundControls: $("sound-controls"),
    btnMute: $("btn-mute"),
    volume: $("volume"),
    videoFrame: $("video-frame"),
    revealVideo: $("reveal-video"),
    caption: $("caption"),
    gotcha: $("gotcha"),
    gotchaText: $("gotcha-text"),
    btnPlaySurprise: $("btn-play-surprise"),
    actions: $("reveal-actions"),
    btnWatchAgain: $("btn-watch-again"),
    btnTryAgain: $("btn-try-again"),
    btnSave: $("btn-save"),
    saveStatus: $("save-status"),
    saveModal: $("save-modal"),
    saveReason: $("save-reason"),
    btnSaveClose: $("btn-save-close"),
    btnSavePhoto: $("btn-save-photo"),
    toast: $("toast"),
    composeCanvas: $("compose-canvas"),
    music: $("music"),
    buddyTemplate: $("buddy-template"),
  };

  /* ========================================================================
     3. Environment helpers
     ======================================================================== */
  const UA = navigator.userAgent || "";
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IS_SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(UA);
  const IS_MOBILE = IS_IOS || /Android|Mobi/i.test(UA);
  const IS_IN_APP = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Snapchat|TikTok|musical_ly/i.test(UA);
  const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PREFER_MP4 = IS_IOS || IS_SAFARI;

  const REC_TYPES_VIDEO = PREFER_MP4
    ? ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4;codecs=avc1", "video/mp4"];
  const REC_TYPES_AV = PREFER_MP4
    ? ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"];
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

  function formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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
    recorder: null,
    recorderMime: "",
    chunks: [],
    recordingBlob: null,
    recordingURL: "",
    recordedSeconds: 0,
    recStart: 0,
    wantAudio: false,
    hasUserAudio: false,
    timeline: null,
    segIndex: -1,
    lastCount: -1,
    rafId: 0,
    wakeLock: null,
    audioCtx: null,
    musicOk: true,
    musicBuffer: null,
    musicBufferPromise: null,
    userAudioBuffer: null,
    volume: CONFIG.music.volume,
    muted: false,
    volumeControllable: canSetMediaVolume(),
    playing: false,
    revealLoopId: 0,
    captionIndex: -1,
    captionStartedAt: 0,
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
    // to play with sound later, when the reveal starts automatically.
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

  function applyVolume() {
    const m = els.music;
    const v = els.revealVideo;
    m.muted = state.muted;
    v.muted = state.muted || !state.hasUserAudio;
    if (state.volumeControllable) {
      m.volume = state.volume;
      v.volume = Math.min(1, state.volume + 0.2);
    }
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
     7. Camera + recording
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
    norecorder: {
      icon: "📼",
      title: "Recording not supported",
      message: "This browser can show the camera but can't record video.",
      tips: ["Please update your browser, or use the latest Chrome, Safari, Edge or Firefox.", "iPhone / iPad need iOS 14.3 or newer."],
    },
    denied: {
      icon: "🚫",
      title: "Camera access was blocked",
      message: "We need your camera to play the challenge. Nothing is uploaded — the video stays on your device.",
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
    recordfail: {
      icon: "😵",
      title: "Recording didn't work",
      message: "Something went wrong while recording the video.",
      tips: ["Tap Try Again to play once more.", "If it keeps happening, try another browser (latest Chrome or Safari)."],
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
    if (IS_IN_APP && kind !== "recordfail") tips.unshift("You seem to be inside an app's built-in browser. Open this link in Safari or Chrome instead.");
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
    if (typeof window.MediaRecorder !== "function") return showError("norecorder");

    showScreen("permission");
    const videoConstraints = {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    };
    const audioConstraints = state.wantAudio ? { echoCancellation: true, noiseSuppression: true } : false;

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
    } catch (err) {
      if (err && err.name === "OverconstrainedError") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioConstraints });
        } catch (err2) {
          err = err2;
        }
      }
      if (!stream && state.wantAudio) {
        // Maybe only the microphone failed — try camera only.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
          toast("🎤 Microphone unavailable — recording video only.");
        } catch (err3) {
          err = err3;
        }
      }
      if (!stream) {
        showScreen("welcome");
        return showError(errorKindFor(err), err);
      }
    }

    state.stream = stream;
    state.hasUserAudio = stream.getAudioTracks().length > 0;
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

  function startRecording() {
    const types = state.hasUserAudio ? REC_TYPES_AV : REC_TYPES_VIDEO;
    const mime = pickMimeType(types);
    const options = { videoBitsPerSecond: CONFIG.recording.videoBitsPerSecond };
    if (state.hasUserAudio) options.audioBitsPerSecond = CONFIG.recording.audioBitsPerSecond;
    if (mime) options.mimeType = mime;

    let recorder;
    try {
      recorder = new MediaRecorder(state.stream, options);
    } catch (_) {
      recorder = new MediaRecorder(state.stream);
    }
    state.chunks = [];
    state.recorder = recorder;
    state.recorderMime = recorder.mimeType || mime || "video/webm";
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) state.chunks.push(e.data);
    };
    recorder.onerror = (e) => console.warn("[recorder] error", e.error || e);
    // Safari's MP4 recorder is most reliable without a timeslice.
    if (isMp4(state.recorderMime)) recorder.start();
    else recorder.start(1000);
    state.recStart = performance.now();
  }

  function stopRecording() {
    const recorder = state.recorder;
    return new Promise((resolve) => {
      if (!recorder) return resolve(null);
      const finish = () => {
        state.recordedSeconds = (performance.now() - state.recStart) / 1000;
        const type = (state.recorderMime || "video/webm").split(";")[0];
        const blob = state.chunks.length ? new Blob(state.chunks, { type }) : null;
        state.recorder = null;
        state.chunks = [];
        resolve(blob);
      };
      if (recorder.state === "inactive") return finish();
      recorder.onstop = finish;
      try {
        recorder.stop();
      } catch (_) {
        finish();
      }
    });
  }

  function discardRecording() {
    const recorder = state.recorder;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      try {
        recorder.stop();
      } catch (_) { /* ignore */ }
    }
    state.recorder = null;
    state.chunks = [];
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
     8. Challenge (moves, countdowns, progress)
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
      segs.push({ type: "action", index, start: t, end: t + dur });
      t += dur;
    });
    return { segs, total: t };
  }

  function buildDots() {
    els.stepDots.textContent = "";
    CONFIG.actions.forEach(() => els.stepDots.appendChild(document.createElement("li")));
  }

  function updateDots(currentIndex) {
    [...els.stepDots.children].forEach((li, i) => {
      li.classList.toggle("done", i < currentIndex);
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
      updateDots(-1);
      return;
    }

    const action = CONFIG.actions[seg.index];
    const total = CONFIG.actions.length;
    els.counter.textContent = `Move ${seg.index + 1} / ${total}`;
    els.moveEmoji.textContent = action.emoji || "⭐";
    els.moveTitle.textContent = action.title;
    els.moveHint.textContent = action.hint || "";
    state.buddy.setAttribute("data-pose", action.pose);
    updateDots(seg.index);

    if (seg.type === "prep") {
      els.phaseLabel.textContent = seg.index === 0 ? "First move · get ready" : "Next move · get ready";
      restartAnimation(els.moveCard, "bump");
    } else {
      els.phaseLabel.textContent = "Go! Do it now";
      popCount("GO!", true);
      goChime();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(60);
        } catch (_) { /* ignore */ }
      }
    }
  }

  function runChallenge() {
    state.timeline = buildTimeline();
    state.segIndex = -1;
    buildDots();
    els.progressFill.style.width = "0%";
    els.recTime.textContent = "00:00";
    showScreen("challenge");
    try {
      startRecording();
    } catch (err) {
      stopCamera();
      showScreen("welcome");
      showError("recordfail", err);
      return;
    }
    requestWakeLock();
    const startedAt = performance.now();
    state.challengeStart = startedAt;
    const sessionId = ++state.sessionId;

    const tick = () => {
      if (state.phase !== "challenge" || sessionId !== state.sessionId) return;
      const t = (performance.now() - startedAt) / 1000;
      const { segs, total } = state.timeline;

      const pct = clamp(t / total, 0, 1) * 100;
      els.progressFill.style.width = `${pct.toFixed(2)}%`;
      els.progress.setAttribute("aria-valuenow", String(Math.round(pct)));
      els.recTime.textContent = formatClock(t);

      let idx = state.segIndex < 0 ? 0 : state.segIndex;
      while (idx < segs.length && t >= segs[idx].end) idx++;
      if (idx >= segs.length) {
        finishChallenge();
        return;
      }
      const seg = segs[idx];
      if (idx !== state.segIndex) {
        state.segIndex = idx;
        enterSegment(seg);
      }

      const remaining = seg.end - t;
      const secs = Math.ceil(remaining - 0.001);
      setTimerRing(remaining / (seg.end - seg.start), String(Math.max(secs, 0)));
      if ((seg.type === "prep" || seg.type === "intro") && secs !== state.lastCount) {
        state.lastCount = secs;
        if (seg.type === "prep" && secs > 0) {
          popCount(String(secs), false);
          beep(560, 0.08);
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
    updateDots(CONFIG.actions.length);
    finishJingle();

    const blobPromise = stopRecording();
    showScreen("complete");
    els.completeCard.classList.remove("is-loading");
    els.completeCard.style.setProperty("--load-dur", `${CONFIG.loadingSeconds}s`);

    const blob = await blobPromise;
    stopCamera(); // turn the camera light off as soon as recording is done

    if (!blob || blob.size < 1000) {
      showScreen("welcome");
      showError("recordfail");
      return;
    }
    state.recordingBlob = blob;
    state.recordingURL = URL.createObjectURL(blob);

    // Get the reveal ready while the "loading" animation plays.
    const v = els.revealVideo;
    v.muted = true;
    v.src = state.recordingURL;
    try {
      v.load();
    } catch (_) { /* ignore */ }
    loadMusicBuffer();
    preloadFonts();
    if (state.hasUserAudio) decodeUserAudio(blob);

    await sleep(900);
    els.completeCard.classList.add("is-loading"); // "Preparing Your Results..."
    await Promise.all([sleep(CONFIG.loadingSeconds * 1000), prepareRevealVideo()]);
    if (state.phase !== "complete") return;
    pinkFlash(startReveal);
  }

  async function decodeUserAudio(blob) {
    const ctx = state.audioCtx;
    if (!ctx || !blob.arrayBuffer) return;
    try {
      state.userAudioBuffer = await decodeAudio(ctx, await blob.arrayBuffer());
    } catch (err) {
      state.userAudioBuffer = null;
      console.info("[audio] Your voice can't be mixed into the download in this browser.", err);
    }
  }

  function preloadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return withTimeout(
      Promise.all([document.fonts.load('400 48px "Pacifico"'), document.fonts.load('700 48px "Fredoka"')]).catch(() => {}),
      2500
    );
  }

  /** Waits until the recorded video can play and fixes WebM's "Infinity" duration. */
  async function prepareRevealVideo() {
    const v = els.revealVideo;
    if (v.readyState < 1) await once(v, "loadedmetadata", 4000);
    if (v.duration === Infinity || Number.isNaN(v.duration)) {
      // Chrome's MediaRecorder WebM files have no duration until we seek to the end.
      const fixed = once(v, "durationchange", 2000);
      try {
        v.currentTime = 1e101;
      } catch (_) { /* ignore */ }
      await fixed;
      try {
        v.currentTime = 0;
      } catch (_) { /* ignore */ }
      await once(v, "seeked", 1500);
    }
    if (v.videoWidth && v.videoHeight) {
      els.videoFrame.style.setProperty("--ar", (v.videoWidth / v.videoHeight).toFixed(4));
    }
  }

  function getVideoDuration() {
    const d = els.revealVideo.duration;
    return Number.isFinite(d) && d > 0 ? d : Math.max(1, state.recordedSeconds);
  }

  /* ========================================================================
     9. Transition + romantic reveal
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
    els.revealTitle.textContent = CONFIG.revealTitle;
    els.gotchaText.textContent = CONFIG.endCard.title;
    showScreen("reveal");
    LoveFX.start();
    LoveFX.burst(22);
    applyVolume();
    hideActions();
    setSaveStatus("");

    const ctxReady = await resumeAudioContext(400);
    // If audio can't run yet (common on iPhone after using the camera), or
    // the browser blocks autoplay, startPlayback() shows "Play Surprise".
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
   * Starts video + music from the beginning. Keep this function synchronous
   * up to the play() calls so it also works inside click handlers on iOS.
   */
  function startPlayback() {
    const v = els.revealVideo;
    const m = els.music;
    clearEndTimers();
    stopMusicFade();
    Composite.abortIfRecording();
    state.playing = false;
    state.captionIndex = -1;
    els.caption.classList.remove("is-in");
    els.caption.textContent = "";
    els.gotcha.classList.remove("is-in");
    els.btnPlaySurprise.hidden = true;
    hideActions();

    ensureAudioContext();
    applyVolume();
    try {
      v.currentTime = 0;
    } catch (_) { /* ignore */ }
    try {
      m.pause();
      m.currentTime = 0;
    } catch (_) { /* ignore */ }

    const videoPlay = v.play();
    const musicPlay = state.musicOk ? m.play() : Promise.resolve();
    const sessionId = state.sessionId;

    Promise.allSettled([videoPlay, musicPlay]).then(([vr, mr]) => {
      if (sessionId !== state.sessionId || state.phase !== "reveal") return;
      const blocked = (r) => r.status === "rejected" && r.reason && r.reason.name === "NotAllowedError";
      if (blocked(vr) || blocked(mr) || vr.status === "rejected") {
        if (vr.status === "rejected" && !blocked(vr)) console.warn("[reveal] video play failed", vr.reason);
        v.pause();
        m.pause();
        showPlaySurprise();
        return;
      }
      if (mr.status === "rejected") {
        // Music file missing / unsupported: carry on without music.
        console.warn("[music] could not play", mr.reason);
        state.musicOk = false;
      }
      onPlaybackStarted();
    });
  }

  function onPlaybackStarted() {
    state.playing = true;
    LoveFX.burst(14);
    if (!Composite.valid && Composite.supported) {
      const started = Composite.start(els.revealVideo, els.revealVideo.currentTime || 0);
      if (!started && state.saveRequested) {
        state.saveRequested = false;
        els.btnSave.disabled = false;
        setSaveStatus("");
        openSaveFallback("This browser couldn't start building the video.");
      }
    }
    cancelAnimationFrame(state.revealLoopId);
    const loop = (now) => {
      if (state.phase !== "reveal") return;
      updateCaption(now);
      // Safety net in case "ended" never fires for some recordings.
      const v = els.revealVideo;
      if (state.playing && v.paused && v.currentTime > 0 && v.currentTime >= getVideoDuration() - 0.25) onPlaybackEnded();
      state.revealLoopId = requestAnimationFrame(loop);
    };
    state.revealLoopId = requestAnimationFrame(loop);
  }

  function currentCaption() {
    if (!state.playing && !Composite.recording) return -1;
    const p = clamp(els.revealVideo.currentTime / getVideoDuration(), 0, 1);
    for (let i = CONFIG.captions.length - 1; i >= 0; i--) {
      const c = CONFIG.captions[i];
      if (p >= c.from && p < (c.to != null ? c.to : 1.01)) return i;
    }
    return state.playing ? -1 : state.captionIndex;
  }

  function updateCaption(now) {
    if (!state.playing) return;
    const idx = currentCaption();
    if (idx === state.captionIndex) return;
    state.captionIndex = idx;
    state.captionStartedAt = now;
    const el = els.caption;
    if (idx < 0) {
      el.classList.remove("is-in");
      el.textContent = "";
      return;
    }
    el.textContent = CONFIG.captions[idx].text;
    restartAnimation(el, "is-in");
  }

  function onPlaybackEnded() {
    if (!state.playing) return;
    state.playing = false;
    els.gotcha.classList.add("is-in");
    LoveFX.burst(26);
    fadeOutMusic(CONFIG.music.fadeOutSeconds);
    if (Composite.recording) Composite.beginEndCard();

    const sessionId = state.sessionId;
    state.endTimers.push(
      setTimeout(async () => {
        if (Composite.recording) await Composite.stop();
        if (sessionId !== state.sessionId || state.phase !== "reveal") return;
        showActions();
      }, CONFIG.endCard.seconds * 1000)
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

  /* ---------- floating hearts & sparkles (DOM) ---------- */
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
     10. Romantic renderer (Canvas) — used for the downloadable video and the
         photo-card fallback. Draws: pink background, hearts, sparkles, the
         mirrored recording in a glowing frame, captions and the end card.
     ======================================================================== */
  const EMOJI_FONTS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

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
    // Heart centred on (cx, cy), roughly `size` wide.
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

  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  class RomanticRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.hearts = [];
      this.sparkles = [];
      this.sprites = [];
      this.lastTs = 0;
    }

    setup(video) {
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      const ar = vw / vh;
      const portrait = ar < 0.9;
      const W = portrait ? 720 : 960;
      const H = portrait ? 1280 : 960;
      this.W = W;
      this.H = H;
      this.canvas.width = W;
      this.canvas.height = H;

      const titleH = H * (portrait ? 0.11 : 0.14);
      const footH = H * 0.06;
      const boxW = W * 0.86;
      const boxH = H - titleH - footH - H * 0.03;
      let fw = boxW;
      let fh = fw / ar;
      if (fh > boxH) {
        fh = boxH;
        fw = fh * ar;
      }
      this.titleH = titleH;
      this.footH = footH;
      this.frame = {
        x: (W - fw) / 2,
        y: titleH + (boxH - fh) / 2 + H * 0.015,
        w: fw,
        h: fh,
        r: Math.min(fw, fh) * 0.07,
      };
      this.prerenderBackground();
      this.prerenderSprites();
      this.initParticles();
      this.lastTs = 0;
    }

    prerenderBackground() {
      const { W, H, frame: f } = this;
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
      glow(W * 0.5, H * 0.45, Math.max(W, H) * 0.55, "rgba(255,255,255,0.5)");
      glow(W * 0.1, H * 0.9, W * 0.6, "rgba(255,45,135,0.35)");
      glow(W * 0.9, H * 0.08, W * 0.5, "rgba(255,255,255,0.45)");
      // glowing white frame (static, so it is cheap to draw every frame)
      c.save();
      c.shadowColor = "rgba(255, 45, 135, 0.85)";
      c.shadowBlur = 46;
      c.fillStyle = "#ffffff";
      const b = Math.round(W * 0.012);
      roundRectPath(c, f.x - b, f.y - b, f.w + b * 2, f.h + b * 2, f.r + b);
      c.fill();
      c.restore();
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
      const n = Math.round((W * H) / 34000);
      for (let i = 0; i < n; i++) this.hearts.push(this.newHeart(true));
      this.sparkles = [];
      for (let i = 0; i < 26; i++) {
        this.sparkles.push({ x: rand(0, W), y: rand(0, H), r: rand(6, 16), sp: rand(1.5, 3.5), ph: rand(0, 6.28) });
      }
    }

    newHeart(anywhere) {
      const { W, H } = this;
      const size = rand(W * 0.025, W * 0.07);
      return {
        x: rand(0, W),
        y: anywhere ? rand(0, H) : H + size,
        size,
        vy: rand(H * 0.05, H * 0.11),
        sway: rand(8, 26),
        freq: rand(0.6, 1.4),
        ph: rand(0, 6.28),
        rot: rand(-0.3, 0.3),
        alpha: rand(0.55, 0.95),
        sprite: pick(this.sprites),
        front: Math.random() < 0.3,
      };
    }

    drawHearts(t, dt, front) {
      const { ctx, H } = this;
      for (let i = 0; i < this.hearts.length; i++) {
        const h = this.hearts[i];
        if (h.front !== front) continue;
        h.y -= h.vy * dt;
        if (h.y < -h.size * 1.5) {
          this.hearts[i] = this.newHeart(false);
          continue;
        }
        const x = h.x + Math.sin(t * h.freq + h.ph) * h.sway;
        const k = clamp(h.y / H, 0, 1);
        ctx.globalAlpha = h.alpha * clamp(k * 4, 0, 1);
        const s = h.size * (1.3 + (1 - k) * 0.3);
        ctx.save();
        ctx.translate(x, h.y);
        ctx.rotate(h.rot + Math.sin(t * h.freq + h.ph) * 0.2);
        ctx.drawImage(h.sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    drawCaption(text, popSeconds) {
      const { ctx, W, frame: f } = this;
      const x = popSeconds == null ? 1 : clamp(popSeconds / 0.5, 0, 1);
      const scale = 0.3 + 0.7 * easeOutBack(x);
      const fs = Math.round(W * 0.052);
      ctx.save();
      ctx.font = `700 ${fs}px "Fredoka", ${EMOJI_FONTS}, sans-serif`;
      const lines = wrapLines(ctx, text, f.w * 0.82);
      const lineH = fs * 1.25;
      const widths = lines.map((l) => ctx.measureText(l).width);
      const bw = Math.max(...widths) + fs * 1.6;
      const bh = lines.length * lineH + fs * 0.9;
      const cx = W / 2;
      const cy = f.y + f.h - f.h * 0.07 - bh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((1 - x) * -0.12);
      ctx.scale(scale, scale);
      ctx.globalAlpha = clamp(x * 3, 0, 1);
      ctx.shadowColor = "rgba(255,45,135,0.55)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bh / 2, fs * 1.1));
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(3, fs * 0.09);
      ctx.strokeStyle = "rgba(255,143,193,0.85)";
      ctx.stroke();
      ctx.fillStyle = "#ff2d87";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => {
        ctx.fillText(l, 0, -((lines.length - 1) * lineH) / 2 + i * lineH);
      });
      ctx.restore();
    }

    /**
     * @param {HTMLVideoElement} video
     * @param {number} now performance.now()
     * @param {{caption?: string|null, captionAge?: number|null, endProgress?: number|null, staticFrame?: boolean}} info
     */
    draw(video, now, info = {}) {
      const { ctx, W, H, frame: f } = this;
      const t = now / 1000;
      const dt = this.lastTs ? clamp((now - this.lastTs) / 1000, 0, 0.1) : 0;
      this.lastTs = now;

      ctx.drawImage(this.bg, 0, 0);

      // sparkles
      ctx.fillStyle = "#ffffff";
      this.sparkles.forEach((s) => {
        const a = Math.abs(Math.sin(t * s.sp + s.ph));
        ctx.globalAlpha = 0.15 + a * 0.85;
        starPath(ctx, s.x, s.y, s.r * (0.5 + a * 0.6));
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      this.drawHearts(t, dt, false);

      // the recording, mirrored like a selfie
      ctx.save();
      roundRectPath(ctx, f.x, f.y, f.w, f.h, f.r);
      ctx.clip();
      ctx.fillStyle = "#3a0f26";
      ctx.fillRect(f.x, f.y, f.w, f.h);
      if (video && video.readyState >= 2) {
        ctx.translate(f.x + f.w, f.y);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, f.w, f.h);
      }
      ctx.restore();

      // pulsing ring around the frame
      ctx.save();
      ctx.lineWidth = Math.max(4, W * 0.007);
      ctx.strokeStyle = `rgba(255, 79, 154, ${0.45 + 0.35 * Math.sin(t * 3)})`;
      roundRectPath(ctx, f.x, f.y, f.w, f.h, f.r);
      ctx.stroke();
      ctx.restore();

      this.drawHearts(t, dt, true);

      // corner hearts on the frame
      const bob = Math.sin(t * 3.5);
      const cs = W * 0.085 * (1 + 0.12 * bob);
      ctx.save();
      ctx.translate(f.x + W * 0.01, f.y + W * 0.01);
      ctx.rotate(-0.25 + bob * 0.08);
      ctx.drawImage(this.sprites[0], -cs / 2, -cs / 2, cs, cs);
      ctx.restore();
      ctx.save();
      ctx.translate(f.x + f.w - W * 0.01, f.y + f.h - W * 0.01);
      ctx.rotate(0.25 - bob * 0.08);
      ctx.drawImage(this.sprites[1], -cs / 2, -cs / 2, cs, cs);
      ctx.restore();

      // title
      ctx.save();
      const ts = Math.round(W * 0.075);
      ctx.font = `400 ${ts}px "Pacifico", ${EMOJI_FONTS}, cursive`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,45,135,0.9)";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(CONFIG.revealTitle, W / 2, this.titleH * 0.55 + Math.sin(t * 2.2) * 4);
      ctx.restore();

      // footer
      ctx.save();
      ctx.font = `600 ${Math.round(W * 0.03)}px "Fredoka", ${EMOJI_FONTS}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.shadowColor = "rgba(200,20,100,0.45)";
      ctx.shadowBlur = 8;
      ctx.fillText(CONFIG.videoFooter, W / 2, H - this.footH * 0.6);
      ctx.restore();

      if (info.caption) this.drawCaption(info.caption, info.captionAge);

      // end card
      if (info.endProgress != null) {
        const k = clamp(info.endProgress, 0, 1);
        ctx.save();
        ctx.globalAlpha = clamp(k * 1.6, 0, 1) * 0.82;
        const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
        rg.addColorStop(0, "#ffd1e6");
        rg.addColorStop(1, "#ff5fa2");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        const pop = 0.3 + 0.7 * easeOutBack(clamp(k * 2.2, 0, 1));
        ctx.save();
        ctx.translate(W / 2, H * 0.46);
        ctx.rotate(-0.07);
        ctx.scale(pop, pop);
        ctx.font = `400 ${Math.round(W * 0.13)}px "Pacifico", ${EMOJI_FONTS}, cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(255,45,135,0.95)";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(CONFIG.endCard.title, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = clamp((k - 0.25) * 3, 0, 1);
        ctx.font = `600 ${Math.round(W * 0.045)}px "Fredoka", ${EMOJI_FONTS}, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(200,20,100,0.6)";
        ctx.shadowBlur = 10;
        ctx.fillText(CONFIG.endCard.subtitle, W / 2, H * 0.46 + W * 0.14);
        ctx.restore();
      }
    }
  }

  /* ========================================================================
     11. Composite video recorder (canvas + music → downloadable file)
     ======================================================================== */
  const Composite = {
    renderer: null,
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
    endStartedAt: 0,
    captionIdx: -1,
    captionAt: 0,
    rafId: 0,
    lastFrame: 0,
    musicIncluded: false,

    detect() {
      const hasRecorder = typeof window.MediaRecorder === "function";
      const hasCapture = typeof els.composeCanvas.captureStream === "function";
      this.mime = pickMimeType(COMPOSITE_TYPES);
      const typeCheckAvailable = hasRecorder && typeof MediaRecorder.isTypeSupported === "function";
      this.supported = hasRecorder && hasCapture && (!!this.mime || !typeCheckAvailable);
      this.renderer = new RomanticRenderer(els.composeCanvas);
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
      const nodes = [];
      let musicGain = null;
      let dest;
      try {
        dest = ctx.createMediaStreamDestination();
        if (state.musicBuffer) {
          const src = ctx.createBufferSource();
          src.buffer = state.musicBuffer;
          src.loop = true;
          musicGain = ctx.createGain();
          musicGain.gain.value = state.userAudioBuffer ? CONFIG.music.videoVolume * 0.6 : CONFIG.music.videoVolume;
          src.connect(musicGain);
          musicGain.connect(dest);
          src.start(0, offset % state.musicBuffer.duration);
          nodes.push(src, musicGain);
        }
        if (state.userAudioBuffer && offset < state.userAudioBuffer.duration) {
          const voice = ctx.createBufferSource();
          voice.buffer = state.userAudioBuffer;
          voice.connect(dest);
          voice.start(0, offset);
          nodes.push(voice);
        }
      } catch (err) {
        console.warn("[composite] audio setup failed", err);
        nodes.forEach((n) => {
          try { n.disconnect(); } catch (_) { /* ignore */ }
        });
        return null;
      }
      if (!nodes.length) return null;
      return { dest, nodes, musicGain };
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

    start(video, offset) {
      if (!this.supported || this.recording) return false;
      try {
        this.renderer.setup(video);
        this.captionIdx = -1;
        this.endStartedAt = 0;
        this.completedPlayback = false;
        this.renderer.draw(video, performance.now(), {});

        const stream = els.composeCanvas.captureStream(CONFIG.composite.fps);
        this.audio = this.buildAudio(offset);
        this.musicIncluded = !!(this.audio && this.audio.musicGain);
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
        recorder.onerror = (e) => console.warn("[composite] recorder error", e.error || e);
        this.stream = stream;
        this.recorder = recorder;
        this.hiddenDuringRecord = document.hidden;
        this.recording = true;
        this.stopping = null;
        const mime = recorder.mimeType || this.mime;
        if (isMp4(mime)) recorder.start();
        else recorder.start(1000);
        this.loop();
        return true;
      } catch (err) {
        console.warn("[composite] cannot build the video in this browser", err);
        this.cleanupAudio();
        this.recording = false;
        this.supported = false;
        return false;
      }
    },

    loop() {
      cancelAnimationFrame(this.rafId);
      const minGap = 1000 / CONFIG.composite.fps - 2;
      const frame = (now) => {
        if (!this.recording) return;
        if (now - this.lastFrame >= minGap) {
          this.lastFrame = now;
          this.drawFrame(now);
        }
        this.rafId = requestAnimationFrame(frame);
      };
      this.rafId = requestAnimationFrame(frame);
    },

    drawFrame(now) {
      const v = els.revealVideo;
      const info = {};
      if (this.endStartedAt) {
        info.endProgress = (now - this.endStartedAt) / (CONFIG.endCard.seconds * 1000);
        info.caption = null;
      } else {
        const p = clamp(v.currentTime / getVideoDuration(), 0, 1);
        let idx = -1;
        for (let i = CONFIG.captions.length - 1; i >= 0; i--) {
          const c = CONFIG.captions[i];
          if (p >= c.from && p < (c.to != null ? c.to : 1.01)) {
            idx = i;
            break;
          }
        }
        if (idx !== this.captionIdx) {
          this.captionIdx = idx;
          this.captionAt = now;
        }
        if (idx >= 0) {
          info.caption = CONFIG.captions[idx].text;
          info.captionAge = (now - this.captionAt) / 1000;
        }
      }
      this.renderer.draw(v, now, info);
    },

    beginEndCard() {
      if (!this.recording) return;
      this.completedPlayback = true;
      this.endStartedAt = performance.now();
      const ctx = state.audioCtx;
      if (this.audio && this.audio.musicGain && ctx) {
        try {
          const g = this.audio.musicGain.gain;
          g.cancelScheduledValues(ctx.currentTime);
          g.setValueAtTime(g.value, ctx.currentTime);
          g.linearRampToValueAtTime(0.0001, ctx.currentTime + CONFIG.endCard.seconds);
        } catch (_) { /* ignore */ }
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
      cancelAnimationFrame(this.rafId);
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

  /** iPhone/iPad: open the share sheet ("Save Video" → Photos). Elsewhere: download. */
  function deliverFile(blob, filename, successText) {
    if (IS_IOS && navigator.canShare && typeof File === "function") {
      try {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({ files: [file], title: "My romantic surprise 💗" })
            .then(() => setSaveStatus("💕 Saved! Choose “Save Video” to keep it in Photos."))
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
    // replay once while recording the romantic edit.
    state.saveRequested = true;
    els.btnSave.disabled = true;
    setSaveStatus("🎬 Creating your video — it will replay once. Please keep this tab open.");
    toast("🎬 Creating your video — keep this tab open until it finishes 💗", 6000);
    startPlayback();
  }

  function openSaveFallback(reason) {
    els.saveReason.textContent =
      reason || "This browser can't combine your clip with the romantic effects into one video file.";
    openModal(els.saveModal);
  }

  function seekVideo(video, time) {
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      try {
        video.currentTime = time;
      } catch (_) {
        done();
      }
      setTimeout(done, 2500);
    });
  }

  async function savePhotoCard() {
    const v = els.revealVideo;
    const wasPlaying = !v.paused;
    if (wasPlaying) v.pause();
    const returnTo = v.currentTime;

    // Pick the "heart hands" moment if there is one, otherwise the middle.
    let moment = getVideoDuration() * 0.45;
    const heartIdx = CONFIG.actions.findIndex((a) => a.pose === "heart");
    const seg = state.timeline && state.timeline.segs.find((s) => s.type === "action" && s.index === heartIdx);
    if (seg) moment = Math.min(getVideoDuration() - 0.1, (seg.start + seg.end) / 2);
    await seekVideo(v, moment);
    await preloadFonts();

    const canvas = document.createElement("canvas");
    const renderer = new RomanticRenderer(canvas);
    renderer.setup(v);
    renderer.draw(v, performance.now(), { caption: CONFIG.photoCaption, captionAge: null });

    canvas.toBlob((blob) => {
      if (blob) deliverFile(blob, `${CONFIG.downloadName}-photo-${timestamp()}.png`, "📸 Photo card saved!");
      else toast("Sorry, the photo couldn't be created in this browser.");
    }, "image/png");

    await seekVideo(v, returnTo);
    if (wasPlaying) v.play().catch(() => {});
  }

  /* ========================================================================
     13. Reset / navigation
     ======================================================================== */
  function abortChallenge() {
    state.sessionId++;
    cancelAnimationFrame(state.rafId);
    releaseWakeLock();
    discardRecording();
    stopCamera();
  }

  function resetToWelcome() {
    state.sessionId++;
    cancelAnimationFrame(state.rafId);
    cancelAnimationFrame(state.revealLoopId);
    clearEndTimers();
    stopMusicFade();
    releaseWakeLock();
    discardRecording();
    stopCamera();
    Composite.reset();
    LoveFX.stop();

    const v = els.revealVideo;
    try {
      v.pause();
    } catch (_) { /* ignore */ }
    v.removeAttribute("src");
    try {
      v.load();
    } catch (_) { /* ignore */ }
    const m = els.music;
    try {
      m.pause();
      m.currentTime = 0;
    } catch (_) { /* ignore */ }
    if (state.volumeControllable) m.volume = state.volume;

    if (state.recordingURL) URL.revokeObjectURL(state.recordingURL);
    state.recordingURL = "";
    state.recordingBlob = null;
    state.userAudioBuffer = null;
    state.hasUserAudio = false;
    state.playing = false;
    state.saveRequested = false;
    state.timeline = null;

    els.caption.classList.remove("is-in");
    els.caption.textContent = "";
    els.gotcha.classList.remove("is-in");
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
    els.btnStart.addEventListener("click", () => {
      els.consentAudio.checked = false;
      openModal(els.consentModal);
    });

    els.btnConsentCancel.addEventListener("click", () => closeModal(els.consentModal));

    els.btnConsentAgree.addEventListener("click", () => {
      unlockAudio(); // must happen inside the tap
      state.wantAudio = els.consentAudio.checked;
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
      if (window.confirm("Quit the challenge? Your recording will be deleted.")) {
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
      // Ask for consent again right away so the new recording is clearly agreed to.
      setTimeout(() => {
        els.consentAudio.checked = false;
        openModal(els.consentModal);
      }, 350);
    });

    els.btnSave.addEventListener("click", onSaveClick);
    els.btnSaveClose.addEventListener("click", () => closeModal(els.saveModal));
    els.btnSavePhoto.addEventListener("click", () => {
      closeModal(els.saveModal);
      savePhotoCard();
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

    els.revealVideo.addEventListener("ended", onPlaybackEnded);

    els.music.addEventListener("error", () => {
      state.musicOk = false;
      console.warn(`[music] Could not load ${CONFIG.music.src}. The reveal will play without music.`);
    });

    // Close dialogs with Escape (except while the camera is starting).
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
      if (state.phase === "reveal" && state.playing && els.revealVideo.paused) {
        els.revealVideo.play().catch(() => showPlaySurprise());
      }
    });

    window.addEventListener("pagehide", () => {
      discardRecording();
      stopCamera();
    });
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
    els.metaMoves.textContent = String(CONFIG.actions.length);
    const timeText = total < 50 ? `${Math.round(total)} sec` : `${Math.max(1, Math.round(total / 60))} min`;
    els.metaTime.textContent = timeText.replace(/ (sec|min)$/, "");
    els.metaTime.parentElement.lastChild.textContent = total < 50 ? " sec" : " min";
    document.querySelectorAll(".js-total-time").forEach((n) => {
      n.textContent = total < 50 ? `${Math.round(total)} seconds` : `${Math.max(1, Math.round(total / 60))} minute${total >= 90 ? "s" : ""}`;
    });

    Composite.detect();
    applyVolume();
    wireEvents();
  }

  init();
})();
