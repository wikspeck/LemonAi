import fs from 'node:fs/promises';
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#344f3d"/><path d="M256 120l38 98 98 38-98 38-38 98-38-98-98-38 98-38Z" fill="#e5eddb"/><path d="M382 102v52m-26-26h52" stroke="#a9c18c" stroke-width="15" stroke-linecap="round"/></svg>`;
for (const size of [192, 512]) await sharp(Buffer.from(svg)).resize(size).png().toFile(`public/lume-${size}.png`);
await sharp(Buffer.from(svg.replace('rx="112"', 'rx="0"'))).png().toFile('public/lume-maskable.png');
await fs.copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
