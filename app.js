"use strict";

let state = loadData();
let currentView = "today";
let activeHabitId = null;
let activeRange = 30;
let statsMonth = null;

function activeHabits() {
  return state.habits.filter(function (h) { return !h.archiviert; });
}

function showView(name) {
  currentView = name;
  ["today", "stats", "manage"].forEach(function (v) {
    document.getElementById("view-" + v).classList.toggle("hidden", v !== name);
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("active", t.dataset.view === name);
  });
  render();
}

function render() {
  if (currentView === "today") { renderToday(); }
  else if (currentView === "stats") { renderStats(); }
  else if (currentView === "manage") { renderManage(); }
}

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

function renderToday() {
  const now = new Date();
  const today = todayKey();
  document.getElementById("today-weekday").textContent = WEEKDAYS[now.getDay()];
  document.getElementById("today-date").textContent = now.getDate() + ". " + MONTHS[now.getMonth()];

  const list = document.getElementById("today-list");
  const progress = document.getElementById("today-progress");
  const bar = document.getElementById("today-bar");
  list.innerHTML = "";
  const habits = activeHabits();

  if (habits.length === 0) {
    progress.textContent = "";
    progress.classList.remove("complete");
    bar.style.width = "0%";
    list.innerHTML = '<p class="empty">Noch keine Gewohnheiten. Lege unter „Verwalten" eine an.</p>';
    return;
  }

  let doneCount = 0;
  habits.forEach(function (h) {
    const entries = state.eintraege[h.id] || {};
    const done = !!entries[today];
    if (done) { doneCount++; }
    const info = h.info || "";
    const row = document.createElement("button");
    row.className = "habit-row" + (done ? " done" : "");
    row.style.setProperty("--c", h.farbe);
    row.innerHTML =
      '<span class="habit-dot" style="background:' + escapeHtml(h.farbe) + '"></span>' +
      '<span class="habit-text">' +
        '<span class="habit-name">' + escapeHtml(h.name) + "</span>" +
        (info ? '<span class="habit-note">' + escapeHtml(info) + "</span>" : "") +
      "</span>" +
      '<span class="habit-mark"></span>';
    row.addEventListener("click", function () {
      toggleEntry(state, h.id, today);
      saveData(state);
      renderToday();
    });
    list.appendChild(row);
  });

  const all = doneCount === habits.length;
  bar.style.width = Math.round((doneCount / habits.length) * 100) + "%";
  progress.classList.toggle("complete", all);
  progress.textContent = all
    ? "Für heute erledigt."
    : doneCount + " von " + habits.length + " erledigt";
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Tab-Verdrahtung
document.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () { showView(t.dataset.view); });
});

// Platzhalter, in Task 10/11 implementiert
function renderManage() {
  const list = document.getElementById("manage-list");
  list.innerHTML = "";
  state.habits.forEach(function (h) {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML =
      '<span class="dot" style="background:' + escapeHtml(h.farbe) + '"></span>' +
      '<span class="name">' + escapeHtml(h.name) + (h.archiviert ? " (archiviert)" : "") +
        (h.info ? '<span class="manage-note">' + escapeHtml(h.info) + "</span>" : "") +
      "</span>";
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Bearbeiten";
    renameBtn.addEventListener("click", function () {
      const name = prompt("Name:", h.name);
      if (name === null) { return; }
      const trimmed = name.trim();
      if (!trimmed) { return; }
      const info = prompt("Zusatzinfo (kann leer sein):", h.info || "");
      if (info === null) { return; }
      updateHabit(state, h.id, trimmed, h.farbe, info.trim()); saveData(state); renderManage();
    });
    const archiveBtn = document.createElement("button");
    archiveBtn.textContent = h.archiviert ? "—" : "Archivieren";
    archiveBtn.disabled = h.archiviert;
    archiveBtn.addEventListener("click", function () {
      archiveHabit(state, h.id); saveData(state); renderManage();
    });
    const delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.addEventListener("click", function () {
      if (confirm('"' + h.name + '" und alle Einträge wirklich löschen?')) {
        deleteHabit(state, h.id); saveData(state); renderManage();
      }
    });
    row.appendChild(renameBtn);
    row.appendChild(archiveBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}
function renderStats() {
  const habits = activeHabits();
  if (habits.length === 0) {
    document.getElementById("stats-habit-select").innerHTML = "<p>Keine Gewohnheiten.</p>";
    document.getElementById("heatmap").innerHTML = "";
    document.getElementById("cal-month").textContent = "";
    document.getElementById("stat-current").textContent = "0";
    document.getElementById("stat-longest").textContent = "0";
    document.getElementById("stat-rate").textContent = "0%";
    const trendCanvas = document.getElementById("trend");
    trendCanvas.getContext("2d").clearRect(0, 0, trendCanvas.width, trendCanvas.height);
    return;
  }
  if (!activeHabitId || !habits.some(function (h) { return h.id === activeHabitId; })) {
    activeHabitId = habits[0].id;
  }
  renderHabitChips(habits);
  const habit = habits.find(function (h) { return h.id === activeHabitId; });
  const entries = state.eintraege[habit.id] || {};
  const today = todayKey();
  const range = activeRange === 0 ? null : activeRange;
  document.getElementById("stat-current").textContent = currentStreak(entries, today);
  document.getElementById("stat-longest").textContent = longestStreak(entries);
  document.getElementById("stat-rate").textContent =
    successRate(entries, habit.erstelltAm, today, range) + "%";
  renderCalendar(habit, entries, today);
  drawTrend(habit, entries, today);
}

function renderHabitChips(habits) {
  const box = document.getElementById("stats-habit-select");
  box.innerHTML = "";
  habits.forEach(function (h) {
    const b = document.createElement("button");
    b.textContent = h.name;
    if (h.id === activeHabitId) { b.classList.add("active"); }
    b.addEventListener("click", function () { activeHabitId = h.id; renderStats(); });
    box.appendChild(b);
  });
}

function renderCalendar(habit, entries, today) {
  const now = new Date();
  if (!statsMonth) { statsMonth = { y: now.getFullYear(), m: now.getMonth() }; }
  const y = statsMonth.y, m = statsMonth.m;
  document.getElementById("cal-month").textContent = MONTHS[m] + " " + y;
  document.getElementById("cal-next").disabled =
    (y === now.getFullYear() && m === now.getMonth());

  const grid = document.getElementById("heatmap");
  grid.innerHTML = "";
  const yesterday = addDays(today, -1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Montag = 0

  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement("div");
    blank.className = "cell blank";
    grid.appendChild(blank);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = d;
    if (key > today) { cell.classList.add("future"); }
    if (entries[key]) {
      cell.classList.add("done");
      cell.style.background = habit.farbe;
      cell.style.color = "#04130a";
    }
    if (key === today || key === yesterday) {
      cell.classList.add("tappable");
      cell.addEventListener("click", function () {
        toggleEntry(state, habit.id, key);
        saveData(state);
        renderStats();
      });
    }
    grid.appendChild(cell);
  }
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function drawTrend(habit, entries, today) {
  const canvas = document.getElementById("trend");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, pad = 18;
  ctx.clearRect(0, 0, W, H);
  const line = cssVar("--line", "#d9ded6");
  const muted = cssVar("--muted", "#929b92");
  const series = weeklyRates(entries, habit.erstelltAm, today);

  // Baseline (nur unten, ruhig)
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad);
  ctx.stroke();

  if (series.length === 0) {
    ctx.fillStyle = muted;
    ctx.font = "italic 13px ui-serif, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Noch keine Daten", W / 2, H / 2);
    return;
  }

  const plotW = W - pad * 2, plotH = H - pad * 2;
  function x(i) { return pad + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1)); }
  function y(rate) { return pad + plotH * (1 - rate / 100); }

  // Weiche Fläche unter der Linie
  ctx.beginPath();
  ctx.moveTo(x(0), H - pad);
  series.forEach(function (p, i) { ctx.lineTo(x(i), y(p.rate)); });
  ctx.lineTo(x(series.length - 1), H - pad);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(habit.farbe, 0.14);
  ctx.fill();

  // Linie
  ctx.strokeStyle = habit.farbe;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  series.forEach(function (p, i) {
    if (i === 0) { ctx.moveTo(x(i), y(p.rate)); } else { ctx.lineTo(x(i), y(p.rate)); }
  });
  ctx.stroke();

  // Punkte
  ctx.fillStyle = habit.farbe;
  series.forEach(function (p, i) {
    ctx.beginPath(); ctx.arc(x(i), y(p.rate), 2.5, 0, Math.PI * 2); ctx.fill();
  });
}

function hexToRgba(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) { return "rgba(124,154,134," + a + ")"; }
  return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + a + ")";
}

document.getElementById("add-habit").addEventListener("click", function () {
  const name = document.getElementById("new-name").value.trim();
  const farbe = document.getElementById("new-color").value;
  const info = document.getElementById("new-info").value.trim();
  if (!name) { return; }
  createHabit(state, name, farbe, todayKey(), info);
  saveData(state);
  document.getElementById("new-name").value = "";
  document.getElementById("new-info").value = "";
  renderManage();
});

document.getElementById("export-btn").addEventListener("click", function () {
  const blob = new Blob([exportJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habit-tracker-backup-" + todayKey() + ".json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-btn").addEventListener("click", function () {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", function (ev) {
  const file = ev.target.files[0];
  if (!file) { return; }
  const reader = new FileReader();
  reader.onload = function () {
    try {
      state = importJson(reader.result);
      render();
      alert("Backup importiert.");
    } catch (e) {
      alert("Datei konnte nicht gelesen werden.");
    }
    ev.target.value = "";
  };
  reader.readAsText(file);
});

document.getElementById("cal-prev").addEventListener("click", function () {
  if (!statsMonth) { return; }
  statsMonth.m--;
  if (statsMonth.m < 0) { statsMonth.m = 11; statsMonth.y--; }
  renderStats();
});

document.getElementById("cal-next").addEventListener("click", function () {
  if (!statsMonth) { return; }
  const now = new Date();
  if (statsMonth.y === now.getFullYear() && statsMonth.m === now.getMonth()) { return; }
  statsMonth.m++;
  if (statsMonth.m > 11) { statsMonth.m = 0; statsMonth.y++; }
  renderStats();
});

document.querySelectorAll("#stat-range button").forEach(function (b) {
  b.addEventListener("click", function () {
    activeRange = Number(b.dataset.range);
    document.querySelectorAll("#stat-range button").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    renderStats();
  });
});

showView("today");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("SW-Registrierung fehlgeschlagen:", err);
    });
  });
}
