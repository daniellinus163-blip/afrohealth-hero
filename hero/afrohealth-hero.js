/**
 * AfroHealth hero — text reveal + dual-layer video crossfade (max 2 videos decoding)
 */
(function () {
  var hero = document.querySelector(".afh-hero");
  if (!hero) return;

  var ROTATE_MS = 7000;
  var FADE_MS = 1200;

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

  var urls = [];
  try {
    urls = JSON.parse(cfgEl.textContent.trim() || "[]");
  } catch (e) {
    return;
  }
  if (!Array.isArray(urls) || urls.length === 0) return;

  urls = urls
    .map(function (u) {
      return typeof u === "string" ? u.trim() : "";
    })
    .filter(Boolean);
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
      var u = urls[i % n];
      if (!failed[u]) return { url: u, index: i % n };
      i++;
      tries++;
    }
    return null;
  }

  function showFallback() {
    wrap.style.display = "none";
    wrap.classList.remove("is-ready");
    hero.classList.add("afh-hero--video-fallback");
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function advance() {
    var next = nextUrl(idx + 1);
    if (!next) return;

    var outL = activeLayer();
    var inL = inactiveLayer();
    var outV = outL.querySelector("video");
    var inV = inL.querySelector("video");

    inV.preload = "auto";
    inV.src = next.url;

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
      },
      { once: true }
    );

    inV.addEventListener(
      "error",
      function onErr() {
        inV.removeEventListener("error", onErr);
        failed[next.url] = true;
        inV.removeAttribute("src");
        inV.load();
      },
      { once: true }
    );
  }

  function startRotation() {
    if (urls.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = window.setInterval(advance, ROTATE_MS);
  }

  var first = nextUrl(0);
  if (!first) return;

  v0.src = first.url;
  idx = first.index;

  function onFirstPlay() {
    v0.removeEventListener("canplay", onFirstPlay);
    wrap.classList.add("is-ready");
    v0.play().catch(function () {});
    startRotation();
  }

  v0.addEventListener("canplay", onFirstPlay, { once: true });
  v0.addEventListener(
    "error",
    function () {
      failed[first.url] = true;
      var second = nextUrl(1);
      if (!second) {
        showFallback();
        return;
      }
      v0.src = second.url;
      idx = second.index;
      v0.addEventListener("canplay", onFirstPlay, { once: true });
    },
    { once: true }
  );
})();
