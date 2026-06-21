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
function renderManage() {}
function renderStats() {}

showView("today");
