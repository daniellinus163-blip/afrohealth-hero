/**
 * AfroHealth hero — .is-visible for staggered copy entrance; pauses hero video if reduced motion.
 */
(function () {
  var hero = document.querySelector(".afh-hero");
  if (!hero) return;

  function reveal() {
    hero.classList.add("is-visible");
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    reveal();
    var vid = hero.querySelector(".afh-hero__video");
    if (vid) {
      vid.removeAttribute("autoplay");
      vid.pause();
    }
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }
})();
