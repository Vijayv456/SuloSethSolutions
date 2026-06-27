/* ===================================================================
   Training page — "Split Reveal" scroll animation.
   The active service card splits vertically into two halves that slide
   outward (opening-curtain) while the next service emerges from centre.
   Pinned + scrubbed on desktop; static grid on mobile / reduced-motion.
   Hardware-accelerated (translateX / scale / opacity).
   =================================================================== */
(function () {
  'use strict';
  const section = document.querySelector('.sr-section');
  if (!section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data = [];
  try { data = JSON.parse(document.getElementById('srData').textContent); } catch (e) {}
  const N = data.length;
  if (!N) return;

  const back = document.getElementById('srBack');
  const left = document.getElementById('srLeft');
  const right = document.getElementById('srRight');
  const faceL = document.getElementById('srFaceL');
  const faceR = document.getElementById('srFaceR');
  const dots = [...document.querySelectorAll('#srDots span')];
  const segs = Math.max(N - 1, 1);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function card(d) {
    return `<div class="sr-card-inner">
      <span class="sr-ic"><i class="${d.icon}"></i></span>
      <h3>${d.title}</h3>
      <div class="sr-chips">${(d.skills || []).map(s => `<span>${s}</span>`).join('')}</div>
    </div>`;
  }

  let lastStep = -1;
  function build(step) {
    const front = data[step];
    const next = data[Math.min(step + 1, N - 1)];
    faceL.innerHTML = card(front);
    faceR.innerHTML = card(front);
    back.innerHTML = card(next);
  }

  function render(p) {
    p = clamp(p, 0, 1);
    const step = clamp(Math.floor(p * segs + 1e-6), 0, segs - 1);
    const localP = clamp(p * segs - step, 0, 1);
    if (step !== lastStep) { build(step); lastStep = step; }
    const e = easeInOut(localP);
    // curtain: halves slide fully aside
    left.style.transform = `translate3d(${-e * 102}%,0,0) scale(${1 - e * 0.04})`;
    right.style.transform = `translate3d(${e * 102}%,0,0) scale(${1 - e * 0.04})`;
    left.style.opacity = right.style.opacity = (1 - e * 0.15).toFixed(3);
    // incoming card emerges from centre
    back.style.transform = `scale(${0.9 + e * 0.1})`;
    back.style.opacity = (0.45 + e * 0.55).toFixed(3);
    const active = clamp(Math.round(p * segs), 0, N - 1);
    dots.forEach((d, i) => d.classList.toggle('active', i === active));
  }

  let st = null;
  function buildPin() {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=' + (segs * 420),
        pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.7, invalidateOnRefresh: true,
        onUpdate: () => render(proxy.p), onRefresh: () => render(proxy.p),
      },
    });
    return tween.scrollTrigger;
  }

  if (window.gsap && window.ScrollTrigger && !reduced) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
      section.classList.remove('sr-static');
      build(0); st = buildPin(); render(0);
      return () => { st = null; section.classList.add('sr-static'); };
    });
    mm.add('(max-width: 991px)', () => { section.classList.add('sr-static'); });
  } else {
    section.classList.add('sr-static');
  }

  build(0);
  render(0);
  window.__split = { render, N, get st() { return st; } };
})();
