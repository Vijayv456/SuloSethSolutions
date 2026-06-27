/* ===================================================================
   Services page — scroll-driven progress storytelling.
   Pins the section; each scroll step completes one service (snap),
   the progress line fills, completed items get glowing checkmarks,
   and the panel + futuristic illustration update. Releases at the end.
   =================================================================== */
(function () {
  'use strict';
  const section = document.querySelector('.g2-section');
  if (!section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...document.querySelectorAll('.g2-item')];
  const fill = document.getElementById('g2Fill');
  const n = items.length;
  if (!n) return;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let data = [];
  try { data = JSON.parse(document.getElementById('g2Data').textContent); } catch (e) {}

  // ---- Illustration builders (Font Awesome + CSS, no emojis) ----
  const VIS = {
    browser: `<div class="ill ill-browser floaty"><span class="glow"></span><div class="win"><div class="bar"><i></i><i></i><i></i></div><div class="code"><span></span><span></span><span></span><span></span></div></div></div>`,
    phone: `<div class="ill ill-phone floaty"><span class="glow"></span><div class="ph"><div class="scr"><b></b><b></b><b></b></div></div><div class="ph small"><div class="scr"><b></b><b></b></div></div></div>`,
    network: `<div class="ill ill-net floaty"><span class="glow"></span><svg viewBox="0 0 260 200" preserveAspectRatio="none"><line x1="130" y1="100" x2="40" y2="28"/><line x1="130" y1="100" x2="220" y2="28"/><line x1="130" y1="100" x2="130" y2="178"/></svg><span class="hub"><i class="fa-solid fa-plug"></i></span><span class="sat s1"><i class="fa-solid fa-database"></i></span><span class="sat s2"><i class="fa-solid fa-cloud"></i></span><span class="sat s3"><i class="fa-solid fa-mobile-screen"></i></span></div>`,
    dashboard: `<div class="ill ill-dash floaty"><span class="glow"></span><div class="win"><div class="chips"><span></span><span></span><span></span></div><div class="bars"><i></i><i></i><i></i><i></i><i></i></div></div></div>`,
    flow: `<div class="ill ill-flow floaty"><span class="glow"></span><span class="box"><i class="fa-solid fa-inbox"></i></span><i class="fa-solid fa-arrow-right ar"></i><span class="box"><i class="fa-solid fa-gears"></i></span><i class="fa-solid fa-arrow-right ar"></i><span class="box"><i class="fa-solid fa-circle-check"></i></span></div>`,
    data: `<div class="ill ill-data floaty"><span class="glow"></span><div class="db"><i class="fa-solid fa-database"></i></div><div class="stream"><b></b><b></b><b></b><b></b></div></div>`,
    cloud: `<div class="ill ill-cloud floaty"><span class="glow"></span><i class="fa-solid fa-cloud big"></i><div class="srv"><span><i class="fa-solid fa-server"></i></span><span><i class="fa-solid fa-server"></i></span><span><i class="fa-solid fa-server"></i></span></div></div>`,
    learn: `<div class="ill ill-learn floaty"><span class="glow"></span><i class="fa-solid fa-laptop-code big"></i><div class="prog"><b></b></div><i class="fa-solid fa-certificate cert"></i></div>`,
    team: `<div class="ill ill-team floaty"><span class="glow"></span><span><i class="fa-solid fa-user"></i></span><span><i class="fa-solid fa-user"></i></span><span><i class="fa-solid fa-user"></i></span><span><i class="fa-solid fa-user"></i></span><span><i class="fa-solid fa-user"></i></span><span><i class="fa-solid fa-user"></i></span></div>`,
    career: `<div class="ill ill-career floaty"><span class="glow"></span><div class="cbars"><i></i><i></i><i></i><i></i></div><i class="fa-solid fa-arrow-trend-up tr"></i></div>`,
  };

  const els = {
    step: document.getElementById('g2Step'), title: document.getElementById('g2Title'),
    desc: document.getElementById('g2Desc'), feats: document.getElementById('g2Feats'),
    visual: document.getElementById('g2Visual'),
    info: document.querySelector('.g2-info'),
  };
  let lastActive = -1;
  function updatePanel(i) {
    const s = data[i]; if (!s) return;
    els.step.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    els.title.textContent = s.title;
    els.desc.textContent = s.desc;
    els.feats.innerHTML = (s.features || []).map(f => `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`).join('');
    els.visual.innerHTML = VIS[s.visual] || '';
    els.info.classList.remove('swap'); void els.info.offsetWidth; els.info.classList.add('swap');
  }

  function render(p) {
    p = clamp(p, 0, 1);
    const active = Math.round(p * (n - 1));
    items.forEach((it, i) => {
      it.classList.toggle('done', i < active);
      it.classList.toggle('active', i === active);
      it.classList.toggle('upcoming', i > active);
    });
    if (fill) fill.style.height = (n > 1 ? active / (n - 1) * 100 : 0) + '%';
    if (active !== lastActive) { updatePanel(active); lastActive = active; }
  }

  let st = null;
  function buildPin() {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=' + (n * 300),
        pin: true, pinSpacing: true, anticipatePin: 1, scrub: 0.6, invalidateOnRefresh: true,
        snap: { snapTo: 1 / (n - 1), duration: { min: 0.15, max: 0.35 }, ease: 'power1.inOut' },
        onUpdate: () => render(proxy.p), onRefresh: () => render(proxy.p),
      },
    });
    return tween.scrollTrigger;
  }

  if (window.gsap && window.ScrollTrigger && !reduced) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
      section.classList.remove('g2-static');
      st = buildPin();
      render(0);
      return () => { st = null; section.classList.add('g2-static'); render(0); };
    });
    mm.add('(max-width: 991px)', () => { section.classList.add('g2-static'); render(0); });
  } else {
    section.classList.add('g2-static');
  }

  items.forEach((it, i) => it.addEventListener('click', () => {
    const target = n > 1 ? i / (n - 1) : 0;
    if (st) window.ssScrollTo(st.start + (st.end - st.start) * target);
    else render(target);
  }));

  render(0);
  window.__growth2 = { render, n };
})();
