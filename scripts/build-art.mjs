/**
 * Reproducible original G1 fixture: tiny 4-frame cat sprite sheet.
 *
 * The output demonstrates the actual PNG/atlas build without bundling an art
 * editor or copying commercial sprites. It is a pipeline acceptance sample;
 * higher-detail G2/G4 illustrations will replace it later.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const FRAME_W = 32;
export const FRAME_H = 32;
export const FRAME_COUNT = 4;
const WIDTH = FRAME_W * FRAME_COUNT;
const HEIGHT = FRAME_H;
const PIXELS = new Uint8Array(WIDTH * HEIGHT * 4);
const PALETTE = {
  outline:'#54495D', shadow:'#987A81', coat:'#E8C8B4',
  cream:'#F7E7D6', ear:'#D89AA7', eyes:'#333E4E',
  nose:'#B97B91', paws:'#C29A95', highlight:'#FFFAE9'
};
function rgba(color) {
  const hex = PALETTE[color] ?? color;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error('Unknown color: ' + color);
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];
}
function rectangle(frame, x, y, w, h, color) {
  const c=rgba(color);
  for(let j=Math.max(0,y);j<Math.min(FRAME_H,y+h);j++){
    for(let i=Math.max(0,x);i<Math.min(FRAME_W,x+w);i++){
      const index = (j*WIDTH + frame*FRAME_W+i)*4;
      PIXELS.set(c,index);
    }
  }
}
function dot(f,x,y,c){rectangle(f,x,y,1,1,c);}
function cat(frame) {
  const blink = frame === 2;
  const tailUp = frame % 2 === 1;
  const pawLift = frame === 3;
  // Tail behind body, with small frame-to-frame motion.
  rectangle(frame,22,17+(tailUp?-2:1),5,3,'outline');
  rectangle(frame,25,12+(tailUp?-3:1),3,9,'coat');
  rectangle(frame,26,11+(tailUp?-3:1),2,4,'shadow');
  // Feet outline and main rounded torso.
  rectangle(frame,8,25,17,3,'outline');
  rectangle(frame,7,17,19,10,'outline');
  rectangle(frame,8,17,17,9,'coat');
  rectangle(frame,10,21,13,5,'cream');
  rectangle(frame,10,25,3,2,'paws');
  rectangle(frame,20,25-(pawLift?2:0),3,2,'paws');
  // Head and two diagonal-tipped ears.
  rectangle(frame,8,9,17,12,'outline');
  rectangle(frame,9,8,4,5,'outline');
  rectangle(frame,20,8,4,5,'outline');
  rectangle(frame,10,9,3,4,'ear');
  rectangle(frame,21,9,2,4,'ear');
  rectangle(frame,9,11,15,10,'coat');
  rectangle(frame,11,16,11,4,'cream');
  rectangle(frame,10,12,4,2,'highlight');
  if (blink) {
    rectangle(frame,12,15,3,1,'eyes');
    rectangle(frame,19,15,3,1,'eyes');
  } else {
    rectangle(frame,12,14,2,3,'eyes');
    rectangle(frame,20,14,2,3,'eyes');
    dot(frame,12,14,'highlight');dot(frame,20,14,'highlight');
  }
  rectangle(frame,16,17,2,1,'nose');
  rectangle(frame,15,19,1,1,'shadow');
  rectangle(frame,18,19,1,1,'shadow');
  dot(frame,8,19,'shadow');dot(frame,23,19,'shadow');
}

function crc32(data) {
  let crc=0xFFFFFFFF;
  for(const byte of data) {
    crc ^= byte;
    for(let k=0;k<8;k++) crc=(crc>>>1) ^ ((crc&1)?0xEDB88320:0);
  }
  return (crc^0xFFFFFFFF)>>>0;
}
function chunk(type,payload) {
  const label=Buffer.from(type,'ascii');
  const bytes=Buffer.from(payload);
  const header=Buffer.allocUnsafe(4),end=Buffer.allocUnsafe(4);
  header.writeUInt32BE(bytes.length,0);
  end.writeUInt32BE(crc32(Buffer.concat([label,bytes])),0);
  return Buffer.concat([header,label,bytes,end]);
}
export function createPNG() {
  PIXELS.fill(0);
  for(let f=0;f<FRAME_COUNT;f++)cat(f);
  const header=Buffer.alloc(13);
  header.writeUInt32BE(WIDTH,0);header.writeUInt32BE(HEIGHT,4);
  header[8]=8;header[9]=6;header[10]=0;header[11]=0;header[12]=0;
  const raw=Buffer.alloc((WIDTH*4+1)*HEIGHT);
  for(let y=0;y<HEIGHT;y++){
    const row=y*(WIDTH*4+1);
    raw[row]=0; // PNG no filter
    raw.set(PIXELS.subarray(y*WIDTH*4,(y+1)*WIDTH*4),row+1);
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))
  ]);
}
export function createMetadata() {
  return {
    format:'gpcl-atlas/v1',image:'cat-demo.png',
    size:{w:WIDTH,h:HEIGHT},frameSize:{w:FRAME_W,h:FRAME_H},
    origin:{x:16,y:29},
    frames:Array.from({length:FRAME_COUNT},(_,i)=>({
      name:'idle_'+i,rect:{x:i*FRAME_W,y:0,w:FRAME_W,h:FRAME_H},duration:[260,190,130,220][i]
    })),
    animations:{idle:{frames:Array.from({length:FRAME_COUNT},(_,i)=>'idle_'+i),loop:true}},
    credit:{creator:'GPT Pixel Office',license:'original-project'}
  };
}
export async function buildArt(outputDir=join(dirname(fileURLToPath(import.meta.url)),'..','public','assets','generated')) {
  await mkdir(outputDir,{recursive:true});
  const png=createPNG();
  const metadata=createMetadata();
  await Promise.all([
    writeFile(join(outputDir,'cat-demo.png'),png),
    writeFile(join(outputDir,'cat-demo.json'),JSON.stringify(metadata,null,2)+'\n')
  ]);
  return {file:'cat-demo.png',size:png.length,frames:FRAME_COUNT};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=await buildArt();
  console.log('[G1] generated original cat atlas:',result);
}
