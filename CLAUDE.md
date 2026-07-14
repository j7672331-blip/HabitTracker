# Habit-Tracker — Projektregeln

## Eigenständiges Projekt
Dieses Projekt ist **vollständig getrennt** vom Projekt „Gesellenstück_SAT" (Arduino/Raspberry-Pi).
Es teilt **keinen** Code, keine Daten und kein Tooling mit dem SAT-Projekt.

**Regel für die Zusammenarbeit:**
- Ausschließlich Dateien **innerhalb** dieses Ordners (`HabitTracker/`) lesen oder ändern.
- **Niemals** Dateien aus `…/Schule/8. Klasse/Mechatronik/Gesellenstück_SAT/` lesen, ändern oder als Referenz heranziehen.
- Kein Vermischen von Inhalten, Konfiguration oder Memory der beiden Projekte.

## Projekt-Fakten
- Typ: PWA (Vanilla HTML/CSS/JS, kein Framework, kein Build-Tool).
- Tests: `"/c/Program Files/nodejs/node.exe" tests/run.js` (Node nur als Test-Runner, `python` ist in dieser Umgebung ein kaputter Store-Stub).
- Speicherung: `localStorage["habitTrackerData"]`; Backup über Export/Import (JSON).
- Vorschau-Screenshots gehören nach `previews/` (in `.gitignore`).
- Design: "Nocturne Grün" — neutrales Schwarz (`--paper #0C0D0C`) + lebendiges Grün (`--accent #34D17A`), Space Grotesk (lokal in `fonts/`) für Titel/Zahlen, Signature-Glow bei Interaktionen.
- **Live-Deploy: GitHub Pages, `https://j7672331-blip.github.io/HabitTracker/`.** Repo `github.com/j7672331-blip/HabitTracker` (public, kein `gh`-CLI verfügbar — Push per `git push origin master`, ggf. Browser-Login-Popup).
- Icon: `icons/icon-192.png`/`icon-512.png`, generiert aus `icons/icon-source.html` (HT-Monogramm, manuell im Browser rendern + screenshotten, keine automatisierte Pipeline).

## Workflow für jede Änderung (eingespielt, bitte einhalten)
1. Lokal testen: Node-Static-Server auf einen freien Port zeigen lassen (Root = dieser Ordner; `.claude/launch.json` hat `python -m http.server` konfiguriert, das läuft in dieser Umgebung NICHT zuverlässig — Node-Server manuell starten ist der bewährte Weg), per Browser/Playwright verifizieren.
2. **Bei jeder Änderung an precachten Dateien (`style.css`, `index.html`, `app.js`, `storage.js`, `manifest.json`, Icons, Fonts) `CACHE`-Version in `sw.js` hochzählen** — sonst bleibt die installierte PWA auf altem Stand hängen.
3. `node tests/run.js` — muss 34/34 grün sein vor jedem Commit.
4. Gezielt stagen (nie `git add -A`), committen, `git push origin master`.
5. Deploy verifizieren: `curl` die Datei von der Pages-URL, mit lokaler Datei per `cmp`/`md5sum` vergleichen (Pages braucht oft 10–30s zum Neubauen).
6. Nutzer muss bei Icon-/Name-Änderungen das Homescreen-Icon löschen + neu hinzufügen (iOS cached das App-Icon/Namen beim Hinzufügen). Bei reinen CSS/JS-Änderungen reicht die network-first-SW-Strategie normalerweise automatisch.

## Bekannte Baustellen / offene Punkte
- Keine Push-Notifications: bräuchte einen echten Push-Server (VAPID-Keys) — existiert nicht, nicht ohne Weiteres nachrüstbar ohne Backend-Entscheidung. Alternative (iOS-Kurzbefehle/Automation) noch als Konzept zu klären, nicht gebaut.
- Icon-PNGs (`icons/icon-192.png`/`icon-512.png`) noch NICHT neu gerendert — `icon-source.html` nutzt bereits `linear-gradient(108deg, ...)` passend zum App-Hintergrund, aber der manuelle Render+Screenshot-Schritt steht noch aus.
