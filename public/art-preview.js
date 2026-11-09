import {loadAtlas,drawAnimation} from './engine/atlas.js';

const $=id=>document.getElementById(id);
let sprites=null;
let current='dusk';

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
  if(document.hidden || !sprites)return;
  for(const size of [2,4,8]){
    const canvas=$('preview'+size);
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawAnimation(ctx,sprites,'idle',now,canvas.width/2,29*size,size);
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
  window.requestAnimationFrame(render);
}
boot();
