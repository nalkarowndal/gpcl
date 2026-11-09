import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CodexMonitor, parseCodexRecord } from '../server/codex-monitor.mjs';

test('Codex parser emits only metadata, not prompts or tool content', () => {
  const ctx = { id: 'temp', name: 'Codex', agentId: 'main', agentName: 'GPT Lead', active: false };
  const meta = parseCodexRecord({ type:'session_meta',payload:{ id:'123',cwd:'/home/example/project'} },ctx);
  assert.equal(meta[0].sessionId, 'rollout-123');
  assert.equal(meta[0].sessionName, 'Codex · Workspace');
  const prompt = 'SECRET user prompt 123';
  const start = parseCodexRecord({ type:'event_msg',payload:{ type:'user_message',message: prompt } },ctx);
  assert.equal(start[0].type, 'task.started');
  const tool = parseCodexRecord({type:'response_item',payload:{type:'function_call',arguments:'PRIVATE KEY=xyz'}},ctx);
  assert.equal(tool[0].type, 'tool.started');
  const done = parseCodexRecord({type:'event_msg',payload:{type:'task_complete'}},ctx);
  assert.equal(done[0].type, 'task.completed');
  assert.ok(!JSON.stringify([...meta,...start,...tool,...done]).includes(prompt));
  assert.ok(!JSON.stringify([...meta,...start,...tool,...done]).includes('PRIVATE KEY'));
});
test('Codex parser preserves failures, unknown events ignored', () => {
  const ctx = { id:'rollout-a',name:'Codex',agentId:'main',agentName:'GPT Lead', active: true };
  assert.deepEqual(parseCodexRecord({type:'event_msg',payload:{type:'unknown_event'}},ctx),[]);
  assert.equal(parseCodexRecord({type:'event_msg',payload:{type:'task_complete',error:{message:'secret error'}}},ctx)[0].type,'task.failed');
  assert.equal(parseCodexRecord({type:'event_msg',payload:{type:'turn_aborted'}},ctx)[0].type,'task.failed');
});
test('Auto monitor tails newly appended files, ignores stale history and emits no content', async t => {
  const root = await mkdtemp(join(tmpdir(),'pixel-office-codex-'));
  t.after(async () => rm(root,{recursive:true,force:true}));
  const now = Date.now();
  const date = new Date(now);
  const dir = join(root,'sessions',String(date.getFullYear()),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0'));
  await mkdir(dir,{recursive:true});
  const file = join(dir,'rollout-demo.jsonl');
  const lines = [
    {type:'session_meta',payload:{ id:'abc',cwd:'/home/dev/my-app'}},
    {type:'event_msg',payload:{type:'task_started'}},
    {type:'response_item',payload:{type:'function_call',name:'shell',arguments:'PASSWORD=NEVER_SEND'}},
    {type:'response_item',payload:{type:'function_call_output',output:'Secret terminal output'}},
    {type:'event_msg',payload:{type:'task_complete'}}
  ];
  await writeFile(file,lines.slice(0,3).map(v=>JSON.stringify(v)).join('\n')+'\n');
  const events = [];
  const monitor = new CodexMonitor(event=>events.push(event),{root,clock:()=>now});
  await monitor.scan();
  assert.equal(events.length, 3);
  assert.equal(events[0].sessionId,'rollout-abc');
  assert.equal(events[1].type,'task.started');
  await appendFile(file,lines.slice(3).map(v=>JSON.stringify(v)).join('\n')+'\n');
  await monitor.scan();
  assert.equal(events.length,5);
  assert.equal(events[4].type,'task.completed');
  assert.ok(!JSON.stringify(events).includes('PASSWORD'));
  assert.ok(!JSON.stringify(events).includes('Secret terminal output'));
  await monitor.scan();
  assert.equal(events.length,5);
});
