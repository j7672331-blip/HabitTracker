"use strict";
// --- Sanity check (bleibt als erster Fall stehen) ---
assertEqual("framework works", 1 + 1, 2);

// --- stats: Datums-Helfer ---
assertEqual("dateKey formats with padding",
  dateKey(new Date(2026, 0, 5)), "2026-01-05");
assertEqual("addDays forward across month",
  addDays("2026-01-31", 1), "2026-02-01");
assertEqual("addDays backward across year",
  addDays("2026-01-01", -1), "2025-12-31");

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

// --- stats: Heatmap ---
assertEqual("heatmapDays returns numDays entries ending today",
  heatmapDays({ "2026-06-20": true }, "2026-06-21", 3),
  [ { date: "2026-06-19", done: false },
    { date: "2026-06-20", done: true },
    { date: "2026-06-21", done: false } ]);

// --- stats: Wochenverlauf ---
// 2026-06-15 ist ein Montag.
assertEqual("startOfWeek returns Monday",
  startOfWeek("2026-06-17"), "2026-06-15");
assertEqual("startOfWeek on Monday returns same day",
  startOfWeek("2026-06-15"), "2026-06-15");
assertEqual("weeklyRates one partial week",
  weeklyRates({ "2026-06-15": true, "2026-06-16": true }, "2026-06-15", "2026-06-17"),
  [ { weekStart: "2026-06-15", rate: 67 } ]);

// --- storage: Mutationen ---
(function () {
  let d = { habits: [], eintraege: {} };
  createHabit(d, "Sport", "#34d399", "2026-06-21");
  assertEqual("createHabit adds one habit", d.habits.length, 1);
  assertEqual("createHabit sets fields",
    [d.habits[0].name, d.habits[0].farbe, d.habits[0].erstelltAm, d.habits[0].archiviert],
    ["Sport", "#34d399", "2026-06-21", false]);
  assertEqual("createHabit defaults info to empty", d.habits[0].info, "");

  let d2 = { habits: [], eintraege: {} };
  createHabit(d2, "Wasser", "#1db954", "2026-06-21", "mind. 3 Liter");
  assertEqual("createHabit stores info", d2.habits[0].info, "mind. 3 Liter");

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
