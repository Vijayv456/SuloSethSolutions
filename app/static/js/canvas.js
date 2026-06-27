/* ===================================================================
   SuloSethuSolution — Canvas systems
   Global ambient drift (#bg-canvas), hero network (#hero-canvas),
   flow connecting path (#flow-canvas). Palette follows the theme.
   =================================================================== */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const d = DPR();
    canvas.width = Math.max(1, r.width * d);
    canvas.height = Math.max(1, r.height * d);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { w: r.width, h: r.height, ctx };
  }

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const p = ['--cyan', '--blue', '--purple'].map(v => cs.getPropertyValue(v).trim()).filter(Boolean);
    return p.length ? p : ['#22d3ee', '#3a86ff', '#8b5cf6'];
  }
  let PALETTE = readPalette();

  function heroNetwork() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    let { w, h, ctx } = fit(canvas);
    const mouse = { x: -9999, y: -9999, active: false };
    let nodes = [];
    function build() {
      const count = Math.min(110, Math.floor((w * h) / 13000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8, c: PALETTE[(Math.random() * PALETTE.length) | 0]
      }));
    }
    build();
    const LINK = 130;
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        if (mouse.active) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 180) { n.x += dx / d * 0.6; n.y += dy / d * 0.6; }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK) {
            ctx.strokeStyle = a.c; ctx.globalAlpha = (1 - dist / LINK) * 0.22; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.active) {
          const a = nodes[i], dist = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dist < LINK + 40) {
            ctx.strokeStyle = PALETTE[0]; ctx.globalAlpha = (1 - dist / (LINK + 40)) * 0.5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      for (const n of nodes) {
        ctx.beginPath(); ctx.fillStyle = n.c; ctx.shadowColor = n.c; ctx.shadowBlur = 8;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }
    let raf = null;
    function start() { if (!raf && !reduced) raf = requestAnimationFrame(frame); else if (reduced) frame(); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true; });
    canvas.addEventListener('mouseleave', () => { mouse.active = false; mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', () => { ({ w, h, ctx } = fit(canvas)); build(); });
    window.addEventListener('ss-theme', () => { PALETTE = readPalette(); build(); });
    new IntersectionObserver(([e]) => { e.isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(canvas);
    start();
  }

  function ambient() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || reduced) return;
    let { w, h, ctx } = fit(canvas);
    let parts = [];
    function build() {
      const count = Math.min(70, Math.floor((w * h) / 26000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.6 + 0.5, c: PALETTE[(Math.random() * PALETTE.length) | 0], a: Math.random() * 0.4 + 0.15
      }));
    }
    build();
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', () => { ({ w, h, ctx } = fit(canvas)); build(); });
    window.addEventListener('ss-theme', () => { PALETTE = readPalette(); build(); });
    requestAnimationFrame(frame);
  }

  function flowPath() {
    const canvas = document.getElementById('flow-canvas');
    const wrap = canvas && canvas.parentElement;
    if (!canvas || !wrap) return;
    let { w, h, ctx } = fit(canvas);
    let dash = 0;
    function points() {
      const steps = [...wrap.querySelectorAll('.flow-step')];
      const wr = wrap.getBoundingClientRect();
      return steps.map(s => { const r = s.getBoundingClientRect(); return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 }; });
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      const pts = points();
      if (pts.length > 1) {
        ctx.lineWidth = 2; ctx.strokeStyle = PALETTE[0]; ctx.shadowColor = PALETTE[0]; ctx.shadowBlur = 10;
        ctx.setLineDash([7, 10]); ctx.lineDashOffset = -dash;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) { const prev = pts[i - 1], cur = pts[i]; const mx = (prev.x + cur.x) / 2; ctx.bezierCurveTo(mx, prev.y, mx, cur.y, cur.x, cur.y); }
        ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      }
      dash = (dash + 0.8) % 1000;
      raf = requestAnimationFrame(frame);
    }
    let raf = null;
    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    window.addEventListener('resize', () => { ({ w, h, ctx } = fit(canvas)); });
    new IntersectionObserver(([e]) => { e.isIntersecting && !reduced ? start() : stop(); if (reduced) frame(); }, { threshold: 0 }).observe(canvas);
  }

  window.SS_CANVAS = { heroNetwork, ambient, flowPath };
})();
