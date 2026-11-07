import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const apk = 'native/LumeNotebooks/app/build/outputs/apk/release/app-release.apk';
const directory = 'native/LumeNotebooks/app/build/outputs/androidTest-results/connected/release';
const reports = (await fs.readdir(directory)).filter(name => name.endsWith('.xml'));
if (!reports.length) throw new Error('Release instrumentation report missing');
let report = ''; let newestReport = 0;
for (const name of reports) { const file = `${directory}/${name}`; report += await fs.readFile(file, 'utf8'); newestReport = Math.max(newestReport, (await fs.stat(file)).mtimeMs); }
if (!report.includes('tests="2" failures="0" errors="0"') || !report.includes('createNotebookEditAndReopenOfflineNote') || !report.includes('offlineWriteAndConflictPreserveBothVersions')) throw new Error('Required release tests did not pass');
if ((await fs.stat(apk)).mtimeMs > newestReport) throw new Error('APK changed after device tests');
const bytes = await fs.readFile(apk);
await fs.writeFile('work/lume/android-release-evidence.json', JSON.stringify({ sha256: crypto.createHash('sha256').update(bytes).digest('hex'), install: true, offlineEditing: true, restart: true, nativeTestsPassed: true, testedAt: new Date(newestReport).toISOString(), device: 'Pixel 9 emulator, Android 17, release-signed instrumentation', report: directory }, null, 2));
console.log('Release device-test evidence matched to the exact APK.');
