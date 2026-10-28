// Æfing kvöldsins, taktmælir, myndbandsverkfæri, upptaka, framfarir og áminning.
// Sýnishorn: allt er geymt í þessum vafra (localStorage og IndexedDB), ekkert er sent á netþjón.
// Notar breytur úr nemandi.html: store, toast, WEEKS, selected, unlockedCount, weekStatus, renderLesson, chosenSong.

(() => {
  const $ = id => document.getElementById(id);
  const DAY_MS = 864e5;
  const pad = n => String(n).padStart(2, '0');
  const mmss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const STUTT = ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun'];
  const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  // ---------------------------------------------------------------- Hljóð
  let ctx = null;
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function click(time, accent) {
    const a = audio(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.35, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    o.connect(g).connect(a.destination); o.start(time); o.stop(time + 0.07);
  }
  function chime() {
    try {
      const a = audio(), t = a.currentTime;
      [880, 1318.5].forEach((f, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.9);
        o.connect(g).connect(a.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 1);
      });
    } catch {}
  }

  // ---------------------------------------------------------------- Taktmælir
  // Ein vél, mörg viðmót (spjald á síðunni og í æfingaham).
  const metro = {
    bpm: store.get('tsn-bpm', 70), beats: 4, on: false, next: 0, beat: 0, timer: null, views: new Set(), lastBeatAt: 0, lastBeat: 0,
    start() {
      const a = audio(); this.on = true; this.beat = 0; this.next = a.currentTime + 0.06;
      this.timer = setInterval(() => this.tick(), 25); this.render();
    },
    stop() { this.on = false; clearInterval(this.timer); this.render(); },
    toggle() { this.on ? this.stop() : this.start(); },
    set(b) { this.bpm = Math.max(30, Math.min(200, Math.round(b))); store.set('tsn-bpm', this.bpm); this.render(); },
    tick() {
      const a = audio();
      while (this.next < a.currentTime + 0.12) {
        const accent = this.beat % this.beats === 0, at = this.next, b = this.beat % this.beats;
        click(at, accent);
        setTimeout(() => this.flash(b), Math.max(0, (at - a.currentTime) * 1000));
        this.next += 60 / this.bpm; this.beat++;
      }
    },
    flash(b) { this.views.forEach(v => v.querySelectorAll('.m-dot').forEach((d, i) => d.classList.toggle('lit', i === b))); },
    render() {
      this.views.forEach(v => {
        v.querySelector('.m-bpm').textContent = this.bpm;
        v.querySelector('.m-slider').value = this.bpm;
        const t = v.querySelector('.m-toggle');
        t.textContent = this.on ? '■ Stöðva taktmæli' : '▶ Kveikja á taktmæli';
        t.classList.toggle('btn-primary', !this.on); t.classList.toggle('btn-outline', this.on);
        if (!this.on) v.querySelectorAll('.m-dot').forEach(d => d.classList.remove('lit'));
      });
    },
    mount(el) {
      el.innerHTML = `
        <div class="m-top">
          <button type="button" class="m-step" data-d="-5" aria-label="Hægja á">−</button>
          <div class="m-read"><span class="m-bpm">${this.bpm}</span><small>slög á mínútu</small></div>
          <button type="button" class="m-step" data-d="5" aria-label="Hraða">+</button>
        </div>
        <input class="m-slider" type="range" min="30" max="200" value="${this.bpm}" aria-label="Hraði taktmælis">
        <div class="m-dots" aria-hidden="true">${'<i class="m-dot"></i>'.repeat(4)}</div>
        <button type="button" class="btn btn-primary btn-sm m-toggle"></button>`;
      el.addEventListener('click', e => {
        const s = e.target.closest('.m-step'); if (s) this.set(this.bpm + +s.dataset.d);
        if (e.target.closest('.m-toggle')) this.toggle();
      });
      el.querySelector('.m-slider').addEventListener('input', e => this.set(+e.target.value));
      this.views.add(el); this.render();
    },
  };
  document.querySelectorAll('[data-metro]').forEach(el => metro.mount(el));

  // ---------------------------------------------------------------- Æfingaskrá (mínútur á dag)
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  if (!store.get('tsn-seeded', false)) {
    // Sýnishornsgögn: nokkur kvöld síðustu vikur
    const seed = {};
    [[1, 20], [2, 15], [4, 25], [6, 10], [8, 20], [9, 30], [11, 15], [13, 20], [15, 10], [16, 20]].forEach(([d, m]) => {
      seed[dayKey(new Date(today0 - d * DAY_MS))] = m;
    });
    store.set('tsn-log', seed); store.set('tsn-seeded', true);
  }
  const log = () => store.get('tsn-log', {});
  function addMinutes(min) {
    const l = log(), k = dayKey(today0);
    l[k] = (l[k] || 0) + min; store.set('tsn-log', l); renderProgress();
  }
  const monday = (() => { const d = new Date(today0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const weekDays = () => Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY_MS));

  const goalSel = $('goal');
  goalSel.value = String(store.get('tsn-goal', 4));
  goalSel.addEventListener('change', () => { store.set('tsn-goal', +goalSel.value); renderProgress(); });

  function renderProgress() {
    const l = log(), goal = +goalSel.value;
    const days = weekDays().map(d => ({ d, m: l[dayKey(d)] || 0 }));
    const nights = days.filter(x => x.m > 0).length;
    const mins = days.reduce((a, x) => a + x.m, 0);
    const max = Math.max(30, ...days.map(x => x.m));
    const todayIdx = (today0.getDay() + 6) % 7;

    $('minute-bars').innerHTML = days.map((x, i) => `
      <div class="mb${i === todayIdx ? ' today' : ''}${i > todayIdx ? ' future' : ''}">
        <span class="mb-val">${x.m ? x.m : ''}</span>
        <span class="mb-bar"><i style="height:${x.m / max * 100}%"></i></span>
        <span class="mb-day">${STUTT[i]}</span>
      </div>`).join('');
    const left = Math.max(0, goal - nights);
    $('week-sum').innerHTML = `<strong>${mins} mínútur</strong> í vikunni · ${nights} af ${goal} kvöldum` +
      (left ? `. ${left === 1 ? 'Eitt kvöld' : left + ' kvöld'} eftir í markmiðið.` : '. Markmiðinu náð, vel gert!');

    // Hringur í „Æfing kvöldsins“
    const pct = Math.min(1, nights / goal), C = 2 * Math.PI * 42;
    $('tonight-goal').innerHTML = `
      <svg viewBox="0 0 100 100" class="ring" role="img" aria-label="${nights} af ${goal} æfingakvöldum í vikunni">
        <circle cx="50" cy="50" r="42" class="ring-bg"/>
        <circle cx="50" cy="50" r="42" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
        <text x="50" y="48" class="ring-num">${nights}/${goal}</text>
        <text x="50" y="64" class="ring-lbl">kvöld</text>
      </svg>
      <div class="goal-text"><strong>${mins} mín</strong> í vikunni<br><span>${l[dayKey(today0)] ? '✓ Þú hefur æft í dag' : 'Ekki búin(n) að æfa í dag'}</span></div>`;

    // Framfarir
    const all = Object.values(l), total = all.reduce((a, b) => a + b, 0);
    const streakWeeks = (() => { // vikur í röð með a.m.k. einu æfingakvöldi
      let n = 0;
      for (let w = 0; w < 52; w++) {
        const from = monday.getTime() - w * 7 * DAY_MS;
        const any = Array.from({ length: 7 }, (_, i) => l[dayKey(new Date(from + i * DAY_MS))]).some(Boolean);
        if (any) n++; else if (w > 0) break;
      }
      return n;
    })();
    $('stats-row').innerHTML = [
      [total, 'mínútur samtals'], [all.filter(Boolean).length, 'æfingakvöld'], [streakWeeks, streakWeeks === 1 ? 'vika í röð' : 'vikur í röð'],
      [chosenSong() ? 1 : 0, chosenSong() ? 'lag valið' : 'lög kláruð'],
    ].map(([n, t]) => `<div class="stat"><strong>${n}</strong><small>${t}</small></div>`).join('');
  }
  $('log-manual').addEventListener('click', () => { addMinutes(15); toast('15 mínútum bætt við í dag.'); });

  // ---------------------------------------------------------------- Upptökur (IndexedDB)
  const db = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open('tsn-netnam', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    return {
      async add(o) { try { const d = await open(); return new Promise(r => { const t = d.transaction('rec', 'readwrite'); t.objectStore('rec').add(o); t.oncomplete = r; t.onerror = r; }); } catch {} },
      async all() { try { const d = await open(); return new Promise(r => { const q = d.transaction('rec').objectStore('rec').getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); }); } catch { return []; } },
    };
  })();

  async function renderBeforeAfter() {
    const recs = await db.all();
    const first = recs[0], last = recs.length > 1 ? recs[recs.length - 1] : null;
    const card = (r, title, fallback) => {
      if (r) {
        const url = URL.createObjectURL(r.blob);
        const media = r.blob.type.startsWith('audio') ? `<audio src="${url}" controls></audio>` : `<video src="${url}" controls playsinline></video>`;
        return `<div class="ba-card"><span class="ba-tag">${title}</span>${media}<small>${esc(r.week)} · ${fmt(new Date(r.at))}</small></div>`;
      }
      return `<div class="ba-card empty"><span class="ba-tag">${title}</span><div class="ba-ph">${fallback}</div></div>`;
    };
    $('before-after').innerHTML =
      card(first, 'Fyrsta upptakan', 'Fyrsta upptakan þín birtist hér.<br><button type="button" class="link-btn" data-open-rec>Taka upp núna</button>') +
      card(last, 'Nýjasta upptakan', first ? 'Taktu upp aftur eftir nokkrar æfingar og berðu saman.' : 'Þegar þú hefur tekið upp tvisvar sérðu muninn hér.');
  }
  $('before-after').addEventListener('click', e => { if (e.target.closest('[data-open-rec]')) openUpload(); });

  // ---------------------------------------------------------------- Senda / taka upp
  const up = $('upload');
  let stream = null, rec = null, chunks = [], blob = null, recT = null, recStart = 0;
  const showTab = tab => {
    document.querySelectorAll('[data-utab]').forEach(b => b.setAttribute('aria-selected', b.dataset.utab === tab));
    $('recorder').hidden = tab !== 'rec'; $('file-pick').hidden = tab !== 'file';
  };
  up.addEventListener('click', e => { const t = e.target.closest('[data-utab]'); if (t) showTab(t.dataset.utab); });
  function openUpload() { resetRec(); showTab('rec'); up.showModal(); }
  window.openUpload = openUpload;
  $('open-upload').addEventListener('click', openUpload);

  function stopStream() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
  function resetRec() {
    stopStream(); clearInterval(recT); blob = null; chunks = [];
    $('rec-live').hidden = false; $('rec-live').srcObject = null;
    $('rec-play').hidden = true; $('rec-play').removeAttribute('src');
    $('rec-empty').hidden = false; $('rec-dot').hidden = true; $('rec-msg').hidden = true;
    $('rec-start').hidden = false; $('rec-stop').hidden = true; $('rec-again').hidden = true;
  }
  $('rec-start').addEventListener('click', async () => {
    const audioOnly = $('rec-audio').checked;
    try {
      stream = await navigator.mediaDevices.getUserMedia(audioOnly ? { audio: true } : { audio: true, video: { facingMode: 'user', width: { ideal: 1280 } } });
    } catch {
      const m = $('rec-msg'); m.hidden = false;
      m.textContent = 'Náði ekki í myndavél eða hljóðnema. Leyfðu aðgang í vafranum, eða veldu „Velja skrá“ og sendu upptöku úr símanum.';
      return;
    }
    const live = $('rec-live'); live.srcObject = stream; live.play().catch(() => {});
    $('rec-empty').hidden = !audioOnly; if (audioOnly) $('rec-empty').textContent = 'Tek upp hljóð…';
    chunks = []; rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      blob = new Blob(chunks, { type: rec.mimeType || (audioOnly ? 'audio/webm' : 'video/webm') });
      stopStream(); clearInterval(recT);
      const pl = $('rec-play'); pl.src = URL.createObjectURL(blob); pl.hidden = false;
      $('rec-live').hidden = true; $('rec-empty').hidden = true; $('rec-dot').hidden = true;
      $('rec-stop').hidden = true; $('rec-again').hidden = false;
    };
    rec.start(); recStart = Date.now();
    $('rec-dot').hidden = false; $('rec-time').textContent = '0:00';
    recT = setInterval(() => { $('rec-time').textContent = mmss((Date.now() - recStart) / 1000); }, 250);
    $('rec-start').hidden = true; $('rec-stop').hidden = false;
  });
  $('rec-stop').addEventListener('click', () => rec && rec.state !== 'inactive' && rec.stop());
  $('rec-again').addEventListener('click', () => { resetRec(); $('rec-start').click(); });
  $('rec-file').addEventListener('change', e => { blob = e.target.files[0] || null; });

  up.addEventListener('close', async () => {
    if (rec && rec.state === 'recording') rec.stop();
    if (up.returnValue === 'send') {
      if (blob) {
        await db.add({ at: Date.now(), week: $('upload-week').value, blob });
        renderBeforeAfter();
      }
      toast(blob ? 'Upptakan er send til kennarans.' : 'Sýnishorn: veldu eða taktu upp upptöku til að senda.');
    }
    resetRec(); $('upload-form').reset(); up.returnValue = '';
  });

  // ---------------------------------------------------------------- Kennslumyndband: hraði, bútar, kaflar
  const vid = $('lesson-video');
  const CHAPTERS = [[0, 'Upphitun'], [10, 'Hægri hönd'], [20, 'Vinstri hönd bætist við'], [30, 'Báðar hendur saman']];
  let A = null, B = null, looping = false;
  const syncVT = () => {
    $('vt-toggle').textContent = vid.paused ? '▶' : '❚❚';
    $('vt-time').textContent = `${mmss(vid.currentTime)} / ${mmss(vid.duration || 0)}`;
    $('v-play').classList.toggle('gone', !vid.paused || vid.currentTime > 0);
    const cur = CHAPTERS.reduce((a, c, i) => vid.currentTime >= c[0] ? i : a, 0);
    document.querySelectorAll('#chapters li').forEach((li, i) => li.classList.toggle('cur', i === cur));
  };
  $('chapters').innerHTML = CHAPTERS.map(([t, n]) => `<li><button type="button" data-t="${t}"><span>${mmss(t)}</span>${n}</button></li>`).join('');
  $('chapters').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { vid.currentTime = +b.dataset.t; vid.play(); } });
  const playPause = () => vid.paused ? vid.play() : vid.pause();
  $('v-play').addEventListener('click', playPause);
  $('vt-toggle').addEventListener('click', playPause);
  vid.addEventListener('click', playPause);
  ['play', 'pause', 'timeupdate', 'loadedmetadata', 'seeked'].forEach(ev => vid.addEventListener(ev, syncVT));
  document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    vid.playbackRate = +b.dataset.speed;
    document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b));
  }));
  const loopHint = () => {
    $('vt-a').textContent = A === null ? 'A' : `A ${mmss(A)}`;
    $('vt-b').textContent = B === null ? 'B' : `B ${mmss(B)}`;
    $('vt-loop').setAttribute('aria-pressed', looping); $('vt-loop').classList.toggle('on', looping);
  };
  $('vt-a').addEventListener('click', () => { A = vid.currentTime; if (B !== null && B <= A) B = null; loopHint(); });
  $('vt-b').addEventListener('click', () => { B = vid.currentTime; if (A === null || A >= B) A = Math.max(0, B - 5); loopHint(); });
  $('vt-loop').addEventListener('click', () => {
    if (A === null || B === null) { toast('Ýttu fyrst á A við upphaf og B við lok bútsins.'); return; }
    looping = !looping; loopHint(); if (looping) { vid.currentTime = A; vid.play(); }
  });
  vid.addEventListener('timeupdate', () => { if (looping && B !== null && vid.currentTime >= B) vid.currentTime = A; });
  loopHint();

  // Myndbandið fylgir völdu vikunni: hulið ef vikan er læst eða lag ekki valið
  const baseRender = renderLesson;
  renderLesson = function () {
    baseRender();
    const w = WEEKS[selected], st = weekStatus(selected);
    const hide = st === 'locked' || (!!w.song && !chosenSong());
    $('v-frame').classList.toggle('veil', hide);
    $('v-tools').hidden = hide;
    if (hide) vid.pause();
  };
  renderLesson();

  // ---------------------------------------------------------------- Æfing kvöldsins
  const strip = t => t.replace(/^\d+\s*mín:\s*/, '');
  function buildSession(min) {
    const w = WEEKS[Math.min(selected, unlockedCount - 1)];
    const plan = w.plan.filter(p => !/^Taka upp/.test(p)).map(strip);
    const tech = plan.slice(0, 3);
    const warm = { title: 'Upphitun', min: 2, bpm: 60, chapter: 0,
      text: 'Hristu hendurnar, slakaðu á öxlunum og spilaðu fimm fingra æfinguna upp og niður, fyrst með hægri og svo vinstri hendi.' };
    const t = (title, m, bpm, ch) => ({ title, min: m, bpm, chapter: ch,
      text: 'Spilaðu hægt og jafnt. Ef þú gerir mistök skaltu hægja á taktmælinum frekar en að flýta þér. Horfðu á bútinn úr myndbandinu ef þú ert óviss.' });
    const play = (m, record) => ({ title: record ? 'Spila í gegn og taka upp' : 'Spila í gegn', min: m, record,
      text: record ? 'Spilaðu einu sinni í gegn eins og á tónleikum. Ekki stoppa þótt eitthvað klikki. Taktu upp ef þú vilt senda kennaranum.'
                   : 'Spilaðu allt sem þú æfðir í kvöld í einni lotu, án þess að stoppa.' });
    if (min === 10) return [{ ...warm, min: 2 }, t(tech[1] || tech[0], 4, 60, 1), t(tech[2] || tech[0], 4, 66, 3)];
    if (min === 20) return [{ ...warm, min: 3 }, t(tech[0], 5, 60, 1), t(tech[1] || tech[0], 5, 66, 2), t(tech[2] || tech[0], 5, 72, 3), play(2, true)];
    return [{ ...warm, min: 4 }, t(tech[0], 6, 60, 1), t(tech[1] || tech[0], 7, 66, 2), t(tech[2] || tech[0], 8, 72, 3), play(3, false), play(2, true)];
  }

  const pr = document.createElement('dialog');
  pr.id = 'practice'; pr.className = 'practice';
  pr.innerHTML = `
    <div class="pr-wrap">
      <header class="pr-head">
        <div><span class="pr-eyebrow" id="pr-eyebrow"></span><div class="pr-dots" id="pr-dots"></div></div>
        <button type="button" class="pr-close" id="pr-close" aria-label="Loka æfingu">✕</button>
      </header>
      <div class="pr-body" id="pr-body"></div>
    </div>`;
  document.body.appendChild(pr);

  let S = null; // núverandi æfing
  let wake = null;
  const lockScreen = async () => { try { wake = await navigator.wakeLock.request('screen'); } catch {} };

  function startSession(min) {
    S = { min, steps: buildSession(min), i: 0, left: 0, paused: false, used: 0, last: Date.now(), done: false, timer: null };
    S.left = S.steps[0].min * 60;
    pr.showModal(); lockScreen(); renderStep();
    S.timer = setInterval(tickSession, 250);
  }
  function tickSession() {
    if (!S || S.done) return;
    const now = Date.now(), dt = (now - S.last) / 1000; S.last = now;
    if (S.paused) return;
    S.used += dt; S.left -= dt;
    if (S.left <= 0) { chime(); next(); return; }
    updateClock();
  }
  function updateClock() {
    const st = S.steps[S.i], total = st.min * 60, C = 2 * Math.PI * 54;
    const el = $('pr-clock'); if (!el) return;
    el.textContent = mmss(Math.max(0, Math.ceil(S.left)));
    $('pr-ring').setAttribute('stroke-dashoffset', C * (1 - Math.max(0, S.left) / total));
  }
  function next() {
    if (S.i < S.steps.length - 1) { S.i++; S.left = S.steps[S.i].min * 60; renderStep(); }
    else finish();
  }
  function prev() { if (S.i > 0) { S.i--; S.left = S.steps[S.i].min * 60; renderStep(); } }

  function renderStep() {
    const st = S.steps[S.i], C = 2 * Math.PI * 54;
    $('pr-eyebrow').textContent = `Æfing kvöldsins · ${S.min} mín · Skref ${S.i + 1} af ${S.steps.length}`;
    $('pr-dots').innerHTML = S.steps.map((x, i) => `<i class="${i < S.i ? 'done' : i === S.i ? 'cur' : ''}"></i>`).join('');
    if (st.bpm) metro.set(st.bpm);
    const ch = st.chapter !== undefined ? CHAPTERS[st.chapter] : null;
    $('pr-body').innerHTML = `
      <div class="pr-step">
        <h2>${esc(st.title)}</h2>
        <p>${esc(st.text)}</p>
        <div class="pr-timer">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="pr-ring-bg"/><circle id="pr-ring" cx="60" cy="60" r="54" class="pr-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <span id="pr-clock" class="pr-clock">${mmss(S.left)}</span>
        </div>
        <div class="pr-controls">
          <button type="button" class="pr-btn" id="pr-prev" ${S.i === 0 ? 'disabled' : ''} aria-label="Fyrra skref">⏮</button>
          <button type="button" class="pr-btn big" id="pr-pause" aria-label="${S.paused ? 'Halda áfram' : 'Pása'}">${S.paused ? '▶' : '❚❚'}</button>
          <button type="button" class="pr-btn" id="pr-next" aria-label="Næsta skref">⏭</button>
        </div>
      </div>
      <div class="pr-side">
        ${st.bpm ? `<div class="pr-card"><h3>Taktmælir</h3><p class="muted">Tillaga: ${st.bpm} slög. Hraðaðu bara þegar þetta er orðið auðvelt.</p><div class="metro dark" id="pr-metro"></div></div>` : ''}
        ${ch ? `<div class="pr-card"><h3>Bútur úr myndbandinu</h3><p class="muted">${esc(ch[1])}, á 75% hraða, endurtekið.</p><video id="pr-video" src="media/demo-lota.mp4" playsinline muted preload="metadata"></video><button type="button" class="btn btn-outline btn-sm" id="pr-vplay">▶ Spila bútinn</button></div>` : ''}
        ${st.record ? `<div class="pr-card"><h3>Upptaka</h3><p class="muted">Þú getur tekið upp beint hér og sent kennaranum.</p><button type="button" class="btn btn-primary btn-sm" id="pr-rec">● Taka upp</button></div>` : ''}
      </div>`;
    const mEl = $('pr-metro');
    if (mEl) { metro.views.forEach(v => { if (!document.body.contains(v)) metro.views.delete(v); }); metro.mount(mEl); }
    const pv = $('pr-video');
    if (pv && ch) {
      const from = ch[0], to = ch[0] + 10;
      pv.addEventListener('loadedmetadata', () => { pv.currentTime = from; pv.playbackRate = 0.75; });
      pv.addEventListener('timeupdate', () => { if (pv.currentTime >= to) pv.currentTime = from; });
      $('pr-vplay').addEventListener('click', () => {
        pv.muted = false; pv.playbackRate = 0.75;
        if (pv.paused) { pv.play(); $('pr-vplay').textContent = '❚❚ Stöðva bútinn'; } else { pv.pause(); $('pr-vplay').textContent = '▶ Spila bútinn'; }
      });
    }
    $('pr-prev').onclick = prev; $('pr-next').onclick = () => { chime(); next(); };
    $('pr-pause').onclick = () => { S.paused = !S.paused; renderStep(); };
    const r = $('pr-rec'); if (r) r.onclick = () => { S.paused = true; renderStep(); openUpload(); };
    updateClock();
  }

  function finish() {
    S.done = true; clearInterval(S.timer); metro.stop(); chime();
    const m = Math.max(1, Math.round(S.used / 60)); addMinutes(m);
    $('pr-eyebrow').textContent = `Æfing kvöldsins · ${S.min} mín`;
    $('pr-dots').innerHTML = S.steps.map(() => '<i class="done"></i>').join('');
    const nights = weekDays().filter(d => log()[dayKey(d)]).length, goal = +goalSel.value;
    $('pr-body').innerHTML = `
      <div class="pr-step pr-done">
        <div class="pr-badge">✓</div>
        <h2>Vel gert!</h2>
        <p>${m} ${m === 1 ? 'mínúta skráð' : 'mínútur skráðar'} í dagbókina. Þetta er kvöld ${nights} af ${goal} í vikunni${nights >= goal ? ', og markmiðinu er náð!' : '.'}</p>
        <div class="pr-controls">
          <button type="button" class="btn btn-primary" id="pr-rec2">● Taka upp og senda kennara</button>
          <button type="button" class="btn btn-outline" id="pr-end">Loka</button>
        </div>
      </div>`;
    $('pr-rec2').onclick = () => { closeSession(true); openUpload(); };
    $('pr-end').onclick = () => closeSession(true);
  }
  function closeSession(silent) {
    if (!S) return;
    clearInterval(S.timer); metro.stop();
    if (!S.done && S.used >= 60) { const m = Math.round(S.used / 60); addMinutes(m); toast(`${m} mín skráðar í dagbókina.`); }
    else if (!S.done && !silent) toast('Æfingu hætt. Það er allt í lagi, næst er nýtt kvöld.');
    S = null; try { wake && wake.release(); } catch {}
    pr.close();
  }
  $('pr-close').addEventListener('click', () => closeSession(false));
  pr.addEventListener('cancel', e => { e.preventDefault(); closeSession(false); });

  document.querySelectorAll('.time-pick').forEach(b => b.addEventListener('click', () => startSession(+b.dataset.min)));
  $('tonight-sub').textContent = `Við setjum saman æfingu úr viku ${Math.min(selected, unlockedCount - 1) + 1}: ${WEEKS[Math.min(selected, unlockedCount - 1)].title.toLowerCase()}. Þú fylgir bara skrefunum, með tímamæli og taktmæli.`;

  // ---------------------------------------------------------------- Áminning (.ics í dagatal)
  const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  let rdays = store.get('tsn-remind-days', [1, 3]);
  $('remind-time').value = store.get('tsn-remind-time', '20:30');
  const renderDays = () => {
    $('remind-days').innerHTML = STUTT.map((d, i) =>
      `<button type="button" class="day-chip" aria-pressed="${rdays.includes(i)}" data-rd="${i}">${d}</button>`).join('');
  };
  $('remind-days').addEventListener('click', e => {
    const b = e.target.closest('[data-rd]'); if (!b) return;
    const i = +b.dataset.rd; rdays = rdays.includes(i) ? rdays.filter(x => x !== i) : [...rdays, i].sort();
    store.set('tsn-remind-days', rdays); renderDays();
  });
  $('remind-time').addEventListener('change', e => store.set('tsn-remind-time', e.target.value));
  $('remind-add').addEventListener('click', () => {
    if (!rdays.length) { toast('Veldu a.m.k. einn dag.'); return; }
    const [h, m] = ($('remind-time').value || '20:30').split(':').map(Number);
    const first = new Date(today0);
    while (!rdays.includes((first.getDay() + 6) % 7)) first.setDate(first.getDate() + 1);
    first.setHours(h, m, 0, 0);
    const end = new Date(first.getTime() + 20 * 60000);
    const local = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const url = location.href.split('#')[0] + '#kvold';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tonsmidja Sudurlands//Netnam//IS', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:tsn-aefing-${Date.now()}@tonsmidjan`, `DTSTAMP:${local(new Date())}`,
      `DTSTART:${local(first)}`, `DTEND:${local(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${rdays.map(i => BYDAY[i]).join(',')}`,
      'SUMMARY:Æfing kvöldsins – Tónsmiðjan',
      `DESCRIPTION:Bara 10–20 mínútur. Opnaðu æfingu kvöldsins: ${url}`,
      `URL:${url}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Æfing kvöldsins', 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'aefing-kvoldsins.ics'; document.body.appendChild(a); a.click(); a.remove();
    toast('Opnaðu skrána til að bæta áminningunni í dagatalið þitt.');
  });
  renderDays();

  renderProgress(); renderBeforeAfter();
})();
