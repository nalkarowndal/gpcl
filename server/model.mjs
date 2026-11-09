const TYPES = new Set([
  'session.started', 'session.ended', 'task.started', 'task.completed',
  'task.failed', 'tool.started', 'tool.completed', 'agent.spawned',
  'agent.waiting', 'agent.resumed', 'agent.completed', 'message'
]);

const STATES = {
  'session.started': 'working', 'session.ended': 'done',
  'task.started': 'working', 'task.completed': 'done',
  'task.failed': 'error', 'tool.started': 'working',
  'tool.completed': 'working', 'agent.spawned': 'working',
  'agent.waiting': 'waiting', 'agent.resumed': 'working',
  'agent.completed': 'done'
};

const FALLBACK = {
  'session.started': '새 세션이 시작됐어요', 'session.ended': '세션 종료',
  'task.started': '작업을 시작했어요', 'task.completed': '작업 완료!',
  'task.failed': '작업에 오류가 발생했어요', 'tool.started': '도구를 사용 중이에요',
  'tool.completed': '도구 실행 완료', 'agent.spawned': '새 팀원이 합류했어요',
  'agent.waiting': '응답을 기다려요', 'agent.resumed': '다시 작업 중',
  'agent.completed': '팀원 작업 완료', message: '상태 업데이트'
};

function clean(value, fallback, limit = 120) {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, limit) || fallback;
}

export class OfficeModel {
  constructor() {
    this.sessions = new Map();
    this.events = [];
    this.nextId = 1;
  }

  ingest(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('JSON object required');
    }
    if (!TYPES.has(input.type)) {
      throw new TypeError('Unsupported event type');
    }
    const sessionId = clean(input.sessionId, 'default', 80);
    const agentId = clean(input.agentId, 'main', 80);
    const now = new Date().toISOString();
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId, title: clean(input.sessionName, 'GPT 작업 세션', 80),
        status: 'working', updatedAt: now, createdAt: now,
        progress: 0, agents: [], completedTasks: 0, toolCalls: 0
      };
      this.sessions.set(sessionId, session);
    }
    if (input.sessionName) session.title = clean(input.sessionName, session.title, 80);
    session.updatedAt = now;
    const role = agentId === 'main' ? 'lead' : 'worker';
    let agent = session.agents.find(a => a.id === agentId);
    if (!agent) {
      agent = {
        id: agentId, name: clean(input.agentName, role === 'lead' ? 'GPT Lead' : 'GPT Agent', 36),
        role, status: 'working', activity: '작업 준비 중', updatedAt: now
      };
      session.agents.push(agent);
    }
    if (input.agentName) agent.name = clean(input.agentName, agent.name, 36);
    const label = clean(input.label, FALLBACK[input.type], 140);
    agent.activity = label;
    agent.updatedAt = now;
    if (STATES[input.type]) agent.status = STATES[input.type];

    if (input.type === 'task.started' || input.type === 'session.started') session.status = 'working';
    if (input.type === 'task.completed') {
      session.completedTasks += 1;
      session.status = 'done';
      session.progress = 100;
    }
    if (input.type === 'task.failed') session.status = 'error';
    if (input.type === 'session.ended') {
      if (session.status !== 'error') session.status = 'done';
      else agent.status = 'error';
    }
    if (input.type === 'agent.waiting') session.status = 'waiting';
    if (input.type === 'agent.resumed' || input.type === 'tool.started') session.status = 'working';
    if (input.type === 'tool.started') session.toolCalls += 1;
    if (typeof input.progress === 'number' && Number.isFinite(input.progress)) {
      session.progress = Math.max(0, Math.min(100, Math.round(input.progress)));
    } else if (input.type === 'task.started') {
      session.progress = 4;
    } else if (input.type === 'tool.completed' && session.progress < 92) {
      session.progress = Math.min(92, session.progress + 8);
    }
    const event = { id: this.nextId++, time: now, sessionId, agentId, agentName: agent.name, type: input.type, label };
    this.events.unshift(event);
    this.events.length = Math.min(this.events.length, 100);

    // Keep memory bounded, removing oldest sessions first.
    while (this.sessions.size > 16) this.sessions.delete(this.sessions.keys().next().value);
    return event;
  }

  snapshot() {
    const sessions = [...this.sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const agents = sessions.flatMap(s => s.agents.map(a => ({ ...a, sessionId: s.id })));
    return {
      sessions,
      events: this.events,
      stats: {
        sessions: sessions.length,
        working: agents.filter(a => a.status === 'working').length,
        completed: sessions.reduce((n, s) => n + s.completedTasks, 0),
        toolCalls: sessions.reduce((n, s) => n + s.toolCalls, 0)
      }
    };
  }

  reset() {
    this.sessions.clear();
    this.events = [];
    this.nextId = 1;
  }
}
