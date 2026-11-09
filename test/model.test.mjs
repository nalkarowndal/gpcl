import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeModel } from '../server/model.mjs';

test('initial office is empty and safe', () => {
  const model = new OfficeModel();
  assert.deepEqual(model.snapshot(), { sessions: [], events: [], stats: { sessions:0, working:0, completed:0, toolCalls:0 } });
});
test('create sessions, agents, task state and tool counts', () => {
  const model = new OfficeModel();
  model.ingest({ sessionId:'a', sessionName:'UI 개발', type:'session.started' });
  model.ingest({ sessionId:'a', agentId:'designer', agentName:'Designer', type:'agent.spawned' });
  model.ingest({ sessionId:'a', type:'task.started', label:'개발 시작' });
  model.ingest({ sessionId:'a', type:'tool.started' });
  model.ingest({ sessionId:'a', type:'tool.completed' });
  let state = model.snapshot();
  assert.equal(state.stats.sessions, 1);
  assert.equal(state.stats.toolCalls, 1);
  assert.equal(state.sessions[0].agents.length, 2);
  assert.equal(state.sessions[0].progress, 12);
  assert.equal(state.events[0].type, 'tool.completed');
  model.ingest({ sessionId:'a', type:'task.completed' });
  state = model.snapshot();
  assert.equal(state.stats.completed, 1);
  assert.equal(state.sessions[0].status, 'done');
  assert.equal(state.sessions[0].progress, 100);
});
test('waiting, errors, and resumes have deterministic transitions', () => {
  const model = new OfficeModel();
  model.ingest({ sessionId:'x', type:'agent.waiting' });
  assert.equal(model.snapshot().sessions[0].status, 'waiting');
  model.ingest({ sessionId:'x', type:'agent.resumed' });
  assert.equal(model.snapshot().sessions[0].status, 'working');
  model.ingest({ sessionId:'x', type:'task.failed' });
  assert.equal(model.snapshot().sessions[0].status, 'error');
  model.ingest({ sessionId:'x', type:'session.ended' });
  assert.equal(model.snapshot().sessions[0].status, 'error');
});
test('reject invalid input and clamp hostile or oversized data', () => {
  const model = new OfficeModel();
  assert.throws(() => model.ingest(null), /JSON object/);
  assert.throws(() => model.ingest({ type:'arbitrary' }), /Unsupported/);
  model.ingest({ type:'message', label:'A'.repeat(1000), progress:250, sessionId:'z' });
  assert.equal(model.snapshot().events[0].label.length, 140);
  assert.equal(model.snapshot().sessions[0].progress, 100);
  model.ingest({ type:'message', progress:-50, sessionId:'z' });
  assert.equal(model.snapshot().sessions[0].progress, 0);
});
test('bounded memory, snapshot and reset', () => {
  const model = new OfficeModel();
  for (let i=0; i<150; i++) model.ingest({ type:'message', sessionId:'s'+i });
  assert.equal(model.snapshot().events.length, 100);
  assert.equal(model.snapshot().sessions.length, 16);
  model.reset();
  assert.equal(model.snapshot().sessions.length, 0);
  assert.equal(model.snapshot().events.length, 0);
});
