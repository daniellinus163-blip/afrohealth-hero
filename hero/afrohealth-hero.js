/**
 * AfroHealth hero — .is-visible for staggered copy entrance.
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
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }
})();
