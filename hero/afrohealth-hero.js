/**
 * AfroHealth hero — sequential video crossfade. Config: [{ "url", "hold" }] or URL strings.
 * Skips broken URLs; load timeout skips stuck clips so every segment can play.
 */
(function () {
  var hero = document.querySelector(".afh-hero");
  if (!hero) return;

  var DEFAULT_HOLD = 4000;
  var FADE_MS = 900;
  var LOAD_TIMEOUT_MS = 15000;

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
  var advancing = false;

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

  function whenVideoReady(inV, onReady, onGaveUp, bootId) {
    var done = false;
    function cleanup() {
      clearTimeout(loadTo);
      inV.removeEventListener("canplaythrough", onThrough);
      inV.removeEventListener("canplay", onCanPlay);
    }
    function finishOk() {
      if (done) return;
      if (bootId != null && bootId !== bootGen) return;
      done = true;
      cleanup();
      onReady();
    }
    function finishSkip() {
      if (done) return;
      if (bootId != null && bootId !== bootGen) return;
      done = true;
      cleanup();
      onGaveUp();
    }
    function onThrough() {
      finishOk();
    }
    function onCanPlay() {
      if (inV.readyState >= 3) finishOk();
    }
    var loadTo = window.setTimeout(finishSkip, LOAD_TIMEOUT_MS);
    inV.addEventListener("canplaythrough", onThrough, { once: true });
    inV.addEventListener("canplay", onCanPlay, { once: true });
  }

  function advance() {
    if (advancing) return;
    if (urls.length < 2) return;

    var next = nextUrl(idx + 1);
    if (!next) {
      showFallback();
      return;
    }

    advancing = true;
    clearTimer();

    var outL = activeLayer();
    var inL = inactiveLayer();
    var outV = outL.querySelector("video");
    var inV = inL.querySelector("video");

    inV.preload = "auto";
    inV.src = next.entry.url;

    function skipThis() {
      failed[next.entry.url] = true;
      inV.removeAttribute("src");
      inV.load();
      advancing = false;
      window.setTimeout(advance, 0);
    }

    inV.addEventListener(
      "error",
      function onErr() {
        inV.removeEventListener("error", onErr);
        skipThis();
      },
      { once: true }
    );

    whenVideoReady(
      inV,
      function swap() {
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
        advancing = false;
        scheduleAdvanceFromCurrent();
      },
      skipThis,
      null
    );
  }

  var bootGen = 0;

  function startFirst() {
    wrap.classList.add("is-ready");
    v0.play().catch(function () {});
    if (urls.length >= 2) scheduleAdvanceFromCurrent();
  }

  function tryFirstVideo(startIndex) {
    var pick = nextUrl(startIndex);
    if (!pick) {
      showFallback();
      return;
    }

    bootGen++;
    var myBoot = bootGen;

    v0.src = pick.entry.url;
    idx = pick.index;

    function onFirstError() {
      if (myBoot !== bootGen) return;
      failed[pick.entry.url] = true;
      v0.removeAttribute("src");
      v0.load();
      tryFirstVideo(startIndex + 1);
    }

    v0.addEventListener("error", onFirstError, { once: true });

    whenVideoReady(
      v0,
      function () {
        if (myBoot !== bootGen) return;
        v0.removeEventListener("error", onFirstError);
        startFirst();
      },
      function () {
        if (myBoot !== bootGen) return;
        v0.removeEventListener("error", onFirstError);
        failed[pick.entry.url] = true;
        v0.removeAttribute("src");
        v0.load();
        tryFirstVideo(startIndex + 1);
      },
      myBoot
    );
  }

  tryFirstVideo(0);
})();
