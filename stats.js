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

function heatmapDays(entries, todayK, numDays) {
  const out = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const key = addDays(todayK, -i);
    out.push({ date: key, done: !!entries[key] });
  }
  return out;
}

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
