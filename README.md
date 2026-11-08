# Jonas 40 – havefest 12. juni 2027

Privat projekt (Montislignum, ikke firma). Statisk side på GitHub Pages med to Google Sheets som RSVP-database:

| Ark | Ejer | Indhold |
|---|---|---|
| Gæster | Jonas | svar, antal, adresse (fanen Info) |
| Indslag | toastmasteren | taler og indslag – Jonas ser dem aldrig |

## Filer
- `index.html`, `style.css`, `app.js` – selve siden
- `config.js` – tekster, program, tidspunkt, svarfrist, toastmasterens navn og de to API-adresser
- `og.png` – billedet, der vises, når linket deles på Messenger
- `apps-script/Code.gs` – Jonas' backend
- `apps-script/Toastmaster.gs` – toastmasterens backend

Åbnes siden uden API-adresse (eller med `?demo`), kører den i demotilstand med en falsk gæst.

## 1. Jonas' ark (ca. 10 min)
1. Opret et nyt Google Sheet, fx "Jonas 40 – gæster".
2. **Udvidelser → Apps Script**, slet indholdet og indsæt `apps-script/Code.gs`. Gem.
3. Genindlæs arket → menuen **Fest → Opret faner**.
4. Skriv adressen i fanen **Info** (A1) og evt. ekstra info i A2.
5. Indsæt din gæsteliste i fanen **Gæster**: én række pr. invitation (et par = én række). **Navn** skrives, som det skal stå ("Mette og Lars"), og **Max** er antal personer.
6. **Implementer → Ny implementering → Webapp**. Udfør som: *mig*, adgang: *alle*. Sæt URL'en i `config.js` → `api`.
7. **Fest → Lav koder, links og invitationer**. Kolonnen **Invitation** indeholder nu en færdig Messenger-besked med det personlige link. Kopiér cellen og send den.
   Teksten rettes i `INVITATION` øverst i `Code.gs`. Kør menuen igen bagefter – koderne bevares.
8. Fanen **Overblik** viser inviteret, kommer, kan ikke og mangler svar – opdateres af sig selv. Kolonnen **Baby** (fx "x") giver pasningsundtagelse i invitation og på siden.
9. **På festdagen:** start en Spotify Jam, slå "Lad andre ændre, hvad der afspilles" fra, og indsæt Jam-linket i **Info!A3**. Topknappen på alles side bliver til **Musik**. Slet linket bagefter.

## 2. Toastmasterens ark (toastmasteren gør det selv)
1. Toastmasteren opretter sit eget Google Sheet → **Udvidelser → Apps Script** → indsætter `Toastmaster.gs`.
2. Genindlæs → **Toastmaster → Opret fane**.
3. **Implementer → Webapp**, udfør som *mig*, adgang *alle*, og send URL'en til Jonas.
4. Jonas sætter den i `config.js` → `toastApi` og skriver toastmasterens navn i `toastmaster`.

Indtil `toastApi` er sat, er feltet om taler skjult på siden.
Det er en æresordning: koden ligger i et offentligt repo, så Jonas kunne i princippet slå et indslag op med en gæstekode. Lad være 🙂

## Opdatering af siden
Hæv `?v=` på style.css, config.js og app.js i `index.html` ved hver ændring. Ellers kan gæster få gammel JS sammen med ny HTML (Pages cacher i 10 min).

## Ændringer i Apps Script
**Implementer → Administrer implementeringer → rediger → Ny version**. Så beholder du samme URL.

## Udgivelse
Repo `Montislignum/fest-40` (offentligt, fordi GitHub Pages fra private repoer kræver betalt konto) → Settings → Pages → branch `main`, mappe `/`.
Siden ender på https://montislignum.github.io/fest-40/ – passer `SITE_URL` i `Code.gs` og `og:image` i `index.html`.

Der står ingen adresse, gæstenavne eller telefonnumre i repoet. Alt personligt ligger i arkene.
