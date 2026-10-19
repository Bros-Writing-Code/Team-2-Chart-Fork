import { instanceOf } from '../../../zing-plot-plus-plus/tests/helpers/dom-stub.js';
import '../../../zing-plot-plus-plus/src/detailedPlots.js';
const el = instanceOf('scatter-plot');
let s = 42; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const med = a => a.sort((x,y)=>x-y)[a.length>>1];
const out = [];
for (const n of [100, 1000, 10000, 50000, 100000]) {
  const points = Array.from({length:n}, () => ({ coordinate: [r()*10, r()*10] }));
  const data = { title:'T','x-axis-label':'X','y-axis-label':'Y', points };
  const ts = []; let svg;
  for (let i=0;i<7;i++){ const t0=performance.now(); svg = el.generateGraph(data,500,500,false,0,0,10,10,10); ts.push(performance.now()-t0); }
  const circles = (svg.match(/<circle/g)||[]).length;
  // canvas-side hover: brute-force nearest-point vs uniform grid, 1000 queries
  const xs = new Float64Array(n), ys = new Float64Array(n);
  points.forEach((p,i)=>{ xs[i]=100+p.coordinate[0]/10*375; ys[i]=440-p.coordinate[1]/10*400; });
  const R2=16; let q=7; const qr=()=>(q=(q*16807)%2147483647)/2147483647;
  let t0=performance.now();
  for(let k=0;k<1000;k++){const mx=qr()*500,my=qr()*500;let b=-1,bd=R2;for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my,d=dx*dx+dy*dy;if(d<=bd){bd=d;b=i;}}}
  const brute=performance.now()-t0;
  const C=16,cols=32; t0=performance.now(); const g=new Map();
  for(let i=0;i<n;i++){const k=((ys[i]/C)|0)*cols+((xs[i]/C)|0);(g.get(k)||g.set(k,[]).get(k)).push(i);}
  const build=performance.now()-t0; q=7; t0=performance.now();
  for(let k=0;k<1000;k++){const mx=qr()*500,my=qr()*500,cx=(mx/C)|0,cy=(my/C)|0;let b=-1,bd=R2;
    for(let gy=cy-1;gy<=cy+1;gy++)for(let gx=cx-1;gx<=cx+1;gx++){const c=g.get(gy*cols+gx);if(!c)continue;for(const i of c){const dx=xs[i]-mx,dy=ys[i]-my,d=dx*dx+dy*dy;if(d<=bd){bd=d;b=i;}}}}
  const grid=performance.now()-t0;
  out.push({ n, svgBuildMs:+med(ts).toFixed(2), svgKB: Math.round(svg.length/1024), circles, hoverBrute1000Ms:+brute.toFixed(2), gridBuildMs:+build.toFixed(2), hoverGrid1000Ms:+grid.toFixed(2) });
}
console.table(out);
console.log(JSON.stringify(out));
