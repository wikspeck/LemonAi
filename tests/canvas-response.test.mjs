import { decodeCanvas } from '../lib/lemon2/canvas-response.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
const valid = { version:1,title:'Hello',components:[{type:'paragraph',text:'Useful answer'}] };
test('Canvas accepts JSON objects, fences, BOM and envelopes',()=>{
 for(const value of [valid,JSON.stringify(valid),'\uFEFF```json\n'+JSON.stringify(valid)+'\n```',{canvas:valid}]) assert.equal(decodeCanvas(value).canvas.title,'Hello');
});
test('Malformed, truncated and unsupported Canvas preserve readable content without exposing internal JSON',()=>{
 for(const value of ['{"version":1,"title":"Example","components":[{"type":"paragraph","text":"Keep this"}',{version:1,title:'Example',components:[{type:'unsupported',text:'Keep this'}]}]){
 const result=decodeCanvas(value);assert.ok(!result.canvas);assert.match(result.text,/Keep this/);assert.doesNotMatch(result.text,/"components"/);assert.ok(result.original.length);
 }
});
test('ordinary text remains useful and excessive output is bounded',()=>{
 assert.equal(decodeCanvas('A natural answer.').text,'A natural answer.');
 assert.equal(decodeCanvas('x'.repeat(1000001)).reason,'size-or-empty');
});

test('prose-wrapped internal Canvas is normalized instead of being displayed as JSON',()=>{
 const good=decodeCanvas('Introduction.\n'+JSON.stringify(valid)+'\nConclusion.');
 assert.ok(good.canvas);assert.equal(good.canvas.components[0].text,'Introduction.');
 const bad=decodeCanvas('Useful introduction.\n'+JSON.stringify({version:1,components:[{type:'bad',text:'Keep this'}]})+'\nUseful conclusion.');
 assert.match(bad.text,/Keep this/);assert.doesNotMatch(bad.text,/"components"/);
});

test('prose-wrapped Canvas handles escaped quotes and braces inside text',()=>{
 const document={version:1,title:'Escaping',components:[{type:'paragraph',text:'Use "a } b" and a backslash \\ safely.'}]};
 const result=decodeCanvas('Before. '+JSON.stringify(document)+' After.');
 assert.ok(result.canvas);assert.equal(result.canvas.components[1].text,document.components[0].text);
});
