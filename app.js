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
    const streak = currentStreak(entries, today);
    const row = document.createElement("button");
    row.className = "habit-row" + (done ? " done" : "");
    row.style.setProperty("--c", h.farbe);
    row.innerHTML =
      '<span class="habit-dot" style="background:' + escapeHtml(h.farbe) + '"></span>' +
      '<span class="habit-text">' +
        '<span class="habit-name">' + escapeHtml(h.name) + "</span>" +
        (info ? '<span class="habit-note">' + escapeHtml(info) + "</span>" : "") +
      "</span>" +
      (streak > 1 ? '<span class="habit-streak">' + streak + '</span>' : "") +
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

// ---------- Modale Dialoge (ersetzen native prompt/confirm/alert) ----------
function closeModal(backdrop) {
  backdrop.classList.remove("show");
  document.removeEventListener("keydown", backdrop._onKey);
  setTimeout(function () { backdrop.remove(); }, 160);
}

function openModal(buildFn) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal";
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  requestAnimationFrame(function () { backdrop.classList.add("show"); });
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) { closeModal(backdrop); }
  });
  backdrop._onKey = function (e) { if (e.key === "Escape") { closeModal(backdrop); } };
  document.addEventListener("keydown", backdrop._onKey);
  buildFn(modal, backdrop);
  return backdrop;
}

function openConfirmModal(message, onConfirm, opts) {
  opts = opts || {};
  openModal(function (modal, backdrop) {
    const p = document.createElement("p");
    p.textContent = message;
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-cancel";
    cancelBtn.textContent = "Abbrechen";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = opts.danger ? "modal-danger" : "modal-confirm";
    confirmBtn.textContent = opts.confirmLabel || "OK";
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modal.appendChild(p);
    modal.appendChild(actions);
    cancelBtn.addEventListener("click", function () { closeModal(backdrop); });
    confirmBtn.addEventListener("click", function () { closeModal(backdrop); onConfirm(); });
    confirmBtn.focus();
  });
}

function openEditModal(habit) {
  openModal(function (modal, backdrop) {
    const h3 = document.createElement("h3");
    h3.textContent = "Gewohnheit bearbeiten";
    const nameField = document.createElement("div");
    nameField.className = "modal-field";
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = habit.name; nameInput.maxLength = 40;
    nameInput.placeholder = "Name der Gewohnheit";
    nameField.appendChild(nameInput);
    const infoField = document.createElement("div");
    infoField.className = "modal-field";
    const infoInput = document.createElement("input");
    infoInput.type = "text"; infoInput.value = habit.info || ""; infoInput.maxLength = 60;
    infoInput.placeholder = "Zusatzinfo (optional)";
    infoField.appendChild(infoInput);
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-cancel"; cancelBtn.textContent = "Abbrechen";
    const saveBtn = document.createElement("button");
    saveBtn.className = "modal-confirm"; saveBtn.textContent = "Speichern";
    actions.appendChild(cancelBtn); actions.appendChild(saveBtn);
    modal.appendChild(h3); modal.appendChild(nameField); modal.appendChild(infoField); modal.appendChild(actions);

    function save() {
      const trimmed = nameInput.value.trim();
      if (!trimmed) { nameInput.focus(); return; }
      updateHabit(state, habit.id, trimmed, habit.farbe, infoInput.value.trim());
      saveData(state);
      closeModal(backdrop);
      renderManage();
    }
    cancelBtn.addEventListener("click", function () { closeModal(backdrop); });
    saveBtn.addEventListener("click", save);
    nameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { save(); } });
    infoInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { save(); } });
    nameInput.focus();
    nameInput.select();
  });
}

function showToast(message, opts) {
  opts = opts === true ? { error: true } : (opts || {});
  const t = document.createElement("div");
  t.className = "toast" + (opts.error ? " toast-error" : "");
  const span = document.createElement("span");
  span.textContent = message;
  t.appendChild(span);
  function hide() {
    t.classList.remove("show");
    setTimeout(function () { t.remove(); }, 220);
  }
  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-action";
    btn.textContent = opts.actionLabel;
    btn.addEventListener("click", function () { opts.onAction(); hide(); });
    t.appendChild(btn);
  }
  document.body.appendChild(t);
  requestAnimationFrame(function () { t.classList.add("show"); });
  setTimeout(hide, opts.duration || 2200);
}

// Tab-Verdrahtung
document.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () { showView(t.dataset.view); });
});

function renderManage() {
  const list = document.getElementById("manage-list");
  list.innerHTML = "";
  state.habits.forEach(function (h, idx) {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML =
      '<button type="button" class="dot" data-habit-id="' + escapeHtml(h.id) + '" data-color="' + escapeHtml(h.farbe) + '" style="background:' + escapeHtml(h.farbe) + '" aria-label="Farbe ändern"></button>' +
      '<span class="name">' + escapeHtml(h.name) + (h.archiviert ? " (archiviert)" : "") +
        (h.info ? '<span class="manage-note">' + escapeHtml(h.info) + "</span>" : "") +
      "</span>";
    const reorder = document.createElement("div");
    reorder.className = "manage-reorder";
    const upBtn = document.createElement("button");
    upBtn.type = "button"; upBtn.textContent = "↑"; upBtn.setAttribute("aria-label", "Nach oben");
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", function () {
      moveHabit(state, h.id, -1); saveData(state); renderManage();
    });
    const downBtn = document.createElement("button");
    downBtn.type = "button"; downBtn.textContent = "↓"; downBtn.setAttribute("aria-label", "Nach unten");
    downBtn.disabled = idx === state.habits.length - 1;
    downBtn.addEventListener("click", function () {
      moveHabit(state, h.id, 1); saveData(state); renderManage();
    });
    reorder.appendChild(upBtn);
    reorder.appendChild(downBtn);
    row.prepend(reorder);

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Bearbeiten";
    renameBtn.addEventListener("click", function () {
      openEditModal(h);
    });
    const archiveBtn = document.createElement("button");
    archiveBtn.textContent = h.archiviert ? "Reaktivieren" : "Archivieren";
    archiveBtn.addEventListener("click", function () {
      if (h.archiviert) { unarchiveHabit(state, h.id); } else { archiveHabit(state, h.id); }
      saveData(state); renderManage();
    });
    const delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.addEventListener("click", function () {
      openConfirmModal('"' + h.name + '" und alle Einträge wirklich löschen?', function () {
        const habitBackup = h;
        const entriesBackup = state.eintraege[h.id];
        const idxBackup = state.habits.indexOf(h);
        deleteHabit(state, h.id); saveData(state); renderManage();
        showToast('"' + h.name + '" gelöscht.', {
          actionLabel: "Rückgängig",
          duration: 4500,
          onAction: function () {
            state.habits.splice(idxBackup, 0, habitBackup);
            if (entriesBackup) { state.eintraege[habitBackup.id] = entriesBackup; }
            saveData(state); renderManage();
          },
        });
      }, { danger: true, confirmLabel: "Löschen" });
    });
    row.appendChild(renameBtn);
    row.appendChild(archiveBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
  renderBackupHint();
}

function renderBackupHint() {
  const hint = document.getElementById("backup-hint");
  if (!hint) { return; }
  if (state.habits.length === 0) { hint.textContent = ""; return; }
  const last = localStorage.getItem("habitTrackerLastExport");
  if (!last) {
    hint.textContent = "Noch kein Backup exportiert.";
    return;
  }
  const days = Math.round((new Date(todayKey()) - new Date(last)) / 86400000);
  hint.textContent = days >= 14 ? "Letztes Backup vor " + days + " Tagen — Zeit für ein neues." : "";
}
function renderStats() {
  const habits = activeHabits();
  if (habits.length === 0) {
    document.getElementById("stats-habit-select").innerHTML = '<p class="empty">Keine Gewohnheiten.</p>';
    document.getElementById("heatmap").innerHTML = "";
    document.getElementById("cal-month").textContent = "";
    document.getElementById("stat-current").textContent = "0";
    document.getElementById("stat-longest").textContent = "0";
    document.getElementById("stat-rate").textContent = "0%";
    return;
  }
  if (activeHabitId !== "all" && !habits.some(function (h) { return h.id === activeHabitId; })) {
    activeHabitId = "all";
  }
  renderHabitChips(habits);
  const today = todayKey();
  const range = activeRange === 0 ? null : activeRange;

  if (activeHabitId === "all") {
    setStatLabels("Heute", "Perfekte Tage", "Ø Quote");
    let doneToday = 0;
    habits.forEach(function (h) {
      const e = state.eintraege[h.id] || {};
      if (e[today]) { doneToday++; }
    });
    document.getElementById("stat-current").textContent = doneToday + "/" + habits.length;

    let earliest = today, sum = 0;
    habits.forEach(function (h) {
      if (h.erstelltAm < earliest) { earliest = h.erstelltAm; }
      const e = state.eintraege[h.id] || {};
      sum += successRate(e, h.erstelltAm, today, range);
    });
    document.getElementById("stat-rate").textContent = Math.round(sum / habits.length) + "%";

    let perfect = 0, cur = earliest;
    while (cur <= today) {
      let existing = 0, done = 0;
      habits.forEach(function (h) {
        if (h.erstelltAm <= cur) {
          existing++;
          const e = state.eintraege[h.id] || {};
          if (e[cur]) { done++; }
        }
      });
      if (existing > 0 && done === existing) { perfect++; }
      cur = addDays(cur, 1);
    }
    document.getElementById("stat-longest").textContent = perfect;

    renderCalendarCombined(habits, today);
    return;
  }

  setStatLabels("Aktuelle Serie", "Längste Serie", "Erfolgsquote");
  const habit = habits.find(function (h) { return h.id === activeHabitId; });
  const entries = state.eintraege[habit.id] || {};
  document.getElementById("stat-current").textContent = currentStreak(entries, today);
  document.getElementById("stat-longest").textContent = longestStreak(entries);
  document.getElementById("stat-rate").textContent =
    successRate(entries, habit.erstelltAm, today, range) + "%";
  renderCalendar(habit, entries, today);
}

function setStatLabels(a, b, c) {
  document.getElementById("stat-l1").textContent = a;
  document.getElementById("stat-l2").textContent = b;
  document.getElementById("stat-l3").textContent = c;
}

function renderHabitChips(habits) {
  const box = document.getElementById("stats-habit-select");
  box.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.textContent = "Alle";
  if (activeHabitId === "all") { allBtn.classList.add("active"); }
  allBtn.addEventListener("click", function () { activeHabitId = "all"; renderStats(); });
  box.appendChild(allBtn);
  habits.forEach(function (h) {
    const b = document.createElement("button");
    b.textContent = h.name;
    if (h.id === activeHabitId) { b.classList.add("active"); }
    b.addEventListener("click", function () { activeHabitId = h.id; renderStats(); });
    box.appendChild(b);
  });
}

function monthGridScaffold(today, dayFn) {
  const now = new Date();
  if (!statsMonth) { statsMonth = { y: now.getFullYear(), m: now.getMonth() }; }
  const y = statsMonth.y, m = statsMonth.m;
  document.getElementById("cal-month").textContent = MONTHS[m] + " " + y;
  document.getElementById("cal-next").disabled =
    (y === now.getFullYear() && m === now.getMonth());

  const grid = document.getElementById("heatmap");
  grid.innerHTML = "";
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
    const future = key > today;
    if (future) { cell.classList.add("future"); }
    dayFn(cell, key, future);
    grid.appendChild(cell);
  }
}

function renderCalendar(habit, entries, today) {
  const yesterday = addDays(today, -1);
  monthGridScaffold(today, function (cell, key) {
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
  });
}

function renderCalendarCombined(habits, today) {
  monthGridScaffold(today, function (cell, key, future) {
    if (key === today) { cell.classList.add("is-today"); }
    if (future) { return; }
    let existing = 0, done = 0;
    habits.forEach(function (h) {
      if (h.erstelltAm <= key) {
        existing++;
        const e = state.eintraege[h.id] || {};
        if (e[key]) { done++; }
      }
    });
    if (existing > 0 && done > 0) {
      const frac = done / existing;
      const level = frac >= 0.75 ? 3 : (frac >= 0.25 ? 2 : 1);
      cell.classList.add("frac-" + level);
      if (level >= 2) { cell.style.color = "#04130a"; }
    }
  });
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
  localStorage.setItem("habitTrackerLastExport", todayKey());
  renderBackupHint();
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
      showToast("Backup importiert.");
    } catch (e) {
      showToast("Datei konnte nicht gelesen werden.", true);
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
