import { readdir, stat, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const MAX_READ = 128 * 1024;
const RECENT_MS = 5 * 60_000;
const MAX_FILES = 100;
const MAX_CURSORS = 200;

function datePath(date) {
  return [String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')];
}

function directoryCandidates(root, clock) {
  const dirs = [];
  for (let n = 0; n < 3; n++) {
    const day = new Date(clock - n * 86400000);
    dirs.push(join(root, 'sessions', ...datePath(day)));
  }
  return dirs;
}

/** A deliberately narrow, privacy-preserving decoder for Codex rollout status. */
export function parseCodexRecord(record, context) {
  if (!record || typeof record !== 'object') return [];
  const payload = record.payload || {};
  const result = [];
  const emit = (type, label) => result.push({ sessionId: context.id, sessionName: context.name, agentId: context.agentId, agentName: context.agentName, type, label });

  if (record.type === 'session_meta') {
    const id = typeof payload.id === 'string' && payload.id.length <= 100 ? payload.id : context.id;
    context.id = id.startsWith('rollout-') ? id : 'rollout-' + id;
    // Never expose a working-directory name or file path in dashboard events.
    context.name = 'Codex · Workspace';
    // Session logs may include subagents. No conversation contents are read into events.
    const isSubagent = Boolean(payload.source?.subagent || payload.thread_source === 'subagent');
    if (isSubagent) {
      context.agentId = 'worker-' + id.slice(-12);
      context.agentName = 'Codex Assistant';
      emit('agent.spawned', 'Codex 서브에이전트 작업 감지');
    } else {
      emit('session.started', '로컬 Codex 세션 감지');
    }
    return result;
  }
  if (record.type === 'event_msg') {
    switch (payload.type) {
      case 'task_started':
      case 'turn_started':
        context.active = true;
        emit('task.started', 'Codex 작업 시작');
        break;
      case 'user_message':
        if (!context.active) {
          context.active = true;
          emit('task.started', '사용자 요청에 대한 작업 시작');
        }
        break;
      case 'task_complete':
      case 'turn_complete':
        context.active = false;
        emit(payload.error ? 'task.failed' : 'task.completed', payload.error ? 'Codex 작업 오류' : 'Codex 작업 완료');
        break;
      case 'turn_aborted':
        context.active = false;
        emit('task.failed', 'Codex 작업 중단');
        break;
      case 'agent_message':
        if (context.active) emit('message', 'Codex가 응답을 작성했어요');
        break;
    }
  }
  if (record.type === 'response_item') {
    const itemType = payload.type;
    if (itemType === 'function_call' || itemType === 'custom_tool_call') {
      emit('tool.started', 'Codex 도구 실행');
    } else if (itemType === 'function_call_output' || itemType === 'custom_tool_call_output') {
      emit('tool.completed', 'Codex 도구 결과 수신');
    }
  }
  return result;
}

/**
 * Scans ONLY Codex's local rollout files. No prompt body, command, file name
 * from rollout content, token, authentication, or tool result is emitted.
 * Existing old logs are not replayed. EOF does not imply completion.
 */
export class CodexMonitor {
  constructor(onEvent, { root = process.env.CODEX_HOME || join(homedir(), '.codex'), clock = () => Date.now() } = {}) {
    this.root = resolve(root);
    this.onEvent = onEvent;
    this.clock = clock;
    this.cursors = new Map();
    this.busy = false;
  }
  async listRecentFiles() {
    const files = [];
    for (const dir of directoryCandidates(this.root, this.clock())) {
      let entries = [];
      try { entries = await readdir(dir, { withFileTypes: true }); }
      catch { continue; }
      for (const entry of entries) {
        if (!entry.isFile() || !/^rollout-.*\.jsonl$/.test(entry.name)) continue;
        files.push(join(dir, entry.name));
      }
    }
    return files.sort().slice(-MAX_FILES);
  }
  async scan() {
    if (this.busy) return;
    this.busy = true;
    try {
      const files = await this.listRecentFiles();
      for (const path of files) {
        try { await this.scanFile(path); } catch { /* Rollover or permission changes are harmless. */ }
      }
      while (this.cursors.size > MAX_CURSORS) this.cursors.delete(this.cursors.keys().next().value);
    } finally { this.busy = false; }
  }
  async scanFile(path) {
    const metadata = await stat(path);
    if (!metadata.isFile()) return;
    let cursor = this.cursors.get(path);
    if (!cursor) {
      cursor = {
        offset: metadata.mtimeMs > this.clock() - RECENT_MS ? 0 : metadata.size,
        partial: '',
        context: { id: 'rollout-' + basename(path, '.jsonl').slice(-42), name: 'Codex · Workspace', agentId: 'main', agentName: 'GPT Lead', active: false },
      };
      this.cursors.set(path, cursor);
    }
    if (metadata.size < cursor.offset) {
      cursor.offset = 0;
      cursor.partial = '';
    }
    if (metadata.size === cursor.offset) return;

    // Read at most 128 KiB per polling tick. Bound partial lines to avoid
    // accidentally accumulating full prompts or large tool output in memory.
    const length = Math.min(MAX_READ, metadata.size - cursor.offset);
    const fd = await open(path, 'r');
    let bytes;
    try {
      bytes = Buffer.alloc(length);
      const result = await fd.read(bytes, 0, length, cursor.offset);
      bytes = bytes.subarray(0, result.bytesRead);
    } finally { await fd.close(); }
    cursor.offset += bytes.length;
    if (!bytes.length) return;

    const joined = cursor.partial + bytes.toString('utf8');
    const lines = joined.split('\n');
    cursor.partial = lines.pop() || '';
    if (cursor.partial.length > MAX_READ) cursor.partial = '';

    for (const line of lines) {
      if (!line || line.length > MAX_READ) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      for (const event of parseCodexRecord(record, cursor.context)) {
        try { this.onEvent(event); } catch { /* One malformed session must not stop monitoring. */ }
      }
    }
  }
}

export function startCodexMonitor(onEvent, options = {}) {
  const monitor = new CodexMonitor(onEvent, options);
  monitor.scan().catch(() => {});
  const timer = setInterval(() => monitor.scan().catch(() => {}), Number(process.env.OFFICE_SCAN_MS || 1500));
  timer.unref();
  return () => clearInterval(timer);
}
