#!/usr/bin/env node
// Renders favicons and PWA icons from the Route Pair mark (design B02).
// Colours are read from src/styles/tokens.css so the icons follow the tokens.
//   node scripts/generate-icons.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..");
const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
const token = (name) => {
  const m = tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};
const emerald = token("primary-600");
const gold400 = token("secondary-400");
const gold500 = token("secondary-500");
const white = token("neutral-0");

// Mark geometry on its 48-unit grid. Small cuts thicken strokes (B02 favicon cuts).
const mark = ({ line, dot, stroke = 4, stopR = 6, dotR = 7 }) => `
  <circle cx="13" cy="32" r="${stopR}" fill="none" stroke="${line}" stroke-width="${stroke}"/>
  <path d="M19 32h3a6 6 0 0 0 6-6v-4a6 6 0 0 1 6-6" fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linecap="round"/>
  <circle cx="35" cy="16" r="${dotR}" fill="${dot}"/>`;

// App icon: mark centred on emerald. `inset` is the share of the canvas the 48-grid occupies.
const appIcon = (size, inset) => {
  const s = size * inset;
  const o = (size - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${emerald}"/>
    <g transform="translate(${o} ${o}) scale(${s / 48})">${mark({ line: white, dot: gold400 })}</g>
  </svg>`;
};

// Favicon: mark alone on transparent, thicker cut.
const favicon = (size) => {
  const cut =
    size <= 16
      ? { stroke: 6, stopR: 7, dotR: 9 }
      : size <= 32
        ? { stroke: 4.5, stopR: 6, dotR: 7.5 }
        : { stroke: 4, stopR: 6, dotR: 7 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    ${mark({ line: emerald, dot: size <= 32 ? gold500 : gold400, ...cut })}
  </svg>`;
};

const out = join(root, "public/icons");
mkdirSync(out, { recursive: true });

const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(join(out, file));

await Promise.all([
  // "any" icons use the full square; maskable keeps the mark inside the inner 80% safe zone.
  png(appIcon(192, 0.72), "icon-192.png"),
  png(appIcon(512, 0.72), "icon-512.png"),
  png(appIcon(192, 0.56), "maskable-192.png"),
  png(appIcon(512, 0.56), "maskable-512.png"),
  png(appIcon(180, 0.66), "apple-touch-icon.png"),
  png(favicon(16), "favicon-16.png"),
  png(favicon(32), "favicon-32.png"),
  png(favicon(48), "favicon-48.png"),
]);

writeFileSync(join(root, "src/app/icon.svg"), favicon(48).trim() + "\n");
console.log("icons written to public/icons and src/app/icon.svg");
