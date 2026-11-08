/**
 * Toastmasterens backend – oprettes af TOASTMASTEREN i sit eget Google Sheet
 * (Udvidelser → Apps Script), så Jonas aldrig får indslagene at se.
 *
 * Fane "Indslag": Kode | Navn | Beskrivelse | Opdateret
 * Webapp-URL'en sendes til Jonas, som sætter den i config.js → toastApi.
 */

const COLS = ['Kode', 'Navn', 'Beskrivelse', 'Opdateret'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Toastmaster')
    .addItem('Opret fane', 'opsaet')
    .addToUi();
}

function opsaet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Indslag') || ss.insertSheet('Indslag');
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function find_(kode) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Indslag');
  if (!/^[a-z0-9]{4,16}$/.test(kode)) return { sh, rowNo: 0 };
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === kode) return { sh, rowNo: i + 1, r: rows[i] };
  }
  return { sh, rowNo: -1 };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Gæsten ser sit eget indslag igen, når linket åbnes på ny
function doGet(e) {
  const hit = find_(String(e.parameter.g || ''));
  if (!hit.rowNo) return json_({ ok: false });
  return json_({ ok: true, indslag: hit.rowNo > 0, indslagTekst: hit.r ? hit.r[2] : '' });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false }); }
  const tekst = (s, n) => { const t = String(s || '').slice(0, n); return /^[=+\-@]/.test(t) ? "'" + t : t; };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hit = find_(String(b.g || ''));
    if (!hit.rowNo) return json_({ ok: false });
    if (!b.indslag) {
      if (hit.rowNo > 0) hit.sh.deleteRow(hit.rowNo); // fortrudt
      return json_({ ok: true });
    }
    const row = [String(b.g), tekst(b.navn, 100), tekst(b.indslagTekst, 300) || '(ikke beskrevet)', new Date()];
    if (hit.rowNo > 0) hit.sh.getRange(hit.rowNo, 1, 1, row.length).setValues([row]);
    else hit.sh.appendRow(row);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
