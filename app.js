(() => {
  const F = window.FEST;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  const code = (params.get('g') || '').trim();
  const demo = !F.api || params.has('demo');

  // ---- Statisk indhold fra config ----
  $('#navn').textContent = F.navn;
  $('#alder').textContent = F.alder;
  $('#timeline').innerHTML = F.program.map((p) => `<li><b>${esc(p.tid)}</b>${esc(p.tekst)}</li>`).join('');
  $('#slut').textContent = `Festen slutter ${F.slut}.`;
  $('#facts').innerHTML = F.praktisk.map((p) => `<div><dt>${esc(p.titel)}</dt><dd>${esc(p.tekst)}</dd></div>`).join('');
  const frist = new Date(F.svarFrist + 'T12:00:00');
  $('#frist').textContent = `Svar gerne senest ${frist.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}. Du kan altid ændre dit svar via samme link.`;

  // Lyskæde
  const bulbs = $('.garland .bulbs');
  for (let i = 1; i < 16; i++) {
    const x = i * 25, t = (x % 200) / 200;
    const y = 4 + 32 * 4 * t * (1 - t) * 0.5 + 2;
    bulbs.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y.toFixed(1)}" r="3" style="animation-delay:${(i % 5) * 0.6}s"/>`);
  }

  // ---- Nedtælling ----
  const start = new Date(F.start);
  function tick() {
    const ms = start - Date.now();
    if (ms <= 0) { $('#countdown').innerHTML = '<div><b>Nu!</b><span>Skål</span></div>'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    $('#countdown').innerHTML = [[d, 'dage'], [h, 'timer'], [m, 'min']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  }
  tick(); setInterval(tick, 30000);

  // ---- RSVP ----
  const form = $('#rsvp');
  const state = $('#rsvp-state');
  const show = (html, cls = '') => { state.className = 'notice ' + cls; state.innerHTML = html; state.hidden = false; };

  // To adskilte backends: Jonas' ark (svar, kost, hilsen) og toastmasterens ark (taler/indslag),
  // så Jonas aldrig ser indslagene.
  const toastOn = demo || !!F.toastApi;
  if (!toastOn) $('#toast-felt').hidden = true;
  $('#toast-note').textContent = `Går kun til ${F.toastmaster} – Jonas ser det ikke.`;

  async function api(which, method, body) {
    const url = which === 'toast' ? F.toastApi : F.api;
    if (demo) {
      const key = which === 'toast' ? 'fest40-demo-toast' : 'fest40-demo';
      await new Promise((r) => setTimeout(r, 300));
      let gemt = null;
      try { gemt = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
      if (method === 'POST') { try { localStorage.setItem(key, JSON.stringify(body)); } catch {} return { ok: true }; }
      if (key === 'fest40-demo-toast') return { ok: true, indslag: !!gemt?.indslag, indslagTekst: gemt?.indslagTekst || '' };
      return { ok: true, guest: { navn: 'Mette og Lars', max: 2, svar: gemt }, info: { adresse: '(adressen vises her for inviterede)', stedinfo: 'Demotilstand – intet bliver gemt online.' } };
    }
    const res = method === 'GET'
      ? await fetch(`${url}?g=${encodeURIComponent(code)}`)
      // text/plain undgår CORS-preflight, som Apps Script ikke svarer på
      : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ g: code, ...body }) });
    return res.json();
  }
  let gaestNavn = '';

  function syncClasses() {
    const k = form.kommer.value;
    form.classList.toggle('yes', k === 'ja');
    form.classList.toggle('speech', k === 'ja' && form.indslag.checked);
  }
  form.addEventListener('change', syncClasses);

  function fill(guest, toast) {
    gaestNavn = guest.navn;
    $('#gaest').textContent = `Kære ${guest.navn}`;
    $('#antal').innerHTML = Array.from({ length: guest.max }, (_, i) => `<option value="${i + 1}">${i + 1} ${i ? 'personer' : 'person'}</option>`).join('');
    const s = guest.svar;
    if (s) {
      form.querySelector(`input[name=kommer][value="${s.kommer}"]`)?.click();
      form.antal.value = s.antal || 1;
      form.kost.value = s.kost || '';
      form.besked.value = s.besked || '';
    } else {
      form.antal.value = guest.max;
    }
    if (toast?.ok) {
      form.indslag.checked = !!toast.indslag;
      form.indslagTekst.value = toast.indslagTekst || '';
    }
    syncClasses();
  }

  function receipt(s) {
    return s.kommer === 'ja'
      ? `<strong>Tak – vi glæder os til at se ${s.antal > 1 ? `jer (${s.antal} personer)` : 'dig'}!</strong><br>Du kan rette dit svar herunder.`
      : '<strong>Tak for svaret.</strong> Ærgerligt – vi skåler for dig.<br>Du kan rette dit svar herunder.';
  }

  async function load() {
    if (!code && !demo) {
      show('Brug det personlige link fra din invitation for at svare.');
      $('#cta').textContent = 'Se programmet'; $('#cta').href = '#program';
      return;
    }
    try {
      const [r, toast] = await Promise.all([
        api('fest', 'GET'),
        toastOn ? api('toast', 'GET').catch(() => null) : null,
      ]);
      if (!r.ok) { show('Linket er ikke gyldigt. Tjek at du har kopieret hele linket fra invitationen.', 'err'); return; }
      fill(r.guest, toast);
      if (r.info?.adresse) {
        $('#adresse').textContent = r.info.adresse;
        $('#stedinfo').textContent = r.info.stedinfo || '';
        $('#sted').hidden = false;
      }
      if (r.guest.svar) show(receipt(r.guest.svar), 'ok'); else state.hidden = true;
      if (demo) show((r.guest.svar ? receipt(r.guest.svar) + '<br>' : '') + '<em>Demotilstand – ingen API-adresse sat i config.js.</em>', r.guest.svar ? 'ok' : '');
      form.hidden = false;
    } catch (e) {
      show('Kunne ikke hente din invitation lige nu. Prøv igen om lidt.', 'err');
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!form.kommer.value) { show('Vælg ja eller nej først.', 'err'); return; }
    const kommer = form.kommer.value === 'ja';
    const body = {
      kommer: form.kommer.value,
      antal: kommer ? Number(form.antal.value) : 0,
      kost: kommer ? form.kost.value.trim() : '',
      besked: form.besked.value.trim(),
    };
    const indslag = kommer && form.indslag.checked;
    const toastBody = { navn: gaestNavn, indslag, indslagTekst: indslag ? form.indslagTekst.value.trim() : '' };
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Sender …';
    try {
      const r = await api('fest', 'POST', body);
      if (!r.ok) throw new Error(r.error || 'fejl');
      let toastFejl = false;
      if (toastOn) {
        try { toastFejl = !(await api('toast', 'POST', toastBody)).ok; } catch { toastFejl = true; }
      }
      show(receipt(body) + (toastFejl
        ? `<br><span style="color:var(--err)">Dit indslag nåede ikke frem til ${esc(F.toastmaster)} – send svaret igen eller skriv direkte til ${esc(F.toastmaster)}.</span>`
        : ''), 'ok');
      state.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      show('Svaret blev ikke gemt – prøv igen. Fortsætter det, så skriv direkte til Jonas.', 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Send svar';
    }
  });

  load();
})();
