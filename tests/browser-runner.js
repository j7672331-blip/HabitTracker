"use strict";
let _pass = 0, _fail = 0;
function assertEqual(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (ok) { _pass++; } else { _fail++; }
  const row = document.createElement("div");
  row.textContent = (ok ? "PASS: " : "FAIL: ") + name + (ok ? "" : "  (got " + a + ", want " + e + ")");
  row.style.color = ok ? "green" : "red";
  document.getElementById("results").appendChild(row);
}
function summary() {
  const s = document.createElement("div");
  s.textContent = "--- " + _pass + " passed, " + _fail + " failed ---";
  s.style.fontWeight = "bold";
  s.style.marginTop = "1em";
  document.getElementById("results").appendChild(s);
}
