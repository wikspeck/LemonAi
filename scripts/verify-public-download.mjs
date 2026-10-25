import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const origin = process.argv[2] ?? 'https://lemonai.wik-speck.workers.dev';
const local = JSON.parse(await fs.readFile('public/downloads/release.json', 'utf8'));
const manifestResponse = await fetch(`${origin}/downloads/release.json?verify=${Date.now()}`);
if (!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
const remote = await manifestResponse.json();
if (remote.sha256 !== local.sha256 || remote.fileName !== local.fileName || remote.bytes !== local.bytes) throw new Error('Live release mismatch');
const response = await fetch(`${origin}/downloads/${remote.fileName}?verify=${Date.now()}`);
if (!response.ok || !response.body) throw new Error(`Download HTTP ${response.status}`);
const hash = crypto.createHash('sha256'); let bytes = 0;
for await (const chunk of response.body) { hash.update(chunk); bytes += chunk.length; if (bytes > remote.bytes) throw new Error('Download exceeds manifest size'); }
const sha256 = hash.digest('hex');
if (bytes !== remote.bytes || sha256 !== remote.sha256) throw new Error('Download integrity mismatch');
console.log(JSON.stringify({ fileName: remote.fileName, bytes, sha256, channel: remote.channel, cleanWindowsVerified: remote.cleanWindowsVerified }, null, 2));
