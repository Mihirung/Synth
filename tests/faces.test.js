// Lumatable: the detector still reads a marker when the object's glyph sits in the corners of the face (the experimental d12 set) and the face is painted as the kit says: light disc, dark ring, light glyphs 3.5 mm out.   node tests/faces.test.js
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
  // a synthetic camera frame: a painted d12 face seen from above at `pxmm` pixels per millimetre
  const r = await page.evaluate(async()=>{
    const ids = [marker_id('osc'), marker_id('filter'), marker_id('seq'), 255].map(x=>x|0);
    function marker_id(t){ return TUIO_TYPES.indexOf(t)*4; }
    const out = {};
    for(const pxmm of [1.4, 1.0, 0.8]){
      out[pxmm] = [];
      for(const id of ids){
        const W=1280, H=720, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
        g.fillStyle='#3a3f48'; g.fillRect(0,0,W,H);                              // the TV, dim
        const cx=640, cy=360, D=54*pxmm, R=D/2;
        // the face: a light pentagon (the neighbouring faces are light too) with a dark ring round the disc
        const ap=30.9*pxmm; g.fillStyle='#d9dde3'; g.beginPath(); for(let k=0;k<5;k++){ const a=-Math.PI/2+k*2*Math.PI/5, rr=ap/Math.cos(Math.PI/5); g[k?'lineTo':'moveTo'](cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); } g.closePath(); g.fill();
        g.fillStyle='#1a1d22'; g.beginPath(); for(let k=0;k<5;k++){ const a=-Math.PI/2+k*2*Math.PI/5, rr=ap/Math.cos(Math.PI/5)-0.6*pxmm; g[k?'lineTo':'moveTo'](cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); } g.closePath(); g.fill();
        // the marker
        const im=new Image(); im.src='data:image/svg+xml;base64,'+btoa(markerSVG(id, 100)); await new Promise(r=>{ im.onload=r; });
        g.drawImage(im, cx-R, cy-R, D, D);
        // the glyph in every corner: light strokes, 1 mm wide, in a 9 mm box whose near edge is 3.5 mm outside the disc
        g.strokeStyle='#d9dde3'; g.lineWidth=1.0*pxmm; g.lineCap='round';
        for(let k=0;k<5;k++){ const a=-Math.PI/2+k*2*Math.PI/5, rc=R+3.5*pxmm+4.5*pxmm, gx=cx+Math.cos(a)*rc, gy=cy+Math.sin(a)*rc, s=9*pxmm;
          g.beginPath(); for(let i=0;i<=8;i++){ const x=gx-s/2+s*i/8, y=gy+0.32*s*Math.sin(2*Math.PI*i/8); g[i?'lineTo':'moveTo'](x,y); } g.stroke();
          g.beginPath(); g.arc(gx, gy, s*0.42, 0, 2*Math.PI); g.stroke(); }
        const data=g.getImageData(0,0,W,H).data;
        const found=detectMarkers(data,W,H);
        out[pxmm].push({ id, found: found.map(f=>f.id), ok: found.length===1 && found[0].id===id, r: found[0] ? +(found[0].r/(R)).toFixed(2) : null });
      }
    }
    return out;
  });
  const okAt = s => r[s].every(x=>x.ok);
  check('1.4 px/mm (a phone above a 55-inch TV): every id reads, one marker, the glyphs never merge with the disc', okAt(1.4), JSON.stringify(r[1.4]));
  check('1.0 px/mm: every id still reads', okAt(1.0), JSON.stringify(r[1.0]));
  res.push('INFO 0.8 px/mm (the floor): '+JSON.stringify(r[0.8]));
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(x=>x.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
