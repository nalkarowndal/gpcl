/**
 * Convert original layered Aseprite artwork to the canonical G1 atlas.
 * This script intentionally does not download or bundle Aseprite.
 */
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, relative, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPngHeader } from './validate-art.mjs';
import { validateAtlas } from '../public/engine/atlas.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceDir = join(repository,'assets-source');
const generatedDir = join(repository,'public','assets','generated');
function fail(reason) { throw new Error('[G1 Aseprite export] '+reason); }
function safeInside(location, folder) {
  const rel=relative(folder,location);
  return rel && !rel.startsWith('..') && !rel.startsWith('/') && !rel.startsWith('\\') && !rel.includes('..'+requireSeparator());
}
function requireSeparator(){return process.platform==='win32'?'\\':'/';}
function parsePivot(value) {
  if(!/^\d{1,3},\d{1,3}$/.test(String(value)))fail('pivot must use integer x,y');
  const [x,y]=value.split(',').map(Number);
  return {x,y};
}
function cleanFrameName(value,i) {
  const key=String(value||'frame_'+i).replace(/\.(png|aseprite|ase)$/i,'').replace(/[^A-Za-z0-9_.-]/g,'_');
  return /^[A-Za-z0-9]/.test(key) ? key.slice(0,96) : 'frame_'+i;
}

/** Convert the documented Aseprite json-array frames + meta.frameTags structure. */
export function normalizeAseprite(raw, {image, pivot, credit={creator:'GPT Pixel Office',license:'original-project'}}) {
  if(!raw || !Array.isArray(raw.frames) || raw.frames.length===0)fail('no exported frames');
  if(!raw.meta?.size)fail('Aseprite JSON missing meta.size');
  const first=raw.frames[0].frame;
  if(!first || !Number.isInteger(first.w) || !Number.isInteger(first.h))fail('missing frame rectangle');
  const names=new Set();
  const frames=raw.frames.map((f,i)=>{
    if(f.rotated || f.trimmed)fail('trimmed/rotated frames are unsupported in G1; export full frames');
    if(!f.frame || f.frame.w!==first.w || f.frame.h!==first.h)fail('mismatched frame dimensions');
    const desired=cleanFrameName(f.filename,i);
    const name=names.has(desired)?'frame_'+i:desired;
    names.add(name);
    return {name,rect:{...f.frame},duration:f.duration};
  });
  const animations={};
  const tags=raw.meta.frameTags||[];
  for(const tag of tags){
    const name=String(tag.name||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_');
    if(!/^[a-z][a-z0-9_-]{0,45}$/.test(name))fail('invalid tag: '+tag.name);
    if(animations[name])fail('duplicated tag '+name);
    if(!Number.isInteger(tag.from) || !Number.isInteger(tag.to) ||
      tag.from<0 || tag.to>=frames.length || tag.from>tag.to)fail('invalid frame tag range');
    const range=frames.slice(tag.from,tag.to+1).map(f=>f.name);
    const direction=tag.direction||'forward';
    if(direction==='reverse')range.reverse();
    if(direction==='pingpong' && range.length>2)
      range.push(...range.slice(1,-1).reverse());
    animations[name]={frames:range,loop:true};
  }
  if(!Object.keys(animations).length)
    animations.idle={frames:frames.map(f=>f.name),loop:true};
  const atlas={
    format:'gpcl-atlas/v1',image,
    size:{w:raw.meta.size.w,h:raw.meta.size.h},
    frameSize:{w:first.w,h:first.h},
    origin:pivot,frames,animations,credit
  };
  return validateAtlas(atlas);
}

async function main() {
  const argv=process.argv.slice(2);
  if(argv.length<2)fail('usage: npm run art:export -- assets-source/pets/cat.aseprite public/assets/generated/cat --pivot 16,29');
  const input=resolve(repository,argv[0]);
  const outputBase=resolve(repository,argv[1]);
  if(!safeInside(input,sourceDir) || !['.aseprite','.ase'].includes(extname(input).toLowerCase()))
    fail('input must be an .aseprite/.ase file within assets-source');
  if(!safeInside(outputBase,generatedDir))fail('output must be inside public/assets/generated');
  if(!/^[A-Za-z0-9_-]+$/.test(basename(outputBase)))fail('output basename must use letters, numbers, underscore or hyphen');
  const pivotAt=argv.indexOf('--pivot');
  const pivot=parsePivot(pivotAt>=0?argv[pivotAt+1]:'16,29');
  await mkdir(dirname(outputBase),{recursive:true});
  const png=outputBase+'.png';
  const rawJSON=outputBase+'.aseprite.json';
  const manifest=outputBase+'.json';
  const executable=process.env.ASEPRITE_BIN || 'aseprite';
  const args=['-b','--color-mode','rgb','--list-tags','--format','json-array',
    '--sheet-type','rows','--shape-padding','2','--data',rawJSON,'--sheet',png,input];
  const out=spawnSync(executable,args,{cwd:repository,encoding:'utf8',timeout:60000,
    maxBuffer:2*1024*1024,shell:false});
  if(out.error || out.status!==0)fail('Aseprite CLI failed: '+(out.error?.message||out.stderr||out.status));
  const raw=JSON.parse(await readFile(rawJSON,'utf8'));
  const atlas=normalizeAseprite(raw,{image:basename(png),pivot});
  const actual=readPngHeader(await readFile(png));
  if(actual.w!==atlas.size.w || actual.h!==atlas.size.h)fail('exported PNG dimensions differ from Aseprite metadata');
  await writeFile(manifest,JSON.stringify(atlas,null,2)+'\n');
  console.log('[G1] exported validated atlas:',manifest,atlas.frames.length,'frames');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{await main();}catch(error){console.error(error.message);process.exitCode=1;}
}
