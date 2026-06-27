/* ===================================================================
   Global scroll controller
   - Lenis smooth scrolling (desktop wheel) integrated with the GSAP
     ticker + ScrollTrigger for perfectly synchronized scroll animations.
   - Native touch scrolling on mobile (best performance / feel).
   - Disabled entirely under prefers-reduced-motion.
   - Keeps ScrollTrigger positions correct on load, resize, orientation
     change, and font/asset load (debounced refresh).
   - Exposes window.ssScrollTo(target) so sections share one smooth jump.
   =================================================================== */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    // Recompute trigger positions after everything has loaded/laid out.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  let lenis = null;
  const canSmooth = !reduced && !!window.Lenis;

  if (canSmooth) {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium ease-out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // smoothTouch left off → native touch scroll on mobile
    });
    window.__lenis = lenis;

    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // One smooth-scroll helper used by all sections for click-to-jump.
  window.ssScrollTo = function (target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.0 });
    else window.scrollTo({ top: typeof target === 'number' ? target : (target.offsetTop || 0), behavior: 'smooth' });
  };

  if (!hasGsap) return;

  // ---- Keep everything in sync on load / resize / orientation ----
  let rt;
  const refresh = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 180); };

  window.addEventListener('load', () => ScrollTrigger.refresh());
  window.addEventListener('orientationchange', () => setTimeout(() => ScrollTrigger.refresh(), 250));
  window.addEventListener('resize', refresh, { passive: true });
  // Webfonts / Font Awesome can reflow after first paint — refresh once ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
