import fs from 'node:fs'; import {PNG} from 'pngjs';
const [,,name,y0,h,out]=process.argv;
const a=PNG.sync.read(fs.readFileSync(`../compare/side/${name}.png`));
const Y=+y0,H=Math.min(+h,a.height-Y);
const o=new PNG({width:a.width,height:H});
PNG.bitblt(a,o,0,Y,a.width,H,0,0);
fs.writeFileSync(out,PNG.sync.write(o));
