const input = document.getElementById('enabled');
const status = document.getElementById('status');
function render(state) {
  input.checked = Boolean(state.enabled);
  status.textContent = state.lastError || (state.lastSentAt
    ? '최근 상태 전송: ' + new Date(state.lastSentAt).toLocaleString('ko-KR')
    : 'ChatGPT 탭에서 응답 생성을 시작하면 감지합니다.');
}
chrome.storage.local.get({ enabled:true, lastSentAt:0, lastError:'' }).then(render);
input.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: input.checked, lastError: '' }).then(() => {
    status.textContent = input.checked ? '자동 감지를 활성화했습니다.' : '감지를 일시 중지했습니다.';
  });
});
