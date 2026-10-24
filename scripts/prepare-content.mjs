import fs from 'node:fs/promises';
const content=await fs.readFile('CHANGELOG.md','utf8');
await fs.mkdir('lib/generated',{recursive:true});
await fs.writeFile('lib/generated/changelog.json',JSON.stringify({source:'CHANGELOG.md',content:content.replace(/^\uFEFF/,'')},null,2)+'\n');
