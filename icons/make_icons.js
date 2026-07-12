// Erzeugt App-Icons ohne externe Bibliotheken (minimales PNG-Encoding).
// Motiv: gruener Kreis mit Haken - das Signature-Element aus .habit-mark.done in style.css.
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PAPER = [0x0c, 0x0d, 0x0c]; // --paper
const ACCENT_A = [0x2f, 0xc9, 0x6f]; // --accent-grad Start
const ACCENT_B = [0x57, 0xe3, 0x9a]; // --accent-grad Ende
const ON_ACCENT = [0x07, 0x16, 0x0d]; // --on-accent

// Gleicher Verlauf wie body { background } in style.css:
// linear-gradient(108deg, color-mix(accent 34%, paper) 0%,
//   color-mix(accent 13%, paper) 32%, paper 62%, #070807 100%)
const BG_ANGLE_DEG = 108;
const BG_STOPS = [
  [0.0, lerp3([0x0c, 0x0d, 0x0c], [0x34, 0xd1, 0x7a], 0.34)],
  [0.32, lerp3([0x0c, 0x0d, 0x0c], [0x34, 0xd1, 0x7a], 0.13)],
  [0.62, PAPER],
  [1.0, [0x07, 0x08, 0x07]],
];

function lerp3(a, b, t) {
  return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
}

function bgColorAt(x, y, size) {
  const rad = (BG_ANGLE_DEG * Math.PI) / 180;
  const gx = Math.sin(rad), gy = -Math.cos(rad);
  const half = (size / 2) * (Math.abs(gx) + Math.abs(gy));
  const dx = x + 0.5 - size / 2, dy = y + 0.5 - size / 2;
  const d = dx * gx + dy * gy;
  const t = Math.max(0, Math.min(1, (d + half) / (2 * half)));
  for (let i = 0; i < BG_STOPS.length - 1; i++) {
    const [t0, c0] = BG_STOPS[i], [t1, c1] = BG_STOPS[i + 1];
    if (t <= t1) { return lerp3(c0, c1, (t - t0) / (t1 - t0)); }
  }
  return BG_STOPS[BG_STOPS.length - 1][1];
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

function lerp(a, b, t) {
  return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
}

function makeIcon(size) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.335;
  const stroke = size * 0.075;
  const p1 = [cx - 0.34 * r, cy + 0.02 * r];
  const p2 = [cx - 0.06 * r, cy + 0.32 * r];
  const p3 = [cx + 0.40 * r, cy - 0.30 * r];
  const buf = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d = Math.hypot(px - cx, py - cy);
      let col;
      if (d <= r) {
        const dseg = Math.min(
          distToSegment(px, py, p1[0], p1[1], p2[0], p2[1]),
          distToSegment(px, py, p2[0], p2[1], p3[0], p3[1])
        );
        if (dseg <= stroke / 2) { col = ON_ACCENT; }
        else { col = lerp(ACCENT_A, ACCENT_B, (x + y) / (2 * size)); }
      } else {
        col = bgColorAt(x, y, size);
      }
      const i = (y * size + x) * 3;
      buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2];
    }
  }
  return buf;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  const table = crc32.table || (crc32.table = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
      t[n] = c >>> 0;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) { crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tag, data) {
  const c = Buffer.concat([Buffer.from(tag), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(c), 0);
  return Buffer.concat([len, c, crc]);
}

function writePng(filePath, size, rgbBuf) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // Filter-Typ 0
    rgbBuf.copy(raw, rowStart + 1, y * size * 3, (y + 1) * size * 3);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  fs.writeFileSync(filePath, Buffer.concat([
    sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]));
}

const here = __dirname;
[192, 512].forEach(function (size) {
  writePng(path.join(here, "icon-" + size + ".png"), size, makeIcon(size));
});
console.log("icons written");
