import { createCozyWorld, stepCozyWorld, renderCozyScene, roomThemes } from './mini-scene.js';
import { loadAtlas } from './engine/atlas.js';
import { createFixedClock, advanceFixedClock } from './engine/timing.js';

const $ = id=>document.getElementById(id);
const bridge = window.pixelCompanion || null;
const world = createCozyWorld();
const art = {cat:null};
const simulation = createFixedClock({hz:60,maxFrameMs:200,maxSteps:8});
async function loadProofArt() {
  try { art.cat=await loadAtlas('/assets/generated/cat-demo.json'); }
  catch (error) {
    // A missing atlas never stops the existing procedurally drawn companion.
    console.warn('[Pixel Office] sprite atlas unavailable; using legacy cat drawing:', error.message);
  }
}
const canvas = $('room-canvas');
const context = canvas.getContext('2d',{alpha:true});
const basicSettings = {layout:'room',roomTheme:'dusk',alwaysOnTop:true,docked:true,opacity:1};
let settings={...basicSettings};
let live={sessions:[],events:[]};
let serverConnected=false;
let rainAudio=null;
let lastDraw=0;
let petMessageUntil=0;
const safeStorage={
  get(key,fallback){
    try{return JSON.parse(localStorage.getItem('pixelCompanion.'+key))??fallback;}
    catch{return fallback;}
  },
  set(key,value){try{localStorage.setItem('pixelCompanion.'+key,JSON.stringify(value));}catch{}}
};
let tasks=safeStorage.get('tasks',[]);
if(!Array.isArray(tasks))tasks=[];
tasks=tasks.filter(item=>item&&typeof item.label==='string').slice(0,20)
  .map((item,i)=>({id:String(item.id||i),label:item.label.slice(0,90),done:Boolean(item.done)}));
let timerRemaining=25*60;
let timerDeadline=null;
let timerRunning=false;
let timerTick=null;

function syncSettings(value={}){
  settings={...settings,...value};
  document.body.dataset.layout=settings.layout==='bar'?'bar':'room';
  $('layout-toggle').textContent=settings.layout==='bar'?'⌂':'▰';
  $('layout-toggle').title=settings.layout==='bar'?'Room 모드로 확대':'작업 표시줄 모드로 축소';
  $('pin-btn').classList.toggle('active',Boolean(settings.alwaysOnTop));
  $('pin-btn').title=settings.alwaysOnTop?'항상 위에 표시 중':'항상 위 표시 꺼짐';
  $('dock-btn').classList.toggle('active',Boolean(settings.docked));
  $('opacity-slider').value=Math.round(settings.opacity*100);
  $('opacity-value').textContent=Math.round(settings.opacity*100)+'%';
  $('theme-btn').title='방 테마: '+({dusk:'황혼',sunrise:'햇살',forest:'숲'}[settings.roomTheme]||'황혼');
  canvas.width=960;
  canvas.height=settings.layout==='bar'?244:580;
  context.imageSmoothingEnabled=false;
}
async function command(name,value){
  if(!bridge){
    if(name==='bar'||name==='room')syncSettings({layout:name});
    if(name==='theme')syncSettings({roomTheme:value});
    return;
  }
  try{await bridge.command(name,value);}catch{ /* No desktop bridge on ordinary browser. */ }
}
function draw(now){
  requestAnimationFrame(draw);
  // Draw rate and NPC movement are independent; do not lose half the time
  // when rendering is throttled to 30fps.
  advanceFixedClock(simulation,now,dt=>stepCozyWorld(world,dt),{paused:document.hidden});
  if(document.hidden || now-lastDraw<1000/30)return;
  lastDraw=now;
  context.setTransform(2,0,0,2,0,0);
  context.imageSmoothingEnabled=false;
  const working=(live.sessions||[]).some(s=>s.status==='working');
  renderCozyScene(context,world,{layout:settings.layout,theme:settings.roomTheme,working,art});
  if(petMessageUntil>now){
    context.font='bold 10px monospace';context.fillStyle='#fff4d6';
    context.textAlign='center';
    context.fillText('♥ 고양이가 기분이 좋아요!',240,settings.layout==='bar'?40:20);
  }
}
function renderConnection(){
  const agents=(live.sessions||[]).filter(s=>s.status==='working').length;
  $('connection-led').classList.toggle('connected',serverConnected);
  $('live-signal').classList.toggle('working',agents>0);
  $('live-signal').textContent=agents>0?'✦ GPT LIVE · '+agents+' SESSIONS':'☕ IDLE · 4 FRIENDS';
  $('gpt-status').textContent=agents>0
    ? 'GPT 작업 감지 · NPC의 움직임은 독립적입니다'
    : 'NPC 방치 생활 · 실제 AI 상태와 별개';
}
async function connect(){
  try{
    const resp=await fetch('/api/state',{cache:'no-store'});
    if(resp.ok){live=await resp.json();serverConnected=true;renderConnection();}
  }catch{}
  const source=new EventSource('/api/events');
  source.addEventListener('snapshot',event=>{
    try{live=JSON.parse(event.data);serverConnected=true;renderConnection();}catch{}
  });
  source.onopen=()=>{serverConnected=true;renderConnection();};
  source.onerror=()=>{serverConnected=false;renderConnection();};
  window.addEventListener('pagehide',()=>source.close(),{once:true});
}

function showDrawer(which){
  for(const id of ['focus-drawer','settings-drawer']){
    $(id).hidden=which!==id || !$(id).hidden;
  }
  // showDrawer('x') opens target only; toggling other closes both.
}
function toggleDrawer(id){
  const opening=$(id).hidden;
  $('focus-drawer').hidden=true;$('settings-drawer').hidden=true;
  $(id).hidden=!opening;
}
function renderTasks(){
  const container=$('task-list');container.replaceChildren();
  for(const item of tasks){
    const row=document.createElement('div');row.className='task-row'+(item.done?' complete':'');
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=item.done;
    checkbox.setAttribute('aria-label','할 일 완료');
    const text=document.createElement('label');text.textContent=item.label;
    const del=document.createElement('button');del.type='button';del.textContent='×';del.title='삭제';
    checkbox.addEventListener('change',()=>{item.done=checkbox.checked;saveTasks();renderTasks();});
    del.addEventListener('click',()=>{tasks=tasks.filter(t=>t!==item);saveTasks();renderTasks();});
    row.append(checkbox,text,del);container.append(row);
  }
}
function saveTasks(){safeStorage.set('tasks',tasks);}
$('task-form').addEventListener('submit',event=>{
  event.preventDefault();
  const label=$('task-input').value.trim().slice(0,90);
  if(!label || tasks.length>=20)return;
  tasks.push({id:String(Date.now())+'-'+tasks.length,label,done:false});
  $('task-input').value='';saveTasks();renderTasks();
});

function updateTimer(){
  const seconds=timerRunning?Math.max(0,Math.ceil((timerDeadline-Date.now())/1000)):timerRemaining;
  $('timer-display').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  if(timerRunning && seconds<=0){
    timerRunning=false;timerRemaining=25*60;
    $('timer-toggle').textContent='▶ 다시 시작';
    $('mood-label').textContent='✦ 작은 집중 시간 완료!';
    setTimeout(()=>{$('mood-label').textContent='☁ peaceful day';},5500);
  }
}
$('timer-toggle').addEventListener('click',()=>{
  if(timerRunning){
    timerRemaining=Math.max(0,Math.ceil((timerDeadline-Date.now())/1000));timerRunning=false;
  }else{timerDeadline=Date.now()+timerRemaining*1000;timerRunning=true;}
  $('timer-toggle').textContent=timerRunning?'Ⅱ 일시정지':'▶ 시작';updateTimer();
});
$('timer-reset').addEventListener('click',()=>{
  timerRunning=false;timerRemaining=25*60;
  $('timer-toggle').textContent='▶ 시작';updateTimer();
});
function noiseContext(){
  // Synthetic rain ambience, NOT copyrighted recorded music.
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return null;
  const audio=new Audio();
  const buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*1.4),audio.sampleRate);
  const data=buffer.getChannelData(0);
  let lastValue=0;
  for(let i=0;i<data.length;i++){
    const white=Math.random()*2-1;
    lastValue=(lastValue+0.05*white)/1.05;
    data[i]=lastValue*.85;
  }
  const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=940;
  const gain=audio.createGain();gain.gain.value=.10;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
  return {audio,source};
}
$('rain-btn').addEventListener('click',async()=>{
  if(rainAudio){
    await rainAudio.audio.close().catch(()=>{});
    rainAudio=null;
  }else{
    try{rainAudio=noiseContext();await rainAudio?.audio.resume();}
    catch{rainAudio=null;}
  }
  const enabled=Boolean(rainAudio);
  $('rain-btn').classList.toggle('active',enabled);
  $('rain-btn').setAttribute('aria-pressed',String(enabled));
  $('rain-btn').title=enabled?'빗소리 끄기':'직접 합성한 빗소리 켜기';
});
$('theme-btn').addEventListener('click',()=>{
  const next=roomThemes[(roomThemes.indexOf(settings.roomTheme)+1)%roomThemes.length];
  syncSettings({roomTheme:next});
  safeStorage.set('theme',next);
  command('theme',next);
});
$('layout-toggle').addEventListener('click',()=>{
  const next=settings.layout==='room'?'bar':'room';
  syncSettings({layout:next});command(next);
});
$('dock-btn').addEventListener('click',()=>command('dock'));
$('pin-btn').addEventListener('click',()=>command('pin'));
$('open-dashboard').addEventListener('click',()=>bridge?command('dashboard'):window.open('/','_blank'));
$('hide-btn').addEventListener('click',()=>command('hide'));
$('focus-btn').addEventListener('click',()=>toggleDrawer('focus-drawer'));
$('more-btn').addEventListener('click',()=>toggleDrawer('settings-drawer'));
$('focus-close').addEventListener('click',()=>{$('focus-drawer').hidden=true;});
$('settings-close').addEventListener('click',()=>{$('settings-drawer').hidden=true;});
$('re-dock').addEventListener('click',()=>command('dock'));
let opacityDebounce;
$('opacity-slider').addEventListener('input',()=>{
  const value=Number($('opacity-slider').value)/100;
  $('opacity-value').textContent=Math.round(value*100)+'%';
  clearTimeout(opacityDebounce);
  opacityDebounce=setTimeout(()=>command('opacity',value),85);
});
canvas.addEventListener('click',()=>{
  petMessageUntil=performance.now()+2000;
  $('mood-label').textContent='♥ hello, little friends';
  setTimeout(()=>{$('mood-label').textContent='☁ peaceful day';},2000);
});

async function init(){
  const userTheme=safeStorage.get('theme','dusk');
  if(roomThemes.includes(userTheme))settings.roomTheme=userTheme;
  if(bridge){
    try{const latest=await bridge.getSettings();if(latest)settings={...settings,...latest};}
    catch{}
    bridge.onSettings(changes=>syncSettings(changes));
  }
  syncSettings(settings);
  renderTasks();updateTimer();renderConnection();
  setInterval(updateTimer,700);
  loadProofArt();
  requestAnimationFrame(draw);
  connect();
}
init();
