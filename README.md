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
