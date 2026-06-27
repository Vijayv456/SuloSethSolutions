/* ===================================================================
   SuloSethuSolution — UI interactions (content is server-rendered)
   =================================================================== */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Counters ---------- */
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = target.toLocaleString() + suffix; return; }
    const dur = 1800, start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString() + suffix;
    })(start);
  }

  /* ---------- Reveal + counters ---------- */
  function observeReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(runCounter);
        if (e.target.matches('[data-count]')) runCounter(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
  }

  /* ---------- Timeline progress fill ---------- */
  function timelineProgress() {
    $$('.timeline').forEach(tl => {
      const bar = $('.timeline-progress', tl);
      if (!bar) return;
      const update = () => {
        const r = tl.getBoundingClientRect();
        const passed = Math.min(Math.max(window.innerHeight * 0.6 - r.top, 0), r.height);
        bar.style.height = (passed / r.height * 100) + '%';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------- Carousels (stories + reviews), auto + manual ---------- */
  function carousels() {
    $$('[data-carousel]').forEach(wrap => {
      const track = $('.stories-track', wrap);
      if (!track) return;
      const step = () => Math.min(360, (track.querySelector('.story-card')?.offsetWidth || 340) + 22);
      const next = $('[data-next]', wrap), prev = $('[data-prev]', wrap);
      next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
      prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      if (reduced) return;
      let timer = setInterval(auto, 2200);
      function auto() {
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) track.scrollTo({ left: 0, behavior: 'smooth' });
        else track.scrollBy({ left: step(), behavior: 'smooth' });
      }
      track.addEventListener('mouseenter', () => clearInterval(timer));
      track.addEventListener('mouseleave', () => timer = setInterval(auto, 2200));
    });
  }

  /* ---------- Marquee: clone track for seamless loop ---------- */
  function marquees() {
    $$('.marquee-track').forEach(t => { t.innerHTML = t.innerHTML + t.innerHTML; });
  }

  /* ---------- Accordion ---------- */
  function accordions() {
    $$('.acc-q').forEach(q => q.addEventListener('click', () => {
      const item = q.closest('.acc-item');
      const ans = $('.acc-a', item);
      const open = item.classList.toggle('open');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : 0;
    }));
  }

  /* ---------- Roadmap tabs ---------- */
  function roadmapTabs() {
    const tabsWrap = $('.rm-tabs');
    if (!tabsWrap) return;
    const panels = $$('[data-roadmap]');
    $$('.rm-tab', tabsWrap).forEach(tab => tab.addEventListener('click', () => {
      $$('.rm-tab', tabsWrap).forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => p.hidden = p.dataset.roadmap !== tab.dataset.track);
    }));
  }

  /* ---------- Hero code typing effect ---------- */
  function typeCode() {
    const el = $('[data-type]');
    if (!el) return;
    const lines = JSON.parse(el.dataset.type || '[]');
    if (reduced) { el.innerHTML = lines.map(highlight).join('\n') + '<span class="code-caret">&nbsp;</span>'; return; }
    let li = 0, ci = 0, html = '';
    function tick() {
      if (li >= lines.length) { el.innerHTML = html + '<span class="code-caret">&nbsp;</span>'; return; }
      const line = lines[li];
      ci++;
      const shown = lines.slice(0, li).map(highlight).join('\n') + (li ? '\n' : '') + escapeHtml(line.slice(0, ci));
      el.innerHTML = shown + '<span class="code-caret">&nbsp;</span>';
      if (ci >= line.length) { html = lines.slice(0, li + 1).map(highlight).join('\n'); li++; ci = 0; setTimeout(tick, 180); }
      else setTimeout(tick, 26);
    }
    tick();
  }
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // Single-quoted class attributes so the string-matching pass below never
  // re-matches the quotes we inject.
  function highlight(line) {
    let s = escapeHtml(line);
    s = s.replace(/("[^"]*")/g, "<span class='c-str'>$1</span>");
    s = s.replace(/\b(def|return|import|for|in|if|else)\b/g, "<span class='c-key'>$1</span>");
    s = s.replace(/\b(True|False|None)\b/g, "<span class='c-bool'>$1</span>");
    s = s.replace(/\b(build_solution|build_network|launch_career|train|mentor|connect|print)\b/g, "<span class='c-fn'>$1</span>");
    return s;
  }

  /* ---------- Navbar ---------- */
  function nav() {
    const n = $('.site-nav');
    if (!n) return;
    const onScroll = () => n.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $$('#navMenu .nav-link, #navMenu .btn').forEach(a => a.addEventListener('click', () => {
      const c = $('#navMenu');
      if (c && c.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(c).hide();
    }));
  }

  /* ---------- Hero parallax ---------- */
  function parallax() {
    const layer = $('[data-parallax]');
    const hero = $('.hero');
    if (!layer || !hero || reduced) return;
    hero.addEventListener('mousemove', e => {
      const dx = (e.clientX - innerWidth / 2) / (innerWidth / 2), dy = (e.clientY - innerHeight / 2) / (innerHeight / 2);
      layer.style.transform = `translate(${dx * 14}px, ${dy * 14}px)`;
    });
    hero.addEventListener('mouseleave', () => layer.style.transform = '');
  }

  /* ---------- Custom cursor ---------- */
  function cursor() {
    if (matchMedia('(hover: none)').matches) return;
    const dot = $('.cursor-dot'), ring = $('.cursor-ring');
    if (!dot || !ring) return;
    let rx = 0, ry = 0, x = 0, y = 0;
    document.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; });
    (function loop() { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    $$('a, button, .svc-card, .why-card, .flow-step, .prog-card, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  }

  /* ---------- GSAP polish ---------- */
  function gsapPolish() {
    if (reduced || !window.gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero-left .reveal', { y: 30, opacity: 0, duration: 0.9, stagger: 0.12, delay: 0.2, ease: 'power3.out' });
    gsap.from('.hero-visual', { y: 40, opacity: 0, scale: 0.96, duration: 1, delay: 0.4, ease: 'power3.out' });
  }

  /* ---------- AJAX forms ---------- */
  function ajaxForms() {
    $$('form[data-ajax]').forEach(form => {
      const note = $('.form-note', form);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const btn = form.querySelector('[type=submit]');
        const orig = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        try {
          const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' } });
          const data = await res.json();
          if (note) { note.className = 'form-note ' + (data.ok ? 'ok' : 'err'); note.textContent = data.message; }
          if (data.ok) form.reset();
        } catch (err) {
          if (note) { note.className = 'form-note err'; note.textContent = 'Something went wrong. Please try again.'; }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = orig; }
        }
      });
    });
  }

  /* ---------- Dark / Light mode toggle (nav button) ---------- */
  function currentMode() { try { return localStorage.getItem('ss-mode') || 'dark'; } catch (e) { return 'dark'; } }
  function applyMode(mode) {
    if (mode === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('ss-mode', mode); } catch (e) {}
    $$('.mode-toggle').forEach(b => {
      const dark = mode !== 'light';
      b.innerHTML = `<i class="fa-solid ${dark ? 'fa-sun' : 'fa-moon'}"></i>`;
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    window.dispatchEvent(new Event('ss-theme')); // canvas re-reads palette
  }
  function modeToggle() {
    applyMode(currentMode());
    $$('.mode-toggle').forEach(b => b.addEventListener('click', () => {
      applyMode(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    }));
  }

  /* ---------- Interactive code tabs ---------- */
  function codeTabs() {
    $$('[data-code-tabs]').forEach(win => {
      // syntax-highlight each panel's code
      $$('.ct-code code', win).forEach(c => { c.innerHTML = c.textContent.split('\n').map(highlight).join('\n'); });
      const tabs = $$('.ct-tab', win), panels = $$('.ct-panel', win);
      tabs.forEach(tab => tab.addEventListener('click', () => {
        const id = tab.dataset.tab;
        tabs.forEach(t => { const on = t === tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
      }));
    });
  }

  /* ---------- Technologies circular ring: spin while in view ---------- */
  function techRing() {
    const ring = $('#techRing');
    if (!ring || reduced) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => ring.classList.toggle('spin', e.isIntersecting));
    }, { threshold: 0.2 });
    io.observe(ring);
  }

  /* ---------- Loader ---------- */
  function loader() {
    const l = $('#loader');
    if (!l) return;
    const hide = () => { l.classList.add('hide'); setTimeout(() => l.remove(), 800); };
    window.addEventListener('load', () => setTimeout(hide, 500));
    setTimeout(hide, 3500);
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    observeReveals(); timelineProgress(); carousels(); marquees(); accordions();
    roadmapTabs(); typeCode(); nav(); parallax(); cursor(); gsapPolish();
    ajaxForms(); modeToggle(); techRing(); codeTabs(); loader();
    $$('.hero-trust [data-count]').forEach(runCounter);
    if (window.SS_CANVAS) { SS_CANVAS.ambient(); SS_CANVAS.heroNetwork(); SS_CANVAS.flowPath(); }
  });
})();
