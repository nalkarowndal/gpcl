import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  console.error('사용법: npm run codex -- "프로젝트의 코드 구조를 분석해 줘"');
  process.exit(1);
}
const endpoint = (process.env.OFFICE_URL || 'http://127.0.0.1:3333').replace(/\/$/, '');
const sessionId = 'codex-' + process.pid + '-' + Date.now();
const label = (process.env.OFFICE_TASK_NAME || 'Codex CLI 작업').slice(0, 80);
const token = process.env.OFFICE_TOKEN || '';
let queue = Promise.resolve();
let failures = 0;
let finished = false;
let currentAgentId = 'main';

function submit(type, details = {}) {
  const payload = { sessionId, sessionName: label, agentId: currentAgentId, agentName: 'GPT Lead', type, ...details };
  queue = queue.then(async () => {
    const result = await fetch(endpoint + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization:'Bearer ' + token } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });
    if (!result.ok) throw new Error('HTTP ' + result.status);
  }).catch(error => {
    failures++;
    if (failures === 1) console.error('[Pixel Office] 대시보드 이벤트 전송 실패:', error.message, '| 먼저 npm start 를 실행해 주세요.');
  });
  return queue;
}

function toolLabel(item, completed) {
  const suffix = completed ? '완료' : '실행 중';
  switch (item.type) {
    case 'command_execution': return '터미널 명령 ' + suffix;
    case 'file_change': return '코드 파일 변경 ' + suffix;
    case 'web_search': return '웹 검색 ' + suffix;
    case 'mcp_tool_call': return '외부 도구 호출 ' + suffix;
    case 'collab_tool_call': return '협업 에이전트 작업 ' + suffix;
    case 'reasoning': return '문제 해결 단계 ' + suffix;
    default: return '도구 작업 ' + suffix;
  }
}

function handle(event) {
  if (!event || typeof event.type !== 'string') return;
  if (event.type === 'thread.started') return;
  if (event.type === 'turn.started') return void submit('task.started', { label: '요청받은 GPT 작업을 시작했어요', progress: 5 });
  if (event.type === 'turn.completed') {
    finished = true;
    submit('task.completed', { label: 'GPT 작업이 성공적으로 완료됐어요', progress: 100 });
    return;
  }
  if (event.type === 'turn.failed' || event.type === 'error') {
    finished = true;
    submit('task.failed', { label: 'GPT 작업에 오류가 발생했어요' });
    return;
  }
  if (event.type === 'item.started' || event.type === 'item.completed') {
    const item = event.item || {};
    if (item.type === 'agent_message' || item.type === 'assistant_message') {
      if (event.type === 'item.completed') submit('message', { label: 'GPT가 작업 결과를 정리했어요' });
      return;
    }
    if (item.type === 'todo_list' || item.type === 'plan_update') {
      if (event.type === 'item.completed') submit('message', { label: '작업 계획과 체크리스트를 갱신했어요' });
      return;
    }
    if (item.type === 'reasoning') return; // Never transmit private reasoning content.
    if (item.type === 'collab_tool_call' && event.type === 'item.started') {
      // One short-lived assistant represents delegated work in the office.
      submit('agent.spawned', { agentId: 'assistant', agentName: 'Assistant', label: '협업 팀원이 작업을 시작했어요' });
    }
    const done = event.type === 'item.completed';
    submit(done ? 'tool.completed' : 'tool.started', {
      label: toolLabel(item, done),
      ...(item.type === 'collab_tool_call' ? { agentId: 'assistant', agentName: 'Assistant' } : {})
    });
    if (item.type === 'collab_tool_call' && done) {
      submit('agent.completed', { agentId: 'assistant', agentName: 'Assistant', label: '협업 팀원 작업 완료' });
    }
  }
}

await submit('session.started', { label: 'Codex CLI 세션 연결됨' });

// Windows .cmd shims require a shell; the command here is constant and the
// user-provided prompt is fed through stdin, never interpolated into the shell.
const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'codex';
const args = isWindows ? ['/d','/s','/c','codex exec --json -'] : ['exec', '--json', '-'];
const child = spawn(command, args, {
  cwd: process.cwd(), windowsHide: true, stdio: ['pipe','pipe','inherit']
});
child.stdin.on('error', () => {});
child.stdin.end(prompt);

const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
lines.on('line', line => {
  try { handle(JSON.parse(line)); }
  catch { /* Ignore non-JSON status lines without changing the Codex run. */ }
});
child.on('error', error => {
  console.error('[Pixel Office] Codex CLI를 시작하지 못했습니다:', error.message);
  submit('task.failed', { label: 'Codex CLI 실행 실패 (설치 및 로그인을 확인하세요)' });
  process.exitCode = 1;
});
child.on('close', async code => {
  await queue;
  if (!finished && code !== 0) await submit('task.failed', { label: 'Codex 실행이 비정상 종료됐어요' });
  else if (!finished) await submit('task.completed', { label: 'Codex 작업 종료', progress:100 });
  await submit('session.ended', { label: 'Codex CLI 세션이 종료됐어요' });
  await queue;
  if (code !== 0) process.exitCode = code || 1;
});
