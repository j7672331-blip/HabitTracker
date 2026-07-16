# Habit-Tracker — Übergabe / Stand (für neue Session)

Stand: 2026-07-16. Dieses Dokument fasst den kompletten bisherigen Verlauf zusammen,
damit in einer neuen Session nahtlos weitergearbeitet werden kann.

---

## 0. Neue Session richtig starten (WICHTIG)

- **Doppelklick auf `Habit-Tracker.cmd`** (in diesem Ordner) → öffnet ein Terminal
  **im HabitTracker-Ordner** und startet `claude`. Dadurch ist der Arbeitsordner = HabitTracker
  und das Projekt ist **getrennt vom SAT-Projekt** (Arduino/Pi).
- **Niemals** Claude aus dem SAT-Software-Ordner heraus an HabitTracker arbeiten lassen — ist
  in dieser Session (2026-07-14) wieder passiert: 4 Playwright-Screenshots landeten im
  SAT-Root statt in `previews/`, weil Claude dort (nicht via `Habit-Tracker.cmd`) lief.
  Nachträglich gefunden + verschoben. **Darf laut User nicht wieder vorkommen.**

Projektregeln stehen zusätzlich in `CLAUDE.md` (wird automatisch geladen, wenn Claude in
diesem Ordner läuft) — dort steht auch der komplette Deploy-Workflow.

---

## 1. Was das ist

Persönlicher, interaktiver **Habit-Tracker** als installierbare **iPhone-PWA**.
Gewohnheiten täglich abhaken (Ja/Nein), Statistik über vergangene Werte.
Daten **nur lokal** im iPhone (`localStorage`), Backup per JSON Export/Import. **Kein Server.**

**Live:** `https://j7672331-blip.github.io/HabitTracker/` (GitHub Pages, Repo
`github.com/j7672331-blip/HabitTracker`, öffentlich, kein `gh`-CLI verfügbar).

Zielgerät: iPhone (Safe-Areas/Dynamic Island berücksichtigt), aber responsiv.

---

## 2. Technik & Architektur

- Reine **Vanilla HTML/CSS/JS**, **kein Framework, kein Build-Tool**.
- **Node** ist NICHT für die App, sondern **nur Test-Runner** (Pfad
  `"C:\Program Files\nodejs\node.exe"`).
- Dateien (jede mit klarer Aufgabe):
  - `index.html` – Struktur: 3 Ansichten (Heute/Statistik/Verwalten) + untere Tab-Leiste
  - `style.css` – Design "Nocturne Grün": `--paper:#0C0D0C`, `--accent:#34D17A`,
    Signature-Glow bei Interaktionen, Space Grotesk (lokal in `fonts/`)
  - `stats.js` – **pure** Funktionen (Datum, Streak, Quote, Heatmap-Tage, Wochenrate,
    Wochentag-Muster, Trend/Monatsvergleich); keine DOM/Storage
  - `storage.js` – einzige Schnittstelle zu `localStorage` + Mutationen + Export/Import
  - `app.js` – UI-Logik, verdrahtet alles
  - `sw.js` – Service Worker (Offline-Cache; Cache-Name aktuell **`habit-tracker-v40`**;
    `fetch()` nutzt `{cache:"no-store"}` gegen den Browser-HTTP-Disk-Cache, siehe Abschnitt 6b)
  - `manifest.json` – PWA-Metadaten
  - `icons/` – `icon-192.png`/`icon-512.png` (generiert aus `icon-source.html`, manuell
    im Browser rendern + screenshotten — keine automatisierte Pipeline)
  - `tests/` – `test-cases.js`, `run.js` (Node-Runner via `vm`) → **34/34 grün**
  - `previews/` – Vorschau-Screenshots (in `.gitignore`, NICHT committen)
  - `.claude/launch.json` – Preview-Server-Config (`python -m http.server` — **läuft in
    dieser Umgebung NICHT**, siehe Abschnitt 7)
  - `habit-tracker-import.json` – persönliches Backup, jetzt **13 Gewohnheiten**
    (in `.gitignore`, nicht Teil des Repos) — **importiert, User bestätigt "passt alles"**
  - `CLAUDE.md`, `Habit-Tracker.cmd`, `HANDOFF.md` – Projektregeln, Launcher, dieses Dokument

---

## 3. Datenmodell (`localStorage["habitTrackerData"]`)

```json
{
  "habits": [
    { "id": "h1", "name": "Wasser trinken", "farbe": "#4EA8DE",
      "info": "2 Liter am Tag", "erstelltAm": "2026-07-14", "archiviert": false }
  ],
  "eintraege": { "h1": { "2026-07-14": true } }
}
```
- Nur **erledigte** Tage werden gespeichert. Fehlt ein Datum = nicht erledigt.
- Datumsschlüssel `YYYY-MM-DD` nach **lokaler** Gerätezeit.
- `info` = kursive Zusatzinfo pro Gewohnheit (optional, Standard "").
- **Import überschreibt komplett** (kein Merge) — `importJson()` in `storage.js`.

---

## 4. Funktionen (aktueller Stand)

**Heute:** Datum als Bold-Kopf, Fortschrittsbalken, Text „X von Y erledigt". Liste als
iOS-Gruppenkarte: Farbpunkt + Name + kursive Zusatzinfo + Flame-Streak-Badge (ab Serie >1,
zweifarbiges Flammen-SVG statt nackter Zahl) + Häkchen-Kreis mit Fill-Animation.
Ganze Zeile tippbar = heute umschalten. Nur heute+gestern tippbar (ältere Tage = Anzeige only).
Toggle aktualisiert **gezielt nur die betroffene Zeile** (kein Full-Rebuild der Liste mehr —
Perf-Fix, siehe Abschnitt 6). **Kein Quick-Add hier** (User wollte es explizit wieder raus,
"dafür hat man ja Verwalten").

**Statistik:** Chips „Alle" + je Gewohnheit.
- Einzel-Gewohnheit: Kennzahlen „Aktuelle Serie / Längste Serie / Erfolgsquote"
  (Zeitraum 7/30/Gesamt umschaltbar) + Monatskalender (‹ › Navigation, vorwärts gesperrt).
  Heute-Zelle: Sofort-Toggle beim Tippen. Vortag-Zelle: öffnet Custom-Modal
  ("X für [Datum] nachträglich als erledigt/nicht erledigt markieren?" Ja/Nein) statt
  Sofort-Toggle — verhindert versehentliches Verändern alter Tage.
- „Alle": Kennzahlen „Heute X/Y · Perfekte Tage · Ø Quote"; Kalender nach Erfüllungs-Anteil
  schattiert. Vortag-Zelle **jetzt auch tippbar** (war vorher nie klickbar): öffnet
  Nachtrag-Modal mit allen an dem Tag aktiven Gewohnheiten zum Abhaken, Kalender-Shading
  aktualisiert sich live beim Toggle. Nur Heute bekommt den Akzent-Ring (`.is-today`),
  Vortag sieht optisch aus wie jeder andere Tag (nur Cursor/Tap-Scale zeigt Tippbarkeit).
- **Neu:** Wochentag-Muster (Balkenchart, Erfolgsquote je Wochentag) + Trend-Sparkline
  (letzte 8 Wochen + Monatsvergleich "Dieser Monat vs. Vormonat").
- **"Zu heute springen"** ist **kein eigener Button** mehr, sondern versteckt im
  Kalender-Legenden-Element ("heute"-Text + grün umrandetes Kästchen unten) — User wollte
  es unauffällig, nicht als sichtbarer Button.
- User will sich Stats **später nochmal ansehen**, evtl. noch was verbessern — offen.

**Verwalten:** Anlegen (Name + Zusatzinfo + Farbe), Bearbeiten (Modal, öffnet jetzt oben
statt zentriert — iOS-Tastatur verdeckte sonst die Eingabefelder), Archivieren, Löschen.
Backup (Export/Import JSON). **Reorder existiert:** Drag-Handle (lange gedrückt halten +
verschieben) sowie Pfeiltasten hoch/runter bei Fokus auf einer Zeile (`moveHabit()` in
`storage.js`) — bei Bedarf im Code nachschauen statt zu raten, war in einer früheren
Session-Antwort fälschlich verneint worden.

**Global:**
- `touch-action: pan-x pan-y` auf `html` — Doppel-Tap-Zoom **und** Pinch-Zoom sind
  deaktiviert (User wollte explizit beides aus, trotz normaler A11y-Empfehlung, das
  Pinch-Zoom zu erhalten — bewusste Entscheidung für diese persönliche Single-User-App).
  **Ergänzt (2026-07-16):** `touch-action` allein reichte nach Bildschirm-Rotation nicht
  zuverlässig — Viewport-Meta zusätzlich `maximum-scale=1,user-scalable=no`, plus
  globaler `touchend`-Delta-Check (≤300ms → `preventDefault`) gegen den kleinen
  iOS-Doppel-Tap-Scroll-Ruckler. Siehe Abschnitt 6b.
- **Querformat (Rotation) wird jetzt unterstützt** statt nur toleriert — eigener
  `@media (orientation:landscape)`-Block, Heute-Liste zweispaltig, Kopfbereich
  kompakter, `.modal` bekam `max-height:86vh` + Scroll für flache Viewports.
- **Keine Text-Markierung per Finger** mehr (kein blaues iOS-Highlight, kein
  Copy/Lupen-Callout) — `user-select:none` + `-webkit-touch-callout:none` auf `html`,
  Inputs/Textareas explizit wieder auf `text` gesetzt (sonst kein Tippen mehr möglich).
- Scroll-Position wird bei jedem Tab-Wechsel auf 0 zurückgesetzt (`window.scrollTo(0,0)`
  in `showView()`) — vorher blieb man beim Wechsel an der alten Scroll-Position hängen.
- **PWA:** offline-fähig (Service Worker), installierbar (manifest).

---

## 5. Design

**"Nocturne Grün"** (einziges aktives Design, Design-2-Variante wurde verworfen):
- `--paper:#0C0D0C`, `--surface:#17181A`, `--accent:#34D17A`, `--accent-2:#5CE39B`
- Hintergrund: `linear-gradient(108deg, color-mix(accent 34%, paper) 0%,
  color-mix(accent 13%, paper) 32%, paper 62%, #070807 100%)`
- App-Icon (`icon-source.html`) nutzt **exakt dieselbe Formel** — nach zwei Fehlversuchen
  (erst zu wenig, dann zu viel Grün beim Boost-Versuch) landete es beim 1:1-Match. User:
  "so lassen wirs".
- Space Grotesk lokal gehostet (`fonts/`), Signature-Glow bei Interaktionen (Buttons,
  Häkchen-Fill, Flame-Badge, Bar-Chart-Fill-Animation).

---

## 6. Wichtige Änderungen dieser Session (2026-07-14)

Chronologisch, alle Commits `01258cb` → `1f49ebc` (siehe `git log`):

1. **Doppel-Tap-Zoom-Fix, Kalender-Heute-Sprung, Flame-Badge, Quick-Add, Perf-Fix,
   neue Stats, Icon-Gradient-Richtung** (großer Erstcommit, 8 Punkte auf einmal geplant
   und umgesetzt, siehe Abschnitt 4 für Details zu jedem).
2. **Feedback-Runde:** Pinch-Zoom zusätzlich aus, "Heute"-Trigger in Kalender-Legende
   versteckt statt eigener Button, Modal öffnet oben (Tastatur-Problem), Icon-PNGs
   tatsächlich neu gerendert (vorher nur CSS-Quelle geändert, PNGs waren noch alt).
3. **Icon-Farbjustierung (2 Runden):** erst zu kräftig geboostet, dann zurück auf die
   exakte App-Formel — User-Feedback-Loop, am Ende 1:1-Match bestätigt.
4. **Quick-Add wieder entfernt:** User wollte klare Trennung Heute (nur abhaken) vs.
   Verwalten (Gewohnheiten pflegen).
5. **Scroll-Reset beim Tab-Wechsel.**
6. **SAT/HabitTracker-Vermischung gefunden + bereinigt** (siehe Abschnitt 0).
7. **Mehr Scroll-Puffer am Seitenende** (`main.padding-bottom: 0 → 2.5rem → 4.5rem → 7rem
   → zurück auf 4.5rem`, finaler Wert) — bei viel Inhalt (viele Gewohnheiten,
   Backup-Sektion, Statistik-Charts) endete die letzte Zeile/das letzte Element direkt
   an der Tabbar-Freistellung, kein Platz zum Weiterscrollen. 7rem war zu viel, User
   wollte den mittleren Wert zurück. **Wichtiger Fallstrick dabei entdeckt:** Änderungen
   waren auf dem iPhone erst nach **erneutem "Zum Home-Bildschirm hinzufügen"** sichtbar,
   normales Neuöffnen/Force-Quit der installierten PWA reichte nicht (iOS cached die
   Standalone-App hartnäckiger als die Service-Worker-Network-first-Strategie vermuten
   lässt). Cache jetzt `habit-tracker-v34`. Falls nochmal ein anderer Wert gewünscht:
   `style.css` (`main { padding-bottom: ... }`) anpassen.
8. **Icon-Logo pixelgenau zentriert.** `top:50%/left:50%` zentrierte nur die Line-Box,
   nicht die tatsächliche Glyphen-Tinte — "HT" (Versalien ohne Unterlängen) saß dadurch
   systematisch ~12.5px zu hoch und ~7.5px zu weit rechts (512px-Referenz, per
   Pixel-Bounding-Box-Analyse zweier unabhängiger Methoden bestätigt: Canvas-Front-Text
   isoliert gerendert + finale-PNG-Threshold-Scan). Fix: `top: calc(50% + 2.44vmin);
   left: calc(50% - 1.46vmin);` in `.txt` (icon-source.html). Nach Fix: bbox-Zentrum
   (256.5/256.5) bzw. (95.5/96) bei 512px/192px — praktisch exakt mittig. Diagnose-Skript
   liegt im Scratchpad (`check-icon-center.js`, reiner Node-PNG-Decoder ohne Dependencies,
   falls nochmal gebraucht — Pfad session-gebunden, ggf. neu schreiben). Cache jetzt
   `habit-tracker-v35`.

**Perf-Fix Detail (renderToday):** Vorher baute jeder Klick auf eine Gewohnheit die
komplette `#today-list` per `innerHTML=""` neu (alle Zeilen, auch unbetroffene) — spürbar
bei mehr Gewohnheiten. Jetzt: `buildHabitRow()` erzeugt eine einzelne Zeile,
`updateAfterToggle()` ersetzt nur die eine getoggelte Zeile per `row.replaceWith(...)` und
aktualisiert Progress-Bar/Text separat. Verifiziert per DOM-Marker-Test: unberührte Zeilen
bleiben derselbe DOM-Knoten.

**Icon-Regen-Workaround:** Das Browser-Screenshot-Tool (`computer`/`zoom`) war diese ganze
Session über kaputt (Timeout). Workaround: Canvas-Rendering direkt im Browser-Tab per
`javascript_tool` (reproduziert CSS-Gradient/Font/Skew/Blur/Drop-Shadow exakt per Formel,
inkl. `gradLine()`-Helper der die CSS-`linear-gradient`-Winkel-Mathematik nachbildet) +
ein kleiner `POST /__save-icon`-Endpoint im lokalen `static-server.js` (Whitelist nur
`icon-192.png`/`icon-512.png`), der die Base64-PNG-Bytes auf Platte schreibt. Ergebnis
danach per `Read`-Tool visuell geprüft (das Tool kann Bilder rendern).

**sw.js Cache-Verlauf dieser Session:** v24 → v25 → v26 → v27 → v28 → v29 → v30 → v31
→ v32 → v33 → v34 → v35 (jede Runde: Tests grün → Commit → Push → GitHub-Pages-Rebuild
abwarten (~20-40s) → MD5-Vergleich lokal vs. deployed).

---

## 6b. Session 2026-07-16 (Fortsetzung: Rotation, Nachtrag-Popup, Caching-Fix)

Ausgangspunkt: Icon war laut User schon fertig ("Punkt 4 schon gemacht"). Vier
Feedback-Runden, alle deployed + MD5-verifiziert, alle vom User bestätigt.

1. **Zoom nach Rotation + Doppel-Tap-Scroll-Ruckler.** Viewport-Meta
   `maximum-scale=1,user-scalable=no` ergänzt. Globaler `touchend`-Listener
   (`app.js`, ganz oben): Delta zum letzten `touchend` ≤300ms → `preventDefault()`,
   Standard-iOS-Workaround, unterdrückt gezielt nur die iOS-Doppel-Tap-Zoom-Geste
   (samt dem kleinen Scroll-Ruckler, den `touch-action` allein nicht immer verhinderte),
   normale Einzel-Taps bleiben unberührt.
2. **Querformat:** User hat sich bei einer Rückfrage explizit für "richtig unterstützen"
   entschieden (nicht nur Bugfix, nicht Portrait-Sperre). `@media (orientation:landscape)
   and (max-height:500px)`-Block in `style.css`: `main` breiter (720px), Heute-Liste
   `display:grid; grid-template-columns:1fr 1fr` mit Spalten-Trenner, kompakterer
   Kopfbereich. `.modal` bekam unabhängig davon `max-height:86vh;overflow-y:auto`
   (schützt auch vor abgeschnittenen Dialogen bei flacher Höhe).
3. **Vortag-Nachtrag-Popup.** User wollte: Tippen auf Vortag im Kalender → Popup ob
   nachträglich eintragen. Umgesetzt für Einzel-Gewohnheit-Kalender (Ja/Nein-Modal via
   bereits vorhandenem `openConfirmModal()`). **Wichtig entdeckt:** User testete auf dem
   "Alle"-Kalender, der laut altem Design nie tippbar war (kein Einzel-Eintrag
   zuordenbar) — daher "passiert nichts", kein Bug. Nachgebaut: neues Modal
   `openDayEntryModal()` mit eigenem `buildDayEntryRow()` (bewusst NICHT `buildHabitRow()`
   wiederverwendet — dessen Klick-Handler hängt hart an `#today-list`/`#today-progress`
   per globalem `querySelector`, hätte bei Fremd-Datum die falsche/Heute-Zeile getroffen).
4. **CSS-Ring-Bug:** Nutzer wollte, dass Vortag NICHT wie Heute aussieht (kein
   Akzent-Ring). Ring war an `.tappable` gekoppelt, betraf also auch den Vortag.
   Fix: Ring nur noch an `.is-today`; Einzel-Kalender setzt die Klasse jetzt beim
   Heute-Tag explizit selbst (`renderCalendarCombined` hatte sie schon).
5. **Kritischer Cache-Bug:** Nach Deploy + MD5-verifiziertem Server-Stand meldete User
   "Umrandung ist immer noch da". Ursache: `sw.js`-`fetch(e.request)` respektierte den
   normalen Browser-HTTP-Disk-Cache (nicht nur den eigenen SW-Cache) — GitHub Pages'
   Cache-Header ließen den Browser alte `style.css` ausliefern, obwohl der Server
   längst aktuell war und der SW selbst auf dem neuesten Stand war. Fix:
   `fetch(e.request, {cache:"no-store"})` erzwingt echten Netzwerk-Roundtrip.
   **Für die Zukunft wichtig:** MD5-Server-Verifikation beweist NICHT, dass der Client
   die neue Version sieht — bei "Änderung kommt nicht an"-Meldungen zuerst prüfen, ob
   der SW `cache:"no-store"` nutzt, bevor man am eigentlichen Feature-Code sucht.
6. **Text-Markierung aus:** `user-select:none` + `-webkit-touch-callout:none` auf `html`
   (fühlte sich sonst wie eine Webseite statt native App an), `input`/`textarea`
   explizit wieder auf `text` — sonst kein Tippen/Markieren in Eingabefeldern mehr.
7. **13-Habit-Import:** `habit-tracker-import.json` neu geschrieben — "Zahnspange
   tragen" (Info "für die Nacht", `#6C7CFF`, Schlaf-Farbe) an Position 3,
   "Sonderaktivität" (Info "kann ausgetauscht werden", `#9B7EDE`) an Position 13.
   Reihenfolge + Farben vorab per Tabellen-Widget visuell mit User abgestimmt.
   **User hat importiert, bestätigt "passt alles mit den 13 Aktivitäten".** Import
   überschreibt immer komplett — zum Zeitpunkt des Imports gab es keine echten
   Check-in-Daten zu verlieren.
8. **Reorder-Feature entdeckt/richtiggestellt:** auf Nachfrage des Users fälschlich
   behauptet, es gäbe kein Umsortieren — existiert aber bereits (Drag-Handle +
   Pfeiltasten, `moveHabit()`). Lehre: bei Unsicherheit über vorhandene Features im
   Code nachschauen (`Grep`) statt aus altem HANDOFF-Wissen zu raten.

**sw.js Cache-Verlauf:** v35 → v36 (die drei Kernfixes: Zoom/Querformat/Vortag-Popup)
→ v37 (Doppel-Tap-Fix + "Alle"-Kalender-Popup) → v38 (Ring-Fix) → v39 (`no-store`-Fix)
→ v40 (Text-Markierung aus). Jede Runde: Tests grün → Commit (gezielte Dateien, nie
`git add -A`) → Push → Poll-Loop (`until`-Schleife mit `?nocache=$(date +%s)`,
kein blindes `sleep`, GateGuard/Sandbox blockt Standalone-Sleeps) gegen GH-Pages-MD5.

**GateGuard-Hook (Sandbox, session-übergreifend relevant):** blockt in dieser
Umgebung immer den ersten Edit/Write/Bash-Call pro Datei/Session mit einem
Fact-Forcing-Error. Kein echter Fehler — kurze Fakten posten (Importeure/Grep-Treffer,
betroffene Funktion, Datenschema falls zutreffend, Zitat der User-Instruktion), dann
denselben Tool-Call 1:1 wiederholen, geht dann durch.

---

## 7. Entwickeln / Testen / Vorschau

- **Tests:** `"C:\Program Files\nodejs\node.exe" tests/run.js` → **34/34 grün.**
- **Lokal ansehen:** `python -m http.server` **funktioniert in dieser Bash-Umgebung
  NICHT** (Windows App-Execution-Alias, bekannt). Funktionierender Workaround dieser
  Session: eigenes `static-server.js` (Node, im Scratchpad-Ordner der Session — **Pfad
  ist session-gebunden, nicht dauerhaft!**), manuell per Bash im Hintergrund gestartet
  (`run_in_background: true`), dann `preview_start` mit `{url: "http://localhost:8766/..."}`
  statt `{name: "..."}` (Name-basierter Start bindet sich fälschlich an den SAT-Projektordner
  als cwd, nicht an `.claude/launch.json` hier).
- **Playwright/Browser-Screenshots** IMMER nach `previews/` — nie in fremde Ordner! (Siehe
  Abschnitt 0, ist diese Session trotzdem passiert.)
- Service Worker cached aggressiv: vor jedem Test `navigator.serviceWorker.getRegistrations()
  .then(rs => rs.forEach(r => r.unregister()))` ausführen, dann neu laden.

---

## 8. Deployment & iPhone

- Hosting über **GitHub Pages**. Push auf `master` → Rebuild dauert ~20-40s.
- Deploy-Verifikation: `curl` die Datei von der Pages-URL, `md5sum` gegen lokale Datei
  vergleichen (Workflow-Pflicht laut `CLAUDE.md`, diese Session konsequent gemacht).
- iPhone: HTTPS-URL in **Safari** → Teilen → **Zum Home-Bildschirm**.
- **Bei Icon-Änderungen:** Homescreen-Icon löschen + neu hinzufügen (iOS cached das Icon
  beim ersten Hinzufügen, network-first-SW-Update reicht dafür NICHT aus). Nach dieser
  Session also nötig, um das finale Icon zu sehen.
- **Erinnerungen (Punkt 9 aus der Ursprungsplanung):** echte Push-Notifications brauchen
  einen Server (VAPID-Keys) — nicht vorhanden, nicht gebaut. Alternative (iOS-Kurzbefehle/
  Automation) war als Konzept vorgesehen, **wurde diese Session nicht mehr behandelt.**

---

## 9. Git-Stand

- Branch: `master`. Letzter Commit: `97defb5` ("Text-Markierung (blaues iOS-Highlight)
  app-weit deaktiviert"). Commits dieser Session (chronologisch nach `ecd4593`):
  Zoom/Querformat/Vortag-Popup → Doppel-Tap-Fix + "Alle"-Kalender-Popup →
  Ring-Fix → SW `no-store`-Fix → Text-Markierung aus.
- Live-Deploy verifiziert identisch zu `master` (MD5-Check nach jedem Push, inkl.
  `?nocache=`-Cache-Busting im curl selbst, siehe Abschnitt 6b Punkt 5 für die
  Client-seitige Cache-Falle die trotzdem auftrat).
- Working tree sauber (bis auf dieses HANDOFF.md-Update).

---

## 10. Offene Punkte / nächste Schritte

- **Import erledigt.** 13 Gewohnheiten (die alten 11 + "Zahnspange tragen" Pos.3 +
  "Sonderaktivität" Pos.13) importiert, User bestätigt "passt alles". Falls nochmal
  ein Reset/Neu-Import gewünscht ist: `habit-tracker-import.json` im Projektordner
  liegt schon in dieser 13er-Version, Import über **Verwalten → Backup → Importieren**
  (überschreibt IMMER komplett, vorher fragen ob das ok ist).
- **Punkt 9 (Erinnerungen-Konzept, iOS-Kurzbefehle/Automation)** — angekündigt, immer
  noch nicht umgesetzt/besprochen.
- **Stats:** User wollte sich Wochentag-Muster/Trend-Feature nochmal in Ruhe ansehen,
  bisher kein weiteres Feedback dazu.
- **Icon:** war laut User zu Beginn dieser Session bereits erledigt (Homescreen-Icon
  gelöscht+neu hinzugefügt, finale Version bestätigt sichtbar) — kein offener Punkt mehr.
- Kein GitHub-CLI (`gh`) verfügbar — Repo-Verwaltung nur über normales `git`.

---

## 11. Umgebungs-Notizen (für Claude in neuer Session)

- Windows 11, PowerShell + Git-Bash. Node nur als Test-Runner.
- **`python` im Bash-Tool funktioniert nicht** → eigener Node-Static-Server nötig (siehe
  Abschnitt 7), NICHT `.claude/launch.json` dauerhaft auf einen session-gebundenen
  Scratchpad-Pfad ändern (der stirbt mit der Session).
- **GateGuard-Hook** aktiv: vor jedem ersten Bash/Edit/Write pro Datei Facts nötig
  (Importeure, betroffene API, Datenschema, User-Instruktion zitieren). Bei destruktiven
  Git-Befehlen zusätzlich Rollback-Prozedur nennen.
- **Caveman-Mode** aktiv (knappe Antworten in fragmentiertem Deutsch), außer bei
  Commit-Messages/Code-Kommentaren (normal geschrieben) und komplexen Bestätigungen.
- **Browser-Screenshot-Tool (`computer`) kann instabil/kaputt sein** (Timeout) — bei
  Bedarf Canvas-Rendering-Workaround aus Abschnitt 6 wiederverwenden statt blind
  wiederholt zu versuchen.
- **SAT/HabitTracker strikt getrennt halten** — siehe Abschnitt 0, ist ein wiederkehrendes
  Risiko wenn die Session nicht im richtigen Ordner startet.
- **SW-Cache-Fallstrick:** Änderungen nicht sichtbar → SW deregistrieren oder frischen
  Port nutzen. Cache-Version in `sw.js` bei precachten Datei-Änderungen IMMER bumpen.
