import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const files = [];
async function walk(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await walk(file); else files.push(file); } }
await walk('.next/static');
const urls = files.filter(f => /\.(js|css|woff2)$/.test(f)).map(f => '/_next/' + f.replaceAll('\\', '/').replace(/^\.next\//, '')).sort();
const version = crypto.createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 16);
await fs.writeFile('public/offline-assets.json', JSON.stringify(urls));
await fs.writeFile('public/offline-version.js', `self.LUME_CACHE_VERSION=${JSON.stringify(version)};\n`);
console.log(`Offline shell prepared: ${urls.length} assets, version ${version}`);
