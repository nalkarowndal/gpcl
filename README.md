# GPT Pixel Office

> **GPT가 일하는 모습을 눈으로 보는 작은 픽셀아트 오피스.**  
> Codex CLI의 실제 작업 이벤트를 받아 실시간으로 변하는 로컬 퍼스트 시각화 대시보드입니다.

![Status](https://img.shields.io/badge/node-%E2%89%A5%2020-8ac5a6?style=flat-square) ![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-93a8cf?style=flat-square)

## GPT Pixel Office 4.0 — Taskbar Cozy Companion (Windows portable EXE)

이번 버전은 **TBH: Task Bar Hero**의 작업 표시줄 주변 방치형 실행 방식과 **Mini Cozy Room: Lo-Fi**의 아늑한 공간 및 집중 도구에서 영감을 얻어 독자적으로 제작한 **작은 데스크톱 컴패니언**입니다. 상용 게임의 원본 캐릭터·이미지·음악·맵·코드가 포함되어 있지 않습니다.

- **기본 화면 = Room:** 픽셀아트 입체 방, 캐릭터 4명과 고양이 1마리가 업무와 무관하게 이동하고 휴식합니다.
- **Taskbar 모드:** 상단의 ▰ 버튼을 눌러 작업 표시줄 바로 위에 놓기 쉬운 얇은 가로형 미니 창으로 전환합니다. *Windows 작업 표시줄 내부에 임베드하는 방식은 아니며 작업 표시줄 위의 영역에 정렬합니다.*
- **투명·테두리 없는 창:** 제목 영역 드래그로 자유 이동, 항상 위 표시 On/Off, 투명도 55~100% 조절, 작업 표시줄 위로 정렬, 창 크기 조절을 지원합니다.
- **트레이 상주:** × 버튼으로 숨기고 시스템 트레이 아이콘을 더블 클릭하면 다시 나타납니다. 트레이에서 Room/Taskbar 모드 변경, 전체 대시보드 열기, 상단 고정 및 클릭 통과 변경, 완전 종료가 가능합니다. 클릭 통과를 켜면 마우스 조작이 불가능하므로 **반드시 트레이에서 클릭 통과를 다시 해제하세요**.
- **꾸미기:** 원본 방의 황혼/햇살/숲 테마 3종.
- **집중 도구:** 로컬 25분 포모도로 타이머, 개인용 할 일 목록(최대 20개, 이 PC에만 저장). 온라인 계정 필요 없음.
- **앰비언스:** 사용자가 클릭해 켜는 절제된 **직접 합성 빗소리**. 별도의 상용 Lo-Fi 음악 파일을 무단 사용하지 않습니다.
- **GPT LIVE:** 실제 연동된 Codex/ChatGPT 웹 이벤트가 있을 때만 상태 표시. 화면에 있는 자율 NPC들은 작업 감지 에이전트가 아닙니다.
- **성능:** 480px 기반 Canvas 2D 오리지널 장면, 최대 30FPS로 업데이트, GPU가 필요 없는 소규모 구성.
- **실행:** 설치하지 않는 **Windows x64 단일 EXE**, Electron 엔진 포함. 별도 Node.js 설치 불필요.

### Windows 설치 없이 시작

**<https://github.com/nalkarowndal/gpcl/releases/tag/v4.0.0>** 에서 `GPT-Pixel-Office-4.0.0-portable-x64.exe` 다운로드 → 더블클릭합니다.

이름이 동일한 v3.0.0 실행파일은 기존 대시보드 기반 디자인이므로 **v4.0.0**을 다운로드해야 위젯형 Room/Taskbar 모드를 사용할 수 있습니다.

처음 실행하면 작은 방이 화면 가장자리, Windows 작업 표시줄 위에 나타납니다. 창을 닫아도 트레이에 상주하며, 트레이에서 **종료**를 선택하면 완전히 종료됩니다. 클릭 통과 시 트레이를 통해 조작을 복구하세요.

빌드/검증:

```powershell
npm install
npm test
npm run build:portable
```

생성 결과: `dist/portable/GPT-Pixel-Office-4.0.0-portable-x64.exe`.

**주의:** 이 빌드는 코드 서명되지 않았으므로 Windows SmartScreen 경고가 나타날 수 있습니다. GitHub Releases의 SHA256SUMS.txt로 실행 파일을 검증하세요. 실제 Task Bar Hero 게임의 전투·아이템·스팀 시장 거래나 Mini Cozy Room의 멀티플레이·상용 음악 기능을 복제한 프로젝트는 아닙니다.

---

## 3.0 — 방치형 사무실 및 Windows 포터블 실행파일 (.exe)

이제 GPT 작업을 실행하지 않아도 6명의 가상 캐릭터가 사무실에서 자유롭게 생활합니다. **실제 AI 작업이 아니며, 별도의 NPC 방치 시뮬레이션**입니다.

- **자율 생활:** 산책, 커피 타임, 수다, 독서, 쉬기, 책상 정리, 식물 돌보기
- **충돌 회피:** 책상, 책장, 서버, 커피 바를 통과하지 않도록 격자 경로 탐색(A*) 적용
- **일시정지 및 속도:** 방치형 동작을 멈추거나 1×/2×/3× 속도로 변경
- **보기 모드:** IDLE(기본값), DEMO(가상 GPT 예시), LIVE(실제 연동 이벤트)
- **독립 동작:** Codex/ChatGPT가 실행 중이지 않아도 NPC들은 활동. LIVE에서도 일부 NPC 생활은 계속 표시
- **Windows 실행파일:** Node.js 설치, VSIX 설치, 웹브라우저 수동 실행 없이 포터블 exe 파일을 더블클릭하면 앱이 열리고 로컬 서버가 시작됩니다

### Windows 사용자: 실행파일 다운로드

1. [Windows Portable EXE 빌드 결과](https://github.com/nalkarowndal/gpcl/actions/workflows/windows-portable.yml) 페이지에서 최신 **성공한 main 브랜치 실행**을 엽니다.
2. **Artifacts → GPT-Pixel-Office-Windows-Portable-x64**를 다운로드하여 ZIP을 풉니다.
3. **`GPT-Pixel-Office-3.0.0-portable-x64.exe`**를 더블클릭합니다. **설치 마법사는 없으며 관리자 권한이 기본으로 필요하지 않습니다.**
4. 실행 시 바로 방치형 사무실이 나타납니다. 좌측에서 IDLE/DEMO/LIVE를 선택하고 '잠시 멈추기' 또는 1×/2×/3×를 조절할 수 있습니다.
5. 닫으면 앱이 종료됩니다. 웹의 ChatGPT·Codex 연결을 사용하려면 이전 문서의 브라우저 확장·로컬 기록 자동 감지 기능을 참고하세요.

> **Windows 보안 경고:** 코드 서명되지 않은 새 실행파일이므로 Windows SmartScreen이 경고할 수 있습니다. GitHub 저장소의 소스 코드, CI 빌드 기록, `SHA256SUMS.txt`로 배포 파일을 검증하세요. 인터넷이나 외부 API 접속 없이도 방치형 모드는 동작합니다.

> **실행 방식:** 포터블 exe는 자체적으로 Electron/Chromium과 서버 런타임을 포함합니다. 첫 실행 시 Windows 임시 폴더에 필요한 내부 구성요소를 풀 수는 있지만, 설치 프로그램을 실행하거나 시작 메뉴·레지스트리에 앱을 등록하지 않습니다. 앱 데이터(선택한 속도 등)는 사용자 프로필 저장소에 남을 수 있습니다.

### 개발자: 직접 빌드

Windows + Node.js 20 이상에서:

```powershell
git clone https://github.com/nalkarowndal/gpcl.git
cd gpcl
npm install
npm test
npm run build:portable
```

결과물: `dist/portable/GPT-Pixel-Office-3.0.0-portable-x64.exe`

기존 `npm start`를 통한 웹 실행, `npm run codex`를 통한 이벤트 연동, VS Code/Antigravity VSIX 및 ChatGPT 브라우저 확장도 유지됩니다.

---

## 2.0 자동 감지 설치 (VS Code / Antigravity / ChatGPT 웹)

**실행 단계를 줄인 설치 방식:** VS Code 계열 에디터에서 Pixel Office 확장을 설치하고 재시작하면 로컬 서버가 자동 시작됩니다. Codex IDE/CLI가 로컬 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` 기록을 새로 작성할 때 상태 이벤트를 감지합니다. 이전 대화의 내용은 가져오지 않습니다. (외부 네트워크 연결 없음)

### VS Code · Antigravity IDE 자동 감지

1. [GitHub Actions](https://github.com/nalkarowndal/gpcl/actions)에서 최근 **성공한 Pixel Office CI** 실행을 열어 `gpt-pixel-office-extensions` 아티팩트를 다운로드해 압축을 풉니다.
2. `gpt-pixel-office.vsix`를 VS Code 또는 Antigravity에서 **Extensions → ... → Install from VSIX...**로 설치합니다.
3. Node.js 20 이상이 PATH에 설치되어 있어야 합니다. 에디터를 재시작/Reload Window하면 `onStartupFinished`가 로컬 Pixel Office 서버를 자동 실행합니다.
4. 상태 표시줄의 `GPT Pixel Office`를 클릭하거나 명령 팔레트에서 `GPT Pixel Office: Open Dashboard`를 선택합니다.
5. 에디터의 Codex 확장 또는 터미널에서 Codex 작업을 수행하면 새로운 세션 로그가 감지되어 LIVE 모드에 반영됩니다.

Antigravity IDE는 VS Code 호환 확장 설치/실행 기능을 제공하는 버전에서 동작하도록 작성됐습니다. **Antigravity 자체 Gemini/에이전트의 비공개 실행 내역을 추적하는 기능은 아닙니다.** 별도의 공개 이벤트 API나 로컬 Codex 기록이 없으면 감지되지 않습니다.

VSIX 직접 빌드:

```bash
npm run pack:vsix
```

성공 시 `dist/gpt-pixel-office.vsix` 생성. `gptPixelOffice.autoStart` 설정으로 에디터 자동 시작 여부를 조절할 수 있습니다.

### ChatGPT 웹 채팅 · Work 화면 상태

1. 위 GitHub Actions 아티팩트의 `gpt-pixel-office-chatgpt-browser.zip`을 압축 해제합니다.
2. Chrome/Edge에서 **확장 프로그램 관리 → 개발자 모드 → 압축해제된 확장 프로그램 로드**를 선택하고, `manifest.json`이 있는 폴더를 지정합니다.
3. 로컬 Office 서버가 켜진 상태에서 **chatgpt.com**에 접속해 채팅을 사용합니다.
4. 브라우저 확장은 ChatGPT 화면의 **응답 중지 버튼 표시 여부만** 관찰하고, 시작·종료에 해당하는 이벤트를 로컬 서버에 보냅니다.
5. 대시보드에서 **LIVE** 모드를 선택하면 `ChatGPT 웹 화면 · 관찰 기반` 세션이 나타납니다. 확장 프로그램 팝업에서 감지를 언제든지 일시 중지할 수 있습니다.

**중요한 한계:** ChatGPT 웹의 DOM 표시는 OpenAI의 공식 개발자 이벤트 API가 아닙니다. 따라서 사이트 UI 업데이트에 따라 인식이 실패할 수 있고 중지 버튼이 없어지는 것이 항상 작업 성공을 뜻하지도 않습니다. 이것은 응답 표시 상태를 추정한 신호입니다. **ChatGPT Work**가 브라우저에 진행/중지 상태를 보여 주는 경우에만 같은 원리로 일부 감지될 수 있으며, 클라우드 내부 도구, 백그라운드 작업, 원격 브라우저 세션, 비공개 추론 진행률, 완전한 서브에이전트 구조는 자동 추적하지 못합니다. 데스크톱 앱의 내부 이벤트에도 접근하지 않습니다. 정확한 Work 진행률이 필요한 경우에는 외부 작업 러너가 `POST /api/events` 이벤트를 제공하도록 별도 통합해야 합니다.

### 자동 감지 범위 및 개인정보

| 환경 | 자동으로 감지되는 부분 | 감지할 수 없는 부분 |
| --- | --- | --- |
| Codex CLI / IDE | 로컬 rollout JSONL 파일의 시작/종료/도구 이벤트 | 파일 내용/사유/내부 추론 내용 (의도적으로 수집하지 않음) |
| VS Code | 확장 자동 실행 및 Codex 로컬 기록 탐색 | GitHub Copilot/타 모델의 비공개 내부 작업 |
| Antigravity IDE | 호환 VSIX 실행 및 로컬 Codex 기록 | Antigravity 고유 에이전트/Gemini 백엔드 |
| ChatGPT 웹 채팅 | 화면에 표시된 응답 생성/종료 신호 | 비공개 모델/도구/정확한 진행률 |
| ChatGPT Work 웹 | 브라우저 화면에 표시된 응답 상태에 한함 | 구동 중인 클라우드 작업, 원격 앱/파일 접근, 백그라운드 단계 |
| ChatGPT Work 데스크톱 | 없음 (공식 자동 이벤트 인터페이스 없음) | 내부 작업 이벤트 및 에이전트 추적 |

서버 기본 수신 주소는 `http://127.0.0.1:3333`이며, 브라우저 확장은 ChatGPT 도메인과 로컬 주소만 권한으로 요청합니다. 프롬프트, 메시지 내용, 쿠키, 인증 토큰, 방문 기록 등은 수집하거나 전송하지 않습니다. Codex 기록은 자동으로 읽지만 이벤트 종류 외의 민감 데이터는 출력하지 않습니다. `OFFICE_AUTO_DETECT=0 npm start`로 파일 감시를 중지할 수 있습니다.

브라우저 확장은 `OFFICE_TOKEN` 보호가 설정된 서버에는 인증 없이 이벤트를 전송할 수 없으므로, 토큰 보호를 켰다면 별도의 인증 지원이 필요합니다. 로컬 서버를 공용 IP에 바인딩하지 마세요.

---

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

**ChatGPT 웹 채팅과 Work의 내부 도구 실행 상태는 공식 공개 실시간 이벤트 피드를 제공하지 않습니다.** 2.0 브라우저 확장을 설치하면 웹페이지에 드러나는 응답 생성 UI만 관찰할 수 있습니다. 그 외 작업 단계는 앱 또는 에이전트 러너에서 아래 이벤트를 직접 보내야 합니다.

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
