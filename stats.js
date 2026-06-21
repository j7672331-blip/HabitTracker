// Pure Berechnungslogik. Keine DOM-, keine Storage-Zugriffe.
"use strict";

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
