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
