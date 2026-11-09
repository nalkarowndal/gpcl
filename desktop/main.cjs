'use strict';
/**
 * Standalone Windows portable application: no Node installation is needed.
 * Reuses the local-only server and launches a locked-down Chromium window.
 */
const { app, BrowserWindow, dialog, shell } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const BASE_URL = 'http://127.0.0.1:3333';
let windowRef = null;
let service = null;
let shuttingDown = false;

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

async function alreadyRunning() {
  try {
    const response = await fetch(BASE_URL + '/api/health', { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.ok === true && data?.app === 'GPT Pixel Office';
  } catch { return false; }
}

async function serviceUrl() {
  if (await alreadyRunning()) return BASE_URL;
  const moduleUrl = pathToFileURL(join(__dirname, '..', 'server', 'index.mjs')).href;
  const { startOfficeService } = await import(moduleUrl);
  try {
    service = await startOfficeService({ host: '127.0.0.1', port: 3333 });
    return service.url;
  } catch (error) {
    // Another instance could have started while we were probing the port.
    if (error?.code === 'EADDRINUSE' && await alreadyRunning()) return BASE_URL;
    // If another app owns 3333, launch locally on a private free port.
    if (error?.code === 'EADDRINUSE') {
      service = await startOfficeService({ host: '127.0.0.1', port: 0 });
      return service.url;
    }
    throw error;
  }
}

async function createWindow() {
  const url = await serviceUrl();
  const allowedOrigin = new URL(url).origin;
  windowRef = new BrowserWindow({
    title: 'GPT Pixel Office — Idle Life',
    width: 1400,
    height: 920,
    minWidth: 825,
    minHeight: 590,
    backgroundColor: '#121b28',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  windowRef.webContents.setWindowOpenHandler(({ url: outgoing }) => {
    try {
      const parsed = new URL(outgoing);
      if (parsed.protocol === 'https:' && parsed.hostname === 'github.com') {
        shell.openExternal(outgoing);
      }
    } catch { /* ignore invalid link */ }
    return { action: 'deny' };
  });
  windowRef.webContents.on('will-navigate', (event, target) => {
    try {
      if (new URL(target).origin === allowedOrigin) return;
    } catch { /* block */ }
    event.preventDefault();
  });
  windowRef.once('ready-to-show', () => windowRef?.show());
  windowRef.on('closed', () => { windowRef = null; });
  await windowRef.loadURL(url);
}

if (hasLock) {
  app.on('second-instance', () => {
    if (windowRef) {
      if (windowRef.isMinimized()) windowRef.restore();
      windowRef.focus();
    }
  });
  app.whenReady().then(createWindow).catch(error => {
    dialog.showErrorBox('GPT Pixel Office', '프로그램을 시작할 수 없습니다.\n' + (error?.message || String(error)));
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (service) { service.close().catch(() => {}); service = null; }
  });
}
