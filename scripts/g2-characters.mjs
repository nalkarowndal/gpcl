/**
 * Phase G2 — original handcrafted-in-code chibi pixel art characters.
 *
 * Each sprite is painted pixel-by-pixel from a layered design specification,
 * then serialized into real RGBA PNG + gpcl-atlas/v1 metadata. Characters
 * have independent hairstyles, facial details, outfits, accessories and
 * animation poses; no game assets or external illustrations are copied.
 *
 * This script is deliberately deterministic (no RNG, assets, network, time).
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {validateAtlas} from '../public/engine/atlas.js';

export const FRAME_W=32, FRAME_H=48, COLUMNS=12, PAD=2;
export const CHARACTER_NAMES=Object.freeze(['Mimi','Nori','Pico','Luna']);
export const ACTIONS=Object.freeze([
  ['idle',4,230],['walk_down',6,100],['walk_up',6,100],
  ['walk_left',6,100],['walk_right',6,100],
  ['work',6,145],['coffee',8,165],['read',6,175],
  ['chat',4,230],['rest',4,340],['plant',6,155],['sit',4,220]
]);
export const FRAME_COUNT=ACTIONS.reduce((sum,a)=>sum+a[1],0);
export const SHEET_W=COLUMNS*(FRAME_W+PAD);
export const SHEET_H=Math.ceil(FRAME_COUNT/COLUMNS)*(FRAME_H+PAD);

export const PROFILES=Object.freeze({
  Mimi:{name:'Mimi',style:'twin-buns',detail:'Rose cardigan, double buns, bow clip',
    outline:'#382D49',hair:'#594058',hairShade:'#382D49',hairLight:'#8B6583',
    coat:'#E99FA9',coatShade:'#B66F84',coatLight:'#F6C8C2',accent:'#FFE1A5',
    skin:'#F3C6AC',skinShade:'#D99F98',blush:'#E68E9A',pants:'#5C627C',
    boots:'#433B5B',eye:'#3D3B5C',white:'#FFF3E5'},
  Nori:{name:'Nori',style:'messy-crop',detail:'Sage hoodie, messy auburn hair, round glasses',
    outline:'#343D45',hair:'#8F5C43',hairShade:'#593D3C',hairLight:'#C38A5E',
    coat:'#93C5A0',coatShade:'#598C78',coatLight:'#C6E3B0',accent:'#F6C88C',
    skin:'#EFC0A0',skinShade:'#C78D76',blush:'#D68E89',pants:'#526B7A',
    boots:'#384A52',eye:'#3B4852',white:'#FAF4DE'},
  Pico:{name:'Pico',style:'headphones',detail:'Mint hair, lavender overalls, star headphones',
    outline:'#343451',hair:'#75BAB5',hairShade:'#438991',hairLight:'#B9E7D0',
    coat:'#AA9DD7',coatShade:'#7169A6',coatLight:'#D6C7EC',accent:'#FFE4AD',
    skin:'#F4D0B7',skinShade:'#DCA9A2',blush:'#E89BAF',pants:'#6D6598',
    boots:'#4A426F',eye:'#3E466A',white:'#FFF7ED'},
  Luna:{name:'Luna',style:'braid-beret',detail:'Honey blond braid, apricot sweater, blue beret',
    outline:'#46374E',hair:'#D5A56D',hairShade:'#976B58',hairLight:'#F2D196',
    coat:'#E8BB89',coatShade:'#B88168',coatLight:'#F6DAB0',accent:'#A8C9C5',
    skin:'#F2C7A8',skinShade:'#D19B8E',blush:'#D98B91',pants:'#765D79',
    boots:'#55445B',eye:'#55475C',white:'#FFF5E4'}
});

function colorRGB(hex) {
  if(!/^#[0-9a-fA-F]{6}$/.test(hex))throw new Error('Bad original palette color '+hex);
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5),16),255];
}
const colors=new Map();
function rgba(hex){
  if(!colors.has(hex))colors.set(hex,colorRGB(hex));
  return colors.get(hex);
}
function makePainter(pixels){
  // Only draw inside individual frame cells, never allow sprite pixels to leak into padding.
  function pixel(frame,x,y,hex){
    if(x<0||x>=FRAME_W||y<0||y>=FRAME_H)return;
    const c=rgba(hex), offsetX=(frame%COLUMNS)*(FRAME_W+PAD),
      offsetY=Math.floor(frame/COLUMNS)*(FRAME_H+PAD);
    const at=((y+offsetY)*SHEET_W+(x+offsetX))*4;
    pixels.set(c,at);
  }
  function rect(frame,x,y,w,h,c){
    for(let py=Math.max(0,Math.ceil(y));py<Math.min(FRAME_H,y+h);py++){
      for(let px=Math.max(0,Math.ceil(x));px<Math.min(FRAME_W,x+w);px++)pixel(frame,px,py,c);
    }
  }
  function ellipse(frame,cx,cy,rx,ry,c){
    for(let y=Math.floor(cy-ry);y<=cy+ry;y++){
      for(let x=Math.floor(cx-rx);x<=cx+rx;x++){
        if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1.02)pixel(frame,x,y,c);
      }
    }
  }
  function line(frame,x0,y0,x1,y1,c){
    x0=Math.round(x0);y0=Math.round(y0);
    x1=Math.round(x1);y1=Math.round(y1);
    let dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0);
    const sx=x0<x1?1:-1,sy=y0<y1?1:-1;
    let err=dx+dy;
    for(;;){
      pixel(frame,x0,y0,c);
      if(x0===x1&&y0===y1)break;
      const e=2*err;
      if(e>=dy){err+=dy;x0+=sx;}
      if(e<=dx){err+=dx;y0+=sy;}
    }
  }
  return {pixel,rect,ellipse,line};
}

function drawAccessories(p,f,style,cy,side,back,phase) {
  const {rect:r,pixel:dot,ellipse:ell,line}=p;
  const c=style;
  if(c.style==='twin-buns'){
    ell(f,7,cy-6,5,5,c.outline);ell(f,25,cy-6,5,5,c.outline);
    ell(f,7,cy-7,3.6,3.5,c.hair);ell(f,25,cy-7,3.6,3.5,c.hair);
    r(f,5,cy-10,2,2,c.hairLight);r(f,23,cy-10,2,2,c.hairLight);
    // Ribbon clip—silhouette anchor for Mimi.
    r(f,23,cy-5,5,2,c.accent);r(f,25,cy-7,2,5,c.accent);
    dot(f,25,cy-5,c.white);
  }
  if(c.style==='messy-crop'){
    r(f,6,cy-9,6,4,c.hair);r(f,20,cy-10,5,4,c.hair);
    r(f,11,cy-11,4,4,c.hair);r(f,17,cy-10,6,4,c.hair);
    r(f,10,cy-11,2,2,c.hairLight);r(f,19,cy-12,2,3,c.hairLight);
    if(!back){
      // Glasses: two small open rings with a shared bridge.
      if(!side){
        r(f,10,cy+1,5,4,c.outline);r(f,11,cy+2,3,2,c.skin);
        r(f,18,cy+1,5,4,c.outline);r(f,19,cy+2,3,2,c.skin);
        r(f,15,cy+2,3,1,c.outline);
      }else{r(f,17,cy+1,6,4,c.outline);r(f,18,cy+2,4,2,c.skin);}
    }
  }
  if(c.style==='headphones'){
    // Mint bob + headband, lavender ear cups and tiny star charm.
    r(f,6,cy+2,4,9,c.hairShade);r(f,23,cy+2,4,8,c.hairShade);
    line(f,8,cy-6,12,cy-11,c.outline);
    r(f,12,cy-11,9,2,c.accent);
    line(f,21,cy-10,25,cy-5,c.outline);
    r(f,6,cy-1,4,8,c.coatShade);
    r(f,24,cy-1,4,8,c.coatShade);
    r(f,6,cy+1,3,3,c.accent);r(f,25,cy+1,2,3,c.accent);
    dot(f,26,cy+2,c.white);
  }
  if(c.style==='braid-beret'){
    // Braided long hair and asymmetrical cap.
    r(f,23,cy+5,4,17,c.outline);
    for(let i=0;i<4;i++){
      r(f,23+(i%2),cy+6+i*4,4,3,i%2?c.hairShade:c.hair);
      dot(f,25,cy+7+i*4,c.hairLight);
    }
    r(f,23,cy+20,5,2,c.accent);
    ell(f,16,cy-9,12,4.5,c.outline);
    ell(f,16,cy-10,10,3.5,c.accent);
    r(f,7,cy-7,17,2,c.hairShade);
    r(f,13,cy-11,4,2,c.white);
    dot(f,15,cy-11,c.accent);
  }
}

function drawPose(p,f,c,action,step,frameCount) {
  const {rect:r,ellipse:ell,line,pixel:dot}=p;
  const side=action==='walk_left'||action==='walk_right';
  const back=action==='walk_up';
  const walking=action.startsWith('walk_');
  const stride=walking?Math.sin(step/6*Math.PI*2):0;
  const handSwing=walking?Math.round(stride*2):Math.round(Math.sin(step/Math.max(1,frameCount)*Math.PI*2));
  const footShift=walking?Math.round(stride*2):0;
  const bob=walking?Math.abs(Math.round(stride)):0;
  const sit=action==='sit'||action==='work'||action==='read';
  const doze=action==='rest';
  const yMove=(sit?3:0)+bob;
  const faceY=13+yMove+(doze?2:0);
  const torsoY=25+yMove;
  const eyeClosed=doze||(action==='idle'&&step===3)||(action==='coffee'&&step===5);
  // Shoes and socks — hard outline, 1px lighter rim.
  const footBase=45+(sit?0:0);
  const lFoot=footShift>0?1:0;
  const rFoot=footShift<0?1:0;
  r(f,9+footShift,37+yMove,6,7,c.outline);
  r(f,10+footShift,39+yMove,4,4,c.pants);
  r(f,8+footShift,footBase-3+lFoot,8,3,c.boots);
  r(f,9+footShift,footBase-1+lFoot,6,1,c.coatLight);
  r(f,18-footShift,37+yMove,6,7,c.outline);
  r(f,19-footShift,39+yMove,4,4,c.pants);
  r(f,17-footShift,footBase-3+rFoot,8,3,c.boots);
  r(f,18-footShift,footBase-1+rFoot,6,1,c.coatLight);
  if(sit){
    // The raised knees form a visibly different silhouette.
    r(f,7,39,10,4,c.pants);r(f,17,39,9,4,c.pants);
    r(f,8,42,8,3,c.boots);r(f,18,42,8,3,c.boots);
  }
  // Rear hair falls behind the jacket. Clothing is consistently 3+ color ramp.
  ell(f,16,faceY+6,11,12,c.hairShade);
  r(f,6,faceY+5,5,14,c.hairShade);
  r(f,22,faceY+5,5,14,c.hairShade);
  // Arm positions depend on gestures; draw before chest.
  const gesture=['coffee','read','work','plant','chat'].includes(action);
  const palmY=gesture?torsoY+7:torsoY+10;
  r(f,5-handSwing,torsoY+1,6,13,c.outline);
  r(f,6-handSwing,torsoY+2,4,10,c.coatShade);
  r(f,6-handSwing,palmY+3,4,3,c.skin);
  r(f,21+handSwing,torsoY+1,6,13,c.outline);
  r(f,22+handSwing,torsoY+2,4,10,c.coatShade);
  r(f,22+handSwing,palmY+3,4,3,c.skin);
  // Coat rounded shoulders with darker hem.
  ell(f,16,torsoY+7,10,12,c.outline);
  r(f,8,torsoY,16,17,c.coatShade);
  r(f,10,torsoY+1,13,13,c.coat);
  r(f,10,torsoY+1,12,2,c.coatLight);
  r(f,9,torsoY+15,15,2,c.coatShade);
  r(f,11,torsoY+4,2,10,c.coatLight);
  if(c.style==='twin-buns') {
    r(f,14,torsoY+2,4,4,c.white);r(f,15,torsoY+6,2,9,c.white);
    dot(f,16,torsoY+9,c.accent);dot(f,16,torsoY+13,c.accent);
    r(f,11,torsoY+15,11,2,c.coatLight);
  }else if(c.style==='messy-crop'){
    r(f,13,torsoY+1,7,3,c.coatShade);
    r(f,12,torsoY+3,9,2,c.coatLight);
    r(f,14,torsoY+8,4,5,c.coatShade);
    r(f,15,torsoY+8,2,4,c.accent);
  }else if(c.style==='headphones'){
    r(f,10,torsoY+1,4,14,c.coatShade);r(f,19,torsoY+1,4,14,c.coatShade);
    r(f,11,torsoY+7,11,9,c.coat);r(f,14,torsoY+9,5,4,c.coatLight);
    dot(f,12,torsoY+3,c.accent);dot(f,21,torsoY+3,c.accent);
  }else{
    // Apricot sweater vest, pale collar and star buttons.
    r(f,12,torsoY+1,9,3,c.white);
    r(f,15,torsoY+4,3,12,c.coatLight);
    dot(f,16,torsoY+8,c.accent);dot(f,16,torsoY+12,c.accent);
    r(f,9,torsoY+15,14,2,c.hairShade);
  }
  // Head base with 1px shade and cheeks. Rear view suppresses face.
  ell(f,16,faceY+4,11,10,c.outline);
  ell(f,16,faceY+4,10,9,c.skinShade);
  r(f,8,faceY-1,16,13,c.skin);
  r(f,10,faceY+11,12,2,c.skinShade);
  r(f,8,faceY+6,2,4,c.blush);r(f,23,faceY+6,2,3,c.blush);
  if(!back){
    if(side){
      const lookRight=action==='walk_right';
      const ex=lookRight?20:11;
      r(f,ex,faceY+4,2,3,c.eye);
      if(!eyeClosed)dot(f,ex,faceY+4,c.white);
      else r(f,ex,faceY+6,3,1,c.eye);
      r(f,lookRight?23:8,faceY+7,2,1,c.skinShade);
    }else{
      for(const ex of [11,20]){
        if(eyeClosed)r(f,ex,faceY+5,3,1,c.eye);
        else{r(f,ex,faceY+3,2,3,c.eye);dot(f,ex,faceY+3,c.white);}
      }
      r(f,14,faceY+8,3,1,c.skinShade);
      r(f,15,faceY+9,3,1,c.skinShade);
    }
  }
  // Front fringe and colored hair highlights.
  ell(f,16,faceY-5,11,5,c.outline);
  r(f,6,faceY-6,20,5,c.hair);
  r(f,8,faceY-7,17,3,c.hair);
  r(f,9,faceY-9,13,2,c.hairLight);
  r(f,8,faceY-2,5,5,c.hair);
  r(f,20,faceY-2,5,4,c.hairShade);
  if(back){
    r(f,9,faceY+2,14,10,c.hair);
    r(f,12,faceY+4,7,7,c.hairShade);
    r(f,14,faceY+7,3,6,c.hairLight);
  }
  drawAccessories(p,f,c,faceY,side,back,step);
  // Hands / props above body at animation-specific timing.
  if(action==='coffee'){
    const cupY=torsoY+6-Math.round(Math.sin((step/8)*Math.PI)*5);
    r(f,22,cupY,7,7,c.outline);r(f,23,cupY,5,5,c.accent);
    r(f,28,cupY+2,2,3,c.white);
    r(f,23,cupY+2,5,1,c.white);
    if(step===1||step===2) {dot(f,24,cupY-3,c.white);dot(f,27,cupY-5,c.white);}
  }else if(action==='work'){
    r(f,8,torsoY+11,17,7,c.outline);
    r(f,9,torsoY+10,16,6,c.pants);
    r(f,11,torsoY+11,12,2,c.coatLight);
    r(f,12,torsoY+14,9,1,c.accent);
    r(f,12+(step%2)*4,torsoY+9,3,2,c.skin);
  }else if(action==='read'){
    r(f,8,torsoY+7,17,12,c.outline);
    r(f,9,torsoY+8,7,10,c.white);
    r(f,17,torsoY+8,7,10,c.white);
    line(f,16,torsoY+8,16,torsoY+17,c.coatShade);
    r(f,11,torsoY+10+step%3,3,1,c.coatShade);
    r(f,19,torsoY+11+(step+1)%3,3,1,c.coatShade);
  }else if(action==='plant'){
    r(f,23,torsoY+8,7,6,c.pants);
    r(f,24,torsoY+7,5,2,c.coatLight);
    r(f,23,torsoY+9,5,3,c.accent);
    line(f,23,torsoY+11,18,torsoY+8,c.pants);
    if(step%3!==0){dot(f,19,torsoY+18,c.accent);dot(f,22,torsoY+20,c.accent);}
  }else if(action==='chat'){
    if(step%2===0){
      r(f,25,torsoY+3,4,3,c.skin);
      dot(f,26,torsoY+1,c.accent);
    }
    if(step===1||step===2){
      r(f,21,2,8,5,c.white);r(f,23,7,2,2,c.white);
      dot(f,23,4,c.outline);dot(f,26,4,c.outline);
    }
  }else if(doze){
    if(step%2===0){r(f,23,3,3,2,c.white);r(f,26,1,4,2,c.white);}
  }else if(action==='idle'){
    if(step===1){dot(f,26,faceY-9,c.white);dot(f,28,faceY-11,c.accent);}
  }else if(action==='sit'){
    r(f,12,torsoY+16,11,2,c.coatLight);
  }
}

function pngChunk(type,bytes){
  const label=Buffer.from(type),data=Buffer.from(bytes),length=Buffer.alloc(4),crc=Buffer.alloc(4);
  length.writeUInt32BE(data.length,0);
  let checksum=0xFFFFFFFF;
  for(const byte of Buffer.concat([label,data])){
    checksum^=byte;
    for(let k=0;k<8;k++) checksum=(checksum>>>1)^((checksum&1)?0xEDB88320:0);
  }
  crc.writeUInt32BE((checksum^0xFFFFFFFF)>>>0,0);
  return Buffer.concat([length,label,data,crc]);
}
function toPNG(data){
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(SHEET_W,0);ihdr.writeUInt32BE(SHEET_H,4);
  ihdr[8]=8;ihdr[9]=6; // 8-bit RGBA
  const rows=Buffer.alloc((SHEET_W*4+1)*SHEET_H);
  for(let y=0;y<SHEET_H;y++){
    const from=y*SHEET_W*4;
    rows.set(data.subarray(from,from+SHEET_W*4),y*(SHEET_W*4+1)+1);
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(rows,{level:9})),
    pngChunk('IEND',Buffer.alloc(0))
  ]);
}

export function generateCharacter(name) {
  const c=PROFILES[name];
  if(!c)throw new RangeError('Unknown G2 original character: '+name);
  const pixels=new Uint8Array(SHEET_W*SHEET_H*4);
  const painter=makePainter(pixels);
  const atlas={
    format:'gpcl-atlas/v1',image:'character-'+name.toLowerCase()+'.png',
    size:{w:SHEET_W,h:SHEET_H},frameSize:{w:FRAME_W,h:FRAME_H},
    origin:{x:16,y:45},frames:[],animations:{},
    credit:{creator:'GPT Pixel Office',license:'original-project'}
  };
  let f=0;
  for(const [action,count,duration] of ACTIONS) {
    const list=[];
    for(let n=0;n<count;n++,f++){
      const frameName=action+'_'+n;
      drawPose(painter,f,c,action,n,count);
      atlas.frames.push({name:frameName,
        rect:{x:(f%COLUMNS)*(FRAME_W+PAD),y:Math.floor(f/COLUMNS)*(FRAME_H+PAD),w:FRAME_W,h:FRAME_H},
        duration});
      list.push(frameName);
    }
    atlas.animations[action]={frames:list,loop:true};
  }
  validateAtlas(atlas);
  return {png:toPNG(pixels),atlas,rgba:pixels};
}

export async function buildCharacters(output=join(dirname(fileURLToPath(import.meta.url)),'..','public','assets','generated')){
  await mkdir(output,{recursive:true});
  const result=[];
  for(const name of CHARACTER_NAMES){
    const {png,atlas}=generateCharacter(name);
    await Promise.all([
      writeFile(join(output,atlas.image),png),
      writeFile(join(output,'character-'+name.toLowerCase()+'.json'),JSON.stringify(atlas,null,2)+'\n')
    ]);
    result.push({name,frames:atlas.frames.length,animations:Object.keys(atlas.animations).length,bytes:png.length});
  }
  return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('[G2] created original four-character pixel atlases:',await buildCharacters());
}
