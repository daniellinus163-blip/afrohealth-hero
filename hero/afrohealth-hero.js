/**
 * AfroHealth hero — dual-layer video crossfade + configurable clip duration (default 4s)
 * Config: ["url"] or [{ "url": "...", "hold": 4000 }, ...]
 */
(function () {
  var hero = document.querySelector(".afh-hero");
  if (!hero) return;

  var DEFAULT_HOLD = 4000;
  var FADE_MS = 900;

  function reveal() {
    hero.classList.add("is-visible");
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    reveal();
    var wRm = hero.querySelector(".afh-hero__video-wrap");
    if (wRm) wRm.style.display = "none";
    hero.classList.add("afh-hero--video-fallback");
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }

  var cfgEl = hero.querySelector(".afh-hero__video-config");
  var wrap = hero.querySelector(".afh-hero__video-wrap");
  if (!cfgEl || !wrap || reduceMotion) return;

  var raw = [];
  try {
    raw = JSON.parse(cfgEl.textContent.trim() || "[]");
  } catch (e) {
    return;
  }
  if (!Array.isArray(raw) || raw.length === 0) return;

  var urls = [];
  for (var i = 0; i < raw.length; i++) {
    var item = raw[i];
    if (typeof item === "string") {
      var s = item.trim();
      if (s) urls.push({ url: s, hold: DEFAULT_HOLD });
    } else if (item && typeof item === "object" && item.url) {
      var u = String(item.url).trim();
      if (u) {
        var h = parseInt(item.hold, 10);
        urls.push({ url: u, hold: h > 0 ? h : DEFAULT_HOLD });
      }
    }
  }
  if (urls.length === 0) return;

  var layers = wrap.querySelectorAll(".afh-hero__video-layer");
  if (layers.length < 2) return;

  var v0 = layers[0].querySelector("video");
  var v1 = layers[1].querySelector("video");
  if (!v0 || !v1) return;

  var active = 0;
  var idx = 0;
  var timer = null;
  var failed = {};

  function clearTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function activeLayer() {
    return layers[active];
  }
  function inactiveLayer() {
    return layers[1 - active];
  }

  function nextUrl(start) {
    var n = urls.length;
    var i = start;
    var tries = 0;
    while (tries < n) {
      var entry = urls[i % n];
      if (!failed[entry.url]) return { entry: entry, index: i % n };
      i++;
      tries++;
    }
    return null;
  }

  function showFallback() {
    wrap.style.display = "none";
    wrap.classList.remove("is-ready");
    hero.classList.add("afh-hero--video-fallback");
    clearTimer();
  }

  function scheduleAdvanceFromCurrent() {
    clearTimer();
    var h = urls[idx] ? urls[idx].hold : DEFAULT_HOLD;
    timer = window.setTimeout(function () {
      advance();
    }, h);
  }

  function advance() {
    var next = nextUrl(idx + 1);
    if (!next) return;

    var outL = activeLayer();
    var inL = inactiveLayer();
    var outV = outL.querySelector("video");
    var inV = inL.querySelector("video");

    inV.preload = "auto";
    inV.src = next.entry.url;

    inV.addEventListener(
      "canplay",
      function onReady() {
        inV.removeEventListener("canplay", onReady);
        inL.classList.add("is-active");
        outL.classList.remove("is-active");
        active = 1 - active;
        idx = next.index;
        inV.play().catch(function () {});
        window.setTimeout(function () {
          outV.pause();
          outV.removeAttribute("src");
          outV.load();
          outV.preload = "none";
        }, FADE_MS);
        if (urls.length >= 2) scheduleAdvanceFromCurrent();
      },
      { once: true }
    );

    inV.addEventListener(
      "error",
      function onErr() {
        inV.removeEventListener("error", onErr);
        failed[next.entry.url] = true;
        inV.removeAttribute("src");
        inV.load();
        if (urls.length >= 2) scheduleAdvanceFromCurrent();
      },
      { once: true }
    );
  }

  var first = nextUrl(0);
  if (!first) return;

  v0.src = first.entry.url;
  idx = first.index;

  function onFirstPlay() {
    v0.removeEventListener("canplay", onFirstPlay);
    wrap.classList.add("is-ready");
    v0.play().catch(function () {});
    if (urls.length >= 2) scheduleAdvanceFromCurrent();
  }

  v0.addEventListener("canplay", onFirstPlay, { once: true });
  v0.addEventListener(
    "error",
    function () {
      failed[first.entry.url] = true;
      var second = nextUrl(1);
      if (!second) {
        showFallback();
        return;
      }
      v0.src = second.entry.url;
      idx = second.index;
      v0.addEventListener("canplay", onFirstPlay, { once: true });
    },
    { once: true }
  );
})();
