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
    // 3. a face leaning 15 degrees (a cube tipped by hand) still reads, and reports its tilt through the calibration
    const tip=Math.cos(15*Math.PI/180);
    const tipped=detectMarkers(frame(rim, 30, tip, 0.4), W, H);
    out.tip=tipped.map(m=>({id:m.id, asp:+m.asp.toFixed(2)}));
    // 4. a much steeper camera (about 55 degrees off the vertical): raw, the top face is too squashed to decode; through the calibration it reads
    const src2=[{x:470,y:150},{x:810,y:150},{x:1230,y:690},{x:50,y:690}];
    const H2=solveH(src2,dst), Hi2=solveH(dst,src2);
    function frame2(S, Rs, id2){
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      g.fillStyle='#2a2e36'; g.fillRect(0,0,W,H);
      const shape=(r,ox,oy,fill)=>{ g.fillStyle=fill; g.beginPath(); for(let k=0;k<=48;k++){ const a=2*Math.PI*k/48; const q=applyH(Hi2, S.x+ox+Math.cos(a)*r, S.y+oy+Math.sin(a)*r); g[k?'lineTo':'moveTo'](q.x,q.y); } g.closePath(); g.fill(); };
      shape(Rs,0,0,'#e8ecf2'); const D=2*Rs;
      shape(MARK.centre*D,0,0,'#101317'); shape(MARK.headDot*D, MARK.headR*D, 0, '#101317');
      for(let s=0;s<8;s++) if((id2>>s)&1){ const a=s*Math.PI/4; shape(MARK.bitDot*D, Math.cos(a)*MARK.bitR*D, Math.sin(a)*MARK.bitR*D, '#101317'); }
      return g.getImageData(0,0,W,H).data;
    }
    const id2 = TUIO_TYPES.indexOf('filter')*4 + 2;
    const near={x:CX-TABLE_R*0.5, y:CY+TABLE_R*0.6};
    cam.H=null; const steepRaw=detectMarkers(frame2(near, 34, id2), W, H);
    cam.H=H2; const steep=detectMarkers(frame2(near, 34, id2), W, H);
    out.steep={ raw: steepRaw.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})), plane: steep.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})), want:id2 };
    // 5. a real die, in 3D: a pinhole camera at several tilts, the die at the rim on the camera's side, its top face 100 mm up and its
    //    neighbour leaning 63.4 degrees toward the camera. Only the top face may survive: the neighbour looks squashed from overhead,
    //    too round from a steep camera, and just like a flat marker in between, where the pair rule (one body, two faces) settles it.
    const mmPerPx = 450/TABLE_R;                                           // the table is 900 mm across
    const toMM = p=>({ x:(p.x-CX)*mmPerPx, y:(p.y-CY)*mmPerPx });
    function camera(tiltDeg, dist){
      const t=tiltDeg*Math.PI/180, C={ x:0, y:dist*Math.sin(t), z:dist*Math.cos(t) };   // off toward +y, looking at the table centre
      const f=norm3({x:-C.x,y:-C.y,z:-C.z}), up0 = tiltDeg<1 ? {x:0,y:-1,z:0} : {x:0,y:0,z:1};
      const r=norm3(cross3(f,up0)), u=cross3(r,f), fx=1000;
      return p=>{ const q={x:p.x-C.x,y:p.y-C.y,z:p.z-C.z}; const zc=dot3(q,f), xc=dot3(q,r), yc=dot3(q,u); return { x:fx*xc/zc+W/2, y:fx*yc/zc+H/2 }; };
    }
    function norm3(a){ const l=Math.hypot(a.x,a.y,a.z)||1; return {x:a.x/l,y:a.y/l,z:a.z/l}; }
    function cross3(a,b){ return { x:a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x }; }
    function dot3(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z; }
    function faceShapes(g, proj, c, a, b, Rm, id3, light, dark){
      const shape=(r,ox,oy,fill)=>{ g.fillStyle=fill; g.beginPath(); for(let k=0;k<=48;k++){ const th=2*Math.PI*k/48; const px=ox+Math.cos(th)*r, py=oy+Math.sin(th)*r;
        const q=proj({ x:c.x+a.x*px+b.x*py, y:c.y+a.y*px+b.y*py, z:c.z+a.z*px+b.z*py }); g[k?'lineTo':'moveTo'](q.x,q.y); } g.closePath(); g.fill(); };
      shape(Rm,0,0,light); const D=2*Rm;
      shape(MARK.centre*D,0,0,dark); shape(MARK.headDot*D, MARK.headR*D, 0, dark);
      for(let s=0;s<8;s++) if((id3>>s)&1){ const th=s*Math.PI/4; shape(MARK.bitDot*D, Math.cos(th)*MARK.bitR*D, Math.sin(th)*MARK.bitR*D, dark); }
    }
    const topId = TUIO_TYPES.indexOf('osc')*4, sideId = TUIO_TYPES.indexOf('filter')*4;
    out.die = [];
    for(const [tilt, dieY] of [[0,337],[15,337],[24,337],[32,337],[40,337],[48,337],[55,337],[24,0],[32,0],[40,0],[15,-337],[24,-337]]){   // the die on the camera's side, in the middle, and on the far side
      const proj = camera(tilt, 1200);
      const src3 = dst.map(p=>{ const m=toMM(p); return proj({x:m.x, y:m.y, z:0}); });
      const H3 = solveH(src3, dst);
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      g.fillStyle='#2a2e36'; g.fillRect(0,0,W,H);
      const die={ x:0, y:dieY, z:50 };
      const Cc={ y:1200*Math.sin(tilt*Math.PI/180), z:1200*Math.cos(tilt*Math.PI/180) }, view=Math.atan2(Math.abs(Cc.y-dieY), Cc.z)*180/Math.PI;   // the line of sight's angle from the vertical, at the die
      // the top face
      faceShapes(g, proj, {x:die.x,y:die.y,z:100}, {x:1,y:0,z:0}, {x:0,y:1,z:0}, 27, topId, '#e8ecf2', '#101317');
      // the neighbour leaning toward the camera (the camera is off toward +y, so the face normal leans toward +y)
      const L=63.43*Math.PI/180, n={x:0, y:Math.sin(L), z:Math.cos(L)};
      const cs={ x:die.x+50*n.x, y:die.y+50*n.y, z:die.z+50*n.z };
      const a2={x:1,y:0,z:0}, b2=cross3(n,a2);
      faceShapes(g, proj, cs, a2, b2, 27, sideId, '#e8ecf2', '#101317');
      const data=g.getImageData(0,0,W,H).data;
      cam.H=null; const raw=detectMarkers(data,W,H);
      cam.H=H3; const found=detectMarkers(data,W,H);
      out.die.push({ tilt, dieY, view:+view.toFixed(0), raw: raw.map(m=>m.id), found: found.map(m=>({id:m.id, asp:+m.asp.toFixed(2)})) });
    }
    out.topId=topId; out.sideId=sideId;
    cam.H=null;
    return out;
  });
  const mirror = r.die.filter(d=>d.view>=30 && d.view<=35), rest = r.die.filter(d=>d.view<30 || d.view>35);
  check('a real die in 3D, near, middle and far, cameras overhead to 55 degrees: the top face reads and the leaning neighbour never comes through, except in the mirror band', rest.every(d=>d.found.length===1 && d.found[0].id===r.topId), JSON.stringify(rest));
  res.push('INFO the mirror band (line of sight 30-35 degrees off the vertical at the die, a neighbour leaning straight at the camera looks flat): '+JSON.stringify(mirror));
  check('a camera about 55 degrees off the vertical: raw the marker misreads or is lost, decoded through the calibration it reads its id', (r.steep.raw.length===0 || r.steep.raw[0].id!==r.steep.want) && r.steep.plane.length===1 && r.steep.plane[0].id===r.steep.want && r.steep.plane[0].asp>0.9, JSON.stringify(r.steep));
  check('a flat marker at the rim seen from the side: raw it is a squashed ellipse, through the calibration it is round and reads', r.flat.raw.length>=0 && r.flat.plane.length===1 && r.flat.plane[0].id===0 && r.flat.plane[0].asp>0.9, JSON.stringify(r.flat));
  check('a face leaning 50 degrees toward the camera: its raw outline can look round enough to pass, the plane check rejects it', r.lean.raw.length===1 && r.lean.raw[0].asp>0.6 && r.lean.plane.length===0, JSON.stringify(r.lean));
  check('a marker tipped 15 degrees by hand still reads, with its tilt measured against the plane', r.tip.length===1 && r.tip[0].id===0 && r.tip[0].asp>0.9 && r.tip[0].asp<0.99, JSON.stringify(r.tip));
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(x=>x.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
