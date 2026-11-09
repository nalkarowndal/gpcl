/** G1 file validator: semantic palettes and canonical atlas+PNG bundles. */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAtlas } from '../public/engine/atlas.js';

export const REQUIRED_ROLES = Object.freeze([
  'outline','shadow','wallLight','wallShade','floor','woodDark','woodMid',
  'woodLight','textile','skin','foliage','foliageShade','lamp','window','highlight'
]);
const root = join(dirname(fileURLToPath(import.meta.url)),'..','public','assets');
const paletteNames=['dusk','sunrise','forest'];
function check(ok,msg){if(!ok)throw new Error('[G1] '+msg);}
function paletteColor(value){return typeof value==='string' && /^#[a-fA-F0-9]{6}$/.test(value);}
export function validatePalette(palette) {
  check(palette && palette.format === 'gpcl-palette/v1', 'palette requires gpcl-palette/v1');
  check(paletteNames.includes(palette.id), 'unexpected palette id');
  check(typeof palette.name==='string' && palette.name.length>0,'missing palette display name');
  check(palette.roles && typeof palette.roles==='object','missing semantic roles');
  const keys=Object.keys(palette.roles).sort();
  check(keys.length===REQUIRED_ROLES.length &&
    REQUIRED_ROLES.slice().sort().every((k,i)=>keys[i]===k),'semantic role mismatch in '+palette.id);
  for(const [name,color] of Object.entries(palette.roles)) {
    check(paletteColor(color),'invalid color '+palette.id+'/'+name);
  }
  return palette;
}
export function readPngHeader(bytes) {
  check(Buffer.isBuffer(bytes) && bytes.length>=33, 'PNG file is too small');
  check(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'invalid PNG signature');
  check(bytes.toString('ascii',12,16)==='IHDR', 'missing IHDR chunk');
  check(bytes.readUInt32BE(8)===13,'unexpected IHDR size');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  check(width>0 && width<=8192 && height>0 && height<=8192,'image dimensions out of bounds');
  check(bytes[24]===8 && bytes[25]===6, 'sprite sheet must use 8-bit RGBA PNG');
  return {w:width,h:height};
}
export async function validateArt({assetsRoot=root, requireSample=true}={}) {
  const paletteDir=join(assetsRoot,'palettes');
  const palettes=[];
  for(const id of paletteNames) {
    const value=JSON.parse(await readFile(join(paletteDir,id+'.json'),'utf8'));
    check(value.id===id,'palette id differs from filename: '+id);
    palettes.push(validatePalette(value));
  }
  const outputDir=join(assetsRoot,'generated');
  const entries=await readdir(outputDir);
  const manifests=entries.filter(name=>name.endsWith('.json') && !name.endsWith('.aseprite.json'));
  check(manifests.length>0,'no generated atlas JSON found');
  if(requireSample)check(manifests.includes('cat-demo.json'),'missing original cat test sheet');
  const requiredResidents=['mimi','nori','pico','luna'];
  for(const name of requiredResidents)
    check(manifests.includes('character-'+name+'.json'),'missing G2 character sprite atlas: '+name);

  let images=0,frames=0;
  for(const name of manifests) {
    const atlas=validateAtlas(JSON.parse(await readFile(join(outputDir,name),'utf8')));
    if(name.startsWith('character-')){
      check(atlas.frameSize.w===32 && atlas.frameSize.h===48,'G2 frame size must be 32x48: '+name);
      check(atlas.origin.x===16 && atlas.origin.y===45,'G2 feet pivot mismatch: '+name);
      const requiredActions=['idle','walk_down','walk_up','walk_left','walk_right',
        'work','coffee','read','chat','rest','plant','sit'];
      for(const action of requiredActions)
        check(Array.isArray(atlas.animations[action]?.frames) && atlas.animations[action].frames.length>=4,
          'G2 missing action '+action+' in '+name);
      check(atlas.frames.length===66,'G2 sprite must contain 66 frames: '+name);
    }
    const imageName=atlas.image;
    check(basename(imageName)===imageName,'unsafe atlas image filename');
    const file=await readFile(join(outputDir,imageName));
    const size=readPngHeader(file);
    check(size.w===atlas.size.w && size.h===atlas.size.h,'PNG/JSON dimension mismatch for '+name);
    images++;
    frames+=atlas.frames.length;
  }
  return {palettes:palettes.length,atlases:images,frames};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { console.log('[G1] art validation passed:',await validateArt()); }
  catch(error){console.error('[G1] art validation FAILED:',error.message);process.exitCode=1;}
}
