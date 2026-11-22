# AGENTS.md - Moskeene (Samarbeidsportal for moskeer og trossamfunn)

Dette dokumentet definerer rammeverket, arbeidsmetoden, formålet og designretningslinjene for prosjektet «Moskeene». Alle fremtidige endringer og kodeutvidelser skal følge disse instruksjonene.

---

## 1. Arbeidsmetode og samhandling (OBLIGATORISK)
* **Brukeren har full kontroll:** Hensikten med prosjektet er at brukeren skal lære underveis og ha 100 % eierskap og innsikt i koden.
* **Aktiv veiledning ved alle oppdrag (Mentor-rolle):** Når brukeren ber agenten om å utføre en oppgave eller kodeendring, skal agenten alltid gi aktiv veiledning. Dette innebærer å:
  * Forklare *hvorfor* en løsning eller tilnærming velges (beste praksis, struktur og brukeropplevelse).
  * Vise *hvordan* koden er bygget opp (hvilke HTML-elementer, Tailwind-klasser eller skript som brukes og hva de gjør).
  * Diskutere alternativer og gi konkrete faglige anbefalinger.
* **Forklaring og forståelse først:** Før det gjøres endringer eller legges til nye funksjoner, skal agenten alltid forklare sin forståelse, hva som skal gjøres og hvorfor.
* **Spør alltid før endringer:** Agenten skal aldri endre kode eller opprette nye filer direkte uten å først ha presentert planen og fått brukerens godkjenning.
* **Pedagogisk og trinnvis:** Koden skal deles opp i logiske og lettfattelige biter med forklaringer som gjør det enkelt å lære og mestre teknologien.

---

## 2. Prosjektformål & Visjon
* **Felles samhandlingsportal:** Skape en digital møteplass og informasjonskanal for moskeer og trossamfunn i Norge.
* **Deling av best praksis:** Bygge en felles ressursbank for vellykkede initiativer innen blant annet:
  * Ungdomsarbeid, fritidstilbud og leksehjelp.
  * Frivillighetsarbeid og organisasjonsdrift.
  * Samfunnsdialog, samarbeid med kommuner, skoler og nabolag.
  * Trosdialog og brobygging med andre trossamfunn.
  * Åpenhet, inkludering og høytidsfeiringer.
* **Felles informasjonsflyt:** Formidle nyheter, arrangementer, felles kalender og kunngjøringer.

---

## 3. Brukeropplevelse og tekstkrav (fra fellesreglene)
* **Mobil-først som standard:** Nettsiden skal alltid designes og optimaliseres primært for mobiltelefoner. Store, touch-vennlige knapper, god lesbarhet og rask innlasting.
* **Kort og enkelt språk:** Ingen tunge tekstblokker eller lange avhandlinger. Bruk korte, poengterte setninger, ikoner og lettleste kort/bokser.
* **Inkluderende og verdig uttrykk:** Designet skal oppleves varmt, profesjonelt, respektfullt og tillitsvekkende for alle målgrupper.

---

## 4. Teknologistack
* **HTML5:** Semantisk, ren og tilgjengelig struktur (SEO- og skjermleservennlig).
* **Tailwind CSS:** Rask og moderne utility-first styling (responsivt oppsett for mobil, nettbrett og desktop).
* **Vanilla JavaScript:** Kun lett og ren kode for interaktivitet (mobilmeny, søk, kategorifiltrering, modaler), uten tunge eksterne avhengigheter.

---

## 5. Planlagte kjernemoduler
1. **Hero / Forside:** Klar introduksjon til portalen og felleskapet («Sammen for fellesskap og kunnskap»).
2. **Best praksis (Ressursbank):** Modul med konkrete eksempler, veiledere og tips som moskeer kan ta i bruk.
3. **Samarbeid & Trosdialog:** Eksempler og plattformer for samarbeid med andre trossamfunn og lokalsamfunnet.
4. **Felles kalender / Aktiviteter:** Kommende arrangementer, fagdager og seminarer.
5. **Moské-oversikt / Bli med:** Enkelt skjema/kontaktpunkt for å melde inn en moské eller bidra med erfaringer.

---

## 6. Modulær arkitektur & Dataflyt (Single Source of Truth)
Portalen er organisert i en ren, modularisert struktur for maksimal ytelse og transparens:

* `data/`: Sentralt datalager (JSON og faste data).
  * `publisert-moskeer.json`: Godkjente moskeer med fredagsbønn og tilgangskoder.
  * `upublisert-moskeer.json`: Rådata over alle 266 enheter fra Brønnøysundregistrene.
  * `bonnetider-drammen.js`: Faste bønnetider for året.
* `js/`: Gjenbrukbar forretningslogikk og verktøy.
  * `utils.js`: XSS-sikring (`escapeHtml`), formatere URLer/telefon og toast-varsler.
  * `store.js`: `MoskeStore` som styrer all lesing, skriving, caching og kryss-fane synkronisering.
  * `bonnetider.js`: `BonnetiderApp` for bønnetidsberegning, klokke og sanntids aktiv bønn.
* `css/`: Modulære stilark.
  * `base.css`: Fargepalett, nullstilling, typografi og safe-area-håndtering for mobil.
  * `portal.css`: Felles komponenter for kontrollpaneler og portaler (skjemaer, knapper, tabeller, modaler).
* `min-moske/`: Selvbetjeningsportal for styreledere og imamer.
* `moskesjekk/`: Administrative verktøy for verifisering, lenkekontroll og tilgangsstyring.


