import test from 'node:test';
import assert from 'node:assert/strict';
import settings from '../desktop/settings.cjs';
import { createCozyWorld, stepCozyWorld, renderCozyScene, roomThemes } from '../public/mini-scene.js';
import { readFile } from 'node:fs/promises';

const {dockBounds, visibleBounds, sanitizePreferences,layoutSize} = settings;

test('mini companion docks above taskbar on arbitrary multi-monitor workArea',()=>{
  const display={x:-1920,y:20,width:1920,height:1000};
  for(const layout of ['room','bar']){
    const bounds=dockBounds(display,layout);
    assert.equal(bounds.x+bounds.width,display.x+display.width-10);
    assert.equal(bounds.y+bounds.height,display.y+display.height-10);
    assert.ok(bounds.height<=display.height);
    assert.equal(bounds.height,layoutSize(layout).height);
  }
  assert.ok(layoutSize('bar').height<layoutSize('room').height);
});
test('mini window saved preferences are validated and bounded',()=>{
  assert.deepEqual(sanitizePreferences({layout:'unknown',opacity:-3,roomTheme:'evil'}),sanitizePreferences());
  assert.equal(sanitizePreferences({layout:'bar',docked:false,opacity:.01}).opacity,.55);
  assert.equal(sanitizePreferences({opacity:99}).opacity,1);
  assert.equal(sanitizePreferences({opacity:Number.NaN}).opacity,1);
  assert.equal(sanitizePreferences({roomTheme:'forest'}).roomTheme,'forest');
  assert.deepEqual(visibleBounds({x:-600,y:250,width:600,height:400},{x:0,y:0,width:1000,height:720}),{x:0,y:250,width:600,height:400});
});
test('mini cozy scene has autonomous NPCs irrespective of API sessions',()=>{
  const world=createCozyWorld(41);
  assert.equal(world.people.length,4);
  const before=world.people.map(x=>[x.x,x.y]);
  for(let i=0;i<1800;i++)stepCozyWorld(world,0.04);
  assert.ok(world.people.some((p,i)=>Math.hypot(p.x-before[i][0],p.y-before[i][1])>10));
  assert.deepEqual(roomThemes,['dusk','sunrise','forest']);
  assert.ok(world.people.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test('both original pixel-art layouts render without external image assets',()=>{
  const world=createCozyWorld();
  const gradient={addColorStop(){}};
  const calls=[];
  const ctx=new Proxy({
    beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},
    fillRect(...args){calls.push(args);},
    fillText(){},createRadialGradient(){return gradient;},createLinearGradient(){return gradient;},clearRect(){}
  },{set(obj,k,val){obj[k]=val;return true;}});
  assert.equal(renderCozyScene(ctx,world,{layout:'room',theme:'dusk'}).height,290);
  assert.equal(renderCozyScene(ctx,world,{layout:'bar',theme:'forest',working:true}).height,122);
  assert.ok(calls.length>30,'both scenes render original pixel geometry');
});
test('mini page contains safe CSP and desktop-specific controls',async()=>{
  const html=await readFile(new URL('../public/mini.html',import.meta.url),'utf8');
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/room-canvas/);
  assert.match(html,/focus-drawer/);
  assert.match(html,/layout-toggle/);
  const preload=await readFile(new URL('../desktop/preload.cjs',import.meta.url),'utf8');
  assert.match(preload,/contextBridge/);
  assert.doesNotMatch(preload,/exposeInMainWorld\([^,]+,\s*ipcRenderer/);
});
