"use strict";

// iOS fuehrt bei schnell aufeinanderfolgenden Taps trotz touch-action/
// maximum-scale weiterhin seine Doppel-Tap-Zoom-Geste aus (kurzer Scroll-
// Ruckler zum getippten Element). preventDefault auf dem zweiten touchend
// unterbindet genau das, ohne normale Einzel-Taps zu beeintraechtigen.
let lastTouchEnd = 0;
document.addEventListener("touchend", function (e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) { e.preventDefault(); }
  lastTouchEnd = now;
}, { passive: false });

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
  window.scrollTo(0, 0);
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
const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]; // Montag = 0, wie weekdayRates()

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

  habits.forEach(function (h) {
    list.appendChild(buildHabitRow(h, today));
  });

  updateTodayProgress(habits, today);
}

function buildHabitRow(h, today) {
  const entries = state.eintraege[h.id] || {};
  const done = !!entries[today];
  const info = h.info || "";
  const streak = currentStreak(entries, today);
  const row = document.createElement("button");
  row.dataset.id = h.id;
  row.className = "habit-row" + (done ? " done" : "");
  row.style.setProperty("--c", h.farbe);
  row.innerHTML =
    '<span class="habit-dot" style="background:' + escapeHtml(h.farbe) + '"></span>' +
    '<span class="habit-text">' +
      '<span class="habit-name">' + escapeHtml(h.name) + "</span>" +
      (info ? '<span class="habit-note">' + escapeHtml(info) + "</span>" : "") +
    "</span>" +
    (streak > 1
      ? '<span class="habit-flame">' +
          '<svg class="flame-icon" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path class="flame-outer" d="M12 2.3c.4 2.6-1.1 4-2.4 5.7C8.2 9.7 7 11.5 7 13.8 7 17.8 9.8 21 13.2 21c3.7 0 6.3-2.7 6.3-6.2 0-2.4-1.1-4.2-2.3-5.6-.2 1.6-1 2.6-1.9 2.6-1 0-1.5-.8-1.3-1.9.3-1.7-.2-3.6-2-7.6z"/>' +
            '<path class="flame-core" d="M13.4 11c.5 1.3.2 2.6-.7 3.4-1.1 1-2.7.8-3.4-.4-.6-1-.4-2.3.5-3.3.1 1 .8 1.6 1.6 1.4.7-.2 1.1-.7 1-1.1z"/>' +
          "</svg>" +
          '<span class="flame-num">' + streak + "</span>" +
        "</span>"
      : "") +
    '<span class="habit-mark"></span>';
  row.addEventListener("click", function () {
    toggleEntry(state, h.id, today);
    saveData(state);
    updateAfterToggle(h.id, today);
  });
  return row;
}

// Gezieltes Update statt komplettem renderToday(): nur die getoggelte Zeile
// wird ersetzt, der Rest der Liste (Scroll-Position, DOM-Referenzen) bleibt stehen.
function updateAfterToggle(habitId, today) {
  const habits = activeHabits();
  const h = habits.find(function (x) { return x.id === habitId; });
  const oldRow = document.querySelector('.habit-row[data-id="' + habitId + '"]');
  if (!h || !oldRow) { renderToday(); return; }
  oldRow.replaceWith(buildHabitRow(h, today));
  updateTodayProgress(habits, today);
}

function updateTodayProgress(habits, today) {
  const progress = document.getElementById("today-progress");
  const bar = document.getElementById("today-bar");
  let doneCount = 0;
  habits.forEach(function (h) {
    const entries = state.eintraege[h.id] || {};
    if (entries[today]) { doneCount++; }
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

function isDuplicateName(name, excludeId) {
  const norm = name.trim().toLowerCase();
  return state.habits.some(function (h) {
    return h.id !== excludeId && h.name.trim().toLowerCase() === norm;
  });
}

function openEditModal(habit) {
  openModal(function (modal, backdrop) {
    const h3 = document.createElement("h3");
    h3.textContent = "Gewohnheit bearbeiten";
    const nameRow = document.createElement("div");
    nameRow.className = "modal-field modal-name-row";
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = habit.name; nameInput.maxLength = 40;
    nameInput.placeholder = "Name der Gewohnheit";
    const colorInput = document.createElement("input");
    colorInput.type = "color"; colorInput.value = habit.farbe;
    colorInput.setAttribute("aria-label", "Farbe");
    nameRow.appendChild(nameInput);
    nameRow.appendChild(colorInput);
    const errorP = document.createElement("p");
    errorP.className = "modal-error";
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
    modal.appendChild(h3); modal.appendChild(nameRow); modal.appendChild(errorP);
    modal.appendChild(infoField); modal.appendChild(actions);

    function save() {
      const trimmed = nameInput.value.trim();
      if (!trimmed) { nameInput.focus(); return; }
      if (isDuplicateName(trimmed, habit.id)) {
        errorP.textContent = 'Es gibt bereits eine Gewohnheit namens "' + trimmed + '".';
        nameInput.focus();
        return;
      }
      updateHabit(state, habit.id, trimmed, colorInput.value, infoInput.value.trim());
      saveData(state);
      closeModal(backdrop);
      renderManage();
    }
    cancelBtn.addEventListener("click", function () { closeModal(backdrop); });
    saveBtn.addEventListener("click", save);
    nameInput.addEventListener("input", function () { errorP.textContent = ""; });
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

// Echtes Touch-Drag per Pointer Events (natives HTML5-Drag&Drop funktioniert
// auf iOS nicht zuverlaessig). Die gezogene Zeile folgt 1:1 dem Finger (keine
// Transition), andere Zeilen ruecken live per CSS-Transform Platz - sobald
// die gezogene Zeile ihren urspruenglichen Mittelpunkt ueberquert hat.
// Beim Loslassen wird anhand der ORIGINALEN Mittelpunkte (nicht der gerade
// mitten in der Animation befindlichen) die Zielposition bestimmt und die
// Liste einmal komplett neu gerendert.
function setupRowDrag(handle, row, habit) {
  let dragging = false;
  let startY = 0;
  let startCenter = 0;
  let rowHeight = 0;
  let others = [];
  let origCenters = [];

  function onMove(e) {
    if (!dragging) { return; }
    const dy = e.clientY - startY;
    row.style.transform = "translateY(" + dy + "px)";
    const draggedCenter = startCenter + dy;
    others.forEach(function (r, i) {
      const oc = origCenters[i];
      let shift = 0;
      if (dy > 0 && draggedCenter > oc && oc > startCenter) { shift = -rowHeight; }
      else if (dy < 0 && draggedCenter < oc && oc < startCenter) { shift = rowHeight; }
      r.style.transform = shift ? "translateY(" + shift + "px)" : "";
    });
  }

  function onUp(e) {
    if (!dragging) { return; }
    dragging = false;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    const dy = e.clientY - startY;
    const finalCenter = startCenter + dy;

    let targetIdx = others.length;
    for (let i = 0; i < others.length; i++) {
      if (finalCenter < origCenters[i]) { targetIdx = i; break; }
    }
    const fromIdx = state.habits.indexOf(habit);
    if (fromIdx === -1) { return; }
    state.habits.splice(fromIdx, 1);
    state.habits.splice(targetIdx, 0, habit);
    saveData(state);
    renderManage();
  }

  handle.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    const rowRect = row.getBoundingClientRect();
    startCenter = rowRect.top + rowRect.height / 2;
    rowHeight = rowRect.height;
    row.style.transition = "none";
    others = Array.prototype.filter.call(
      document.querySelectorAll("#manage-list .manage-row"),
      function (r) { return r !== row; }
    );
    origCenters = others.map(function (r) {
      const rc = r.getBoundingClientRect();
      return rc.top + rc.height / 2;
    });
    row.classList.add("dragging");
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* iOS Safari braucht das nicht zwingend */ }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  });
}

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
    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.tabIndex = 0;
    handle.setAttribute("role", "button");
    handle.setAttribute("aria-label", "Ziehen zum Verschieben (oder Pfeiltasten)");
    handle.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") { e.preventDefault(); moveHabit(state, h.id, -1); saveData(state); renderManage(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveHabit(state, h.id, 1); saveData(state); renderManage(); }
    });
    setupRowDrag(handle, row, h);
    row.prepend(handle);

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
    document.getElementById("weekday-chart").innerHTML = "";
    document.getElementById("trend").innerHTML = "";
    document.getElementById("trend-meta").innerHTML = "";
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

    const habitsDataAll = habits.map(function (h) {
      return { entries: state.eintraege[h.id] || {}, createdAt: h.erstelltAm };
    });
    renderWeekdayChart(habitsDataAll, today);
    renderTrend(habitsDataAll, today);
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
  renderWeekdayChart([{ entries: entries, createdAt: habit.erstelltAm }], today);
  renderTrend([{ entries: entries, createdAt: habit.erstelltAm }], today);
  renderCalendar(habit, entries, today);
}

function renderWeekdayChart(habitsData, todayK) {
  const box = document.getElementById("weekday-chart");
  box.innerHTML = "";
  const rates = weekdayRates(habitsData, todayK);
  const todayDow = (new Date().getDay() + 6) % 7;
  rates.forEach(function (r) {
    const col = document.createElement("div");
    col.className = "weekday-bar" + (r.dow === todayDow ? " is-today" : "");
    col.title = WEEKDAY_SHORT[r.dow] + ": " + (r.count === 0 ? "keine Daten" : r.rate + "%");
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.height = "0%";
    track.appendChild(fill);
    requestAnimationFrame(function () {
      fill.style.height = (r.count === 0 ? 0 : r.rate) + "%";
    });
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = WEEKDAY_SHORT[r.dow];
    col.appendChild(track);
    col.appendChild(label);
    box.appendChild(col);
  });
}

function renderTrend(habitsData, todayK) {
  const svg = document.getElementById("trend");
  const meta = document.getElementById("trend-meta");
  const weeks = weeklyRatesMulti(habitsData, todayK, 8);

  if (weeks.length < 2) {
    svg.innerHTML = "";
    meta.textContent = "Noch nicht genug Daten für einen Trend.";
    return;
  }

  const w = 280, h = 70, pad = 6;
  const stepX = (w - pad * 2) / (weeks.length - 1);
  const points = weeks.map(function (wk, i) {
    const x = pad + i * stepX;
    const y = h - pad - ((h - pad * 2) * wk.rate) / 100;
    return x + "," + y;
  });
  svg.innerHTML =
    '<polyline points="' + points.join(" ") +
    '" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    points.map(function (p) {
      const xy = p.split(",");
      return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="2.4" fill="var(--accent-2)"/>';
    }).join("");

  const now = new Date();
  const thisMonth = monthRate(habitsData, todayK, now.getFullYear(), now.getMonth());
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthRate(habitsData, todayK, prev.getFullYear(), prev.getMonth());

  meta.innerHTML = "<span>Dieser Monat: <strong>" + thisMonth.rate + "%</strong></span>";
  if (prevMonth.total > 0) {
    const delta = thisMonth.rate - prevMonth.rate;
    const cls = delta > 0 ? "up" : (delta < 0 ? "down" : "");
    const sign = delta > 0 ? "+" : "";
    meta.innerHTML += '<span class="trend-delta ' + cls + '">' + sign + delta + "% vs. Vormonat</span>";
  }
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
  const isCurrentMonth = (y === now.getFullYear() && m === now.getMonth());
  document.getElementById("cal-next").disabled = isCurrentMonth;

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

function keyToLabel(key) {
  const p = key.split("-").map(Number);
  return p[2] + ". " + MONTHS[p[1] - 1];
}

function renderCalendar(habit, entries, today) {
  const yesterday = addDays(today, -1);
  monthGridScaffold(today, function (cell, key) {
    if (entries[key]) {
      cell.classList.add("done");
      cell.style.background = habit.farbe;
      cell.style.color = "#04130a";
    }
    if (key === today) {
      cell.classList.add("tappable", "is-today");
      cell.addEventListener("click", function () {
        toggleEntry(state, habit.id, key);
        saveData(state);
        renderStats();
      });
    } else if (key === yesterday) {
      cell.classList.add("tappable");
      cell.addEventListener("click", function () {
        const verb = entries[key] ? "als nicht erledigt markieren" : "als erledigt markieren";
        openConfirmModal(
          '"' + habit.name + '" für ' + keyToLabel(key) + " nachträglich " + verb + "?",
          function () {
            toggleEntry(state, habit.id, key);
            saveData(state);
            renderStats();
          },
          { confirmLabel: "Eintragen" }
        );
      });
    }
  });
}

function renderCalendarCombined(habits, today) {
  const yesterday = addDays(today, -1);
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
    if (key === yesterday) {
      cell.classList.add("tappable");
      cell.addEventListener("click", function () { openDayEntryModal(key); });
    }
  });
}

function buildDayEntryRow(h, key) {
  const entries = state.eintraege[h.id] || {};
  const done = !!entries[key];
  const row = document.createElement("button");
  row.type = "button";
  row.className = "habit-row" + (done ? " done" : "");
  row.style.setProperty("--c", h.farbe);
  row.innerHTML =
    '<span class="habit-dot" style="background:' + escapeHtml(h.farbe) + '"></span>' +
    '<span class="habit-text"><span class="habit-name">' + escapeHtml(h.name) + "</span></span>" +
    '<span class="habit-mark"></span>';
  row.addEventListener("click", function () {
    toggleEntry(state, h.id, key);
    saveData(state);
    row.classList.toggle("done", !!(state.eintraege[h.id] || {})[key]);
    renderStats();
  });
  return row;
}

function openDayEntryModal(key) {
  // Kein erstelltAm-Filter, konsistent zum Einzel-Gewohnheit-Kalender: der
  // toggelt den Vortag ebenfalls unabhaengig vom Erstellungsdatum der Habit.
  const habits = activeHabits();
  openModal(function (modal, backdrop) {
    const h3 = document.createElement("h3");
    h3.textContent = "Nachtrag für " + keyToLabel(key);
    const list = document.createElement("div");
    list.className = "day-entry-list";
    if (habits.length === 0) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Keine Gewohnheiten an diesem Tag.";
      list.appendChild(p);
    } else {
      habits.forEach(function (h) { list.appendChild(buildDayEntryRow(h, key)); });
    }
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "modal-confirm";
    doneBtn.textContent = "Fertig";
    doneBtn.addEventListener("click", function () { closeModal(backdrop); });
    actions.appendChild(doneBtn);
    modal.appendChild(h3);
    modal.appendChild(list);
    modal.appendChild(actions);
  });
}

document.getElementById("add-habit").addEventListener("click", function () {
  const name = document.getElementById("new-name").value.trim();
  const farbe = document.getElementById("new-color").value;
  const info = document.getElementById("new-info").value.trim();
  if (!name) { return; }
  if (isDuplicateName(name)) {
    showToast('Es gibt bereits eine Gewohnheit namens "' + name + '".', { error: true });
    return;
  }
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

document.getElementById("cal-today").addEventListener("click", function () {
  const now = new Date();
  statsMonth = { y: now.getFullYear(), m: now.getMonth() };
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
