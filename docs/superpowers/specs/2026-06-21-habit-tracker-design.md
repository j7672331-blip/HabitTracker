# Habit-Tracker – Design-Dokument

**Datum:** 2026-06-21
**Status:** Genehmigt (bereit für Implementierungsplan)

## Ziel

Ein persönlicher, interaktiver Habit-Tracker fürs iPhone. Gewohnheiten werden täglich
abgehakt (Ja/Nein), und man kann vergangene Werte als Statistik einsehen. Läuft als
installierbare Web-App ohne App Store, offline, ohne Server.

## 1. Architektur & Technik

Eine **PWA (Progressive Web App)** – reines HTML/CSS/JavaScript, **kein Framework und
kein Build-Tool**. Wird in Safari geöffnet und über „Zum Home-Bildschirm" als App-Icon
abgelegt; startet dann im Vollbild.

- **Offline-fähig** über einen Service Worker (cached die App-Dateien, damit sie ohne
  Internet startet).
- **`manifest.json`** für App-Name, Icon und Vollbild-Start (`display: standalone`).
- Aufteilung in fokussierte Dateien, jede mit einer klaren Aufgabe:
  - `index.html` – Struktur/Markup der drei Ansichten
  - `style.css` – Gestaltung, Dark-Mode-tauglich
  - `app.js` – UI-Logik, Tab-Wechsel, Event-Handling
  - `storage.js` – Daten lesen/schreiben + Export/Import (einzige Schnittstelle zum Speicher)
  - `stats.js` – reine Berechnungsfunktionen (Streak, Quote, Heatmap-Daten, Verlauf)
  - `sw.js` – Service Worker (Offline-Caching)
  - `manifest.json` – PWA-Metadaten
  - `icons/` – App-Icons

**Begründung der Trennung:** `storage.js` kapselt das Speicherformat, `stats.js` enthält
nur pure Funktionen (gut testbar, ohne DOM). `app.js` verbindet beides mit der Oberfläche.

## 2. Datenspeicher

Speicherung im Browser des iPhones über **`localStorage`** (für die überschaubare
Datenmenge ausreichend und deutlich einfacher als IndexedDB).

**Datenmodell (JSON):**

```json
{
  "habits": [
    { "id": "h1", "name": "Sport", "farbe": "#34d399", "erstelltAm": "2026-06-21", "archiviert": false }
  ],
  "eintraege": {
    "h1": { "2026-06-21": true, "2026-06-20": true }
  }
}
```

- Pro Gewohnheit werden **nur erledigte Tage** gespeichert. Fehlendes Datum = nicht erledigt.
- Datumsschlüssel im Format `YYYY-MM-DD` nach **lokaler Zeit** des Geräts (damit „heute" stimmt).
- **Backup:** „Exportieren" erzeugt eine JSON-Datei (teilbar/sicherbar, z. B. in iCloud Files).
  „Importieren" liest sie wieder ein und ersetzt/füllt den lokalen Speicher.

**Risiko-Hinweis:** iOS kann PWA-Speicher löschen, wenn die App ~7 Tage nicht geöffnet
wird. Bei täglicher Nutzung praktisch irrelevant; das Export-Backup ist die Absicherung.

## 3. Bildschirme & Bedienung

Drei Ansichten, umschaltbar über eine **untere Tab-Leiste** (daumenfreundlich).

**① Heute (Start)**
- Liste aller aktiven Gewohnheiten mit großem Tippbereich zum Abhaken (Häkchen füllt sich,
  kleine Animation).
- Pro Gewohnheit direkt die aktuelle Streak sichtbar (z. B. „🔥 5 Tage").
- Antippen schaltet erledigt/nicht-erledigt für **heute** um.

**② Statistik**
- Gewohnheit oben auswählen (Chips/Dropdown).
- Darunter: Kalender-Heatmap, aktuelle + längste Streak, Erfolgsquote %, Verlaufs-Diagramm.

**③ Verwalten**
- Gewohnheiten anlegen (Name + Farbe), bearbeiten, archivieren/löschen.
- Export- und Import-Knopf fürs Backup.

**Nachträgliches Abhaken:** Nur der **Vortag** ist nachträglich änderbar (über Antippen in
der Heatmap). Heute und gestern sind antippbar, **alle älteren Tage sind nur Anzeige**.

**Gestaltung:** aufgeräumt, große Tippflächen, Dark-Mode-tauglich, je Gewohnheit eine
Farbe als roter Faden.

## 4. Statistik-Berechnungen

Alle bezogen auf die ausgewählte Gewohnheit (reine Funktionen in `stats.js`):

- **Aktuelle Streak:** Tage in Folge bis heute (bzw. bis gestern, falls heute noch nicht
  erledigt), an denen abgehakt wurde.
- **Längste Streak:** längste je erreichte Serie aufeinanderfolgender Tage.
- **Erfolgsquote %:** erledigte Tage ÷ verfügbare Tage seit Erstelldatum. Umschaltbarer
  Zeitraum: letzte 7 / 30 Tage / gesamt.
- **Kalender-Heatmap:** Raster der letzten ~3 Monate; jeder Tag in der Gewohnheits-Farbe
  (erledigt) oder grau (nicht). Heute/gestern antippbar.
- **Verlaufs-Diagramm:** Linie der wöchentlichen Erfolgsquote über die Zeit (Trend),
  gezeichnet mit eingebautem `<canvas>` – **keine externe Diagramm-Bibliothek**.

## 5. Erinnerungen

**Nicht in der App umgesetzt.** Eine zuverlässige, zeitgesteuerte Benachrichtigung ist auf
einer iOS-PWA nicht möglich (keine geplanten lokalen Notifications; echte Push bräuchte
einen Server). Stattdessen liefert die Projekt-Anleitung (README) eine Schritt-für-Schritt-
Beschreibung, wie man in der iPhone-**Kurzbefehle-App** eine tägliche Automation („Tageszeit
22:00 → täglich") als Abend-Erinnerung einrichtet.

## 6. Nicht im Umfang (YAGNI)

- Kein Server, keine Cloud-Synchronisation, kein Pi (bewusst ausgeschlossen).
- Keine numerischen Werte/Mengen/Skalen – nur Abhaken Ja/Nein.
- Keine eingebauten Push-Benachrichtigungen.
- Kein Mehrbenutzer-/Login-System.

## 7. Spätere Erweiterungsmöglichkeiten (optional)

- Pi-/Cloud-Sync für mehrere Geräte.
- Weitere Erfassungsarten (Zahl, Zähler, Skala).
- Wochenziele (z. B. „5× pro Woche" statt täglich).
