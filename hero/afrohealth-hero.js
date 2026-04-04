/**
 * AfroHealth hero — adds .is-visible for staggered entrance (content + tips bar).
 * Ken Burns motion is CSS-only on .afh-hero__character--motion.
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
