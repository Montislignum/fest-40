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
  const facts = (baby) => {
    $('#facts').innerHTML = F.praktisk.map((p) => `<div><dt>${esc(p.titel)}</dt><dd>${esc(baby && p.baby ? p.baby : p.tekst)}</dd></div>`).join('');
  };
  facts(false);
  const frist = new Date(F.svarFrist + 'T12:00:00');
  $('#frist').textContent = `Senest ${frist.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}`;

  // Lyskæde
  const bulbs = $('.garland .bulbs');
  for (let i = 1; i < 16; i++) {
    const x = i * 25, t = (x % 200) / 200;
    bulbs.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${(6 + 64 * t * (1 - t)).toFixed(1)}" r="3"/>`);
  }

  if (!code && !demo) return; // uden personligt link: kun program og praktisk

  // ---- RSVP ----
  // To adskilte backends: Jonas' ark (svar) og toastmasterens ark (taler/indslag),
  // så Jonas aldrig ser indslagene.
  const form = $('#rsvp');
  const btn = form.querySelector('button');
  const fejl = (txt) => { $('#fejl').textContent = txt; $('#fejl').hidden = !txt; };
  const toastOn = demo || !!F.toastApi;
  if (!toastOn) $('#toast-felt').hidden = true;
  $('#indslag-tekst').placeholder = `Kort til ${F.toastmaster}`;

  async function api(which, method, body) {
    const url = which === 'toast' ? F.toastApi : F.api;
    if (demo) {
      const key = which === 'toast' ? 'fest40-demo-toast' : 'fest40-demo';
      await new Promise((r) => setTimeout(r, 300));
      let gemt = null;
      try { gemt = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
      if (method === 'POST') { try { localStorage.setItem(key, JSON.stringify(body)); } catch {} return { ok: true }; }
      if (which === 'toast') return { ok: true, indslag: !!gemt?.indslag, indslagTekst: gemt?.indslagTekst || '' };
      return { ok: true, guest: { navn: 'Mette og Lars', max: 2, baby: params.has('baby'), svar: gemt }, info: { adresse: 'Havevej 1', stedinfo: '' } };
    }
    const res = method === 'GET'
      ? await fetch(`${url}?g=${encodeURIComponent(code)}`)
      // text/plain undgår CORS-preflight, som Apps Script ikke svarer på
      : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ g: code, ...body }) });
    return res.json();
  }

  // Knappen er feedback: "Gemt" når formularen svarer til det gemte, ellers "Send"
  function gemt(ja) {
    btn.disabled = ja;
    btn.textContent = ja ? 'Gemt' : 'Send';
    $('#frist').hidden = ja;
  }

  function sync() {
    const k = form.kommer.value;
    form.classList.toggle('yes', k === 'ja');
    form.classList.toggle('speech', k === 'ja' && form.indslag.checked);
  }
  form.addEventListener('change', () => { sync(); gemt(false); fejl(''); });
  form.addEventListener('input', () => { gemt(false); fejl(''); });

  let gaestNavn = '';
  function fill(guest, toast) {
    gaestNavn = guest.navn;
    facts(!!guest.baby);
    $('#spoerg').textContent = `Kommer ${guest.max > 1 ? 'I' : 'du'}, ${guest.navn}?`;
    $('#antal').innerHTML = Array.from({ length: guest.max }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    $('#antal-felt').hidden = guest.max < 2;
    const s = guest.svar;
    if (s) {
      form.querySelector(`input[name=kommer][value="${s.kommer}"]`).checked = true;
      form.antal.value = s.antal || 1;
    } else {
      form.antal.value = guest.max;
    }
    if (toast?.ok) {
      form.indslag.checked = !!toast.indslag;
      form.indslagTekst.value = toast.indslagTekst || '';
    }
    sync();
    gemt(!!s);
  }

  async function load() {
    $('#svar').hidden = false;
    try {
      const [r, toast] = await Promise.all([
        api('fest', 'GET'),
        toastOn ? api('toast', 'GET').catch(() => null) : null,
      ]);
      if (!r.ok) { $('#spoerg').hidden = true; fejl('Linket virker ikke – tjek at hele linket er kopieret.'); return; }
      fill(r.guest, toast);
      if (r.info?.adresse) {
        $('#adresse').textContent = r.info.adresse;
        $('#stedinfo').textContent = r.info.stedinfo || '';
        $('#sted').hidden = false;
      }
      form.hidden = false;
      $('#cta').hidden = false;
    } catch (e) {
      fejl('Kunne ikke hente invitationen. Prøv igen om lidt.');
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!form.kommer.value) return;
    const kommer = form.kommer.value === 'ja';
    const body = { kommer: form.kommer.value, antal: kommer ? Number(form.antal.value) : 0, kost: '', besked: '' };
    const indslag = kommer && form.indslag.checked;
    const toastBody = { navn: gaestNavn, indslag, indslagTekst: indslag ? form.indslagTekst.value.trim() : '' };
    btn.disabled = true; btn.textContent = 'Sender …';
    try {
      const r = await api('fest', 'POST', body);
      if (!r.ok) throw new Error(r.error || 'fejl');
      if (toastOn && !(await api('toast', 'POST', toastBody).catch(() => ({}))).ok) {
        gemt(false);
        fejl(`Indslaget nåede ikke frem til ${F.toastmaster}. Prøv igen.`);
        return;
      }
      gemt(true);
    } catch (e) {
      gemt(false);
      fejl('Svaret blev ikke gemt. Prøv igen.');
    }
  });

  load();
})();
