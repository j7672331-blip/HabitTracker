// Einzige Schnittstelle zu localStorage + Backup.
"use strict";
const STORAGE_KEY = "habitTrackerData";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { return { habits: [], eintraege: {} }; }
  try {
    const d = JSON.parse(raw);
    return { habits: d.habits || [], eintraege: d.eintraege || {} };
  } catch (e) {
    return { habits: [], eintraege: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createHabit(data, name, farbe, todayK) {
  data.habits.push({ id: genId(), name: name, farbe: farbe, erstelltAm: todayK, archiviert: false });
  return data;
}

function updateHabit(data, id, name, farbe) {
  const h = data.habits.find(function (x) { return x.id === id; });
  if (h) { h.name = name; h.farbe = farbe; }
  return data;
}

function archiveHabit(data, id) {
  const h = data.habits.find(function (x) { return x.id === id; });
  if (h) { h.archiviert = true; }
  return data;
}

function deleteHabit(data, id) {
  data.habits = data.habits.filter(function (x) { return x.id !== id; });
  delete data.eintraege[id];
  return data;
}

function toggleEntry(data, habitId, dateK) {
  if (!data.eintraege[habitId]) { data.eintraege[habitId] = {}; }
  if (data.eintraege[habitId][dateK]) {
    delete data.eintraege[habitId][dateK];
  } else {
    data.eintraege[habitId][dateK] = true;
  }
  return data;
}

function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

function importJson(str) {
  const d = JSON.parse(str);
  if (!Array.isArray(d.habits) || typeof d.eintraege !== "object" || d.eintraege === null || Array.isArray(d.eintraege)) {
    throw new Error("Ungültiges Backup-Format");
  }
  const data = { habits: d.habits, eintraege: d.eintraege };
  saveData(data);
  return data;
}
