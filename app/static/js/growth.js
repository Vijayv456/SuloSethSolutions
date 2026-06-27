/* ===================================================================
   "Services Built for Growth" — pinned scroll-driven service navigator.
   Desktop: GSAP ScrollTrigger pins the section and scroll rotates the
   3-node wheel; auto-releases after the last service. Tablet/mobile:
   static, tap a node to switch. 60fps (transform/opacity only).
   =================================================================== */
(function () {
  'use strict';
  const section = document.querySelector('.sg-section');
  if (!section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = document.getElementById('sgTrack');
  const nodes = [...track.querySelectorAll('.sg-node')];
  const fill = document.querySelector('.sg-line-fill');
  const n = nodes.length;
  if (!n) return;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let data = [];
  try { data = JSON.parse(document.getElementById('sgData').textContent); } catch (e) {}

  const els = {
    num: document.getElementById('sgNum'), ic: document.getElementById('sgIc'),
    title: document.getElementById('sgTitle'), desc: document.getElementById('sgDesc'),
    feats: document.getElementById('sgFeatures'), panel: document.getElementById('sgPanel'),
  };
  let lastActive = -1;
  function updatePanel(i) {
    const s = data[i]; if (!s) return;
    els.num.textContent = String(i + 1).padStart(2, '0');
    els.ic.innerHTML = `<i class="${s.icon}"></i>`;
    els.title.textContent = s.title;
    els.desc.textContent = s.desc;
    els.feats.innerHTML = (s.features || []).map(f => `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`).join('');
    els.panel.classList.remove('swap'); void els.panel.offsetWidth; els.panel.classList.add('swap');
  }

  function render(p) {
    p = clamp(p, 0, 1);
    const active = Math.round(p * (n - 1));
    nodes.forEach((node, i) => {
      const rel = i - active;
      node.style.setProperty('--rel', rel);
      node.classList.toggle('is-active', rel === 0);
      node.classList.toggle('is-prev', rel === -1);
      node.classList.toggle('is-next', rel === 1);
      node.classList.toggle('is-hidden', Math.abs(rel) > 1);
    });
    if (fill) fill.style.height = (p * 100) + '%';
    if (active !== lastActive) { updatePanel(active); lastActive = active; }
  }

  let st = null;
  function buildPin() {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=' + (n * 260),
        pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.7, invalidateOnRefresh: true,
        onUpdate: () => render(proxy.p), onRefresh: () => render(proxy.p),
      },
    });
    return tween.scrollTrigger;
  }

  // Responsive: set up the pin only on desktop; gsap.matchMedia rebuilds /
  // tears down automatically when the viewport crosses the breakpoint.
  if (window.gsap && window.ScrollTrigger && !reduced) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
      section.classList.remove('sg-static');
      st = buildPin();
      render(0);
      return () => { st = null; section.classList.add('sg-static'); render(0); };
    });
    mm.add('(max-width: 991px)', () => { section.classList.add('sg-static'); render(0); });
  } else {
    section.classList.add('sg-static');
  }

  // Click a node to jump to its service (smooth via Lenis when available).
  nodes.forEach((node, i) => node.addEventListener('click', () => {
    const target = n > 1 ? i / (n - 1) : 0;
    if (st) window.ssScrollTo(st.start + (st.end - st.start) * target);
    else render(target);
  }));

  render(0);
  window.__growth = { render, n };
})();
