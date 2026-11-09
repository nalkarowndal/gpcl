/**
 * Original tiny isometric pixel-art environment.
 * Fictional autonomous citizens, not actual ChatGPT agents.
 * No images, music, sprites, or assets from other commercial games.
 */
const THEMES={
  dusk:{sky:'#2c314e',fade:'#676b86',left:'#9a8c9a',right:'#ba9ea3',floor:'#a78079',line:'#644c62',trim:'#ebc5ad',rug:'#bb8b91',leaf:'#7bb296',accent:'#fad69d',dark:'#3d3d57',bed:'#d9b4b7'},
  sunrise:{sky:'#b4c5db',fade:'#f4d7c6',left:'#e3bcbd',right:'#f7cfc0',floor:'#cda18a',line:'#976e75',trim:'#fff0c9',rug:'#e7a4ad',leaf:'#87b5a1',accent:'#ffedb3',dark:'#6a6277',bed:'#efd2cb'},
  forest:{sky:'#263e3d',fade:'#537765',left:'#7f9c88',right:'#9eaf91',floor:'#8c977b',line:'#475c53',trim:'#dbe5b2',rug:'#95a48b',leaf:'#a4d59e',accent:'#ffdfa9',dark:'#324f4c',bed:'#b2bda1'},
};
const NAMES=['Mimi','Nori','Pico','Luna'];
const COATS=['#f6b1ad','#9dd6bb','#dac7f7','#f2d48c'];
const HAIR=['#55445b','#b4765a','#42526a','#9a6257'];
const SPOTS=[[135,173],[184,207],[257,222],[317,179],[212,170],[285,193],[171,232],[345,216]];
function rand(world){world.seed=(Math.imul(world.seed,1664525)+1013904223)>>>0;return world.seed/4294967296;}
export function createCozyWorld(seed=29){
  const world={seed:seed>>>0,time:0,mode:'room',people:[]};
  for(let i=0;i<4;i++){
    const [x,y]=SPOTS[i];
    world.people.push({x,y,tx:x,ty:y,name:NAMES[i],coat:COATS[i],hair:HAIR[i],
      action:'rest',moving:false,wait:i*.6+.8,step:0});
  }
  return world;
}
export function stepCozyWorld(world,dt){
  const amount=Math.max(0,Math.min(.08,Number(dt)||0));
  world.time+=amount;
  for(const p of world.people){
    if(p.wait>0){p.wait-=amount;p.moving=false;continue;}
    const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy);
    if(dist<1){
      if(p.moving){p.moving=false;p.wait=1.6+rand(world)*4.5;p.action=['coffee','rest','read','chat','plant'][Math.floor(rand(world)*5)];}
      else{const target=SPOTS[Math.floor(rand(world)*SPOTS.length)];p.tx=target[0];p.ty=target[1];p.moving=true;p.action='walk';}
    }else{
      const speed=22*amount;
      p.x+=dx/dist*Math.min(dist,speed);
      p.y+=dy/dist*Math.min(dist,speed);
      p.step+=amount*9;
      p.moving=true;
    }
  }
  return world;
}
function box(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(ctx,points,c,edge){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=c;ctx.fill();if(edge){ctx.lineWidth=2;ctx.strokeStyle=edge;ctx.stroke();}}
function label(ctx,s,x,y,color='#fdf3e4',size=9){
  ctx.font='bold '+size+'px monospace';ctx.textAlign='center';ctx.fillStyle='#302c48';
  ctx.fillText(s,x+1,y+1);ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function potted(ctx,x,y,c,t){
  box(ctx,x-10,y-8,20,13,'#6c4e51');box(ctx,x-8,y-5,16,10,'#c58d73');
  box(ctx,x-2,y-24,4,20,'#476b62');
  for(let i=0;i<5;i++){
    box(ctx,x-17+i*6,y-34+(i%3)*4+Math.sin(t*1.3+i)*.7,11,9,i%2?c.leaf:'#6b9f86');
  }
}
function monitor(ctx,x,y,t,c){
  box(ctx,x-20,y-38,39,29,c.dark);
  box(ctx,x-17,y-35,33,23,'#253a50');
  box(ctx,x-14,y-32,27,16,'#395f69');
  for(let i=0;i<3;i++)box(ctx,x-11,y-29+i*5,11+(i*5)%14,2, i===0?'#b5dec5':'#91acba');
  box(ctx,x-3,y-9,6,8,c.dark);
  box(ctx,x-12,y-3,25,4,c.trim);
  if(Math.sin(t*2)>0)box(ctx,x+8,y-26,3,3,'#fbda91');
}
function chair(ctx,x,y,c){
  poly(ctx,[[x-13,y],[x+12,y-5],[x+20,y],[x-5,y+8]],c.dark,c.line);
  box(ctx,x-10,y-17,22,15,'#8e767c');
  box(ctx,x-8,y-15,18,11,c.rug);
}
function cat(ctx,x,y,t){
  const bob=Math.sin(t*2.5)*1.5;
  box(ctx,x-10,y+10,23,4,'#5f4e5680');
  box(ctx,x-8,y-4+bob,19,14,'#e7cab8');
  box(ctx,x-9,y-9+bob,7,8,'#e7cab8');box(ctx,x+5,y-9+bob,6,8,'#e7cab8');
  box(ctx,x-6,y+bob,2,2,'#5d4c59');box(ctx,x+5,y+bob,2,2,'#5d4c59');
  box(ctx,x,y+5+bob,3,2,'#b77d8f');
  box(ctx,x+11,y+1+bob,7,3,'#e7cab8');
}
function resident(ctx,p,i,t,mini){
  const x=Math.round(p.x),y=Math.round(p.y);
  const bob=p.moving?Math.sin(p.step*2)*2:Math.sin(t*1.3+i)*0.4;
  const shade='#2b3447';
  box(ctx,x-11,y+12,24,4,'#382d4566');
  box(ctx,x-7,y+4,5,10,shade);box(ctx,x+2,y+4,5,10,shade);
  box(ctx,x-10,y+12,9,4,'#2b3245');box(ctx,x+2,y+12,9,4,'#2b3245');
  box(ctx,x-9,y-8+bob,18,16,p.coat);
  box(ctx,x-11,y-5+bob,4,11,p.coat);box(ctx,x+8,y-5+bob,4,11,p.coat);
  box(ctx,x-8,y-22+bob,16,16,'#f1c5aa');
  box(ctx,x-9,y-25+bob,18,8,p.hair);
  box(ctx,x-9,y-21+bob,4,9,p.hair);box(ctx,x+6,y-21+bob,3,10,p.hair);
  box(ctx,x-4,y-16+bob,2,2,'#374055');box(ctx,x+3,y-16+bob,2,2,'#374055');
  box(ctx,x,y-11+bob,3,1,'#b67e79');
  if(!mini){
    const txt=p.moving?'♪':{coffee:'☕',rest:'Zz',read:'BOOK',chat:'...',plant:'✿'}[p.action]||'...';
    if(Math.sin(t*.7+i)>-.5)label(ctx,txt,x+18,y-34,'#ffe6b9',8);
  }
}
function drawWindow(ctx,c,t){
  poly(ctx,[[91,106],[148,80],[148,115],[91,139]],c.dark,c.line);
  poly(ctx,[[96,107],[144,86],[144,111],[96,132]],c.sky,'#eac4a7');
  for(let i=0;i<9;i++){
    box(ctx,100+(i*11)%40,102-(i*3)%13,3,3,Math.sin(t*.6+i)>0?'#f9dfc0':'#c4d6da');
  }
  poly(ctx,[[119,98],[122,96],[122,120],[119,122]],c.trim);
}
function drawRoom(ctx,world,theme,working){
  const t=world.time,c=THEMES[theme]||THEMES.dusk;
  // Floating transparent island, not a copy of any commercial game scene.
  const g=ctx.createRadialGradient(240,163,10,240,170,220);
  g.addColorStop(0,c.fade+'aa');g.addColorStop(1,'#00000000');
  ctx.fillStyle=g;ctx.fillRect(0,0,480,290);
  for(let i=0;i<14;i++)box(ctx,24+(i*71)%430,26+(i*43)%215+Math.sin(t*.5+i)*2,2,2,c.trim+'a3');
  // Floating carved base / isometric diamond.
  poly(ctx,[[45,155],[240,68],[435,155],[240,254]],'#463e57',c.dark);
  poly(ctx,[[45,155],[240,254],[240,271],[45,171]],'#665367',c.line);
  poly(ctx,[[240,254],[435,155],[435,172],[240,271]],'#574453',c.line);
  // Walls drawn behind the contents.
  poly(ctx,[[45,155],[240,68],[240,28],[45,110]],c.left,c.line);
  poly(ctx,[[240,68],[435,155],[435,109],[240,28]],c.right,c.line);
  poly(ctx,[[45,155],[240,68],[435,155],[240,254]],c.floor,c.line);
  // Floor plank linework.
  for(let k=1;k<6;k++){
    const x=45+k*32,y=155-k*14.1;
    poly(ctx,[[x,y],[x+195, y+99]],'#00000000',null);
    ctx.strokeStyle=c.line+'50';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+195,y+99);ctx.stroke();
  }
  for(let k=1;k<6;k++){
    const x=240+k*32.5,y=68+k*14.5;
    ctx.strokeStyle=c.line+'55';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-195,y+99);ctx.stroke();
  }
  drawWindow(ctx,c,t);
  // Roof beam and framed pastel poster.
  poly(ctx,[[45,110],[240,28],[435,109],[435,114],[240,34],[45,116]],c.trim);
  poly(ctx,[[296,73],[334,89],[334,119],[296,103]],c.dark,c.line);
  poly(ctx,[[300,79],[330,92],[330,110],[300,98]],c.leaf);
  // Sofa/bed area.
  poly(ctx,[[94,174],[163,140],[211,163],[143,202]],c.dark,c.line);
  poly(ctx,[[100,167],[159,139],[204,161],[144,189]],c.bed,c.trim);
  poly(ctx,[[103,162],[132,148],[150,156],[122,172]],'#eee6da');
  poly(ctx,[[132,177],[174,157],[196,168],[151,190]],c.rug);
  // Rug center, coffee table, and book.
  poly(ctx,[[184,200],[242,169],[311,201],[247,240]],c.rug,c.trim);
  poly(ctx,[[215,199],[263,177],[294,192],[246,215]],'#886f63',c.dark);
  poly(ctx,[[215,192],[263,170],[294,185],[246,208]],'#d8b59a',c.line);
  poly(ctx,[[244,190],[258,184],[270,190],[256,197]],'#f6edd6');
  // Right-side work desk.
  poly(ctx,[[300,139],[352,113],[397,133],[345,160]],'#7d625e',c.line);
  poly(ctx,[[301,134],[352,109],[397,128],[345,154]],c.trim,c.line);
  monitor(ctx,359,134,t,c);
  chair(ctx,338,180,c);
  // Lamp, books and plant.
  box(ctx,392,111,4,23,c.dark);box(ctx,385,110,18,6,c.accent);
  box(ctx,315,124,9,7,'#9ca9bb');box(ctx,324,121,7,10,'#e3b5a7');
  potted(ctx,83,166,c,t);
  potted(ctx,399,166,c,t+1);
  // NPCs are fictional ambient residents.
  const items=world.people.slice().sort((a,b)=>a.y-b.y);
  for(const p of items)resident(ctx,p,world.people.indexOf(p),t,false);
  cat(ctx,312+Math.sin(t*.5)*5,220,t);
  // Cozy particle sparkle.
  if(working){
    box(ctx,358,77,9,3,'#9ce2bd');
    label(ctx,'GPT LIVE',380,66,'#e9f9e2',8);
  }
}
function drawBar(ctx,world,theme,working){
  const c=THEMES[theme]||THEMES.dusk,t=world.time;
  const g=ctx.createLinearGradient(0,0,0,123);g.addColorStop(0,c.sky+'04');g.addColorStop(.7,c.sky+'bb');g.addColorStop(1,c.dark+'ee');
  ctx.fillStyle=g;ctx.fillRect(0,0,480,122);
  for(let i=0;i<25;i++){
    const x=(i*47+Math.sin(t*.2+i)*5)%480,y=13+(i*17)%48;
    box(ctx,x,y,2,2,c.trim+'bb');
  }
  // Petite rooftop platform: never claims to be a full RPG.
  box(ctx,8,77,464,6,c.trim);
  box(ctx,8,83,464,28,c.floor);
  for(let i=0;i<20;i++)box(ctx,14+i*24,91,19,1,c.line);
  box(ctx,8,109,464,5,c.dark);
  potted(ctx,32,77,c,t);
  // Original small staff; movements still autonomous.
  for(let i=0;i<world.people.length;i++){
    const p=world.people[i];
    const x=100+i*88+Math.sin(t*(.7+i*.18)+i)*21;
    resident(ctx,{...p,x,y:71,moving:p.moving,step:p.step},i,t,true);
  }
  cat(ctx,430+Math.sin(t*.9)*6,75,t);
  if(working)label(ctx,'● GPT WORKING',394,16,'#c0f7d2',9);
}
/** Exposes a simple deterministic renderer usable by mini window or tests. */
export function renderCozyScene(ctx,world,{layout='room',theme='dusk',working=false}={}){
  const height=layout==='bar'?122:290;
  ctx.clearRect(0,0,480,290);
  if(layout==='bar')drawBar(ctx,world,theme,working);
  else drawRoom(ctx,world,theme,working);
  return {width:480,height};
}
export const roomThemes=Object.freeze(Object.keys(THEMES));
