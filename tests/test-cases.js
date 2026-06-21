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
