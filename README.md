# GPT Pixel Office

> **GPT가 일하는 모습을 눈으로 보는 작은 픽셀아트 오피스.**  
> Codex CLI의 실제 작업 이벤트를 받아 실시간으로 변하는 로컬 퍼스트 시각화 대시보드입니다.

![Status](https://img.shields.io/badge/node-%E2%89%A5%2020-8ac5a6?style=flat-square) ![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-93a8cf?style=flat-square)

## 기능

- **실시간 픽셀아트 사무실:** 독자 제작 Canvas 2D 아트, 6개 책상, 손으로 그린 캐릭터, 타이핑·대기·완료 상태 애니메이션
- **LIVE / DEMO 모드:** 실제 수신된 이벤트와 시연 데이터를 명확히 분리
- **Codex CLI 연결:** 공식 `codex exec --json` 이벤트로 작업 시작·종료, 도구 실행, 파일 변경, 검색 등 시각화
- **다중 세션 대시보드:** 세션 선택, 팀원 상태, 진행률, 작업 완료·도구 호출 수, 타임라인
- **외부 GPT 작업 이벤트 API:** OpenAI API 애플리케이션, 에이전트 러너, 자동화 스크립트에서 HTTP POST로 상태 업데이트 가능
- **SSE 푸시:** 서버가 브라우저에 변경 내용을 즉시 전달
- **모바일 대응:** 작은 화면에서도 기능 유지
- **로컬 전용 기본값:** 127.0.0.1 바인딩, 외부 프롬프트·원시 도구 출력·비공개 추론 내용 수집 안 함

## 빠른 시작

### 1. 설치 및 실행

Node.js 20 이상이 필요합니다. 실행 자체에는 별도 `npm install`이 필요하지 않습니다.

```bash
git clone https://github.com/nalkarowndal/gpcl.git
cd gpcl
npm start
```

브라우저에서 **http://127.0.0.1:3333**에 접속합니다. 우선 `DEMO` 모드에서 움직이는 사무실을 확인할 수 있습니다.

### 2. 실제 Codex 작업 연결

Codex CLI가 설치되지 않았다면 다음 명령어로 설치하고, `codex`를 실행하여 로그인하세요.

```bash
npm install -g @openai/codex
codex
```

**터미널 1:** 대시보드를 켭니다.

```bash
npm start
```

**터미널 2:** 동일 저장소에서 예시 작업을 시작합니다.

```bash
npm run codex -- "현재 프로젝트 구조를 분석하고 개선할 점을 알려줘"
```

브라우저에서 **LIVE** 모드를 누르면 실제 작업이 표시됩니다. 이후 작업 도중 `task.started`, `tool.started`, `tool.completed`, `task.completed` 같은 이벤트가 자동 수집됩니다.

**다른 프로젝트에서 실행할 경우:** 작업할 프로젝트 디렉터리에서 `node /gpcl까지의/절대경로/scripts/watch-codex.mjs "작업 지시"` 명령을 실행하세요. 그러면 Codex는 해당 프로젝트 디렉터리를 기준으로 작동합니다. Windows라면 예를 들어 `node C:\\Projects\\gpcl\\scripts\\watch-codex.mjs "작업 지시"` 형식입니다.

Codex 자동화는 `codex exec --json -`의 JSONL 출력을 파싱합니다. Codex 자체의 승인 및 샌드박스 정책은 변경하지 않습니다.

## 외부 GPT / AI 에이전트 연결

**일반 ChatGPT 채팅이나 ChatGPT Work의 내부 실행 상태는 공개된 작업 이벤트 피드를 이 앱에 자동으로 전송하지 않습니다.** 따라서 웹 ChatGPT 대화만으로는 LIVE에 캐릭터가 자동 표시되지 않습니다. 연결하려는 앱이나 에이전트 러너가 아래 이벤트를 직접 보내야 합니다.

HTTP POST `http://127.0.0.1:3333/api/events`, `Content-Type: application/json`:

```bash
curl -X POST http://127.0.0.1:3333/api/events \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"my-gpt-task","sessionName":"리액트 앱 개발","agentId":"main","agentName":"GPT Lead","type":"task.started","label":"메인 페이지 구현 시작","progress":10}'
```

PowerShell에서는 다음 명령어를 사용할 수 있습니다.

```powershell
$payload = @{ sessionId='my-gpt-task'; sessionName='React 앱 개발'; type='task.started'; label='첫 작업 시작'; progress=10 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:3333/api/events -Method Post -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($payload))
```

추가 이벤트 예:

```json
{"sessionId":"my-gpt-task","agentId":"ui-agent","agentName":"UI Agent","type":"agent.spawned","label":"UI 구현 담당"}
{"sessionId":"my-gpt-task","agentId":"ui-agent","type":"tool.started","label":"컴포넌트 파일 수정 중"}
{"sessionId":"my-gpt-task","agentId":"ui-agent","type":"tool.completed","label":"컴포넌트 수정 완료","progress":55}
{"sessionId":"my-gpt-task","agentId":"ui-agent","type":"agent.completed","label":"UI 구현 완료"}
{"sessionId":"my-gpt-task","type":"task.completed","label":"전체 작업 완료","progress":100}
```

지원 이벤트 유형:

`session.started`, `session.ended`, `task.started`, `task.completed`, `task.failed`, `tool.started`, `tool.completed`, `agent.spawned`, `agent.waiting`, `agent.resumed`, `agent.completed`, `message`

입력은 UTF-8 JSON이며 16KB 이하로 제한됩니다. `sessionId` / `agentId`는 임의의 영문 문자열을 사용할 수 있고, `progress`는 0부터 100 사이 숫자입니다. 세션과 에이전트는 첫 이벤트 수신 시 자동 생성됩니다.

읽기 API: `GET /api/state` (현재 상태), `GET /api/events` (Server-Sent Events), `GET /api/health` (헬스체크).  
초기화: `POST /api/reset` (수집된 데이터만 삭제).

## 보안 및 개인정보

- 기본 서버 주소 `127.0.0.1:3333`: 공개 인터넷에 노출하지 않습니다.
- `OFFICE_TOKEN` 환경변수를 설정한 경우 POST 요청에 `Authorization: Bearer <token>`이 필요합니다. Codex 감시기에도 같은 환경변수를 설정하세요.
- Codex 감시기는 **프롬프트 본문, 명령어 내용, 파일 경로, 원시 명령 출력, 비공개 추론**을 대시보드 서버로 보내지 않습니다. 안전한 **요약 상태 텍스트**만 전송합니다.
- 외부 스크립트에서 직접 이벤트를 보낼 때는 본문에 비밀 정보가 포함되지 않도록 주의하세요.
- 수신된 상태와 이벤트는 서버 메모리에만 보관합니다. 서버를 종료하면 초기화되며, 최대 세션 16개 / 최근 이벤트 100개만 유지합니다.
- `HOST=0.0.0.0`으로 공개 바인딩하는 것은 권장하지 않습니다. 필요한 경우 리버스 프록시, 접근 인증, 네트워크 격리를 추가하세요.

## 개발 및 테스트

```bash
npm test
npm run dev
```

서비스에는 별도 번들러와 데이터베이스가 필요하지 않습니다.

```text
public/
  index.html      — Semantic HTML dashboard
  style.css       — responsive UI design system
  app.js          — session lists, event timeline, live/demo mode
  office.js       — handmade pixel-art scene, Canvas 2D animation
server/
  index.mjs       — HTTP static server + JSON API + SSE
  model.mjs       — event validation, state and history
scripts/
  watch-codex.mjs — Codex CLI JSONL to office event adapter
test/
  model.test.mjs  — state model tests
.github/workflows/
  ci.yml          — Node.js syntax and test checks
```

## 참고 및 구분

이 프로젝트는 [Claude Office Visualizer](https://github.com/paulrobello/claude-office)의 **작업 상태를 게임 형태로 시각화하는 아이디어**를 참고한 별도의 GPT/Codex용 구현입니다. 기존 프로젝트의 코드, 스프라이트, 이미지나 자산은 복사하지 않았습니다. 현재 제공되는 기능은 MVP이며 ChatGPT 브라우저 탭 감시나 ChatGPT 비공개 내부 이벤트 자동 수집을 지원한다고 주장하지 않습니다.

참고: [Codex 비대화형 `--json` 모드](https://learn.chatgpt.com/docs/non-interactive-mode) · [Codex CLI](https://github.com/openai/codex)
