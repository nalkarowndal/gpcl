import {loadAtlas,drawAnimation} from './engine/atlas.js';

const $=id=>document.getElementById(id);
let sprites=null;
let current='dusk';
const characterSheets=new Map();
const characters=[
  ['Mimi','Rose cardigan · Twin buns'],
  ['Nori','Sage hoodie · Messy hair'],
  ['Pico','Lavender overalls · Headphones'],
  ['Luna','Apricot sweater · Braid & beret']
];
let selectedAction='idle';
const characterCanvases=new Map();
for(const [name,description] of characters){
  const card=document.createElement('article');card.className='character-card';
  const title=document.createElement('h3');title.textContent=name;
  const canvas=document.createElement('canvas');
  canvas.width=192;canvas.height=288;
  canvas.setAttribute('aria-label',name+' 픽셀 아트 캐릭터 애니메이션');
  const sub=document.createElement('p');sub.textContent=description;
  card.append(title,canvas,sub);
  $('character-gallery').append(card);
  characterCanvases.set(name,canvas);
}
$('character-action').addEventListener('change',e=>{selectedAction=e.target.value;});


async function showPalette(id) {
  const valid=['dusk','sunrise','forest'];
  if (!valid.includes(id)) throw new Error('Unknown theme');
  const response=await fetch('/assets/palettes/'+id+'.json');
  if(!response.ok)throw new Error('Missing palette: '+id);
  const value=await response.json();
  if(value.format!=='gpcl-palette/v1'||value.id!==id)
    throw new Error('Unexpected palette document');
  const parent=$('palette');
  parent.replaceChildren();
  for(const [role,color] of Object.entries(value.roles)){
    const card=document.createElement('div');card.className='swatch';
    const sample=document.createElement('div');sample.className='swatch-color';
    sample.style.backgroundColor=color;
    const detail=document.createElement('div');detail.className='swatch-text';
    const title=document.createElement('span');title.textContent=role;
    const code=document.createElement('small');code.textContent=color;
    detail.append(title,code);card.append(sample,detail);parent.append(card);
  }
}
$('theme-picker').addEventListener('change',event=>{
  current=event.target.value;
  showPalette(current).catch(error=>{
    $('palette').textContent='팔레트 오류: '+error.message;
  });
});

function render(now) {
  window.requestAnimationFrame(render);
  if(document.hidden)return;
  if(sprites)for(const size of [2,4,8]){
    const canvas=$('preview'+size);
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawAnimation(ctx,sprites,'idle',now,canvas.width/2,29*size,size);
  }
  for(const [name,canvas] of characterCanvases){
    const sheet=characterSheets.get(name);
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(sheet)drawAnimation(ctx,sheet,selectedAction,now,
      canvas.width/2,45*6,6);
  }
}
async function boot(){
  try {
    await showPalette(current);
    sprites=await loadAtlas('/assets/generated/cat-demo.json');
    $('atlas-status').textContent='✓ 정상: '+sprites.atlas.frames.length+
      '프레임 / '+sprites.image.width+'×'+sprites.image.height+' RGBA atlas';
  }catch(error){
    $('atlas-status').textContent='✕ G1 아트 데이터 검증 실패: '+error.message;
    $('atlas-status').style.color='#ffb8ad';
  }
  const settled=await Promise.all(characters.map(async ([name])=>{
    try {
      characterSheets.set(name,await loadAtlas('/assets/generated/character-'+name.toLowerCase()+'.json'));
      return name;
    }catch(error){
      console.error('[G2] atlas load failed for',name,error);
      return null;
    }
  }));
  const complete=settled.filter(Boolean).length;
  $('character-status').textContent=(complete===4?'✓':'⚠')+' G2 sprites: '+complete+'/4 loaded · 12 animation cycles per character';
  window.requestAnimationFrame(render);
}
boot();
