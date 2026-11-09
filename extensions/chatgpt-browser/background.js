'use strict';

const API = 'http://127.0.0.1:3333/api/events';
const SUPPORTED_TYPES = new Set(['task.started', 'task.completed']);
const VALID_URLS = new Set(['chatgpt.com', 'chat.openai.com']);

chrome.runtime.onInstalled.addListener(() => {
  // The user has installed an extension scoped to ChatGPT and localhost.
  // Users can pause it with the popup at any time.
  chrome.storage.local.get({ enabled: true }).then(({ enabled }) => {
    chrome.storage.local.set({ enabled: Boolean(enabled) });
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderUrl = sender?.tab?.url;
  let host = '';
  try { host = new URL(senderUrl).hostname; } catch { /* no tab */ }
  if (message?.kind !== 'office.event' || !VALID_URLS.has(host)) return false;
  const event = message.event;
  if (!event || !SUPPORTED_TYPES.has(event.type) || typeof event.sessionId !== 'string' ||
      !/^chatgpt-web-[a-z0-9]{1,12}$/.test(event.sessionId)) return false;
  (async () => {
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    if (!enabled) return sendResponse({ ok: false, paused: true });
    const payload = {
      type: event.type, sessionId: event.sessionId,
      sessionName: 'ChatGPT 웹 화면 · 관찰 기반',
      agentId: 'main', agentName: 'ChatGPT',
      label: event.type === 'task.started'
        ? 'ChatGPT 응답 생성 UI 감지 (추정 상태)' : 'ChatGPT 응답 생성 UI 종료 (추정 상태)'
    };
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      let response;
      try {
        response = await fetch(API, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) throw Error('Office HTTP ' + response.status);
      await chrome.storage.local.set({ lastSentAt: Date.now(), lastError: '' });
      sendResponse({ ok: true });
    } catch (error) {
      await chrome.storage.local.set({ lastError: 'Local server unavailable. Run npm start or enable editor extension.' });
      sendResponse({ ok: false, error: String(error?.message || error).slice(0, 90) });
    }
  })().catch(() => sendResponse({ ok: false }));
  return true;
});
