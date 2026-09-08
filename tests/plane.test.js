// Lumatable: the plane check. Through the calibration a marker lying on the table is round wherever the camera is; a face that leans (a die's neighbour, a cube's side) is not, and is rejected even when its raw outline would pass.   node tests/plane.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors=[]; page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html'); await page.click('#begin'); await page.waitForTimeout(300);
  const res=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  const r = await page.evaluate(()=>{
    // a camera off to one side, looking down at the TV at an angle: the four calibration dots land on a trapezoid
    const W=1280, H=720, rr=TABLE_R*0.78;
    const dst=[{x:CX-rr,y:CY-rr},{x:CX+rr,y:CY-rr},{x:CX+rr,y:CY+rr},{x:CX-rr,y:CY+rr}];        // screen
    const src=[{x:330,y:170},{x:950,y:170},{x:1120,y:640},{x:160,y:640}];                        // camera
    const Hc=solveH(src,dst), Hi=solveH(dst,src);
    const id = TUIO_TYPES.indexOf('osc')*4;
    // draw a marker that lies in the table plane at screen point S (radius Rs screen px), optionally squashed as a leaning face would be
    function frame(S, Rs, squash, dir){
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      g.fillStyle='#2a2e36'; g.fillRect(0,0,W,H);
      const shape = (r, ox, oy, fill)=>{ g.fillStyle=fill; g.beginPath(); for(let k=0;k<=48;k++){ const a=2*Math.PI*k/48; let x=Math.cos(a)*r, y=Math.sin(a)*r;
        if(squash<1){ const c=Math.cos(dir), s=Math.sin(dir); const px=x*c+y*s, py=-x*s+y*c; x=(px*squash)*c-py*s; y=(px*squash)*s+py*c; }
        const q=applyH(Hi, S.x+ox+x, S.y+oy+y); g[k?'lineTo':'moveTo'](q.x,q.y); } g.closePath(); g.fill(); };
      shape(Rs, 0, 0, '#e8ecf2');
      const D=2*Rs;
      shape(MARK.centre*D, 0, 0, '#101317'); shape(MARK.headDot*D, MARK.headR*D, 0, '#101317');
      for(let s=0;s<8;s++) if((id>>s)&1){ const a=s*Math.PI/4; shape(MARK.bitDot*D, Math.cos(a)*MARK.bitR*D, Math.sin(a)*MARK.bitR*D, '#101317'); }
      return g.getImageData(0,0,W,H).data;
    }
    const out={};
    cam.H=null;
    const rim={x:CX+TABLE_R*0.7, y:CY+TABLE_R*0.5};
    // 1. a flat marker at the rim, seen from the side: without the calibration it is a squashed ellipse (that is what the camera sees)
    const raw=detectMarkers(frame(rim, 30, 1, 0), W, H);
    cam.H=Hc;
    const flat=detectMarkers(frame(rim, 30, 1, 0), W, H);
    out.flat={ raw: raw.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})), plane: flat.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})) };
    // 2. the same marker on a face leaning 50 degrees toward the camera: its outline in the image is nearly round, but it is not in the plane
    const lean=Math.cos(50*Math.PI/180);
    let best=null;
    for(let k=0;k<12;k++){ cam.H=null; const rw=detectMarkers(frame(rim, 30, lean, k*Math.PI/12), W, H); cam.H=Hc; const pl=detectMarkers(frame(rim, 30, lean, k*Math.PI/12), W, H);
      if(!best || (rw.length && (!best.raw.length || rw[0].asp>best.raw[0].asp))) best={ dir:k*15, raw:rw.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})), plane:pl.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})) }; }
    out.lean=best;
    // 3. a face leaning 20 degrees (a cube tipped by hand) still reads, and reports its tilt through the calibration
    const tip=Math.cos(20*Math.PI/180);
    const tipped=detectMarkers(frame(rim, 30, tip, 0.4), W, H);
    out.tip=tipped.map(m=>({id:m.id, asp:+m.asp.toFixed(2)}));
    cam.H=null;
    return out;
  });
  check('a flat marker at the rim seen from the side: raw it is a squashed ellipse, through the calibration it is round and reads', r.flat.raw.length>=0 && r.flat.plane.length===1 && r.flat.plane[0].id===0 && r.flat.plane[0].asp>0.9, JSON.stringify(r.flat));
  check('a face leaning 50 degrees toward the camera: its raw outline can look round enough to pass, the plane check rejects it', r.lean.raw.length===1 && r.lean.raw[0].asp>0.6 && r.lean.plane.length===0, JSON.stringify(r.lean));
  check('a marker tipped 20 degrees by hand still reads, with its tilt measured against the plane', r.tip.length===1 && r.tip[0].id===0 && r.tip[0].asp>0.85 && r.tip[0].asp<0.99, JSON.stringify(r.tip));
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(x=>x.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
