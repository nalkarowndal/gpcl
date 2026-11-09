import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {generateCharacter,CHARACTER_NAMES,PROFILES,ACTIONS,FRAME_W,FRAME_H,FRAME_COUNT,
  SHEET_W,SHEET_H,COLUMNS,PAD} from '../scripts/g2-characters.mjs';
import {validateAtlas,animationFrame,drawAnimation} from '../public/engine/atlas.js';
import {readPngHeader,validateArt} from '../scripts/validate-art.mjs';
import {chooseCharacterAnimation,characterElapsedMs,CHARACTER_ACTIONS} from '../public/engine/character-animation.js';
import {createCozyWorld,stepCozyWorld,renderCozyScene} from '../public/mini-scene.js';

function decodeUnfilteredPNG(bytes) {
  let offset=8, data=[];
  while(offset<bytes.length) {
    const size=bytes.readUInt32BE(offset);
    const chunk=bytes.toString('ascii',offset+4,offset+8);
    if(chunk==='IDAT')data.push(bytes.subarray(offset+8,offset+8+size));
    offset+=size+12;
    if(chunk==='IEND')break;
  }
  const raw=inflateSync(Buffer.concat(data));
  const result=Buffer.alloc(SHEET_W*SHEET_H*4);
  for(let y=0;y<SHEET_H;y++) {
    const row=y*(1+SHEET_W*4);
    assert.equal(raw[row],0,'G2 uses lossless PNG filter 0');
    raw.copy(result,y*SHEET_W*4,row+1,row+1+SHEET_W*4);
  }
  return result;
}
function frameSignature(rgba,frame){
  const {x,y,w,h}=frame.rect;
  const bytes=Buffer.alloc(w*h*4);
  for(let py=0;py<h;py++)
    rgba.copy(bytes,py*w*4,((y+py)*SHEET_W+x)*4,((y+py)*SHEET_W+x+w)*4);
  return createHash('sha256').update(bytes).digest('hex');
}
test('G2: four original distinct high-detail 32x48 atlas sprites are built with 12 animations',()=>{
  assert.deepEqual(CHARACTER_NAMES,['Mimi','Nori','Pico','Luna']);
  assert.equal(ACTIONS.length,12);
  assert.equal(FRAME_COUNT,66);
  assert.ok(SHEET_W>FRAME_W*2&&SHEET_H>FRAME_H*2);
  const signatures=new Set();
  for(const name of CHARACTER_NAMES) {
    const output=generateCharacter(name);
    const {png,atlas}=output;
    assert.deepEqual(readPngHeader(png),{w:SHEET_W,h:SHEET_H});
    assert.equal(validateAtlas(atlas),atlas);
    assert.equal(atlas.frames.length,FRAME_COUNT);
    assert.equal(atlas.frameSize.w,FRAME_W);
    assert.equal(atlas.frameSize.h,FRAME_H);
    assert.deepEqual(atlas.origin,{x:16,y:45});
    assert.deepEqual(Object.keys(atlas.animations),ACTIONS.map(a=>a[0]));
    assert.match(atlas.image,/^character-(mimi|nori|pico|luna)\.png$/);
    const decoded=decodeUnfilteredPNG(png);
    assert.deepEqual(Array.from(decoded),Array.from(output.rgba),
      name+' generated PNG pixels should be identical to source pixel matrix');
    const first=atlas.frames[0];
    const signature=frameSignature(decoded,first);
    signatures.add(signature);
    let opaque=0;
    for(let py=first.rect.y;py<first.rect.y+FRAME_H;py++)
      for(let px=first.rect.x;px<first.rect.x+FRAME_W;px++)
        opaque+=decoded[(py*SHEET_W+px)*4+3]===255?1:0;
    assert.ok(opaque>=180, name+' must be a substantive illustrated character, not an empty frame');
    const variants=new Set(atlas.frames.slice(0,4).map(f=>frameSignature(decoded,f)));
    assert.ok(variants.size>=2,name+' idle must have unique blink or expression poses');
    for(const [action,count] of ACTIONS){
      assert.equal(atlas.animations[action].frames.length,count);
      assert.ok(animationFrame(atlas,action,99999),name+' '+action+' has no animation');
    }
    for(let row=0;row<Math.ceil(FRAME_COUNT/COLUMNS);row++){
      for(let px=0;px<SHEET_W;px++)
        for(let pad=FRAME_H;pad<FRAME_H+PAD;pad++){
          const py=row*(FRAME_H+PAD)+pad;
          assert.equal(decoded[(py*SHEET_W+px)*4+3],0,name+' padding must remain transparent');
        }
    }
  }
  assert.equal(signatures.size,4,'the four residents need different identifiable silhouettes');
});
test('G2 action selection maps four walking directions and every task to a tagged animation',()=>{
  assert.deepEqual(CHARACTER_ACTIONS,ACTIONS.map(a=>a[0]));
  for(const direction of ['up','down','left','right'])
    assert.equal(chooseCharacterAnimation({moving:true,facing:direction}),'walk_'+direction);
  assert.equal(chooseCharacterAnimation({moving:true,facing:'unknown'}),'walk_down');
  for(const action of ['idle','work','coffee','read','chat','rest','plant','sit'])
    assert.equal(chooseCharacterAnimation({moving:false,action}),action);
  assert.equal(chooseCharacterAnimation({moving:false,action:'roam'}),'idle');
  assert.equal(chooseCharacterAnimation({moving:false,action:'desk'}),'work');
  assert.equal(characterElapsedMs({actionAge:1.5},100,0),1500);
});
test('G2 tracked resident direction and action timer stay finite while strolling',()=>{
  const world=createCozyWorld(43);
  assert.equal(world.people.length,4);
  for(let i=0;i<1200;i++)stepCozyWorld(world,1/60);
  assert.ok(world.people.some(p=>p.actionAge>0));
  for(const p of world.people){
    assert.ok(['up','down','left','right'].includes(p.facing));
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    assert.ok(Number.isFinite(p.actionAge)&&p.actionAge>=0);
  }
});
test('G2 both scene modes render atlas images and fall back for partial sprite loads',()=>{
  const world=createCozyWorld(7);
  const drawCalls=[];
  const gradient={addColorStop(){}};
  const ctx=new Proxy({
    beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},
    clearRect(){},fillRect(){},fillText(){},drawImage(...args){drawCalls.push(args);},
    createRadialGradient(){return gradient;},createLinearGradient(){return gradient;}
  },{set(a,b,c){a[b]=c;return true;}});
  const atlas=generateCharacter('Mimi').atlas;
  const image={width:SHEET_W,height:SHEET_H};
  const art={characters:{Mimi:{atlas,image}}};
  renderCozyScene(ctx,world,{art,layout:'room'});
  renderCozyScene(ctx,world,{art,layout:'bar'});
  assert.equal(drawCalls.length,2,'Mimi loaded sprite should draw in both layouts');
  assert.ok(drawCalls[0][1]>=0);
});
test('G2 public generated character files are present and validated by G1 asset pipeline',async()=>{
  const result=await validateArt();
  assert.equal(result.palettes,3);
  assert.equal(result.atlases,5,'G1 cat and G2 four character sheets');
  assert.equal(result.frames,4+FRAME_COUNT*4);
  for(const name of CHARACTER_NAMES){
    const url=new URL('../public/assets/generated/character-'+name.toLowerCase()+'.json',import.meta.url);
    const manifest=JSON.parse(await readFile(url,'utf8'));
    assert.equal(manifest.frames.length,FRAME_COUNT);
  }
});
