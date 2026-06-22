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
- Tests: `"/c/Program Files/nodejs/node.exe" tests/run.js` (Node nur als Test-Runner).
- Speicherung: `localStorage["habitTrackerData"]`; Backup über Export/Import (JSON).
- Vorschau-Screenshots gehören nach `previews/` (in `.gitignore`).
- Design: dunkel (Apple-Stil) + Spotify-Grün-Akzent.
