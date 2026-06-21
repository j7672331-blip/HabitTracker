"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

// In-Memory-localStorage-Shim (Node hat kein localStorage)
let _ls = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(_ls, k) ? _ls[k] : null; },
  setItem: function (k, v) { _ls[k] = String(v); },
  removeItem: function (k) { delete _ls[k]; },
  clear: function () { _ls = {}; }
};

let _pass = 0, _fail = 0;
global.assertEqual = function (name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (ok) { _pass++; } else { _fail++; }
  console.log((ok ? "PASS: " : "FAIL: ") + name + (ok ? "" : "  (got " + a + ", want " + e + ")"));
};
global.summary = function () {
  console.log("--- " + _pass + " passed, " + _fail + " failed ---");
};

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), "utf8");
  vm.runInThisContext(code, { filename: rel });
}

load("../stats.js");
load("../storage.js");
load("./test-cases.js");
summary();
process.exit(_fail > 0 ? 1 : 0);
