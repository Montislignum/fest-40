/**
 * Backend for Jonas 40 – lægges i et Google Sheet via Udvidelser → Apps Script.
 *
 * Fane "Gæster": Kode | Navn | Max | Svar | Antal | Kost | Besked | Opdateret | Link | Invitation
 *   Du udfylder kun Navn og Max. Menuen "Fest" laver koder, links og Messenger-tekster.
 * Fane "Info": A1 = adresse, A2 = ekstra info om stedet (parkering, ring på osv.).
 *   Vises kun for gæster med et gyldigt link – aldrig i det offentlige repo.
 *
 * Taler og indslag kommer ALDRIG herind – de går direkte til toastmasterens eget ark
 * (se Toastmaster.gs).
 */

const SITE_URL = 'https://montislignum.github.io/fest-40/'; // ret, hvis repoet hedder noget andet
const COLS = ['Kode', 'Navn', 'Max', 'Svar', 'Antal', 'Kost', 'Besked', 'Opdateret', 'Link', 'Invitation'];
const C = Object.fromEntries(COLS.map((n, i) => [n, i]));

// {navn} = hele Navn, {link} = personligt link.
// {du}/{dit} bliver til I/jeres, når Max er over 1.
const INVITATION =
  'Hej {navn}! 🍺🐖\n' +
  'Jeg fylder 40 og holder havefest lørdag 12. juni 2027 – med hjemmebrygget øl, helstegt pattegris, drinks og hygge. ' +
  'Det er en fest for voksne, så børnene bliver hjemme.\n' +
  'Alt om festen og svar her ({dit} personlige link):\n{link}\n' +
  'Håber {du} kommer! /Jonas';

function invitation_(navn, max, link) {
  const flere = max > 1;
  return INVITATION
    .replaceAll('{navn}', String(navn).trim())
    .replaceAll('{du}', flere ? 'I' : 'du')
    .replaceAll('{dit}', flere ? 'jeres' : 'dit')
    .replaceAll('{link}', link);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Fest')
    .addItem('Opret faner', 'opsaet')
    .addItem('Lav koder, links og invitationer', 'lavKoder')
    .addItem('Vis status', 'visStatus')
    .addToUi();
}

function opsaet() {
  const ss = SpreadsheetApp.getActive();
  const g = ss.getSheetByName('Gæster') || ss.insertSheet('Gæster');
  g.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
  g.setFrozenRows(1);
  g.getRange(2, C.Invitation + 1, g.getMaxRows() - 1, 1).setWrap(true);
  const info = ss.getSheetByName('Info') || ss.insertSheet('Info');
  if (!info.getRange('A1').getValue()) {
    info.getRange('A1:A2').setValues([['Skriv adressen her'], ['Parkering på vejen. Gå om bag huset til haven.']]);
  }
}

function gaester_() {
  return SpreadsheetApp.getActive().getSheetByName('Gæster');
}

function lavKoder() {
  const sh = gaester_();
  const rows = sh.getDataRange().getValues();
  const brugte = new Set(rows.slice(1).map((r) => r[C.Kode]).filter(String));
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[C.Navn]) continue;
    if (!r[C.Kode]) {
      let k;
      do { k = nyKode_(); } while (brugte.has(k));
      brugte.add(k);
      sh.getRange(i + 1, C.Kode + 1).setValue(k);
      r[C.Kode] = k;
    }
    if (!r[C.Max]) { sh.getRange(i + 1, C.Max + 1).setValue(1); r[C.Max] = 1; }
    const link = SITE_URL + '?g=' + r[C.Kode];
    sh.getRange(i + 1, C.Link + 1, 1, 2).setValues([[link, invitation_(r[C.Navn], Number(r[C.Max]), link)]]);
  }
}

function nyKode_() {
  // 8 tegn uden forvekslelige bogstaver – svær at gætte, let at skrive af
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

function visStatus() {
  const rows = gaester_().getDataRange().getValues().slice(1).filter((r) => r[C.Navn]);
  const ja = rows.filter((r) => r[C.Svar] === 'ja');
  const personer = ja.reduce((s, r) => s + Number(r[C.Antal] || 0), 0);
  const nej = rows.filter((r) => r[C.Svar] === 'nej').length;
  const mangler = rows.length - ja.length - nej;
  const kost = ja.filter((r) => r[C.Kost]).length;
  SpreadsheetApp.getUi().alert(
    `Invitationer: ${rows.length}\nJa: ${ja.length} (${personer} personer)\nNej: ${nej}\nMangler svar: ${mangler}\nMed kosthensyn: ${kost}`
  );
}

function find_(kode) {
  if (!kode || !/^[a-z0-9]{4,16}$/.test(kode)) return null;
  const sh = gaester_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][C.Kode] === kode) return { sh, rowNo: i + 1, r: rows[i] };
  }
  return null;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const hit = find_(String(e.parameter.g || ''));
  if (!hit) return json_({ ok: false, error: 'ukendt kode' });
  const r = hit.r;
  const svar = r[C.Svar] ? {
    kommer: r[C.Svar],
    antal: Number(r[C.Antal] || 0),
    kost: r[C.Kost],
    besked: r[C.Besked],
  } : null;
  const info = SpreadsheetApp.getActive().getSheetByName('Info');
  return json_({
    ok: true,
    guest: { navn: r[C.Navn], max: Number(r[C.Max] || 1), svar },
    info: info ? { adresse: info.getRange('A1').getValue(), stedinfo: info.getRange('A2').getValue() } : null,
  });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'ugyldig data' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hit = find_(String(b.g || ''));
    if (!hit) return json_({ ok: false, error: 'ukendt kode' });
    const max = Number(hit.r[C.Max] || 1);
    const kommer = b.kommer === 'ja' ? 'ja' : 'nej';
    const antal = kommer === 'ja' ? Math.min(max, Math.max(1, Math.floor(Number(b.antal) || 1))) : 0;
    // Forreste ' forhindrer at gæstetekst tolkes som formel i arket
    const tekst = (s, n) => { const t = String(s || '').slice(0, n); return /^[=+\-@]/.test(t) ? "'" + t : t; };
    hit.sh.getRange(hit.rowNo, C.Svar + 1, 1, 5).setValues([[
      kommer,
      antal,
      kommer === 'ja' ? tekst(b.kost, 200) : '',
      tekst(b.besked, 500),
      new Date(),
    ]]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
