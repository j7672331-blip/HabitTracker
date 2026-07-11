# Habit-Tracker — Übergabe / Stand (für neue Session)

Stand: 2026-07-11. Dieses Dokument fasst den kompletten bisherigen Verlauf zusammen,
damit in einer neuen Session nahtlos weitergearbeitet werden kann.

---

## 0. Neue Session richtig starten (WICHTIG)

- **Doppelklick auf `Habit-Tracker.cmd`** (in diesem Ordner) → öffnet ein Terminal
  **im HabitTracker-Ordner** und startet `claude`. Dadurch ist der Arbeitsordner = HabitTracker
  und das Projekt ist **getrennt vom SAT-Projekt** (Arduino/Pi).
- Voraussetzung: `claude` ist installiert und im PATH (ist gegeben).
- **Niemals** Claude aus einem Eltern-Ordner starten, der SAT und HabitTracker enthält.
- Claude aus dem SAT-Software-Ordner wurde in dieser Session genutzt (falsch!) — hat dazu
  geführt, dass Preview-Screenshots im falschen Ordner landeten. Im nächsten Mal korrekt starten.

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
  Pfad `"C:\Program Files\nodejs\node.exe"`; in frischem Terminal auch `node`).
- Dateien (jede mit klarer Aufgabe):
  - `index.html` – Struktur: 3 Ansichten (Heute/Statistik/Verwalten) + untere Tab-Leiste
  - `style.css` – Design 1: dunkel + Spotify-Grün
  - `design2.html` – **NEU:** Design-2-Einstiegspunkt (gleiche IDs/Skripte wie index.html)
  - `style-design2.css` – **NEU:** Design 2: Rot/Violett-Verlauf + weiße Karten
  - `stats.js` – **pure** Funktionen (Datum, Streak, Quote, Heatmap-Tage, Wochenrate); keine DOM/Storage
  - `storage.js` – einzige Schnittstelle zu `localStorage` + Mutationen + Export/Import
  - `app.js` – UI-Logik, verdrahtet alles
  - `sw.js` – Service Worker (Offline-Cache; Cache-Name aktuell **`habit-tracker-v7`**)
  - `manifest.json` – PWA-Metadaten
  - `icons/` – `icon-192.png`, `icon-512.png`, `make_icons.py`
  - `tests/` – `test-cases.js`, `run.js` (Node-Runner via `vm`), `browser-runner.js`, `test.html`
  - `docs/superpowers/specs|plans/` – Design-Spec + Implementierungsplan
  - `previews/` – Vorschau-Screenshots (in `.gitignore`, NICHT committen)
  - `.claude/launch.json` – Preview-Server-Config (python http.server Port 8766)
  - `CLAUDE.md`, `Habit-Tracker.cmd`, `HANDOFF.md` – Projektregeln, Launcher, dieses Dokument

---

## 3. Datenmodell (`localStorage["habitTrackerData"]`)

```json
{
  "habits": [
    { "id": "h1", "name": "Wasser trinken", "farbe": "#5ac8fa",
      "info": "mindestens drei Liter", "erstelltAm": "2026-04-03", "archiviert": false }
  ],
  "eintraege": { "h1": { "2026-07-11": true } }
}
```
- Nur **erledigte** Tage werden gespeichert. Fehlt ein Datum = nicht erledigt.
- Datumsschlüssel `YYYY-MM-DD` nach **lokaler** Gerätezeit.
- `info` = kursive Zusatzinfo pro Gewohnheit (optional, Standard "").

---

## 4. Funktionen (aktueller Stand)

**Heute:** Datum als Bold-Kopf, Fortschrittsbalken, Text „X von Y erledigt". Liste als
iOS-Gruppenkarte: Farbpunkt + Name + kursive Zusatzinfo + Häkchen-Kreis mit Fill-Animation.
Ganze Zeile tippbar = heute umschalten. Nur heute+gestern tippbar (ältere Tage = Anzeige only).

**Statistik:** Chips „Alle" + je Gewohnheit.
- Einzel-Gewohnheit: Kennzahlen „Aktuelle Serie / Längste Serie / Erfolgsquote"
  (Zeitraum 7/30/Gesamt umschaltbar) + Monatskalender (‹ › Navigation, vorwärts gesperrt).
- „Alle": Kennzahlen „Heute X/Y · Perfekte Tage · Ø Quote"; Kalender nach Erfüllungs-Anteil
  schattiert (mehr Akzentfarbe = mehr erfüllt), nicht tippbar.
- Verlauf-/Linien-Chart wurde entfernt (redundant zum Kalender).

**Verwalten:** Anlegen (Name + Zusatzinfo + Farbe), Bearbeiten, Archivieren, Löschen.
Backup (Export/Import JSON).

**PWA:** offline-fähig (Service Worker), installierbar (manifest).

---

## 5. Design

### Design 1 (`index.html` + `style.css`) — Apple dunkel + Spotify-Grün
- `--paper:#000000` `--surface:#1c1c1e` `--accent:#1db954`
- Dunkle Karte, grüner Häkchen-Fill, grüne Heatmap

### Design 2 (`design2.html` + `style-design2.css`) — Fitness Club Rot/Violett ← NEU
- Verlauf: `#d51a3c` → `#5c1842` → `#221230` (Rot → tiefes Pflaume-Violett)
- Weiße iOS-Karten auf dem Verlauf
- Roter Häkchen-Fill, rote Akzent-Labels, Pillen-Buttons
- Weiße glasmorphe Tabbar
- Heatmap: `color-mix(var(--accent))` → rot statt grün
- **Design-Wahl noch offen — User hat noch nicht entschieden**

---

## 6. Wichtige Änderungen dieser Session (2026-07-11)

### app.js — Heatmap-Shading
Vorher: `cell.style.background = "rgba(29,185,84," + ...` (hartkodiertes Grün)
Jetzt:  `cell.style.background = "color-mix(in srgb, var(--accent) " + pct + "%, transparent)"`
→ Beide Designs nutzen ihre eigene Akzentfarbe. Behavior unverändert, 34/34 Tests grün.

### sw.js — Cache v6 → v7
- Precache enthält jetzt auch `design2.html` + `style-design2.css`
- **ACHTUNG:** SW cached aggressiv. Beim Testen immer auf frischem Port oder SW manuell
  deregistrieren (DevTools → Application → Service Workers → Unregister).

### Git-Commits dieser Session
- `56ae2dc` — Add second design variant (Fitness Club red theme)
- `b5beeab` — Add preview launch config (.claude/launch.json)

---

## 7. Entwickeln / Testen / Vorschau

- **Tests:** `"C:\Program Files\nodejs\node.exe" tests/run.js` → **34/34 grün.**
- **Lokal ansehen:** `python -m http.server 8766`
  **ACHTUNG:** `python` im Bash-Tool funktioniert nicht (Windows App-Execution-Alias).
  Workaround: Node-Server via PowerShell, oder `C:\Users\jonat\AppData\Local\Python\bin\python3.exe`.
- **Design vergleichen:**
  - Design 1: `http://localhost:PORT/index.html`
  - Design 2: `http://localhost:PORT/design2.html`
- **Playwright-Screenshots** IMMER nach `previews/` — nie in fremde Ordner!

---

## 8. Deployment & iPhone

- Hosting über **GitHub Pages** (kostenlos, HTTPS; Pflicht für PWA/Service Worker).
- iPhone: HTTPS-URL in **Safari** → Teilen → **Zum Home-Bildschirm**.
- **Erinnerung:** iPhone-Kurzbefehle → Automation „Tageszeit 22:00, täglich" → App öffnen.

---

## 9. Git-Stand

- Branch: `master`. Letzter Commit: `b5beeab`. **25 Commits gesamt.**
- Working tree: **sauber** (alles committed, außer HANDOFF.md nach diesem Update).
- GitHub-Repo noch nicht angelegt → GitHub Pages noch nicht aktiv → kein iPhone-Zugriff.

---

## 10. Offene Punkte / nächste Schritte

- **Design-Entscheidung:** Design 1 (schwarz/grün) oder Design 2 (rot/violett)?
- **GitHub-Repo anlegen + Pages aktivieren** → echte iPhone-Nutzung.
- **README** an neuen Stand angleichen (design2 erwähnen, Verlauf-Chart raus).
- HANDOFF.md committen nach diesem Update.
- Optional: Gewohnheiten sortierbar; Hinweis bei leerer Zusatzinfo.

---

## 11. Umgebungs-Notizen (für Claude in neuer Session)

- Windows 11, PowerShell + Git-Bash. Node nur als Test-Runner.
- **`python` im Bash-Tool funktioniert nicht** → Node-Server via PowerShell oder python3-Pfad.
- **GateGuard-Hook** aktiv: vor Bash/Edit/Write Facts nötig. Einmal beantworten, identisch wiederholen.
- **Caveman-Mode** aktiv (knappe Antworten).
- **SW-Cache-Fallstrick:** Änderungen nicht sichtbar → SW deregistrieren oder frischen Port nutzen.
  Cache-Version in `sw.js` bei App-Änderungen immer bumpen.
