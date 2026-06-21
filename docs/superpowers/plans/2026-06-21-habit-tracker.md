# Habit-Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine installierbare iPhone-PWA, mit der man Gewohnheiten täglich abhakt (Ja/Nein) und vergangene Werte als Statistik (Streak, Erfolgsquote, Kalender-Heatmap, Verlaufs-Diagramm) einsieht.

**Architecture:** Reine statische Web-App ohne Framework/Build-Tool. Pure Berechnungslogik in `stats.js`, gekapselter Datenzugriff (`localStorage` + JSON-Backup) in `storage.js`, UI-Verdrahtung in `app.js`. Offline-fähig über Service Worker, installierbar über `manifest.json`.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES2015+), `localStorage`, `<canvas>` für Diagramme, Service Worker. Tests laufen **headless mit Node** (`node tests/run.js`) und sind zusätzlich im Browser ansehbar (`tests/test.html`). Lokaler Server: `python -m http.server`. Hosting: GitHub Pages.

## Global Constraints

- **Keine externen Bibliotheken/Frameworks/Build-Tools** für die App selbst. Nur Vanilla HTML/CSS/JS. (Node wird ausschließlich als Test-Runner verwendet, nicht von der App.)
- **Test-Ausführung:** `"/c/Program Files/nodejs/node.exe" tests/run.js` (Node v24 ist installiert; in einem frisch gestarteten Terminal funktioniert auch kurz `node tests/run.js`). Exit-Code 0 = alle grün. Die Quelldateien `stats.js`/`storage.js` bleiben **unveränderte Browser-Skripte** (keine `require`/`module.exports`-Zeilen) – der Node-Runner lädt sie per `vm.runInThisContext`.
- **Datumsschlüssel** immer Format `YYYY-MM-DD` nach **lokaler Gerätezeit**.
- **Speicherung** ausschließlich über `localStorage` unter dem Schlüssel `habitTrackerData`.
- **Nachträgliches Abhaken** nur für **heute und gestern** erlaubt (UI-Regel), ältere Tage nur Anzeige.
- **Sprache der Oberfläche:** Deutsch.
- Jede Gewohnheit hat eine eigene Farbe (Hex) als roter Faden.
- Datenmodell: `{ habits: [{id, name, farbe, erstelltAm, archiviert}], eintraege: { habitId: { "YYYY-MM-DD": true } } }`. Es werden **nur erledigte Tage** gespeichert.

---

## File Structure

- `index.html` – Markup der drei Ansichten (Heute / Statistik / Verwalten) + untere Tab-Leiste
- `style.css` – Gestaltung, Dark-Mode, große Tippflächen
- `stats.js` – pure Funktionen: Datums-Helfer + alle Statistik-Berechnungen (keine DOM-/Storage-Zugriffe)
- `storage.js` – einzige Schnittstelle zu `localStorage` + Daten-Mutationen + Export/Import
- `app.js` – UI-Logik: rendert Ansichten, verdrahtet Events, ruft `storage.js`/`stats.js`
- `sw.js` – Service Worker (Offline-Caching)
- `manifest.json` – PWA-Metadaten
- `icons/icon-192.png`, `icons/icon-512.png` – App-Icons
- `tests/test-cases.js` – **alle Testfälle** (umgebungsneutral; ruft globale `assertEqual`); von Node- und Browser-Runner gemeinsam genutzt
- `tests/run.js` – Node-Runner: shimt `localStorage`, definiert `assertEqual`/`summary`, lädt `stats.js`+`storage.js`+`test-cases.js` per `vm`, Exit-Code nach Ergebnis
- `tests/browser-runner.js` – Browser-Variante von `assertEqual`/`summary` (schreibt ins DOM)
- `tests/test.html` – Browser-Testseite, lädt `stats.js`+`storage.js`+`browser-runner.js`+`test-cases.js`
- `README.md` – Bedienung, lokale Entwicklung, Deployment, iOS-Kurzbefehl-Erinnerung

**TDD-Grenze:** `stats.js` und `storage.js` enthalten die testbare Logik → echte Tests zuerst, verifiziert mit `node tests/run.js`. `app.js`, `style.css`, `sw.js`, `manifest.json`, Icons → manuelle Verifikation im Browser (UI/PWA-Plumbing).

---

## Task 1: Projektgerüst & Test-Harness

**Files:**
- Create: `tests/test-cases.js`
- Create: `tests/run.js`
- Create: `tests/browser-runner.js`
- Create: `tests/test.html`
- Create: `stats.js`
- Create: `storage.js`
- Create: `.gitignore`

**Interfaces:**
- Produces:
  - Globale Test-Helfer `assertEqual(name, actual, expected)` und `summary()` – in Node von `tests/run.js`, im Browser von `tests/browser-runner.js` bereitgestellt.
  - `tests/test-cases.js` enthält **nur** die `assertEqual(...)`-Aufrufe (kein `summary()`), wird von beiden Runnern geladen.
  - Konvention: `stats.js`/`storage.js` definieren Funktionen im globalen Scope (normale `function`-Deklarationen, keine `module.exports`).

> **Hinweis Git:** Das Repo ist bereits initialisiert und enthält einen leeren Wurzel-Commit. Kein erneutes `git init` nötig.

- [ ] **Step 1: `.gitignore` anlegen**

```
# OS / Editor
.DS_Store
Thumbs.db
.vscode/
node_modules/
```

- [ ] **Step 2: Leere Logik-Dateien anlegen**

`stats.js`:
```javascript
// Pure Berechnungslogik. Keine DOM-, keine Storage-Zugriffe.
"use strict";
```

`storage.js`:
```javascript
// Einzige Schnittstelle zu localStorage + Backup.
"use strict";
const STORAGE_KEY = "habitTrackerData";
```

- [ ] **Step 3: Testfall-Datei `tests/test-cases.js` schreiben**

Enthält nur Testfälle (kein Framework, kein `summary()`). Sanity-Check zuerst; spätere Tasks hängen ihre Fälle hier an.
```javascript
"use strict";
// --- Sanity check (bleibt als erster Fall stehen) ---
assertEqual("framework works", 1 + 1, 2);
```

- [ ] **Step 4: Node-Runner `tests/run.js` schreiben**

```javascript
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

// In-Memory-localStorage-Shim (Node hat kein localStorage)
let _ls = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(_ls, k) ? _ls[k] : null; },
  setItem: function (k, v) { _ls[k] = String(v); },
  removeItem: function (k) { delete _ls[k]; },
  clear: function () { _ls = {}; }
};

let _pass = 0, _fail = 0;
global.assertEqual = function (name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (ok) { _pass++; } else { _fail++; }
  console.log((ok ? "PASS: " : "FAIL: ") + name + (ok ? "" : "  (got " + a + ", want " + e + ")"));
};
global.summary = function () {
  console.log("--- " + _pass + " passed, " + _fail + " failed ---");
};

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), "utf8");
  vm.runInThisContext(code, { filename: rel });
}

load("../stats.js");
load("../storage.js");
load("./test-cases.js");
summary();
process.exit(_fail > 0 ? 1 : 0);
```

- [ ] **Step 5: Browser-Runner `tests/browser-runner.js` schreiben**

```javascript
"use strict";
let _pass = 0, _fail = 0;
function assertEqual(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (ok) { _pass++; } else { _fail++; }
  const row = document.createElement("div");
  row.textContent = (ok ? "PASS: " : "FAIL: ") + name + (ok ? "" : "  (got " + a + ", want " + e + ")");
  row.style.color = ok ? "green" : "red";
  document.getElementById("results").appendChild(row);
}
function summary() {
  const s = document.createElement("div");
  s.textContent = "--- " + _pass + " passed, " + _fail + " failed ---";
  s.style.fontWeight = "bold";
  s.style.marginTop = "1em";
  document.getElementById("results").appendChild(s);
}
```

- [ ] **Step 6: `tests/test.html` schreiben**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Habit-Tracker Tests</title>
  <style>body{font-family:monospace;padding:1em} #results div{padding:2px 0}</style>
</head>
<body>
  <h1>Habit-Tracker Tests</h1>
  <div id="results"></div>
  <script src="../stats.js"></script>
  <script src="../storage.js"></script>
  <script src="browser-runner.js"></script>
  <script src="test-cases.js"></script>
  <script>summary();</script>
</body>
</html>
```

- [ ] **Step 7: Tests headless ausführen (grün erwartet)**

Aus dem Projektordner:
```bash
"/c/Program Files/nodejs/node.exe" tests/run.js
```
Erwartet: `PASS: framework works` und `--- 1 passed, 0 failed ---`, Exit-Code 0.

- [ ] **Step 8: Commit**

```bash
git add .gitignore stats.js storage.js tests/test-cases.js tests/run.js tests/browser-runner.js tests/test.html
git commit -m "chore: project scaffold and dual (node+browser) test harness"
```

---

## Task 2: Datums-Helfer in stats.js

**Files:**
- Modify: `stats.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Produces:
  - `dateKey(date: Date) -> "YYYY-MM-DD"` (lokale Zeit)
  - `todayKey() -> "YYYY-MM-DD"`
  - `addDays(key: "YYYY-MM-DD", n: number) -> "YYYY-MM-DD"`

- [ ] **Step 1: Failing Tests schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- stats: Datums-Helfer ---
assertEqual("dateKey formats with padding",
  dateKey(new Date(2026, 0, 5)), "2026-01-05");
assertEqual("addDays forward across month",
  addDays("2026-01-31", 1), "2026-02-01");
assertEqual("addDays backward across year",
  addDays("2026-01-01", -1), "2025-12-31");
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: FAIL-Zeilen (rot), z. B. „dateKey is not defined" in der Konsole.

- [ ] **Step 3: Implementierung in `stats.js` ergänzen**

```javascript
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function todayKey() {
  return dateKey(new Date());
}

function addDays(key, n) {
  const parts = key.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + n);
  return dateKey(dt);
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: alle drei Datums-Tests grün.

- [ ] **Step 5: Commit**

```bash
git add stats.js tests/test-cases.js
git commit -m "feat: date key helpers (dateKey, todayKey, addDays)"
```

---

## Task 3: Streak-Berechnungen

**Files:**
- Modify: `stats.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Consumes: `addDays`
- Produces:
  - `currentStreak(entries: {[key]: true}, todayK: "YYYY-MM-DD") -> number`
  - `longestStreak(entries: {[key]: true}) -> number`

- [ ] **Step 1: Failing Tests schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- stats: Streaks ---
assertEqual("currentStreak counts run ending today",
  currentStreak({ "2026-06-19": true, "2026-06-20": true, "2026-06-21": true }, "2026-06-21"), 3);
assertEqual("currentStreak allows ending yesterday if today missing",
  currentStreak({ "2026-06-19": true, "2026-06-20": true }, "2026-06-21"), 2);
assertEqual("currentStreak is 0 if neither today nor yesterday",
  currentStreak({ "2026-06-18": true }, "2026-06-21"), 0);
assertEqual("currentStreak empty",
  currentStreak({}, "2026-06-21"), 0);
assertEqual("longestStreak finds best run",
  longestStreak({ "2026-06-01": true, "2026-06-02": true, "2026-06-05": true, "2026-06-06": true, "2026-06-07": true }), 3);
assertEqual("longestStreak single day",
  longestStreak({ "2026-06-01": true }), 1);
assertEqual("longestStreak empty",
  longestStreak({}), 0);
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: neue Streak-Tests rot (FAIL).

- [ ] **Step 3: Implementierung in `stats.js` ergänzen**

```javascript
function currentStreak(entries, todayK) {
  let start = todayK;
  if (!entries[todayK]) {
    const y = addDays(todayK, -1);
    if (!entries[y]) { return 0; }
    start = y;
  }
  let count = 0;
  let cur = start;
  while (entries[cur]) {
    count++;
    cur = addDays(cur, -1);
  }
  return count;
}

function longestStreak(entries) {
  const keys = Object.keys(entries).filter(function (k) { return entries[k]; }).sort();
  if (keys.length === 0) { return 0; }
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === addDays(keys[i - 1], 1)) { run++; } else { run = 1; }
    if (run > best) { best = run; }
  }
  return best;
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: alle Streak-Tests grün.

- [ ] **Step 5: Commit**

```bash
git add stats.js tests/test-cases.js
git commit -m "feat: current and longest streak calculations"
```

---

## Task 4: Erfolgsquote

**Files:**
- Modify: `stats.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Consumes: `addDays`
- Produces:
  - `successRate(entries, createdAt: "YYYY-MM-DD", todayK: "YYYY-MM-DD", rangeDays: number|null) -> number` (0–100, gerundet). `rangeDays=null` bedeutet „seit Erstelldatum".

- [ ] **Step 1: Failing Tests schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- stats: Erfolgsquote ---
assertEqual("successRate full since creation",
  successRate({ "2026-06-19": true, "2026-06-21": true }, "2026-06-19", "2026-06-21", null), 67);
assertEqual("successRate 100 percent",
  successRate({ "2026-06-20": true, "2026-06-21": true }, "2026-06-20", "2026-06-21", null), 100);
assertEqual("successRate 0 when nothing done",
  successRate({}, "2026-06-19", "2026-06-21", null), 0);
assertEqual("successRate range limited to last 7 days",
  successRate({ "2026-06-21": true }, "2026-01-01", "2026-06-21", 7), 14);
assertEqual("successRate range start clamped to creation",
  successRate({ "2026-06-21": true }, "2026-06-20", "2026-06-21", 7), 50);
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: Erfolgsquoten-Tests rot.

- [ ] **Step 3: Implementierung in `stats.js` ergänzen**

```javascript
function successRate(entries, createdAt, todayK, rangeDays) {
  let start = createdAt;
  if (rangeDays) {
    const rangeStart = addDays(todayK, -(rangeDays - 1));
    if (rangeStart > start) { start = rangeStart; } // ISO-Strings vergleichen sich korrekt
  }
  if (start > todayK) { return 0; }
  let total = 0;
  let done = 0;
  let cur = start;
  while (cur <= todayK) {
    total++;
    if (entries[cur]) { done++; }
    cur = addDays(cur, 1);
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: alle Erfolgsquoten-Tests grün.

- [ ] **Step 5: Commit**

```bash
git add stats.js tests/test-cases.js
git commit -m "feat: success rate with optional range window"
```

---

## Task 5: Heatmap-Daten

**Files:**
- Modify: `stats.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Consumes: `addDays`
- Produces:
  - `heatmapDays(entries, todayK: "YYYY-MM-DD", numDays: number) -> Array<{date: "YYYY-MM-DD", done: boolean}>` (chronologisch, ältester zuerst, endet bei `todayK`).

- [ ] **Step 1: Failing Test schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- stats: Heatmap ---
assertEqual("heatmapDays returns numDays entries ending today",
  heatmapDays({ "2026-06-20": true }, "2026-06-21", 3),
  [ { date: "2026-06-19", done: false },
    { date: "2026-06-20", done: true },
    { date: "2026-06-21", done: false } ]);
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: Heatmap-Test rot.

- [ ] **Step 3: Implementierung in `stats.js` ergänzen**

```javascript
function heatmapDays(entries, todayK, numDays) {
  const out = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const key = addDays(todayK, -i);
    out.push({ date: key, done: !!entries[key] });
  }
  return out;
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: Heatmap-Test grün.

- [ ] **Step 5: Commit**

```bash
git add stats.js tests/test-cases.js
git commit -m "feat: heatmap day array builder"
```

---

## Task 6: Wöchentlicher Verlauf (Trend)

**Files:**
- Modify: `stats.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Consumes: `dateKey`, `addDays`
- Produces:
  - `startOfWeek(key: "YYYY-MM-DD") -> "YYYY-MM-DD"` (Montag der Woche)
  - `weeklyRates(entries, createdAt, todayK) -> Array<{weekStart: "YYYY-MM-DD", rate: number}>` (rate 0–100, nur Tage zwischen createdAt und todayK zählen)

- [ ] **Step 1: Failing Tests schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- stats: Wochenverlauf ---
// 2026-06-15 ist ein Montag.
assertEqual("startOfWeek returns Monday",
  startOfWeek("2026-06-17"), "2026-06-15");
assertEqual("startOfWeek on Monday returns same day",
  startOfWeek("2026-06-15"), "2026-06-15");
assertEqual("weeklyRates one partial week",
  weeklyRates({ "2026-06-15": true, "2026-06-16": true }, "2026-06-15", "2026-06-17"),
  [ { weekStart: "2026-06-15", rate: 67 } ]);
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: Wochenverlauf-Tests rot.

- [ ] **Step 3: Implementierung in `stats.js` ergänzen**

```javascript
function startOfWeek(key) {
  const parts = key.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const dow = (dt.getDay() + 6) % 7; // Montag = 0
  dt.setDate(dt.getDate() - dow);
  return dateKey(dt);
}

function weeklyRates(entries, createdAt, todayK) {
  let ws = startOfWeek(createdAt);
  const lastWs = startOfWeek(todayK);
  const out = [];
  while (ws <= lastWs) {
    let total = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(ws, i);
      if (day < createdAt || day > todayK) { continue; }
      total++;
      if (entries[day]) { done++; }
    }
    out.push({ weekStart: ws, rate: total === 0 ? 0 : Math.round((done / total) * 100) });
    ws = addDays(ws, 7);
  }
  return out;
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: alle Wochenverlauf-Tests grün.

- [ ] **Step 5: Commit**

```bash
git add stats.js tests/test-cases.js
git commit -m "feat: weekly success-rate series for trend chart"
```

---

## Task 7: Datenspeicher & Mutationen (storage.js)

**Files:**
- Modify: `storage.js`
- Modify: `tests/test-cases.js`

**Interfaces:**
- Produces:
  - `loadData() -> {habits: [], eintraege: {}}` (liefert leere Struktur, wenn nichts/Invalides gespeichert)
  - `saveData(data) -> void`
  - `createHabit(data, name, farbe, todayK) -> data` (hängt Habit mit neuer id an)
  - `updateHabit(data, id, name, farbe) -> data`
  - `archiveHabit(data, id) -> data`
  - `deleteHabit(data, id) -> data` (entfernt Habit **und** seine Einträge)
  - `toggleEntry(data, habitId, dateK) -> data` (setzt/entfernt erledigt)
  - `exportJson(data) -> string`
  - `importJson(str) -> data` (parst, speichert, liefert Daten)

- [ ] **Step 1: Failing Tests schreiben** — ans Ende von `tests/test-cases.js` anhängen:

```javascript
// --- storage: Mutationen ---
(function () {
  let d = { habits: [], eintraege: {} };
  createHabit(d, "Sport", "#34d399", "2026-06-21");
  assertEqual("createHabit adds one habit", d.habits.length, 1);
  assertEqual("createHabit sets fields",
    [d.habits[0].name, d.habits[0].farbe, d.habits[0].erstelltAm, d.habits[0].archiviert],
    ["Sport", "#34d399", "2026-06-21", false]);

  const id = d.habits[0].id;
  toggleEntry(d, id, "2026-06-21");
  assertEqual("toggleEntry sets done", d.eintraege[id]["2026-06-21"], true);
  toggleEntry(d, id, "2026-06-21");
  assertEqual("toggleEntry removes done", d.eintraege[id]["2026-06-21"], undefined);

  updateHabit(d, id, "Laufen", "#60a5fa");
  assertEqual("updateHabit changes name+color",
    [d.habits[0].name, d.habits[0].farbe], ["Laufen", "#60a5fa"]);

  archiveHabit(d, id);
  assertEqual("archiveHabit sets flag", d.habits[0].archiviert, true);

  toggleEntry(d, id, "2026-06-20");
  deleteHabit(d, id);
  assertEqual("deleteHabit removes habit", d.habits.length, 0);
  assertEqual("deleteHabit removes entries", d.eintraege[id], undefined);
})();

// --- storage: Persistenz + Backup ---
(function () {
  localStorage.removeItem("habitTrackerData");
  assertEqual("loadData defaults when empty",
    loadData(), { habits: [], eintraege: {} });

  const d = { habits: [{ id: "h1", name: "X", farbe: "#fff", erstelltAm: "2026-06-21", archiviert: false }], eintraege: { h1: { "2026-06-21": true } } };
  saveData(d);
  assertEqual("saveData/loadData round-trips", loadData(), d);

  const json = exportJson(d);
  localStorage.removeItem("habitTrackerData");
  const imported = importJson(json);
  assertEqual("importJson restores data", imported, d);
  assertEqual("importJson also persists", loadData(), d);
})();
```

- [ ] **Step 2: Tests ausführen, Fehlschlag prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: storage-Tests rot (Funktionen undefined).

- [ ] **Step 3: Implementierung in `storage.js` ergänzen**

```javascript
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { return { habits: [], eintraege: {} }; }
  try {
    const d = JSON.parse(raw);
    return { habits: d.habits || [], eintraege: d.eintraege || {} };
  } catch (e) {
    return { habits: [], eintraege: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createHabit(data, name, farbe, todayK) {
  data.habits.push({ id: genId(), name: name, farbe: farbe, erstelltAm: todayK, archiviert: false });
  return data;
}

function updateHabit(data, id, name, farbe) {
  const h = data.habits.find(function (x) { return x.id === id; });
  if (h) { h.name = name; h.farbe = farbe; }
  return data;
}

function archiveHabit(data, id) {
  const h = data.habits.find(function (x) { return x.id === id; });
  if (h) { h.archiviert = true; }
  return data;
}

function deleteHabit(data, id) {
  data.habits = data.habits.filter(function (x) { return x.id !== id; });
  delete data.eintraege[id];
  return data;
}

function toggleEntry(data, habitId, dateK) {
  if (!data.eintraege[habitId]) { data.eintraege[habitId] = {}; }
  if (data.eintraege[habitId][dateK]) {
    delete data.eintraege[habitId][dateK];
  } else {
    data.eintraege[habitId][dateK] = true;
  }
  return data;
}

function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

function importJson(str) {
  const d = JSON.parse(str);
  const data = { habits: d.habits || [], eintraege: d.eintraege || {} };
  saveData(data);
  return data;
}
```

- [ ] **Step 4: Tests ausführen, PASS prüfen**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: alle storage-Tests grün, Gesamt-Summary „0 failed".

- [ ] **Step 5: Commit**

```bash
git add storage.js tests/test-cases.js
git commit -m "feat: localStorage data layer, mutations and JSON backup"
```

---

## Task 8: Grundgerüst der Oberfläche (index.html + style.css)

**Files:**
- Create: `index.html`
- Create: `style.css`

**Interfaces:**
- Produces: DOM-Struktur mit IDs/Klassen, auf die `app.js` (Task 9–11) zugreift:
  - drei `<section>` mit IDs `view-today`, `view-stats`, `view-manage`
  - Tab-Buttons mit `data-view="today|stats|manage"` und Klasse `tab`
  - Container `#today-list`, `#manage-list`
  - Statistik-Bereiche: `#stats-habit-select`, `#stat-current`, `#stat-longest`, `#stat-rate`, `#stat-range` (Buttons), `#heatmap`, `#trend` (`<canvas>`)
  - „Neu"-Formularfelder: `#new-name`, `#new-color`, Button `#add-habit`
  - Backup-Buttons: `#export-btn`, `#import-btn`, verstecktes `<input type="file" id="import-file">`

- [ ] **Step 1: `index.html` schreiben**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#111827">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="style.css">
  <title>Habit-Tracker</title>
</head>
<body>
  <main>
    <!-- HEUTE -->
    <section id="view-today" class="view">
      <h1>Heute</h1>
      <div id="today-list"></div>
    </section>

    <!-- STATISTIK -->
    <section id="view-stats" class="view hidden">
      <h1>Statistik</h1>
      <div id="stats-habit-select" class="chips"></div>
      <div class="stat-cards">
        <div class="stat-card"><span id="stat-current">0</span><label>Aktuelle Serie</label></div>
        <div class="stat-card"><span id="stat-longest">0</span><label>Längste Serie</label></div>
        <div class="stat-card"><span id="stat-rate">0%</span><label>Erfolgsquote</label></div>
      </div>
      <div id="stat-range" class="chips">
        <button data-range="7">7 Tage</button>
        <button data-range="30" class="active">30 Tage</button>
        <button data-range="0">Gesamt</button>
      </div>
      <h2>Kalender</h2>
      <div id="heatmap"></div>
      <h2>Verlauf (wöchentlich)</h2>
      <canvas id="trend" width="320" height="140"></canvas>
    </section>

    <!-- VERWALTEN -->
    <section id="view-manage" class="view hidden">
      <h1>Verwalten</h1>
      <div class="new-habit">
        <input id="new-name" type="text" placeholder="Name der Gewohnheit" maxlength="40">
        <input id="new-color" type="color" value="#34d399">
        <button id="add-habit">Hinzufügen</button>
      </div>
      <div id="manage-list"></div>
      <h2>Backup</h2>
      <div class="backup">
        <button id="export-btn">Exportieren</button>
        <button id="import-btn">Importieren</button>
        <input id="import-file" type="file" accept="application/json" hidden>
      </div>
    </section>
  </main>

  <nav class="tabbar">
    <button class="tab active" data-view="today">Heute</button>
    <button class="tab" data-view="stats">Statistik</button>
    <button class="tab" data-view="manage">Verwalten</button>
  </nav>

  <script src="stats.js"></script>
  <script src="storage.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css` schreiben**

```css
:root {
  --bg: #111827; --card: #1f2937; --text: #f3f4f6; --muted: #9ca3af;
  --accent: #34d399; --grid-empty: #374151;
}
* { box-sizing: border-box; }
body {
  margin: 0; font-family: -apple-system, system-ui, sans-serif;
  background: var(--bg); color: var(--text);
  padding-bottom: 4.5rem;
}
main { padding: 1rem 1rem 0; max-width: 600px; margin: 0 auto; }
h1 { font-size: 1.6rem; margin: 0.5rem 0 1rem; }
h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: var(--muted); }
.hidden { display: none; }

/* HEUTE-Liste */
.habit-row {
  display: flex; align-items: center; gap: 0.8rem;
  background: var(--card); border-radius: 14px;
  padding: 1rem; margin-bottom: 0.7rem;
}
.habit-check {
  width: 44px; height: 44px; border-radius: 50%; flex: 0 0 auto;
  border: 3px solid var(--muted); background: transparent;
  transition: transform 0.12s ease, background 0.12s ease;
}
.habit-check.done { background: var(--accent); border-color: var(--accent); transform: scale(1.05); }
.habit-info { flex: 1; }
.habit-info .name { font-size: 1.1rem; }
.habit-info .streak { color: var(--muted); font-size: 0.9rem; }

/* Statistik */
.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.chips button {
  background: var(--card); color: var(--text); border: none;
  padding: 0.5rem 0.9rem; border-radius: 999px; font-size: 0.9rem;
}
.chips button.active { background: var(--accent); color: #06281d; }
.stat-cards { display: flex; gap: 0.7rem; }
.stat-card { flex: 1; background: var(--card); border-radius: 14px; padding: 0.9rem; text-align: center; }
.stat-card span { display: block; font-size: 1.5rem; font-weight: 700; }
.stat-card label { color: var(--muted); font-size: 0.8rem; }

/* Heatmap */
#heatmap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cell { aspect-ratio: 1; border-radius: 4px; background: var(--grid-empty); }
.cell.tappable { outline: 2px solid var(--muted); }

/* Verwalten */
.new-habit, .backup { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.new-habit input[type=text] { flex: 1; padding: 0.6rem; border-radius: 10px; border: none; }
button { font-size: 1rem; padding: 0.6rem 1rem; border: none; border-radius: 10px;
  background: var(--accent); color: #06281d; }
.manage-row { display: flex; align-items: center; gap: 0.6rem; background: var(--card);
  border-radius: 12px; padding: 0.7rem; margin-bottom: 0.6rem; }
.manage-row .dot { width: 18px; height: 18px; border-radius: 50%; }
.manage-row .name { flex: 1; }
.manage-row button { background: var(--grid-empty); color: var(--text); padding: 0.4rem 0.7rem; font-size: 0.85rem; }

/* Tab-Leiste */
.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; display: flex;
  background: var(--card); border-top: 1px solid #000;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab { flex: 1; background: transparent; color: var(--muted); border-radius: 0; padding: 0.9rem 0; }
.tab.active { color: var(--accent); }
canvas { width: 100%; height: auto; background: var(--card); border-radius: 12px; }
```

- [ ] **Step 3: Im Browser sichtbar prüfen**

Aus dem Projektordner `python -m http.server` starten, `http://localhost:8000/` öffnen.
Erwartet: „Heute"-Überschrift sichtbar, untere Tab-Leiste mit drei Tabs. (Tabs wechseln noch nicht — kommt in Task 9.) Keine JS-Fehler in der Konsole außer evtl. „app.js 404", solange app.js fehlt — lege in diesem Fall vor dem Test eine leere `app.js` an.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: app shell markup and styling (3 views + tab bar)"
```

---

## Task 9: app.js – Navigation & „Heute"-Ansicht

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes: `loadData`, `saveData`, `toggleEntry`, `todayKey`, `addDays`, `currentStreak`
- Produces (global, von Task 10/11 weiterverwendet):
  - `state` (geladene Daten), `render()` (rendert die aktuelle Ansicht neu), `activeHabitId` (für Statistik), `showView(name)`
  - `renderToday()`

- [ ] **Step 1: `app.js` schreiben**

```javascript
"use strict";

let state = loadData();
let currentView = "today";
let activeHabitId = null;
let activeRange = 30;

function activeHabits() {
  return state.habits.filter(function (h) { return !h.archiviert; });
}

function showView(name) {
  currentView = name;
  ["today", "stats", "manage"].forEach(function (v) {
    document.getElementById("view-" + v).classList.toggle("hidden", v !== name);
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("active", t.dataset.view === name);
  });
  render();
}

function render() {
  if (currentView === "today") { renderToday(); }
  else if (currentView === "stats") { renderStats(); }
  else if (currentView === "manage") { renderManage(); }
}

function renderToday() {
  const list = document.getElementById("today-list");
  list.innerHTML = "";
  const today = todayKey();
  const habits = activeHabits();
  if (habits.length === 0) {
    list.innerHTML = "<p>Noch keine Gewohnheiten. Lege unter „Verwalten" eine an.</p>";
    return;
  }
  habits.forEach(function (h) {
    const entries = state.eintraege[h.id] || {};
    const done = !!entries[today];
    const row = document.createElement("div");
    row.className = "habit-row";
    const streak = currentStreak(entries, today);
    row.innerHTML =
      '<button class="habit-check' + (done ? " done" : "") + '"' +
      ' style="' + (done ? "background:" + h.farbe + ";border-color:" + h.farbe : "border-color:" + h.farbe) + '"></button>' +
      '<div class="habit-info"><div class="name">' + escapeHtml(h.name) + '</div>' +
      '<div class="streak">' + (streak > 0 ? "🔥 " + streak + " Tage" : "Noch keine Serie") + "</div></div>";
    row.querySelector(".habit-check").addEventListener("click", function () {
      toggleEntry(state, h.id, today);
      saveData(state);
      renderToday();
    });
    list.appendChild(row);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Tab-Verdrahtung
document.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () { showView(t.dataset.view); });
});

// Platzhalter, in Task 10/11 implementiert
function renderManage() {}
function renderStats() {}

showView("today");
```

- [ ] **Step 2: Im Browser prüfen**

`http://localhost:8000/` neu laden. Erwartet: Tabs wechseln die Ansicht. „Heute" zeigt Hinweistext (noch keine Gewohnheiten). Keine Konsolenfehler.

- [ ] **Step 3: Manueller Funktionstest mit Testdaten**

In der Browser-Konsole eingeben, um eine Gewohnheit zu simulieren:
```javascript
createHabit(state, "Sport", "#34d399", todayKey()); saveData(state); renderToday();
```
Erwartet: „Sport" erscheint mit Kreis. Klick auf den Kreis → füllt sich, Streak zeigt „🔥 1 Tage". Erneuter Klick → leert sich. Seite neu laden → Zustand bleibt erhalten.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: view navigation and Today view with toggle"
```

---

## Task 10: app.js – „Verwalten"-Ansicht & Backup

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `createHabit`, `updateHabit`, `archiveHabit`, `deleteHabit`, `exportJson`, `importJson`, `saveData`, `todayKey`
- Produces: vollständige `renderManage()`; Backup-Verdrahtung

- [ ] **Step 1: `renderManage()`-Platzhalter in `app.js` ersetzen**

Ersetze `function renderManage() {}` durch:
```javascript
function renderManage() {
  const list = document.getElementById("manage-list");
  list.innerHTML = "";
  state.habits.forEach(function (h) {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML =
      '<span class="dot" style="background:' + h.farbe + '"></span>' +
      '<span class="name">' + escapeHtml(h.name) + (h.archiviert ? " (archiviert)" : "") + "</span>";
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Umbenennen";
    renameBtn.addEventListener("click", function () {
      const name = prompt("Neuer Name:", h.name);
      if (name) { updateHabit(state, h.id, name.trim(), h.farbe); saveData(state); renderManage(); }
    });
    const archiveBtn = document.createElement("button");
    archiveBtn.textContent = h.archiviert ? "—" : "Archivieren";
    archiveBtn.disabled = h.archiviert;
    archiveBtn.addEventListener("click", function () {
      archiveHabit(state, h.id); saveData(state); renderManage();
    });
    const delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.addEventListener("click", function () {
      if (confirm('"' + h.name + '" und alle Einträge wirklich löschen?')) {
        deleteHabit(state, h.id); saveData(state); renderManage();
      }
    });
    row.appendChild(renameBtn);
    row.appendChild(archiveBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}
```

- [ ] **Step 2: „Hinzufügen"- und Backup-Verdrahtung am Ende von `app.js` ergänzen** (vor `showView("today");`)

```javascript
document.getElementById("add-habit").addEventListener("click", function () {
  const name = document.getElementById("new-name").value.trim();
  const farbe = document.getElementById("new-color").value;
  if (!name) { return; }
  createHabit(state, name, farbe, todayKey());
  saveData(state);
  document.getElementById("new-name").value = "";
  renderManage();
});

document.getElementById("export-btn").addEventListener("click", function () {
  const blob = new Blob([exportJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habit-tracker-backup-" + todayKey() + ".json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-btn").addEventListener("click", function () {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", function (ev) {
  const file = ev.target.files[0];
  if (!file) { return; }
  const reader = new FileReader();
  reader.onload = function () {
    try {
      state = importJson(reader.result);
      render();
      alert("Backup importiert.");
    } catch (e) {
      alert("Datei konnte nicht gelesen werden.");
    }
  };
  reader.readAsText(file);
});
```

- [ ] **Step 3: Im Browser prüfen**

`http://localhost:8000/` neu laden, Tab „Verwalten".
Erwartet: Name eingeben + Farbe wählen + „Hinzufügen" → Eintrag erscheint und taucht auch unter „Heute" auf. „Umbenennen"/„Archivieren"/„Löschen" funktionieren. „Exportieren" lädt eine `.json`-Datei herunter; „Importieren" mit dieser Datei stellt die Daten wieder her.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: Manage view (CRUD) and JSON export/import"
```

---

## Task 11: app.js – „Statistik"-Ansicht (Heatmap + Diagramm)

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `currentStreak`, `longestStreak`, `successRate`, `heatmapDays`, `weeklyRates`, `toggleEntry`, `saveData`, `todayKey`, `addDays`
- Produces: vollständige `renderStats()`, Hilfsfunktionen `renderHabitChips()`, `renderHeatmap(habit)`, `drawTrend(habit)`

- [ ] **Step 1: `renderStats()`-Platzhalter in `app.js` ersetzen**

```javascript
function renderStats() {
  const habits = activeHabits();
  if (habits.length === 0) {
    document.getElementById("stats-habit-select").innerHTML = "<p>Keine Gewohnheiten.</p>";
    document.getElementById("heatmap").innerHTML = "";
    return;
  }
  if (!activeHabitId || !habits.some(function (h) { return h.id === activeHabitId; })) {
    activeHabitId = habits[0].id;
  }
  renderHabitChips(habits);
  const habit = habits.find(function (h) { return h.id === activeHabitId; });
  const entries = state.eintraege[habit.id] || {};
  const today = todayKey();
  const range = activeRange === 0 ? null : activeRange;
  document.getElementById("stat-current").textContent = currentStreak(entries, today);
  document.getElementById("stat-longest").textContent = longestStreak(entries);
  document.getElementById("stat-rate").textContent =
    successRate(entries, habit.erstelltAm, today, range) + "%";
  renderHeatmap(habit, entries, today);
  drawTrend(habit, entries, today);
}

function renderHabitChips(habits) {
  const box = document.getElementById("stats-habit-select");
  box.innerHTML = "";
  habits.forEach(function (h) {
    const b = document.createElement("button");
    b.textContent = h.name;
    if (h.id === activeHabitId) { b.classList.add("active"); }
    b.addEventListener("click", function () { activeHabitId = h.id; renderStats(); });
    box.appendChild(b);
  });
}

function renderHeatmap(habit, entries, today) {
  const box = document.getElementById("heatmap");
  box.innerHTML = "";
  const yesterday = addDays(today, -1);
  const days = heatmapDays(entries, today, 91); // ~13 Wochen
  days.forEach(function (d) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (d.done) { cell.style.background = habit.farbe; }
    if (d.date === today || d.date === yesterday) {
      cell.classList.add("tappable");
      cell.title = d.date;
      cell.addEventListener("click", function () {
        toggleEntry(state, habit.id, d.date);
        saveData(state);
        renderStats();
      });
    }
    box.appendChild(cell);
  });
}

function drawTrend(habit, entries, today) {
  const canvas = document.getElementById("trend");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, pad = 24;
  ctx.clearRect(0, 0, W, H);
  const series = weeklyRates(entries, habit.erstelltAm, today);
  // Achsen
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad / 2); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 6, H - pad);
  ctx.stroke();
  if (series.length === 0) { return; }
  const plotW = W - pad - 6, plotH = H - pad - pad / 2;
  function x(i) { return pad + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1)); }
  function y(rate) { return (pad / 2) + plotH * (1 - rate / 100); }
  // Linie
  ctx.strokeStyle = habit.farbe;
  ctx.lineWidth = 2;
  ctx.beginPath();
  series.forEach(function (p, i) {
    if (i === 0) { ctx.moveTo(x(i), y(p.rate)); } else { ctx.lineTo(x(i), y(p.rate)); }
  });
  ctx.stroke();
  // Punkte
  ctx.fillStyle = habit.farbe;
  series.forEach(function (p, i) {
    ctx.beginPath(); ctx.arc(x(i), y(p.rate), 3, 0, Math.PI * 2); ctx.fill();
  });
}
```

- [ ] **Step 2: Zeitraum-Buttons am Ende von `app.js` verdrahten** (vor `showView("today");`)

```javascript
document.querySelectorAll("#stat-range button").forEach(function (b) {
  b.addEventListener("click", function () {
    activeRange = Number(b.dataset.range);
    document.querySelectorAll("#stat-range button").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    renderStats();
  });
});
```

- [ ] **Step 3: Im Browser prüfen**

`http://localhost:8000/` neu laden. Lege unter „Verwalten" 1–2 Gewohnheiten an und hake unter „Heute" ab. Tab „Statistik":
Erwartet: Chips zur Auswahl der Gewohnheit; Karten zeigen aktuelle/längste Serie und Erfolgsquote; Zeitraum-Buttons (7/30/Gesamt) ändern die Quote; Heatmap zeigt eingefärbte Tage, **nur heute/gestern** (umrandet) sind anklickbar und schalten den Tag um; Verlaufs-Diagramm zeichnet eine Linie.

- [ ] **Step 4: Regressionslauf der Logik-Tests**

Führe `"/c/Program Files/nodejs/node.exe" tests/run.js` aus. Erwartet: weiterhin „0 failed" (UI-Änderungen haben die pure Logik nicht berührt).

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: Statistics view with streaks, rate, heatmap and trend chart"
```

---

## Task 12: PWA-Plumbing (manifest, Icons, Service Worker)

**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Create: `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `app.js` (Service-Worker-Registrierung)

**Interfaces:**
- Consumes: Datei-Liste der App (für den Cache in `sw.js`)
- Produces: installierbare, offline-fähige PWA

- [ ] **Step 1: `manifest.json` schreiben**

```json
{
  "name": "Habit-Tracker",
  "short_name": "Habits",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#111827",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Icons erzeugen** (mit dem vorhandenen Python)

Lege das Skript `icons/make_icons.py` an:
```python
# Erzeugt einfache App-Icons ohne externe Bibliotheken (minimales PNG via stdlib).
import struct, zlib, os

def write_png(path, size, rgb):
    w = h = size
    raw = bytearray()
    row = bytes(rgb) * w
    for _ in range(h):
        raw.append(0)            # Filter-Typ 0
        raw.extend(row)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit, Truecolor
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

here = os.path.dirname(__file__)
write_png(os.path.join(here, "icon-192.png"), 192, (52, 211, 153))
write_png(os.path.join(here, "icon-512.png"), 512, (52, 211, 153))
print("icons written")
```
Dann ausführen:
```bash
python icons/make_icons.py
```
Erwartet: Ausgabe „icons written", Dateien `icons/icon-192.png` und `icons/icon-512.png` existieren. (Es sind einfache einfarbige Icons in der Akzentfarbe; später bei Bedarf durch ein Wunsch-Icon ersetzbar.)

- [ ] **Step 3: `sw.js` schreiben**

```javascript
"use strict";
const CACHE = "habit-tracker-v1";
const ASSETS = [
  "./index.html",
  "./style.css",
  "./stats.js",
  "./storage.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
```

- [ ] **Step 4: Service-Worker-Registrierung in `app.js` ergänzen** (ganz am Dateiende)

```javascript
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("SW-Registrierung fehlgeschlagen:", err);
    });
  });
}
```

- [ ] **Step 5: Lokal als PWA prüfen**

`python -m http.server` aus dem Projektordner, `http://localhost:8000/` öffnen.
In den DevTools (Application → Service Workers) prüfen: SW ist „activated". Application → Manifest zeigt Name + Icons ohne Fehler. Danach Netzwerk auf „Offline" stellen und Seite neu laden → App lädt weiterhin.

- [ ] **Step 6: Commit**

```bash
git add manifest.json sw.js icons/make_icons.py icons/icon-192.png icons/icon-512.png app.js
git commit -m "feat: PWA manifest, icons and offline service worker"
```

---

## Task 13: README (Bedienung, Deployment, iOS-Erinnerung)

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nichts (Dokumentation)
- Produces: Anleitung für Nutzung, lokale Entwicklung, GitHub-Pages-Deployment, iPhone-Installation und Kurzbefehl-Erinnerung

- [ ] **Step 1: `README.md` schreiben**

````markdown
# Habit-Tracker

Persönlicher Habit-Tracker als installierbare iPhone-Web-App (PWA). Gewohnheiten täglich
abhaken (Ja/Nein), Statistik mit Serie, Erfolgsquote, Kalender-Heatmap und Verlaufs-Diagramm.
Daten liegen lokal im Browser (`localStorage`), Backup per JSON-Export/Import. Kein Server.

## Lokal entwickeln/testen

Python ist nötig (vorinstalliert). Im Projektordner:

```bash
python -m http.server
```

Dann im Browser öffnen:
- App: <http://localhost:8000/>
- Tests: <http://localhost:8000/tests/test.html> (alle Zeilen grün = ok)

Ein lokaler Server ist wichtig, weil der Service Worker unter `file://` nicht lädt.

## Auf dem iPhone installieren (über GitHub Pages)

1. Repo auf GitHub anlegen und Dateien pushen.
2. GitHub → Repo → **Settings → Pages** → Source: Branch `main`, Ordner `/ (root)` → Save.
3. Nach kurzer Zeit erscheint die HTTPS-URL (`https://<user>.github.io/<repo>/`).
4. Diese URL in **Safari** auf dem iPhone öffnen.
5. Teilen-Symbol → **Zum Home-Bildschirm**. Die App liegt nun als Icon vor und startet im Vollbild.

(HTTPS ist Pflicht für Service Worker + Installation — GitHub Pages liefert das kostenlos.)

## Abend-Erinnerung einrichten (iPhone-Kurzbefehle)

Die App kann sich systembedingt nicht selbst zeitgesteuert melden. Stattdessen über die
**Kurzbefehle**-App eine tägliche Erinnerung anlegen:

1. App **Kurzbefehle** öffnen → unten **Automation** → **+** → **Tageszeit**.
2. Uhrzeit z. B. **22:00**, **Täglich**, **Sofort ausführen** (ohne Nachfrage).
3. Aktion hinzufügen: **„App öffnen" → Habit-Tracker** (das Home-Bildschirm-Icon),
   oder **„Mitteilung anzeigen"** mit Text „Gewohnheiten abhaken nicht vergessen 🙂".
4. Fertig — ab jetzt erinnert dich das iPhone jeden Abend.

## Backup

Unter **Verwalten → Exportieren** wird eine JSON-Datei erzeugt (z. B. in iCloud Files
sichern). **Importieren** stellt sie wieder her. Empfehlung: ab und zu exportieren, damit
bei Verlust des Browser-Speichers nichts verloren geht.

## Projektstruktur

| Datei | Aufgabe |
|---|---|
| `index.html` | Struktur der drei Ansichten + Tab-Leiste |
| `style.css` | Gestaltung (Dark-Mode) |
| `stats.js` | pure Berechnungen (Datum, Streak, Quote, Heatmap, Verlauf) |
| `storage.js` | `localStorage` + Mutationen + Export/Import |
| `app.js` | UI-Logik und Verdrahtung |
| `sw.js`, `manifest.json`, `icons/` | PWA (offline + installierbar) |
| `tests/` | Browser-Testseite für die Logik |
````

- [ ] **Step 2: README im Browser/Editor gegenlesen**

Datei öffnen und prüfen, dass die Schritte vollständig und korrekt sind (Pfade, URLs).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: usage, deployment and iOS reminder instructions"
```

---

## Self-Review (vom Plan-Autor durchgeführt)

**Spec-Abdeckung:**
- PWA/HTML/JS, kein Build → Tasks 8–12. ✓
- Abhaken Ja/Nein, mehrere Gewohnheiten, je Farbe → Tasks 7, 9, 10. ✓
- Nachtragen nur Vortag → Task 11 (`renderHeatmap`, nur heute/gestern `tappable`). ✓
- `localStorage` + JSON Export/Import → Task 7, 10. ✓
- Statistik: aktuelle/längste Streak, Erfolgsquote %, Heatmap, Verlaufs-Diagramm (`<canvas>`, keine Bibliothek) → Tasks 3–6, 11. ✓
- Ansichten Heute/Statistik/Verwalten + Tab-Leiste → Tasks 8, 9. ✓
- Erinnerung nicht in App, README-Anleitung → Task 13. ✓
- Datum lokal `YYYY-MM-DD` → Task 2. ✓

**Placeholder-Scan:** Keine TBD/TODO; alle Code-Schritte enthalten vollständigen Code. ✓

**Typ-Konsistenz:** Funktionssignaturen aus den Interfaces stimmen mit Aufrufen in `app.js` überein (`currentStreak(entries, today)`, `successRate(entries, createdAt, today, range)`, `heatmapDays(entries, today, n)`, `weeklyRates(entries, createdAt, today)`, `toggleEntry(data, habitId, dateK)`). ✓

**Hinweis/Annahme:** Hosting über GitHub Pages und Icon-Erzeugung via Python sind über die Spec hinaus ergänzt, weil ohne sie keine echte iPhone-Nutzung möglich wäre. Beides ist optional ersetzbar (anderer Static-Host bzw. eigenes Icon).
````
