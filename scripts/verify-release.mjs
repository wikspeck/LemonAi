import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const raw=await fs.readFile('public/downloads/release.json','utf8');
const release=JSON.parse(raw.replace(/^\uFEFF/,''));
if (!release.published) { console.log('No published release configured'); process.exit(0); }
const hash=crypto.createHash('sha256');let bytes=0;
for(const part of release.parts){ if(!/^\/downloads\/lemon-\d+\.\d+\.\d+-part-\d{3}\.bin$/.test(part))throw new Error('Invalid part path');const payload=await fs.readFile('public'+part);if(payload.length>16*1024*1024)throw new Error('Oversized asset');hash.update(payload);bytes+=payload.length; }
if(bytes!==release.bytes||hash.digest('hex')!==release.sha256)throw new Error('Release asset does not match manifest');
console.log('Release integrity verified:',bytes,'bytes');
