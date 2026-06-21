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

function successRate(entries, createdAt, todayK, rangeDays) {
  let start = createdAt;
  if (rangeDays) {
    const rangeStart = addDays(todayK, -(rangeDays - 1));
    if (rangeStart > start) { start = rangeStart; }
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
