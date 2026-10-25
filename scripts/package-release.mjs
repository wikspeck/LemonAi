import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const [file, version='2.2.0', channel='candidate'] = process.argv.slice(2);
if (!file || !/^\d+\.\d+\.\d+$/.test(version) || !['candidate','preview','stable'].includes(channel)) throw new Error('Pass installer file, semantic version and candidate/preview/stable channel');
const fileName = path.basename(file);
if(fileName!==`Lemon-${version}-Setup.exe`)throw new Error('Unexpected installer filename');
const payload=await fs.readFile(file);
if(payload[0]!==77||payload[1]!==90)throw new Error('Expected Windows installer PE');
const root=path.resolve('public/downloads');await fs.mkdir(root,{recursive:true});const parts=[];
for(let offset=0,index=0;offset<payload.length;offset+=16*1024*1024,index++){
 const name=`lemon-${version}-part-${String(index).padStart(3,'0')}.bin`;
 await fs.writeFile(path.join(root,name),payload.subarray(offset,offset+16*1024*1024));parts.push(`/downloads/${name}`);
}
const manifest={version,channel,published:true,kind:'installer',signed:false,cleanWindowsVerified:false,fileName,bytes:payload.length,sha256:crypto.createHash('sha256').update(payload).digest('hex'),parts};
await fs.writeFile(path.join(root,'release.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
