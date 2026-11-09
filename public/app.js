import { startOffice } from './office.js';

const $ = id => document.getElementById(id);
const colors = ['#a7d8bd', '#ebb79b', '#bab5e4', '#e6ca90', '#9cbbda', '#e6a8ae'];
const statusLabels = { working: 'WORKING', waiting: 'WAITING', done: 'DONE', error: 'ERROR' };
const symbols = { 'session.started': '↗', 'session.ended': '◌', 'task.started': '✦',
  'task.completed': '✓', 'task.failed': '!', 'tool.started': '⌘',
  'tool.completed': '⌘', 'agent.spawned': '+', 'agent.waiting': '◷',
  'agent.resumed': '↻', 'agent.completed': '✓', message: '✉' };

function newDemo() {
  const t = new Date().toISOString();
  return {
    sessions: [
      {
        id: 'pixel-01', title: 'Design System Renewal', status: 'working', progress: 68,
        completedTasks: 4, toolCalls: 23, createdAt: t, updatedAt: t,
        agents: [
          { id:'main', name:'GPT Leader', role:'lead', status:'working', activity:'디자인 시스템 구조 분석' },
          { id:'pixie', name:'Pixel', role:'worker', status:'working', activity:'UI 컴포넌트 제작 중' },
          { id:'dot', name:'Dot', role:'worker', status:'waiting', activity:'작업 결과 확인 중' }
        ]
      },
      {
        id: 'pixel-02', title: 'API Integration', status: 'working', progress: 43,
        completedTasks: 2, toolCalls: 12, createdAt: t, updatedAt: t,
        agents: [
          { id:'main', name:'Byte', role:'lead', status:'working', activity:'API 응답 검증' },
          { id:'api', name:'Nori', role:'worker', status:'working', activity:'백엔드 모듈 구현' }
        ]
      },
      {
        id: 'pixel-03', title: 'QA & Documentation', status: 'done', progress: 100,
        completedTasks: 3, toolCalls: 8, createdAt: t, updatedAt: t,
        agents: [{ id:'main', name:'Momo', role:'lead', status:'done', activity:'QA 보고서 작성 완료' }]
      }
    ],
    events: [
      { id:1, time:t, sessionId:'pixel-01', agentId:'pixie', agentName:'Pixel', type:'tool.started', label:'컴포넌트 디자인 파일을 정리 중' },
      { id:2, time:t, sessionId:'pixel-02', agentId:'main', agentName:'Byte', type:'tool.completed', label:'API 응답 검증 완료' },
      { id:3, time:t, sessionId:'pixel-01', agentId:'dot', agentName:'Dot', type:'agent.waiting', label:'리뷰 결과를 기다리고 있어요' },
      { id:4, time:t, sessionId:'pixel-03', agentId:'main', agentName:'Momo', type:'task.completed', label:'전체 회귀 테스트 통과!' },
      { id:5, time:t, sessionId:'pixel-01', agentId:'main', agentName:'GPT Leader', type:'task.started', label:'디자인 시스템 구조 분석 시작' }
    ]
  };
}

let demo = newDemo();
let live = { sessions: [], events: [] };
let mode = 'demo';
let filter = 'all';
let manualMode = false;
let selectedId = demo.sessions[0].id;
let connected = false;
let demoStep = 0;

function current() { return mode === 'demo' ? demo : live; }
function agentsOf(data) { return data.sessions.flatMap(s => s.agents.map(a => ({ ...a, sessionId: s.id }))); }
function selectedSession(data) { return data.sessions.find(s => s.id === selectedId) || data.sessions[0] || null; }
function getStats(data) {
  const agents = agentsOf(data);
  return {
    working: agents.filter(a => a.status === 'working').length,
    completed: data.sessions.reduce((total, s) => total + s.completedTasks, 0),
    tools: data.sessions.reduce((total, s) => total + s.toolCalls, 0)
  };
}
function dom(tag, className, textValue) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textValue !== undefined) e.textContent = String(textValue);
  return e;
}
function status(state) { return statusLabels[state] || 'IDLE'; }
function formatTime(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false });
}
function setConnection(value) {
  connected = value;
  $('connection-pill').classList.toggle('connected', connected);
  $('connection-text').textContent = connected ? 'LOCAL CONNECTED' : '연결 대기 중';
}
function switchMode(next, manual = true) {
  mode = next;
  if (manual) manualMode = true;
  for (const option of ['demo','live']) {
    const button = $('mode-' + option);
    button.classList.toggle('active', mode === option);
    button.setAttribute('aria-pressed', String(mode === option));
  }
  $('mode-help').textContent = mode === 'demo'
    ? '이 화면은 시연용 예시입니다. 실제 GPT 실행과 연결되어 있지 않습니다.'
    : '실제 Codex CLI 또는 API로 수신된 작업만 표시합니다.';
  $('canvas-mode-label').textContent = mode === 'demo' ? '● DEMO WORLD' : '● LIVE EVENTS';
  $('canvas-mode-label').classList.toggle('demo-label', mode === 'demo');
  $('canvas-status').textContent = mode === 'demo' ? 'SIMULATION IS RUNNING' : 'AWAITING REAL TASK EVENTS';
  selectedId = current().sessions[0]?.id || '';
  render();
}
function createSessionItem(session, idx) {
  const item = dom('button', 'session-item' + (selectedId === session.id ? ' selected' : ''));
  item.type = 'button';
  item.setAttribute('aria-pressed', String(selectedId === session.id));
  const icon = dom('span', 'session-icon', ['▣','⌘','✎','◈'][idx % 4]);
  const description = dom('span', 'session-label');
  description.append(dom('strong', '', session.title));
  description.append(dom('small', status(session.status) + ' · ' + session.agents.length + ' agents'));
  item.append(icon, description, dom('span', 'session-led ' + session.status));
  item.addEventListener('click', () => { selectedId = session.id; render(); });
  return item;
}
function renderSessions(data) {
  $('session-count').textContent = String(data.sessions.length).padStart(2,'0');
  const container = $('session-list');
  container.replaceChildren();
  if (!data.sessions.length) return container.append(dom('div','empty-state','아직 작업 세션이 없습니다. Codex CLI 실행 후 이곳에 표시됩니다.'));
  data.sessions.forEach((s, i) => container.append(createSessionItem(s,i)));
}
function renderAgents(data) {
  const agents = agentsOf(data);
  $('agent-count').textContent = String(agents.length).padStart(2,'0');
  const list = $('agent-list');
  list.replaceChildren();
  if (!agents.length) return list.append(dom('div','empty-state','연결된 팀원이 없습니다.'));
  agents.slice(0, 9).forEach((agent, i) => {
    const item = dom('div','agent-item');
    const avatar = dom('span','agent-avatar', agent.role === 'lead' ? '✦' : (agent.name[0] || 'A').toUpperCase());
    avatar.style.background = colors[i % colors.length];
    const block = dom('div');
    block.append(dom('strong','',agent.name), dom('small','',agent.role === 'lead' ? 'Lead agent' : 'Team agent'));
    item.append(avatar,block,dom('span','agent-status ' + agent.status,status(agent.status)));
    list.append(item);
  });
}
function eventClass(type) {
  if (type.includes('failed')) return 'error';
  if (type.includes('completed') || type === 'session.ended') return 'done';
  if (type === 'agent.waiting') return 'waiting';
  if (type.startsWith('tool.')) return 'tool';
  return '';
}
function renderEvents(data) {
  $('event-total').textContent = String(data.events.length);
  const events = data.events.filter(e => filter === 'all' ||
    (filter === 'tasks' && (e.type.startsWith('task.') || e.type.startsWith('session.'))) ||
    (filter === 'tools' && e.type.startsWith('tool.')));
  const list = $('activity-list');
  list.replaceChildren(dom('div','activity-day','LATEST UPDATES / ' + new Date().toLocaleDateString('ko-KR')));
  if (!events.length) return list.append(dom('div','empty-state',filter === 'all' ? '아직 이벤트가 없습니다. 작업을 실행해 첫 번째 이벤트를 보내보세요.' : '이 필터에 해당하는 이벤트가 없습니다.'));
  events.slice(0, 28).forEach(e => {
    const row = dom('div','event');
    const icon = dom('span','event-symbol ' + eventClass(e.type),symbols[e.type] || '✦');
    const content = dom('div','event-content');
    const meta = dom('div','event-meta');
    meta.append(dom('strong','',e.agentName || 'GPT Agent'));
    const time = dom('time','',formatTime(e.time));
    time.dateTime = e.time;
    meta.append(time);
    content.append(meta,dom('p','',e.label || e.type),dom('span','event-tag',e.type.toUpperCase()));
    row.append(icon,content);
    list.append(row);
  });
}
function renderDetails(data) {
  const session = selectedSession(data);
  const stats = getStats(data);
  $('stat-agents').replaceChildren(document.createTextNode(String(stats.working)),dom('span','stat-suffix',' 명'));
  $('stat-completed').replaceChildren(document.createTextNode(String(stats.completed)),dom('span','stat-suffix',' 작업'));
  $('stat-tools').replaceChildren(document.createTextNode(String(stats.tools)),dom('span','stat-suffix',' 회'));
  const progress = session?.progress ?? 0;
  $('progress-value').textContent = progress + '%';
  $('progress-fill').style.width = progress + '%';
  $('detail-title').textContent = session?.title || '진행 중인 세션 없음';
  $('detail-status').textContent = session ? status(session.status) : 'IDLE';
  $('detail-completed').textContent = session?.completedTasks ?? '0';
  $('detail-tools').textContent = session?.toolCalls ?? '0';
  $('detail-agents').textContent = session?.agents.length ?? '0';
  const latest = data.events.find(e => e.sessionId === session?.id);
  $('current-task').textContent = latest?.label || (mode === 'demo' ? '시연 작업을 준비하고 있어요' : '실제 GPT 실행 이벤트를 기다리고 있어요');
  $('detail-description').textContent = session
    ? (latest?.label || '작업 상태를 수집하고 있습니다.') : 'Codex CLI 작업이 시작되면 세션 정보가 표시됩니다.';
}
function render() {
  const data = current();
  if (selectedId && !data.sessions.some(s => s.id === selectedId)) selectedId = data.sessions[0]?.id || '';
  renderSessions(data);
  renderAgents(data);
  renderEvents(data);
  renderDetails(data);
}
function simulate() {
  if (mode !== 'demo') return;
  const cycle = [
    ['pixel-01', 'pixie', 'tool.completed', 'UI 컴포넌트 생성이 완료됐어요'],
    ['pixel-01', 'main', 'tool.started', '디자인 토큰을 분석하는 중'],
    ['pixel-02', 'api', 'tool.started', '백엔드 API 호출을 검증 중'],
    ['pixel-02', 'main', 'tool.completed', '요청 처리 결과를 정리했어요'],
    ['pixel-01', 'dot', 'agent.resumed', 'QA 체크리스트를 살펴보는 중'],
    ['pixel-01', 'pixie', 'tool.started', '새로운 픽셀 아이콘을 만드는 중'],
    ['pixel-03', 'main', 'message', '코드 리뷰를 마치고 휴식 중이에요']
  ];
  const [sid,aid,type,label] = cycle[demoStep % cycle.length];
  demoStep++;
  const session = demo.sessions.find(s => s.id === sid);
  const agent = session.agents.find(a => a.id === aid);
  agent.activity = label;
  agent.status = type === 'agent.resumed' ? 'working' : agent.status;
  if (type === 'tool.started') session.toolCalls++;
  if (type === 'tool.completed') session.progress = session.progress >= 94 ? 52 : session.progress + 4;
  demo.events.unshift({ id:Date.now(), time:new Date().toISOString(), sessionId:sid, agentId:aid, agentName:agent.name, type,label });
  demo.events.length = Math.min(demo.events.length, 60);
  render();
}
async function connect() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (response.ok) {
      live = await response.json();
      setConnection(true);
      if (live.sessions.length && !manualMode) switchMode('live', false);
      else render();
    }
  } catch { setConnection(false); }
  const source = new EventSource('/api/events');
  source.addEventListener('snapshot', event => {
    try {
      live = JSON.parse(event.data);
      setConnection(true);
      if (live.sessions.length && mode === 'demo' && !manualMode) switchMode('live', false);
      else if (mode === 'live') render();
    } catch { /* Ignore malformed messages, reconnect handled by EventSource */ }
  });
  source.onopen = () => setConnection(true);
  source.onerror = () => setConnection(false);
  window.addEventListener('pagehide', () => source.close(), { once:true });
}

$('mode-demo').addEventListener('click', () => switchMode('demo'));
$('mode-live').addEventListener('click', () => switchMode('live'));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(b => {
    b.classList.toggle('active', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  renderEvents(current());
}));
$('copy-command').addEventListener('click', async () => {
  const copy = 'npm run codex -- "작업 지시"';
  try {
    await navigator.clipboard.writeText(copy);
    $('copy-command').textContent = '복사됨!';
    setTimeout(() => { $('copy-command').textContent = '복사'; }, 1600);
  } catch {
    $('copy-command').textContent = '복사 실패';
  }
});
function tickClock() { $('office-clock').textContent = new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false }); }
tickClock();
setInterval(tickClock, 20000);
setInterval(simulate, 4200);
startOffice($('officeCanvas'), current);
render();
connect();
