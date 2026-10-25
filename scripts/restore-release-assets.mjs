import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const origin = new URL(process.argv[2] ?? 'https://lemonai.wik-speck.workers.dev');
if (origin.protocol !== 'https:') throw new Error('Use an HTTPS release origin');
for (const manifestFile of ['release-2.1.0.json', 'release.json']) {
 const manifest = JSON.parse(await fs.readFile(`public/downloads/${manifestFile}`, 'utf8'));
 if (!manifest.published) continue;
 const hash = crypto.createHash('sha256'); let bytes = 0;
 for (const part of manifest.parts) {
  if (!/^\/downloads\/lemon-\d+\.\d+\.\d+-part-\d{3}\.bin$/.test(part)) throw new Error('Unsafe release part path');
  const file = `public${part}`;
  let payload;
  try { payload = await fs.readFile(file); }
  catch (error) {
   if (error.code !== 'ENOENT') throw error;
   const response = await fetch(new URL(part, origin), { signal: AbortSignal.timeout(60000) });
   if (!response.ok || !response.body) throw new Error(`Cannot restore ${part}: HTTP ${response.status}`);
   const chunks = []; let length = 0;
   for await (const chunk of response.body) { length += chunk.length; if (length > 16 * 1024 * 1024) throw new Error('Oversized release segment'); chunks.push(chunk); }
   payload = Buffer.concat(chunks);
   await fs.writeFile(file, payload);
  }
  if (payload.length > 16 * 1024 * 1024) throw new Error('Oversized release segment');
  hash.update(payload); bytes += payload.length;
 }
 if (bytes !== manifest.bytes || hash.digest('hex') !== manifest.sha256) throw new Error(`Release integrity failed: ${manifestFile}`);
 console.log(`Verified retained assets: ${manifestFile}, ${bytes} bytes`);
}
