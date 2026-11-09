import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reproducible pixel-art Windows icon generator.
 * Includes a 256x256 image because Windows EXE resource tooling requires it.
 */
const palette = {
  outline:[19,35,50,255], wall:[45,70,80,255],
  roof:[153,224,192,255], roofHi:[204,245,205,255],
  window:[252,217,147,255], shadow:[34,56,67,255],
  frame:[111,166,161,255], door:[23,48,57,255],
  character:[222,153,174,255]
};
const grid=Array.from({length:16},()=>Array.from({length:16},()=>[0,0,0,0]));
function rect(x,y,w,h,color) {
  for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)
    if(row>=0&&row<16&&col>=0&&col<16)grid[row][col]=color;
}
rect(2,3,12,12,palette.outline);rect(3,4,10,10,palette.wall);
rect(1,3,14,3,palette.roof);rect(2,3,12,1,palette.roofHi);
rect(4,7,3,3,palette.shadow);rect(9,7,3,3,palette.shadow);
rect(4,7,2,2,palette.window);rect(9,7,2,2,palette.window);
rect(3,11,10,1,palette.frame);
rect(6,12,4,3,palette.door);rect(7,12,2,2,palette.character);
rect(13,1,2,2,palette.window);rect(12,2,1,1,palette.window);
rect(3,14,3,1,palette.shadow);rect(10,14,3,1,palette.shadow);
rect(6,2,4,1,palette.roofHi);

function imageDib(size) {
  const scale=size/16;
  const maskStride=Math.ceil(size/32)*4;
  const pixels=size*size*4;
  const image=Buffer.alloc(40+pixels+maskStride*size);
  image.writeUInt32LE(40,0);
  image.writeInt32LE(size,4);
  image.writeInt32LE(size*2,8); // XOR + AND bitmap
  image.writeUInt16LE(1,12);
  image.writeUInt16LE(32,14);
  image.writeUInt32LE(pixels+maskStride*size,20);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const [r,g,b,a]=grid[Math.floor(y/scale)][Math.floor(x/scale)];
    const bottomRow=size-1-y;
    const idx=40+(bottomRow*size+x)*4;
    image[idx]=b;image[idx+1]=g;image[idx+2]=r;image[idx+3]=a;
    if(a===0)image[40+pixels+bottomRow*maskStride+(x>>3)]|=128>>(x%8);
  }
  return image;
}

export function createPixelOfficeIco() {
  const sizes=[16,32,64,128,256];
  const images=sizes.map(imageDib);
  const headerSize=6+sizes.length*16;
  const buffer=Buffer.alloc(headerSize+images.reduce((n,img)=>n+img.length,0));
  buffer.writeUInt16LE(1,2); // .ico
  buffer.writeUInt16LE(sizes.length,4);
  let offset=headerSize;
  for(let i=0;i<sizes.length;i++) {
    const p=6+i*16;
    buffer[p]=sizes[i]===256?0:sizes[i];
    buffer[p+1]=sizes[i]===256?0:sizes[i];
    buffer.writeUInt16LE(1,p+4);
    buffer.writeUInt16LE(32,p+6);
    buffer.writeUInt32LE(images[i].length,p+8);
    buffer.writeUInt32LE(offset,p+12);
    images[i].copy(buffer,offset);
    offset+=images[i].length;
  }
  return buffer;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const target=join(dirname(fileURLToPath(import.meta.url)),'..','build','icon.ico');
  await mkdir(dirname(target),{recursive:true});
  const image=createPixelOfficeIco();
  await writeFile(target,image);
  console.log('Generated Windows pixel-art ICO:', target, image.length+' bytes');
}
