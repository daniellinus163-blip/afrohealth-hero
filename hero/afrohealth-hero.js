/**
 * AfroHealth hero — minimal JS: stagger reveal + optional video ready state
 */
(function () {
  var hero = document.querySelector(".afh-hero");
  if (!hero) return;

  function reveal() {
    hero.classList.add("is-visible");
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    reveal();
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }

  var wrap = hero.querySelector(".afh-hero__video-wrap");
  var video = hero.querySelector(".afh-hero__video");
  if (wrap && video && video.querySelector("source[src]")) {
    video.addEventListener(
      "canplay",
      function onCanPlay() {
        video.removeEventListener("canplay", onCanPlay);
        wrap.classList.add("is-ready");
      },
      { once: true }
    );
    video.addEventListener("error", function () {
      wrap.style.display = "none";
    });
  }
})();
