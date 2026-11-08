// Alt der kan rettes uden at røre resten af koden.
// NB: Sitet er offentligt på GitHub Pages – adresse og telefonnumre står IKKE her,
// men i Google Sheet'et (fanen "Info") og vises kun for gæster med et gyldigt link.
window.FEST = {
  navn: 'Jonas',
  alder: 40,
  svarFrist: '2027-05-01',

  // Web-app-URL fra Google Apps Script (se README). Tom = demotilstand.
  api: 'https://script.google.com/macros/s/AKfycbypMrwlEOS7-zfG043eoBtyqhN8BMQG50Ad5TskiNEC4cKbyXcFsh2arrTunvDOltfr/exec',
  // Toastmasterens egen webapp (Toastmaster.gs). Tom = feltet om taler/indslag skjules.
  toastApi: '',
  toastmaster: 'toastmasteren',   // fx 'Peter (toastmaster)'

  program: [
    { tid: '16.00', tekst: 'Kaffe og kage i haven' },
    { tid: '18.00', tekst: 'Velkomstdrinks – og så går vi til bords' },
    { tid: '18.30', tekst: 'Spisning: helstegt pattegris med tilbehør' },
    { tid: '21.00', tekst: 'Drinks, bål og hygge' },
  ],

  praktisk: [
    { titel: 'Kun voksne', tekst: 'Børnene bliver hjemme.' },
    { titel: 'Påklædning', tekst: 'Havefest – tag noget varmt med til aftenen.' },
  ],
};
