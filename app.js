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
function renderStats() {}

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

showView("today");
