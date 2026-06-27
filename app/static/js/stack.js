/* ===================================================================
   Sticky card stack — each card pins, and as the next card scrolls up
   to cover it the covered card scales down + recedes, building a deck
   with depth. Pure CSS sticky handles the stacking; GSAP adds the depth.
   =================================================================== */
(function () {
  'use strict';
  const stack = document.getElementById('processStack');
  if (!stack) return;
  const cards = [...stack.querySelectorAll('.stack-card')];
  if (cards.length < 2) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap || !window.ScrollTrigger) return; // sticky stacking still works without JS

  gsap.registerPlugin(ScrollTrigger);

  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    const next = cards[i + 1];
    // As `next` rises from the bottom to cover `card`, push `card` back.
    gsap.fromTo(card,
      { scale: 1, y: 0, filter: 'brightness(1)' },
      {
        scale: 0.9, y: -28, filter: 'brightness(0.55)', ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
      }
    );
  });
})();
