/* ===================================================================
   Circular Career Orbit — scroll-controlled rotation + dynamic panel
   Drives: orbit rotation, active-stage focus, completed/future states,
   progress-path fill, and the live content card. 60fps via transform-only
   updates; GSAP ScrollTrigger scrub when available, scroll fallback otherwise.
   =================================================================== */
(function () {
  'use strict';
  const section = document.querySelector('.orbit-section');
  if (!section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotor = document.getElementById('orbitRotor');
  const nodes = [...rotor.querySelectorAll('.orbit-node')];
  const prog = document.getElementById('orbitProgress');
  const bar = document.getElementById('opBar');
  const n = nodes.length;
  if (!n) return;
  const step = 360 / n;
  const R = 220;                 // matches SVG circle r
  const C = 2 * Math.PI * R;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let data = [];
  try { data = JSON.parse(document.getElementById('orbitData').textContent); } catch (e) {}

  // Place nodes counter-clockwise so a clockwise rotation brings
  // stage 0 → 1 → 2 … to the top focus position in journey order.
  nodes.forEach((node, i) => node.style.setProperty('--theta', ((360 - i * step) % 360) + 'deg'));
  if (prog) { prog.style.strokeDasharray = C; prog.style.strokeDashoffset = C; }

  // ---- Panel ----
  const els = {
    step: document.getElementById('opStep'), icon: document.getElementById('opIcon'),
    title: document.getElementById('opTitle'), desc: document.getElementById('opDesc'),
    outcome: document.getElementById('opOutcome'), duration: document.getElementById('opDuration'),
    next: document.getElementById('opNext'), panel: document.getElementById('orbitPanel'),
    core: document.getElementById('orbitCore'), coreIc: document.getElementById('coreIc'),
    coreTitle: document.getElementById('coreTitle'), coreStep: document.getElementById('coreStep'),
  };
  let lastActive = -1;
  function updatePanel(i) {
    const s = data[i]; if (!s || !els.title) return;
    els.step.textContent = `Stage ${i + 1} of ${n}`;
    els.icon.innerHTML = `<i class="${s.icon}"></i>`;
    els.title.textContent = s.title;
    els.desc.textContent = s.description;
    els.outcome.textContent = s.outcome;
    els.duration.textContent = s.duration;
    els.next.innerHTML = `<span class="op-next-pill">${s.next}</span>`;
    els.panel.classList.remove('swap'); void els.panel.offsetWidth; els.panel.classList.add('swap');
    // center-of-circle detail
    if (els.coreTitle) {
      els.coreIc.innerHTML = `<i class="${s.icon}"></i>`;
      els.coreTitle.textContent = s.short;
      els.coreStep.textContent = `Stage ${i + 1} of ${n}`;
      els.core.classList.remove('swap'); void els.core.offsetWidth; els.core.classList.add('swap');
    }
  }

  // ---- Render for a given progress (0..1) ----
  function render(p) {
    p = clamp(p, 0, 1);
    const rot = p * (n - 1) * step;
    rotor.style.setProperty('--rot', rot + 'deg');
    const active = Math.round(p * (n - 1));
    nodes.forEach((node, i) => {
      node.classList.toggle('is-active', i === active);
      node.classList.toggle('is-done', i < active);
      node.classList.toggle('is-future', i > active);
    });
    if (prog) prog.style.strokeDashoffset = C * (1 - p);
    if (bar) bar.style.width = (p * 100) + '%';
    if (active !== lastActive) { updatePanel(active); lastActive = active; }
  }

  // ---- Scroll wiring ----
  let st = null;
  function buildTrigger(pin) {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: pin
        ? {
            trigger: section, start: 'top top', end: '+=' + (n * 320),
            pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.8, invalidateOnRefresh: true,
            onUpdate: () => render(proxy.p), onRefresh: () => render(proxy.p),
          }
        : {
            trigger: section, start: 'top 75%', end: 'bottom 25%', scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: () => render(proxy.p), onRefresh: () => render(proxy.p),
          },
    });
    return tween.scrollTrigger;
  }
  function setupScroll() {
    if (window.gsap && window.ScrollTrigger && !reduced) {
      // Pin on desktop, lightweight scrub on smaller screens; matchMedia
      // rebuilds the correct one whenever the viewport crosses 992px.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 992px)', () => { st = buildTrigger(true); render(0); return () => { st = null; render(0); }; });
      mm.add('(max-width: 991px)', () => { st = buildTrigger(false); render(0); return () => { st = null; render(0); }; });
    } else if (reduced) {
      render(0); // static; node clicks still work
    } else {
      const onScroll = () => {
        const r = section.getBoundingClientRect(), vh = window.innerHeight;
        const span = r.height - vh * 0.4;
        render((vh * 0.6 - r.top) / (span > 0 ? span : 1));
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  }

  // ---- Click a node to jump to its stage ----
  nodes.forEach((node, i) => node.addEventListener('click', () => {
    const target = i / (n - 1);
    if (st) {
      window.ssScrollTo(st.start + (st.end - st.start) * target);
    } else {
      render(target);
    }
  }));

  // ---- Floating particles ----
  function particles() {
    if (reduced) return;
    const host = document.getElementById('orbitParticles');
    if (!host) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.top = (60 + Math.random() * 40) + '%';
      p.style.animationDuration = (5 + Math.random() * 7) + 's';
      p.style.animationDelay = (-Math.random() * 8) + 's';
      const sc = 0.5 + Math.random();
      p.style.transform = `scale(${sc})`;
      host.appendChild(p);
    }
  }

  render(0);
  particles();
  setupScroll();

  // Debug hook (harmless): lets tooling drive the journey without scrolling.
  window.__orbit = { render, n };
})();
