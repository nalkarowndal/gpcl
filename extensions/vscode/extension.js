'use strict';
const vscode = require('vscode');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const http = require('node:http');

const PORT = 3333;
const URL = 'http://127.0.0.1:' + PORT;
let service = null;
let statusBar = null;
let healthTimer = null;
let manuallyStopped = false;

async function isOnline() {
  return new Promise(resolve => {
    const req = http.get(URL + '/api/health', { timeout: 1400 }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
function setStatus(isRunning, message) {
  if (!statusBar) return;
  statusBar.text = isRunning ? '$(pulse) GPT Pixel Office' : '$(circle-slash) GPT Pixel Office';
  statusBar.tooltip = message || (isRunning ? 'Auto detection is running locally' : 'Local office is offline');
  statusBar.color = isRunning ? new vscode.ThemeColor('statusBarItem.prominentForeground') : undefined;
  statusBar.show();
}
function nodeProgram() {
  return vscode.workspace.getConfiguration('gptPixelOffice').get('nodePath', 'node') || 'node';
}
async function start() {
  manuallyStopped = false;
  if (await isOnline()) {
    setStatus(true, 'Connected to an existing local Pixel Office service.');
    return true;
  }
  if (service && service.exitCode === null) return true;
  const server = join(__dirname, 'runtime', 'server', 'index.mjs');
  let failure;
  try {
    service = spawn(nodeProgram(), [server], {
      cwd: join(__dirname, 'runtime'),
      windowsHide: true,
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT), OFFICE_AUTO_DETECT: '1' },
      stdio: ['ignore', 'ignore', 'pipe']
    });
    service.on('error', error => {
      failure = error;
      setStatus(false, 'Could not launch Node.js: ' + error.message);
    });
    service.stderr.on('data', data => {
      // Never print potentially sensitive app output to the UI.
      if (data.length && !failure) setStatus(false, 'Local server reported an error. See Node.js setup.');
    });
    service.on('exit', () => {
      service = null;
      setStatus(false, 'Pixel Office local server exited.');
    });
  } catch (error) {
    failure = error;
  }
  for (let i = 0; i < 12 && !failure; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (await isOnline()) {
      setStatus(true, 'Monitoring local Codex session metadata, no prompts or replies collected.');
      return true;
    }
  }
  setStatus(false, 'Requires Node.js 20+ and a free localhost port 3333.');
  vscode.window.showWarningMessage('GPT Pixel Office could not start. Install Node.js 20+ or check port 3333.');
  return false;
}
function stop() {
  manuallyStopped = true;
  if (service) {
    service.kill();
    service = null;
  }
  setStatus(false, 'Auto detection paused in this editor. A separate external service, if any, is not stopped.');
}
async function open() {
  if (!(await isOnline())) await start();
  if (await isOnline()) {
    await vscode.env.openExternal(vscode.Uri.parse(URL));
  } else vscode.window.showWarningMessage('GPT Pixel Office is offline.');
}
async function status() {
  const up = await isOnline();
  setStatus(up, up ? 'Service is healthy on localhost:3333' : 'Service is offline.');
  vscode.window.showInformationMessage(up
    ? 'GPT Pixel Office is connected. Codex sessions from CODEX_HOME/.codex are auto-detected locally.'
    : 'GPT Pixel Office is offline. Use Start Auto Detection (Node.js 20+ required).');
}
function activate(context) {
  statusBar = vscode.window.createStatusBarItem('gptPixelOffice.status', vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'gptPixelOffice.open';
  context.subscriptions.push(statusBar);
  setStatus(false, 'Initializing local office...');
  context.subscriptions.push(
    vscode.commands.registerCommand('gptPixelOffice.open', open),
    vscode.commands.registerCommand('gptPixelOffice.start', start),
    vscode.commands.registerCommand('gptPixelOffice.stop', stop),
    vscode.commands.registerCommand('gptPixelOffice.status', status)
  );
  if (vscode.workspace.getConfiguration('gptPixelOffice').get('autoStart', true)) {
    start().catch(() => setStatus(false, 'Node.js server startup failed.'));
  }
  healthTimer = setInterval(async () => {
    const up = await isOnline();
    setStatus(up, up ? 'Local Codex activity monitor connected.' : 'Service offline.');
    if (!up && !manuallyStopped && vscode.workspace.getConfiguration('gptPixelOffice').get('autoStart', true)) {
      await start();
    }
  }, 30000);
  context.subscriptions.push({ dispose: () => clearInterval(healthTimer) });
}
function deactivate() {
  if (healthTimer) clearInterval(healthTimer);
  if (service) service.kill();
  service = null;
}
module.exports = { activate, deactivate };
