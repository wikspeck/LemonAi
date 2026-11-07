// Creates a dedicated owner-local release identity. Nothing private is committed or uploaded.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = path.resolve('native/LumeNotebooks');
const properties = path.join(root, 'signing.properties');
try { await fs.access(properties); console.log('Existing Android release identity preserved.'); process.exit(0); } catch {}
const directory = path.join(root, 'signing');
await fs.mkdir(directory, { recursive: true });
const password = crypto.randomBytes(32).toString('hex');
const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool.exe') : 'keytool';
const result = spawnSync(keytool, ['-genkeypair', '-keystore', path.join(directory, 'lume-release.jks'), '-storetype', 'PKCS12', '-alias', 'lume-release', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000', '-dname', 'CN=Lume Notebooks, OU=Android, O=Lume', '-storepass:env', 'LUME_SIGNING_PASSWORD', '-keypass:env', 'LUME_SIGNING_PASSWORD'], { env: { ...process.env, LUME_SIGNING_PASSWORD: password }, encoding: 'utf8' });
if (result.status !== 0) throw new Error('Could not generate the Android release key. Existing key files were not replaced.');
await fs.writeFile(properties, `storeFile=signing/lume-release.jks\nstorePassword=${password}\nkeyAlias=lume-release\nkeyPassword=${password}\n`, { flag: 'wx', mode: 0o600 });
console.log('Dedicated Android release key created under native/LumeNotebooks/signing. Back up this directory and signing.properties securely; they are excluded from Git and web builds.');
