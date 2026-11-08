// Alt der kan rettes uden at røre resten af koden.
// NB: Sitet er offentligt på GitHub Pages – adresse og telefonnumre står IKKE her,
// men i Google Sheet'et (fanen "Info") og vises kun for gæster med et gyldigt link.
window.FEST = {
  navn: 'Jonas',
  alder: 40,
  start: '2027-06-12T16:00:00+02:00',
  slut: 'til de sidste går hjem',
  svarFrist: '2027-05-01',

  // Web-app-URL fra Google Apps Script (se README). Tom = demotilstand.
  api: '',
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
    { titel: 'Kun for voksne', tekst: 'Festen er uden børn – book barnepigen i god tid.' },
    { titel: 'Påklædning', tekst: 'Havefest-afslappet. Tag noget varmt med til aftenen og sko, der kan tåle græs.' },
    { titel: 'Transport', tekst: 'Der er hjemmebrygget øl – lad bilen stå, eller aftal en chauffør.' },
    { titel: 'Gaver', tekst: 'Din tilstedeværelse er gave nok. Vil du alligevel give noget, så tænk i flasker og oplevelser.' },
  ],
};
