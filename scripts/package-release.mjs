import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const file = process.argv[2];
if (!file) throw new Error('Pass the built release ZIP as the first argument');
const payload = await fs.readFile(file);
const root=path.resolve('public/downloads');
await fs.mkdir(root,{recursive:true});
const parts=[];
for(let offset=0,index=0;offset<payload.length;offset+=16*1024*1024,index++){
 const name=`lemon-2.1.0-part-${String(index).padStart(3,'0')}.bin`;
 await fs.writeFile(path.join(root,name),payload.subarray(offset,offset+16*1024*1024));
 parts.push(`/downloads/${name}`);
}
const manifest={version:'2.1.0',channel:'preview',published:true,fileName:'Lemon-2.1-win-x64.zip',bytes:payload.length,sha256:crypto.createHash('sha256').update(payload).digest('hex'),parts};
await fs.writeFile(path.join(root,'release.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({bytes:manifest.bytes,sha256:manifest.sha256,parts:parts.length}));
