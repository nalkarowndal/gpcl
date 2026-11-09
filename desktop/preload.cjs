'use strict';
const {contextBridge,ipcRenderer} = require('electron');
// Each command is explicitly whitelisted in the main process.
// Do not expose raw ipcRenderer or the underlying Node.js runtime.
contextBridge.exposeInMainWorld('pixelCompanion',{
  getSettings:()=>ipcRenderer.invoke('companion:getSettings'),
  command:(name,value)=>ipcRenderer.invoke('companion:command',name,value),
  onSettings:(listener)=>{
    if(typeof listener!=='function')return ()=>{};
    const handler=(_event,safeSettings)=>listener(safeSettings);
    ipcRenderer.on('companion:settings',handler);
    return ()=>ipcRenderer.removeListener('companion:settings',handler);
  },
});
