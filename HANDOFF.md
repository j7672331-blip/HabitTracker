# Habit-Tracker — Übergabe / Stand (für neue Session)

Stand: 2026-06-22. Dieses Dokument fasst den kompletten bisherigen Verlauf zusammen,
damit in einer neuen Session nahtlos weitergearbeitet werden kann.

---

## 0. Neue Session richtig starten (WICHTIG)

- **Doppelklick auf `Habit-Tracker.cmd`** (in diesem Ordner) → öffnet ein Terminal
  **im HabitTracker-Ordner** und startet `claude`. Dadurch ist der Arbeitsordner = HabitTracker
  und das Projekt ist **getrennt vom SAT-Projekt** (Arduino/Pi).
- Voraussetzung: `claude` ist installiert und im PATH (ist gegeben).
- **Niemals** Claude aus einem Eltern-Ordner starten, der SAT und HabitTracker enthält.

Projektregeln stehen zusätzlich in `CLAUDE.md` (wird automatisch geladen, wenn Claude in
diesem Ordner läuft).

---

## 1. Was das ist

Persönlicher, interaktiver **Habit-Tracker** als installierbare **iPhone-PWA**.
Gewohnheiten täglich abhaken (Ja/Nein), Statistik über vergangene Werte.
Daten **nur lokal** im iPhone (`localStorage`), Backup per JSON Export/Import. **Kein Server.**

Zielgerät: iPhone 16 Pro Max (Safe-Areas/Dynamic Island berücksichtigt), aber responsiv.

---

## 2. Technik & Architektur

- Reine **Vanilla HTML/CSS/JS**, **kein Framework, kein Build-Tool**.
- **Node** ist NICHT für die App, sondern **nur Test-Runner** (lokal installiert: v24,
  Pfad `"/c/Program Files/nodejs/node.exe"`; in frischem Terminal auch `node`).
- Dateien (jede mit klarer Aufgabe):
  - `index.html` – Struktur: 3 Ansichten (Heute/Statistik/Verwalten) + untere Tab-Leiste
  - `style.css` – Design (Theme s. u.)
  - `stats.js` – **pure** Funktionen (Datum, Streak, Quote, Heatmap-Tage, Wochenrate); keine DOM/Storage
  - `storage.js` – einzige Schnittstelle zu `localStorage` + Mutationen + Export/Import
  - `app.js` – UI-Logik, verdrahtet alles
  - `sw.js` – Service Worker (Offline-Cache; Cache-Name aktuell `habit-tracker-v6`)
  - `manifest.json` – PWA-Metadaten
  - `icons/` – `icon-192.png`, `icon-512.png`, `make_icons.py` (erzeugt einfarbige Icons)
  - `tests/` – `test-cases.js` (Testfälle), `run.js` (Node-Runner via `vm`), `browser-runner.js`, `test.html`
  - `docs/superpowers/specs|plans/` – Design-Spec + Implementierungsplan
  - `previews/` – Vorschau-Screenshots (in `.gitignore`, NICHT committen)
  - `CLAUDE.md`, `Habit-Tracker.cmd`, `HANDOFF.md` – Projektregeln, Launcher, dieses Dokument

---

## 3. Datenmodell (`localStorage["habitTrackerData"]`)

```json
{
  "habits": [
    { "id": "h1", "name": "Wasser trinken", "farbe": "#5ac8fa",
      "info": "mindestens drei Liter", "erstelltAm": "2026-04-03", "archiviert": false }
  ],
  "eintraege": { "h1": { "2026-06-22": true } }
}
```
- Nur **erledigte** Tage werden gespeichert. Fehlt ein Datum = nicht erledigt.
- Datumsschlüssel `YYYY-MM-DD` nach **lokaler** Gerätezeit.
- `info` = kursive Zusatzinfo pro Gewohnheit (optional, Standard "").
- Alt-Daten ohne `info` funktionieren (wird als "" behandelt).

---

## 4. Funktionen (aktueller Stand)

**Heute:** Datum als Bold-Kopf (Wochentag + „22. Juni"), grüner Fortschrittsbalken,
Text „X von Y erledigt" → bei allem fertig „Für heute erledigt." Liste als iOS-Gruppenkarte:
Farbpunkt + (kleinerer) Name + **kursive Zusatzinfo** darunter (KEINE Streak hier mehr) +
grüner Häkchen-Kreis mit weicher Füll-Animation. Ganze Zeile tippbar = heute umschalten.

**Statistik:** Chips zur Auswahl — **„Alle"** (Gesamtansicht) + je Gewohnheit.
- Einzel-Gewohnheit: Kennzahlen „Aktuelle Serie / Längste Serie / Erfolgsquote"
  (Zeitraum 7/30/Gesamt umschaltbar) + **Monatskalender** (nur dieser Monat, ‹ › Navigation,
  vorwärts gesperrt im aktuellen Monat, Tageszahl im Kästchen, korrekte Tageszahl 28–31,
  Wochentags-Kopf Mo–So, grün = erledigt, Zukunft gedimmt, heute/gestern tippbar).
- **„Alle":** ANDERS umgesetzt — Kennzahlen „Heute X/Y · Perfekte Tage · Ø Quote";
  Kalender nach **Erfüllungs-Anteil** pro Tag schattiert (mehr grün = mehr erfüllt),
  nicht tippbar.
- Der frühere Verlauf-/Linien-Chart wurde **entfernt** (redundant zum Kalender).

**Verwalten:** Anlegen (Name + Zusatzinfo „Zusatzinfo (optional)" + Farbe), „Bearbeiten"
(fragt Name UND Zusatzinfo), Archivieren, Löschen. **Backup** (Export/Import JSON) — bleibt
erhalten (Sicherheitsnetz, da Daten nur lokal liegen).

**PWA:** offline-fähig (Service Worker), installierbar (manifest), Theme dunkel.

**Regel Nachtragen:** nur **heute und gestern** umschaltbar, ältere Tage nur Anzeige.

---

## 5. Design (aktuell gewählt)

Stil: **dunkel (Apple) + Spotify-Grün**. (Vorher verworfen: „Ruhe/Ritual" hell-Salbei;
sowie Varianten Momentum / Cockpit.)
Tokens in `style.css` `:root`:
- `--paper:#000000` `--surface:#1c1c1e` `--surface-2:#2c2c2e`
- `--ink:#ffffff` `--ink-soft:#aeaeb2` `--muted:#8e8e93`
- `--accent:#1db954` (Spotify-Grün) `--accent-deep:#1ed760` `--on-accent:#04130a`
- `--line:#2c2c2e`
- Schrift: System-Sans (SF), bold Titel. Manifest `theme_color:#1db954`, `background_color:#000`.

---

## 6. Entwickeln / Testen / Vorschau

- **Tests (headless):** im Projektordner `"/c/Program Files/nodejs/node.exe" tests/run.js`
  → Exit 0 = alle grün. **Aktuell: 34/34 grün.** Auch im Browser ansehbar: `tests/test.html`.
  - Quelldateien `stats.js`/`storage.js` bleiben reine Browser-Skripte (kein `require`/`module.exports`);
    `run.js` lädt sie per `vm.runInThisContext` und shimt `localStorage`.
- **Lokal ansehen:** `python -m http.server` → `http://localhost:8000/` (Server nötig, da
  Service Worker unter `file://` nicht lädt).
- **Vorschau-Screenshots** kommen nach `previews/` (gitignored). Beim Testen mit Playwright:
  Daten per `localStorage.setItem("habitTrackerData", …)` seeden, dann neu laden.

---

## 7. Deployment & iPhone

- Hosting über **GitHub Pages** (kostenlos, HTTPS; Pflicht für PWA/Service Worker). Schritte in `README.md`.
- iPhone: HTTPS-URL in **Safari** → Teilen → **Zum Home-Bildschirm**.
- **Erinnerung** ist NICHT in der App (iOS-PWA kann keine geplanten Notifications). Lösung:
  iPhone-**Kurzbefehle** → Automation „Tageszeit 22:00, täglich" → App öffnen / Mitteilung.
  Anleitung in `README.md`.

---

## 8. Git-Stand

- Repo initialisiert, Default-Branch. Letzter Commit: `bbdae49` (combined „Alle"-View).
- 21 Commits gesamt (Scaffold → TDD-Logik → 3 Ansichten → PWA → README → Redesigns → Features).
- **Noch nicht committet** (untracked/modifiziert): `CLAUDE.md`, `Habit-Tracker.cmd`,
  `HANDOFF.md`, `.gitignore` (previews-Ignore). Sollten als nächstes committet werden.

---

## 9. Offene Punkte / mögliche nächste Schritte

- `CLAUDE.md`, `HANDOFF.md`, `Habit-Tracker.cmd`, `.gitignore` committen.
- GitHub-Repo anlegen + GitHub Pages aktivieren (für echte iPhone-Nutzung).
- README ggf. an neues Design/Feature-Stand angleichen (Verlauf-Chart raus, „Alle"-View rein).
- Optional: Hinweis bei leerer Zusatzinfo; Reihenfolge der Gewohnheiten sortierbar.

---

## 10. Umgebungs-Notizen (für Claude in neuer Session)

- Windows 11, PowerShell + Git-Bash. Node nur als Test-Runner (Pfad s. o.).
- Es ist ein **GateGuard-Hook** aktiv, der vor Bash/Edit/Write kurze „Facts" verlangt
  (Importer/Zweck/Schema/Nutzer-Instruktion). Einfach kurz beantworten, dann Aktion wiederholen.
  Abschaltbar via `ECC_GATEGUARD=off` oder `ECC_DISABLED_HOOKS`.
- „Caveman-Mode" war in dieser Session aktiv (knappe Antworten) — rein kosmetisch.
