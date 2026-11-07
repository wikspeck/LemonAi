import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const manifest = JSON.parse(await fs.readFile('public/downloads/android-release.json', 'utf8'));
if (!manifest.published) { console.log('No Android download published.'); process.exit(0); }
if (!manifest.testedAt || !/^[a-f0-9]{64}$/.test(manifest.certificateSha256) || manifest.fileName !== 'Lume-Notebooks-1.0.0.apk') throw new Error('Android release identity or test evidence missing');
const hash = crypto.createHash('sha256'); let bytes = 0;
for (const part of manifest.parts) { if (!/^\/downloads\/lume-1\.0\.0-part-\d{3}\.bin$/.test(part)) throw new Error('Invalid Android segment path'); const data = await fs.readFile('public' + part); if (data.length > 16 * 1024 * 1024) throw new Error('Oversized download segment'); hash.update(data); bytes += data.length; }
if (bytes !== manifest.bytes || hash.digest('hex') !== manifest.sha256) throw new Error('Android download integrity mismatch');
console.log('Android release integrity verified:', bytes, 'bytes');
