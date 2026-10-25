import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const origin=process.argv[2]??'https://lemonai.wik-speck.workers.dev';
const output=process.argv[3]??'docs/performance/2.2-network-after.json';
const start=performance.now();const catalogue=await(await fetch(origin+'/api/v2/models')).json();const measurements=[{metric:'registry_fetch_ms',value:performance.now()-start,models:catalogue.models.length,tierDefaults:catalogue.tierDefaults}];
for(const tier of ['vortex','zenith','apex']){
 const start=performance.now();const response=await fetch(origin+'/api/v2/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engine:'lemon2',tier,effort:'low',outputMode:'text',stream:true,messages:[{role:'user',content:'Reply with one short sentence explaining what a tree is.'}]}),signal:AbortSignal.timeout(90000)});
 let first=null,characters=0,buffer='';const decoder=new TextDecoder();
 for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()??'';for(const line of lines){if(!line.startsWith('data:'))continue;try{const data=JSON.parse(line.slice(5));const text=data.response??data.choices?.[0]?.delta?.content;if(typeof text==='string'&&text.length){first??=performance.now()-start;characters+=text.length;}}catch{}}}
 measurements.push({metric:'provider_stream',tier,model:response.headers.get('x-lemon-model'),status:response.status,ttftMs:first,totalMs:performance.now()-start,characters});
 console.log(measurements.at(-1));await fs.writeFile(output,JSON.stringify(measurements,null,2)+'\n');
}
