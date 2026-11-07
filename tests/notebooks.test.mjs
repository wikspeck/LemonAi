import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, changed, resolveWrite, importCopies, entitySchema } from '../lib/notebooks/model.ts';
import { retrieve, modelFor, answerText } from '../lib/notebooks/retrieval.ts';

const note = () => ({ ...identity(), kind: 'note', notebookId: 'book', sectionId: 'section', title: 'Photosynthesis', content: 'Plants convert light into chemical energy.', tags: ['biology'], sourceIds: ['source'], starred: false });
test('a stale writer preserves both note versions, without replacing the original', () => {
 const original = note(); const current = changed(original, { content: 'The newest version' });
 const incoming = changed(original, { content: 'An offline edit from another tab' });
 const saved = resolveWrite(current, incoming, original.revision);
 assert.notEqual(saved.id, original.id); assert.equal(saved.content, incoming.content);
 assert.equal(current.content, 'The newest version'); assert.match(saved.title, /conflict copy/);
 assert.equal(resolveWrite(original, incoming, original.revision).id, original.id);
});
test('backup copies remap notebook, section, source and conversation references', () => {
 const records = [{ ...identity(), id: 'book', kind: 'notebook', title: 'Biology', description: '', color: 'sage', icon: '✳', starred: false }, { ...identity(), id: 'section', kind: 'section', notebookId: 'book', title: 'Plants', parentId: null }, { ...identity(), id: 'source', kind: 'attachment', notebookId: 'book', name: 'plants.txt', mime: 'text/plain', size: 3, text: 'sun' }, note()];
 const copy = importCopies(records); copy.forEach(r => assert.equal(entitySchema.safeParse(r).success, true));
 assert.equal(copy[3].notebookId, copy[0].id); assert.equal(copy[3].sectionId, copy[1].id); assert.equal(copy[3].sourceIds[0], copy[2].id);
 for (let i = 0; i < copy.length; i++) assert.notEqual(copy[i].id, records[i].id);
});
test('retrieval ranks matching excerpts and bounds the context', () => {
 const result = retrieve('photosynthesis sunlight', [{ id: 'a', title: 'Economics', text: 'Markets and trade' }, { id: 'b', title: 'Biology', text: 'Photosynthesis uses sunlight.' }, { id: 'c', title: 'Large source', text: 'x'.repeat(10000) }], 2);
 assert.equal(result.length, 2); assert.match(result[0].id, /^b:/); assert.ok(result.every(s => s.excerpt.length <= 1300));
});
test('routing supports explicit model choice and fast versus deep automatic tasks', () => {
 assert.equal(modelFor('summarize', 'auto'), 'llama'); assert.equal(modelFor('explain', 'auto'), 'deepseek'); assert.equal(modelFor('generate', 'llama'), 'llama');
});
test('DeepSeek output hides reasoning and rejects a reasoning-only answer', () => {
 assert.equal(answerText({ response: '<think>private reasoning</think>Answer [1]' }), 'Answer [1]');
 assert.equal(answerText({ choices: [{ message: { content: 'A useful response' } }] }), 'A useful response');
 assert.throws(() => answerText({ response: '<think>unfinished' }), /reasoning/);
});
