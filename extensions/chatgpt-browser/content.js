(() => {
  'use strict';
  // Read ONLY DOM control state. Never read prompts, responses, tokens,
  // cookies, fetch/XHR payloads or hidden internal ChatGPT APIs.
  const stopWords = /(^|[\s:])(stop|cancel generation)([\s:]|$)|중지|생성 중단|생성 취소|停止/i;
  const selectors = [
    'button[data-testid="stop-button"]',
    'button[data-testid="stop-generating-button"]',
    '[data-testid="composer-footer"] button[aria-label*="Stop"]',
  ];
  let enabled = true;
  let sentActive = false;
  let lastRoute = '';
  let interval;
  let queued = false;

  const visible = element => Boolean(element && element.getClientRects().length &&
    getComputedStyle(element).visibility !== 'hidden' && !element.disabled);

  function generating() {
    for (const selector of selectors) {
      if ([...document.querySelectorAll(selector)].some(visible)) return true;
    }
    // Fallback for localized ChatGPT buttons; no body text inspection.
    for (const button of document.querySelectorAll('button[aria-label],button[title]')) {
      if (visible(button) && stopWords.test(button.getAttribute('aria-label') || button.getAttribute('title') || '')) return true;
    }
    return false;
  }

  function sessionId() {
    // Hash only pathname, not conversation text, to avoid storing raw IDs.
    let hash = 2166136261;
    const route = location.pathname;
    for (let i = 0; i < route.length; i++) {
      hash ^= route.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'chatgpt-web-' + (hash >>> 0).toString(36);
  }

  function report(type, label) {
    chrome.runtime.sendMessage({
      kind: 'office.event',
      event: {
        type, sessionId: sessionId(), sessionName: 'ChatGPT 웹 화면 · 관찰 기반',
        agentId: 'main', agentName: 'ChatGPT',
        label
      }
    }).catch(() => {});
  }

  function check() {
    queued = false;
    if (!enabled) return;
    const route = location.pathname;
    const busy = generating();
    if (lastRoute !== route) {
      // URL changes do not prove the prior turn completed.
      sentActive = false;
      lastRoute = route;
    }
    if (busy && !sentActive) {
      report('task.started', 'ChatGPT 화면에서 응답 생성이 감지됐어요');
      sentActive = true;
    } else if (!busy && sentActive) {
      report('task.completed', 'ChatGPT 화면에서 응답 생성 표시가 종료됐어요');
      sentActive = false;
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(check, 350);
  }

  chrome.storage.local.get({ enabled: true }).then(p => {
    enabled = Boolean(p.enabled);
    lastRoute = location.pathname;
    check();
  }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.enabled) return;
    enabled = Boolean(changes.enabled.newValue);
    if (!enabled) sentActive = false;
    else check();
  });
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label', 'title', 'data-testid', 'disabled'] });
  interval = setInterval(check, 1500);
  window.addEventListener('pagehide', () => { observer.disconnect(); clearInterval(interval); });
})();
