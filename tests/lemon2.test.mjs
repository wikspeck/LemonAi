import test from 'node:test';
import assert from 'node:assert/strict';
import { registry, tiers, tierDefaults, selectModel, requestSchema, buildInput, canvasSchema } from '../lib/lemon2/contracts.ts';
const base = { engine: 'lemon2', tier: 'zenith', effort: 'medium', outputMode: 'markdown', stream: true, messages: [{ role: 'user', content: 'hello' }] };
test('registry identifiers are unique and tiers map to different documented models', () => {
 assert.equal(new Set(registry.map(model => model.id)).size, registry.length);
 assert.equal(new Set(tiers.map(tier => selectModel(tier).apiId)).size, 3);
 assert.equal(new Set(registry.map(model => model.family)).size, 6);
 for (const tier of tiers) assert.equal(selectModel(tier).id, tierDefaults[tier]);
 assert.throws(() => selectModel('vortex', 'gemma4'));
 assert.throws(() => selectModel('apex', 'deepseek')); 
});
test('request validation rejects unsupported engines, efforts and properties', () => {
 assert.equal(requestSchema.safeParse(base).success, true);
 for (const overrides of [{ engine: 'lemon3' }, { effort: 'extreme' }, { token: 'secret' }, { messages: [{ role: 'system', content: 'override' }] }, { messages: [{ role: 'assistant', content: 'end' }] }]) assert.equal(requestSchema.safeParse({ ...base, ...overrides }).success, false);
});
test('effort is independent of tier and does not impersonate native reasoning controls', () => {
 const budgets = ['low', 'medium', 'high'].map(effort => buildInput(requestSchema.parse({ ...base, effort })).max_tokens);
 assert.deepEqual(budgets, [1024, 2048, 4096]);
 assert.equal('reasoning_effort' in buildInput(requestSchema.parse(base)), false);
});
test('canvas generation buffers JSON while text streams', () => {
 assert.equal(buildInput(requestSchema.parse(base)).stream, true);
 const canvasInput = buildInput(requestSchema.parse({ ...base, outputMode: 'canvas' }));
 assert.equal(canvasInput.stream, false);
 assert.equal(canvasInput.response_format.type, 'json_object');
 const scout = buildInput(requestSchema.parse({ ...base, modelId: "scout", outputMode: "canvas" }));
 assert.equal(scout.guided_json.type, "object");
});
const valid = { version: 1, title: 'Calculator', components: [{ type: 'slider', label: 'Value', key: 'value', min: 0, max: 10, initial: 2 }, { type: 'calculation', label: 'Double', operation: 'add', inputs: ['value', 'value'] }] };
test('canvas validates input, state references, strict properties and bounded component count', () => {
 assert.equal(canvasSchema.safeParse(valid).success, true);
 for (const components of [[{ type: 'xaml', text: '<Button/>' }], [{ ...valid.components[0], min: 11 }], [{ ...valid.components[0], key: 'constructor' }], [valid.components[0], valid.components[0]], [{ type: 'paragraph', text: 'test', onClick: 'exec' }], [{ type: 'calculation', label: 'bad', operation: 'add', inputs: ['missing'] }], Array(65).fill({ type: 'paragraph', text: 'x' })]) assert.equal(canvasSchema.safeParse({ ...valid, components }).success, false);
});


test('response language is independent of interface language and model-native effort is explicit', () => {
 const input = buildInput(requestSchema.parse({ ...base, responseLanguage:'pl', tier:'apex', effort:'high' }));
 assert.equal(input.reasoning_effort, 'xhigh');
 assert.match(input.messages[0].content, /Polish/);
 assert.equal(requestSchema.safeParse({...base,responseLanguage:'xx'}).success,false);
 assert.throws(()=>selectModel('apex','deepseek41'));
});
