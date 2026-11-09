'use strict';
/**
 * GPT Pixel Office Desktop Companion
 *
 * Starts as a small transparent, frameless room above the Windows taskbar.
 * The complete dashboard stays available on demand, not on every launch.
 * Only IPC commands from the locally hosted mini.html are accepted.
 */
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const { join } = require('node:path');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { sanitizePreferences, layoutSize, dockBounds, visibleBounds } = require('./settings.cjs');

const BASE_URL = 'http://127.0.0.1:3333';
const ICON = join(__dirname, '..', 'build', 'icon.ico');
const hasLock = app.requestSingleInstanceLock();
let mini = null;
let dashboard = null;
let tray = null;
let service = null;
let serviceBase = null;
let prefs = sanitizePreferences();
let saving = null;
let geometryLockUntil = 0;
let quitting = false;

if (!hasLock) app.quit();

function preferencesFile() { return join(app.getPath('userData'), 'companion-settings.json'); }
function readPrefs() {
  try { return sanitizePreferences(JSON.parse(readFileSync(preferencesFile(), 'utf8'))); }
  catch { return sanitizePreferences(); }
}
function savePrefs() {
  if (saving) clearTimeout(saving);
  saving = setTimeout(() => {
    try {
      const file = preferencesFile();
      mkdirSync(join(file, '..'), {recursive:true});
      writeFileSync(file, JSON.stringify(sanitizePreferences(prefs), null, 2));
    } catch { /* An unwritable profile must not prevent the companion from running. */ }
  }, 160);
}

async function alreadyRunning() {
  try {
    const response = await fetch(BASE_URL + '/api/health', {signal: AbortSignal.timeout(1200)});
    if (!response.ok) return false;
    const info = await response.json();
    if (info.app !== 'GPT Pixel Office' || info.ok !== true) return false;
    // Prefer our bundled mini client, never silently load an older Pixel Office build.
    return (await fetch(BASE_URL + '/mini.html', {signal: AbortSignal.timeout(1200)})).ok;
  } catch { return false; }
}
async function startLocalService() {
  if (await alreadyRunning()) return BASE_URL;
  const {startOfficeService} = await import(pathToFileURL(join(__dirname, '..', 'server', 'index.mjs')).href);
  try {
    service = await startOfficeService({port:3333,host:'127.0.0.1'});
  } catch (error) {
    if (error?.code !== 'EADDRINUSE') throw error;
    if (await alreadyRunning()) return BASE_URL;
    service = await startOfficeService({port:0,host:'127.0.0.1'});
  }
  return service.url;
}
function currentWorkArea() {
  const rect = mini && !mini.isDestroyed() ? mini.getBounds() : screen.getPrimaryDisplay().workArea;
  return screen.getDisplayMatching(rect).workArea;
}
function applyBounds(bounds) {
  if (!mini || mini.isDestroyed()) return;
  geometryLockUntil = Date.now()+400;
  mini.setBounds(visibleBounds(bounds, currentWorkArea()));
}
function dockMini() {
  if (!mini || mini.isDestroyed()) return;
  prefs.docked = true;
  applyBounds(dockBounds(currentWorkArea(),prefs.layout));
  savePrefs();
  sendSettings();
}
function setLayout(layout) {
  if (layout !== 'room' && layout !== 'bar') return;
  prefs.layout = layout;
  const workArea = currentWorkArea();
  const size = layoutSize(layout);
  const previous = mini.getBounds();
  if (prefs.docked) applyBounds(dockBounds(workArea,layout));
  else applyBounds(visibleBounds({...previous,width:size.width,height:size.height},workArea));
  savePrefs(); sendSettings();
}
function sendSettings() {
  if (mini && !mini.isDestroyed() && !mini.webContents.isDestroyed()) {
    mini.webContents.send('companion:settings', sanitizePreferences(prefs));
  }
}
function trayMenu() {
  return Menu.buildFromTemplate([
    {label:'작은 방 열기',click:()=>showMini()},
    {label:'전체 GPT 대시보드',click:()=>showDashboard()},
    {type:'separator'},
    {label:'Room 모드',type:'radio',checked:prefs.layout==='room',click:()=>setLayout('room')},
    {label:'Taskbar 모드',type:'radio',checked:prefs.layout==='bar',click:()=>setLayout('bar')},
    {label:'작업 표시줄 위로 정렬',click:()=>dockMini()},
    {type:'separator'},
    {label:'항상 위에 표시',type:'checkbox',checked:prefs.alwaysOnTop,click:()=>runCommand('pin')},
    {label:'마우스 클릭 통과',type:'checkbox',checked:prefs.clickThrough,click:()=>runCommand('clickThrough')},
    {type:'separator'},
    {label:'종료',click:()=>{ quitting=true; app.quit(); }},
  ]);
}
function refreshTray() { if (tray) tray.setContextMenu(trayMenu()); }
function initTray() {
  const icon = nativeImage.createFromPath(ICON);
  if (icon.isEmpty()) throw new Error('Bundled pixel-art tray icon is missing');
  tray = new Tray(icon);
  tray.setToolTip('GPT Pixel Office · Cozy Companion');
  tray.on('double-click',showMini);
  refreshTray();
}
function showMini() {
  if (!mini || mini.isDestroyed()) return;
  mini.show(); mini.focus();
}
function showDashboard() {
  if (dashboard && !dashboard.isDestroyed()) {dashboard.show(); dashboard.focus(); return;}
  dashboard = new BrowserWindow({
    title:'GPT Pixel Office · Task Monitor',
    width:1360,height:900,minWidth:820,minHeight:580,
    backgroundColor:'#121b28',autoHideMenuBar:true,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true},
  });
  lockNavigation(dashboard,serviceBase,'/');
  dashboard.on('closed',()=>{dashboard=null;});
  dashboard.loadURL(serviceBase+'/').catch(()=>{});
}
function lockNavigation(win,origin,path) {
  win.webContents.setWindowOpenHandler(({url})=>{
    try {
      const parsed=new URL(url);
      if(parsed.protocol==='https:' && parsed.hostname==='github.com') shell.openExternal(url);
    }catch{}
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{
    try {
      const target=new URL(url);
      if(target.origin===origin && target.pathname===path) return;
    }catch{}
    event.preventDefault();
  });
}
function runCommand(command,arg) {
  if (!mini || mini.isDestroyed()) return false;
  switch(command) {
    case 'room': case 'bar': setLayout(command); break;
    case 'dock': dockMini(); break;
    case 'pin':
      prefs.alwaysOnTop=!prefs.alwaysOnTop;
      mini.setAlwaysOnTop(prefs.alwaysOnTop,'floating');savePrefs();sendSettings();break;
    case 'clickThrough':
      prefs.clickThrough=!prefs.clickThrough;
      mini.setIgnoreMouseEvents(prefs.clickThrough, {forward:true});
      savePrefs();sendSettings();break;
    case 'opacity':
      if(typeof arg!=='number' || !Number.isFinite(arg)) return false;
      prefs.opacity=Math.max(0.55,Math.min(1,Math.round(arg*100)/100));
      mini.setOpacity(prefs.opacity);savePrefs();sendSettings();break;
    case 'theme':
      if(!['dusk','sunrise','forest'].includes(arg))return false;
      prefs.roomTheme=arg;savePrefs();sendSettings();break;
    case 'dashboard': showDashboard();break;
    case 'hide': mini.hide();break;
    case 'quit': quitting=true;app.quit();break;
    default: return false;
  }
  refreshTray();
  return true;
}
async function createMini() {
  serviceBase=await startLocalService();
  prefs=readPrefs();
  const size=layoutSize(prefs.layout);
  const workArea=screen.getPrimaryDisplay().workArea;
  const bounds=prefs.docked || !prefs.customBounds
    ? dockBounds(workArea,prefs.layout)
    : visibleBounds({...prefs.customBounds,width:size.width,height:size.height},workArea);
  mini=new BrowserWindow({
    title:'GPT Pixel Office · Little Cozy Room',
    ...bounds,minWidth:size.minWidth,minHeight:size.minHeight,
    transparent:true,frame:false,resizable:true,hasShadow:false,
    alwaysOnTop:prefs.alwaysOnTop,skipTaskbar:true,autoHideMenuBar:true,
    backgroundColor:'#00000000',
    icon:ICON,show:false,
    webPreferences:{
      preload:join(__dirname,'preload.cjs'),
      sandbox:true,nodeIntegration:false,contextIsolation:true,webSecurity:true,
    },
  });
  mini.setOpacity(prefs.opacity);
  mini.setAlwaysOnTop(prefs.alwaysOnTop,'floating');
  mini.setIgnoreMouseEvents(prefs.clickThrough,{forward:true});
  lockNavigation(mini,serviceBase,'/mini.html');
  mini.on('close',(event)=>{if(!quitting){event.preventDefault();mini.hide();}});
  mini.on('move',()=>{
    if(Date.now()<geometryLockUntil)return;
    prefs.docked=false;
    prefs.customBounds=mini.getBounds();
    savePrefs();sendSettings();
  });
  mini.on('resize',()=>{
    if(Date.now()<geometryLockUntil)return;
    prefs.docked=false;
    prefs.customBounds=mini.getBounds();
    savePrefs();
  });
  await mini.loadURL(serviceBase+'/mini.html');
  mini.once('ready-to-show',showMini);
  // 'ready-to-show' might have fired during loadURL on very fast machines.
  if(!mini.isVisible())showMini();
  refreshTray();
}
function isTrustedMini(event) {
  if (!mini || mini.isDestroyed() || event.sender!==mini.webContents) return false;
  try {
    const u=new URL(event.sender.getURL());
    return u.origin===serviceBase && u.pathname==='/mini.html';
  }catch{return false;}
}
if(hasLock){
  app.on('second-instance',showMini);
  app.whenReady().then(async()=>{
    initTray();
    ipcMain.handle('companion:getSettings',event=>isTrustedMini(event)?sanitizePreferences(prefs):null);
    ipcMain.handle('companion:command',(event,command,arg)=>isTrustedMini(event) && runCommand(command,arg));
    screen.on('display-metrics-changed',()=>{if(prefs.docked) dockMini();});
    screen.on('display-removed',()=>{if(prefs.docked) dockMini();});
    await createMini();
  }).catch(error=>{
    dialog.showErrorBox('GPT Pixel Office','데스크톱 컴패니언을 실행하지 못했습니다.\n'+(error?.message||error));
    quitting=true;app.quit();
  });
  // Closing the window only hides it. Tray > 종료 truly quits.
  app.on('window-all-closed',()=>{});
  app.on('before-quit',()=>{
    quitting=true;
    if(saving){clearTimeout(saving);saving=null;}
    try{const path=preferencesFile();mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,JSON.stringify(sanitizePreferences(prefs),null,2));}catch{}
    if(service){service.close().catch(()=>{});service=null;}
  });
}
