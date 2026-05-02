// Script to generate PNG icons from the SVG favicon
// Run this once: node scripts/gen-icons.js
// Requires: npm install -D sharp (run if needed)

import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../public/icons/favicon.svg");
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, pad: true },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size, pad } of sizes) {
  const outPath = join(__dirname, "../public/icons", name);
  let pipeline = sharp(svgBuffer).resize(
    pad ? Math.round(size * 0.8) : size,
    pad ? Math.round(size * 0.8) : size
  );

  if (pad) {
    pipeline = pipeline.extend({
      top: Math.round(size * 0.1),
      bottom: Math.round(size * 0.1),
      left: Math.round(size * 0.1),
      right: Math.round(size * 0.1),
      background: { r: 2, g: 6, b: 23, alpha: 1 }, // #020617
    });
  }

  await pipeline.png().toFile(outPath);
  console.log(`✓ Generated ${name} (${size}×${size})`);
}

console.log("\n🎉 All icons generated in public/icons/");
