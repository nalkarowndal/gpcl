# GPT Pixel Office editor extension

This is a local-first VS Code extension compatible with VS Code extension hosts that support Node.js extensions.

1. Run `npm run pack:vsix` in the repository root to build the installer.
2. In VS Code or compatible Antigravity IDE: Extensions → ... → Install from VSIX...
3. Select `dist/gpt-pixel-office.vsix`. Reload the editor.
4. The extension runs `node` on startup to launch http://127.0.0.1:3333.
5. Click the `GPT Pixel Office` status bar item to open the office.
6. When Codex CLI / Codex IDE writes a rollout under `CODEX_HOME/sessions` or `~/.codex/sessions`, the office shows event types automatically.

**Limitations:** This extension is not a hook into Google Antigravity's internal Gemini agent, ChatGPT Work's cloud jobs, GitHub Copilot Chat internals, or the private ChatGPT runtime. It detects local Codex session **file lifecycle events** only. No conversation contents are transmitted. Antigravity compatibility depends on its VS Code extension API compatibility and whether its environment can run the embedded Node.js service.

Settings: `gptPixelOffice.autoStart` default true, `gptPixelOffice.nodePath` default `node`.
Commands: Open Dashboard, Start Auto Detection, Stop Local Office, Check Connection.
