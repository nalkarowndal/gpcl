import test from 'node:test';
import assert from 'node:assert/strict';
import { createPNG,createMetadata } from '../scripts/build-art.mjs';
import { readPngHeader,validateArt,validatePalette } from '../scripts/validate-art.mjs';
import { normalizeAseprite } from '../scripts/export-aseprite.mjs';
import { validateAtlas,animationFrame,snapPixel,drawAtlasFrame,drawAnimation,loadAtlas } from '../public/engine/atlas.js';
import { createFixedClock,advanceFixedClock } from '../public/engine/timing.js';

test('G1 original sample is an actual RGBA PNG with canonical 4-frame atlas',()=>{
  const png=createPNG(),meta=createMetadata();
  assert.ok(png.length>250);
  assert.deepEqual(readPngHeader(png),{w:128,h:32});
  assert.equal(validateAtlas(meta),meta);
  assert.equal(meta.frames.length,4);
  assert.deepEqual(meta.origin,{x:16,y:29});
  assert.equal(animationFrame(meta,'idle',0).name,'idle_0');
  assert.equal(animationFrame(meta,'idle',260).name,'idle_1');
  assert.equal(animationFrame(meta,'idle',450).name,'idle_2');
  assert.equal(animationFrame(meta,'idle',580).name,'idle_3');
  assert.equal(animationFrame(meta,'idle',800).name,'idle_0');
});

test('G1 atlas rejects invalid JSON, out-of-bounds cells and traversal',()=>{
  const good=createMetadata();
  const mutate=(patch)=>{
    const next=structuredClone(good);
    patch(next);
    return ()=>validateAtlas(next);
  };
  assert.throws(mutate(a=>{a.frames[0].rect.x=120;}),/outside atlas/);
  assert.throws(mutate(a=>{a.image='../secret.png';}),/local PNG/);
  assert.throws(mutate(a=>{a.frames[0].duration=20;}),/duration/);
  assert.throws(mutate(a=>{a.animations.idle.frames=['missing'];}),/missing frame/);
  assert.throws(mutate(a=>{a.origin.y=99;}),/origin/);
  assert.throws(mutate(a=>{a.frames[1].name=a.frames[0].name;}),/duplicate/);
  assert.throws(mutate(a=>{a.credit.license='';}),/credit/);
});

test('G1 integer pixel renderer and animation respect frame origin',()=>{
  const meta=createMetadata();
  const calls=[];
  const ctx={imageSmoothingEnabled:true,drawImage(...args){calls.push(args);}};
  const image={width:128,height:32};
  assert.equal(drawAtlasFrame(ctx,image,meta,meta.frames[0],106.2,92.8),true);
  assert.equal(ctx.imageSmoothingEnabled,false);
  assert.deepEqual(calls[0].slice(1),[0,0,32,32,90,64,32,32]);
  assert.equal(drawAnimation(ctx,{atlas:meta,image},'idle',261,120,80),true);
  assert.deepEqual(calls[1].slice(1,5),[32,0,32,32]);
  assert.equal(snapPixel(15.72),16);
  assert.equal(drawAnimation(ctx,null,'idle',0,10,10),false);
});

test('G1 atlas loader never loads external image, checks decoded image size',async()=>{
  const metadata=createMetadata();
  const loaded=[];
  const valid=await loadAtlas('/assets/generated/cat-demo.json',{
    baseUrl:'http://localhost:3333/',
    fetchFn:async uri=>{loaded.push(uri);return {ok:true,json:async()=>metadata};},
    loadImage:async uri=>{loaded.push(uri);return {width:128,height:32};}
  });
  assert.equal(valid.atlas.frames.length,4);
  assert.deepEqual(loaded,['http://localhost:3333/assets/generated/cat-demo.json',
    'http://localhost:3333/assets/generated/cat-demo.png']);
  await assert.rejects(loadAtlas('https://example.com/private.json',{baseUrl:'http://localhost:3333/'}),/cross-origin/);
  await assert.rejects(loadAtlas('/assets/generated/cat-demo.json',{
    baseUrl:'http://localhost:3333/',fetchFn:async()=>({ok:true,json:async()=>metadata}),
    loadImage:async()=>({width:1,height:1})
  }),/dimensions/);
});

test('G1 semantic palettes and generated art pass contract validation',async()=>{
  const summary=await validateArt();
  assert.equal(summary.palettes,3);
  assert.ok(summary.atlases>=1);
  assert.ok(summary.frames>=4);
  assert.throws(()=>validatePalette({format:'gpcl-palette/v1',id:'dusk',name:'invalid',roles:{outline:'#fff'}}),/semantic role mismatch/);
});

test('G1 Aseprite json-array tagged animation converts to canonical metadata',()=>{
  const fake={
    frames:[0,1,2].map(i=>({filename:'cat_'+i+'.png',
      frame:{x:i*32,y:0,w:32,h:32},duration:120,rotated:false,trimmed:false})),
    meta:{size:{w:96,h:32},frameTags:[{name:'idle',from:0,to:2,direction:'pingpong'}]}
  };
  const atlas=normalizeAseprite(fake,{image:'cat.png',pivot:{x:16,y:29}});
  assert.deepEqual(atlas.animations.idle.frames,['cat_0','cat_1','cat_2','cat_1']);
  assert.throws(()=>normalizeAseprite({...fake,frames:[{...fake.frames[0],trimmed:true}]},
    {image:'cat.png',pivot:{x:16,y:29}}),/trimmed/);
});

test('G1 fixed 60Hz simulation advances equally with 30Hz and 60Hz drawings',()=>{
  const low=createFixedClock(),high=createFixedClock();
  let a=0,b=0;
  advanceFixedClock(low,0,()=>a++);
  advanceFixedClock(high,0,()=>b++);
  for(let i=1;i<=30;i++)advanceFixedClock(low,i*1000/30,()=>a++);
  for(let i=1;i<=60;i++)advanceFixedClock(high,i*1000/60,()=>b++);
  assert.ok(Math.abs(a-b)<=1,'simulation should not slow down due to draw cap');
  assert.ok(a>=59 && b>=59);
  const before=a;
  advanceFixedClock(low,90000,()=>a++,{paused:true});
  assert.equal(a,before,'hidden window must not run all missed frames');
  advanceFixedClock(low,90016.67,()=>a++);
  assert.ok(a<=before+2);
});
