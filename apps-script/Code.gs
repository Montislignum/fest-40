/**
 * Backend for Jonas 40 – lægges i et Google Sheet via Udvidelser → Apps Script.
 *
 * Fane "Gæster": Kode | Navn | Max | Svar | Antal | Kost | Besked | Opdateret | Link | Invitation | Baby
 *   Du udfylder Navn, Max og evt. Baby (alt andet end tom/nej = må tage den lille med).
 *   Menuen "Fest" laver koder, links og Messenger-tekster.
 * Fane "Info": A1 = adresse, A2 = ekstra info om stedet (parkering, ring på osv.),
 *   A3 = Spotify Jam-link (indsættes på festdagen → Musik-knap på siden; slet det bagefter).
 *   Vises kun for gæster med et gyldigt link – aldrig i det offentlige repo.
 *
 * Taler og indslag kommer ALDRIG herind – de går direkte til toastmasterens eget ark
 * (se Toastmaster.gs).
 */

const SITE_URL = 'https://montislignum.github.io/fest-40/'; // ret, hvis repoet hedder noget andet
// Baby står sidst, så kolonnerne i et eksisterende ark ikke flytter sig
const COLS = ['Kode', 'Navn', 'Max', 'Svar', 'Antal', 'Kost', 'Besked', 'Opdateret', 'Link', 'Invitation', 'Baby'];
const C = Object.fromEntries(COLS.map((n, i) => [n, i]));

// {navn} = hele Navn, {link} = personligt link, {boern} = BOERN eller BOERN_BABY.
// {du}/{dit} bliver til I/jeres, når Max er over 1.
const INVITATION =
  'Hej {navn}! 🍺🐖\n' +
  'Jeg fylder 40 og holder havefest lørdag 12. juni 2027 – med hjemmebrygget øl, helstegt pattegris, drinks og hygge. ' +
  '{boern}\n' +
  'Alt om festen og svar her ({dit} personlige link):\n{link}\n' +
  'Håber {du} kommer! /Jonas';
const BOERN = 'Det er en fest for voksne, så børnene bliver hjemme.';
const BOERN_BABY = 'Det er en fest for voksne – men tag bare den lille med, hvis I ikke kan finde pasning.';

function baby_(r) {
  const v = r[C.Baby];
  return v === true || (typeof v === 'string' && v.trim() !== '' && v.trim().toLowerCase() !== 'nej');
}

function invitation_(navn, max, link, baby) {
  const flere = max > 1;
  return INVITATION
    .replaceAll('{navn}', String(navn).trim())
    .replaceAll('{boern}', baby ? BOERN_BABY : BOERN)
    .replaceAll('{du}', flere ? 'I' : 'du')
    .replaceAll('{dit}', flere ? 'jeres' : 'dit')
    .replaceAll('{link}', link);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Fest')
    .addItem('Opret faner', 'opsaet')
    .addItem('Lav koder, links og invitationer', 'lavKoder')
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
  overblik_(ss);
}

// Fanen "Overblik": tal der opdaterer sig selv via formler mod Gæster
function overblik_(ss) {
  const o = ss.getSheetByName('Overblik') || ss.insertSheet('Overblik', 0);
  const col = (navn) => String.fromCharCode(65 + C[navn]);
  const r = (navn) => `'Gæster'!${col(navn)}2:${col(navn)}`;
  const [navn, max, svar, antal] = [r('Navn'), r('Max'), r('Svar'), r('Antal')];
  o.clear();
  o.getRange('A1:C1').setValues([['', 'Invitationer', 'Personer']]);
  o.getRange('A2:A5').setValues([['Inviteret'], ['Kommer'], ['Kan ikke'], ['Mangler svar']]);
  // Formlerne har bevidst INGEN skilletegn (komma/semikolon), så de virker i et dansk ark.
  // SUMPRODUCT med ét argument erstatter COUNTIF/SUMIF.
  const er = (v) => `(${svar}="${v}")`;
  o.getRange('B2:C5').setFormulas([
    [`=COUNTA(${navn})`, `=SUM(${max})`],
    [`=SUMPRODUCT(${er('ja')}*1)`, `=SUMPRODUCT(${er('ja')}*${antal})`],
    // Personer: "Kan ikke" tæller også ubrugte pladser hos dem, der kommer færre end Max – så kolonnen går op
    [`=SUMPRODUCT(${er('nej')}*1)`, '=C2-C3-C5'],
    ['=B2-B3-B4', `=C2-SUMPRODUCT((${er('ja')}+${er('nej')})*${max})`],
  ]);
  o.getRange('A1:C1').setFontWeight('bold');
  o.getRange('A2:A5').setFontWeight('bold');
  o.getRange('A3:C3').setFontWeight('bold').setFontSize(14);
  o.setColumnWidth(1, 130);
  o.setColumnWidths(2, 2, 110);
  ss.setActiveSheet(o);
  ss.moveActiveSheet(1);
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
    sh.getRange(i + 1, C.Link + 1, 1, 2).setValues([[link, invitation_(r[C.Navn], Number(r[C.Max]), link, baby_(r))]]);
  }
}

function nyKode_() {
  // 8 tegn uden forvekslelige bogstaver – svær at gætte, let at skrive af
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
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
    guest: { navn: r[C.Navn], max: Number(r[C.Max] || 1), baby: baby_(r), svar },
    info: info ? {
      adresse: info.getRange('A1').getValue(),
      stedinfo: info.getRange('A2').getValue(),
      musik: String(info.getRange('A3').getValue()).trim(),
    } : null,
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
