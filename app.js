"use strict";

let state = loadData();
let currentView = "today";
let activeHabitId = null;
let activeRange = 30;

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

function renderToday() {
  const list = document.getElementById("today-list");
  list.innerHTML = "";
  const today = todayKey();
  const habits = activeHabits();
  if (habits.length === 0) {
    list.innerHTML = '<p>Noch keine Gewohnheiten. Lege unter "Verwalten" eine an.</p>';
    return;
  }
  habits.forEach(function (h) {
    const entries = state.eintraege[h.id] || {};
    const done = !!entries[today];
    const row = document.createElement("div");
    row.className = "habit-row";
    const streak = currentStreak(entries, today);
    row.innerHTML =
      '<button class="habit-check' + (done ? " done" : "") + '"' +
      ' style="' + (done ? "background:" + h.farbe + ";border-color:" + h.farbe : "border-color:" + h.farbe) + '"></button>' +
      '<div class="habit-info"><div class="name">' + escapeHtml(h.name) + '</div>' +
      '<div class="streak">' + (streak > 0 ? "🔥 " + streak + " Tage" : "Noch keine Serie") + "</div></div>";
    row.querySelector(".habit-check").addEventListener("click", function () {
      toggleEntry(state, h.id, today);
      saveData(state);
      renderToday();
    });
    list.appendChild(row);
  });
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
      '<span class="dot" style="background:' + h.farbe + '"></span>' +
      '<span class="name">' + escapeHtml(h.name) + (h.archiviert ? " (archiviert)" : "") + "</span>";
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Umbenennen";
    renameBtn.addEventListener("click", function () {
      const name = prompt("Neuer Name:", h.name);
      if (name) { updateHabit(state, h.id, name.trim(), h.farbe); saveData(state); renderManage(); }
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
  renderHeatmap(habit, entries, today);
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

function renderHeatmap(habit, entries, today) {
  const box = document.getElementById("heatmap");
  box.innerHTML = "";
  const yesterday = addDays(today, -1);
  const days = heatmapDays(entries, today, 91); // ~13 Wochen
  days.forEach(function (d) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (d.done) { cell.style.background = habit.farbe; }
    if (d.date === today || d.date === yesterday) {
      cell.classList.add("tappable");
      cell.title = d.date;
      cell.addEventListener("click", function () {
        toggleEntry(state, habit.id, d.date);
        saveData(state);
        renderStats();
      });
    }
    box.appendChild(cell);
  });
}

function drawTrend(habit, entries, today) {
  const canvas = document.getElementById("trend");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, pad = 24;
  ctx.clearRect(0, 0, W, H);
  const series = weeklyRates(entries, habit.erstelltAm, today);
  // Achsen
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad / 2); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 6, H - pad);
  ctx.stroke();
  if (series.length === 0) { return; }
  const plotW = W - pad - 6, plotH = H - pad - pad / 2;
  function x(i) { return pad + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1)); }
  function y(rate) { return (pad / 2) + plotH * (1 - rate / 100); }
  // Linie
  ctx.strokeStyle = habit.farbe;
  ctx.lineWidth = 2;
  ctx.beginPath();
  series.forEach(function (p, i) {
    if (i === 0) { ctx.moveTo(x(i), y(p.rate)); } else { ctx.lineTo(x(i), y(p.rate)); }
  });
  ctx.stroke();
  // Punkte
  ctx.fillStyle = habit.farbe;
  series.forEach(function (p, i) {
    ctx.beginPath(); ctx.arc(x(i), y(p.rate), 3, 0, Math.PI * 2); ctx.fill();
  });
}

document.getElementById("add-habit").addEventListener("click", function () {
  const name = document.getElementById("new-name").value.trim();
  const farbe = document.getElementById("new-color").value;
  if (!name) { return; }
  createHabit(state, name, farbe, todayKey());
  saveData(state);
  document.getElementById("new-name").value = "";
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
  };
  reader.readAsText(file);
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
