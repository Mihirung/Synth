// Lumatable: the advanced-drawer test suite. Runs the instrument headless in Chromium
// (Playwright) served from the repo, and checks the pucks end to end.
//   node tests/advanced.test.js
// Needs Playwright with a Chromium (PLAYWRIGHT_CHROMIUM may point at the binary).
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive:true });
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:[
    '--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin'); await page.waitForTimeout(500);
  const results=[]; const check=(n,ok,i)=>results.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));

  // A. analogue engine with envelope, velocity, tuning and bend
  const ana = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    await setSoundMode('moog'); await new Promise(r=>setTimeout(r,300));
    const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    const osc=spawn('osc',...P(0.4,-0.2)); osc.arc=0.8; const seq=spawn('seq',...P(0.6,0.15)); const env=spawn('env',...P(0.4,-0.55)); env.option=2;
    const flt=spawn('filter',...P(0.1,-0.1)); const fenv=spawn('env',...P(0.1,-0.5)); const tn=spawn('tune',...P(-0.5,0.5)); tn.angle=(2.5/TUNINGS.length)*TAU;
    const xp=spawn('xpress',...P(-0.5,-0.5)); xp.option=3;
    computePatch();
    const mode=analogState.mode, hasAna=!!osc.ana, bendP=!!(osc.ana&&osc.ana.param('bend'));
    setPressure(osc, 0.8, 'lift');
    await new Promise(r=>setTimeout(r,2200));
    let peak=0; osc.an.getFloatTimeDomainData(osc.wave); for(const v of osc.wave) peak=Math.max(peak,Math.abs(v));
    let fpeak=0; flt.an.getFloatTimeDomainData(flt.wave); for(const v of flt.wave) fpeak=Math.max(fpeak,Math.abs(v));
    return { mode, hasAna, bendP, peak, fpeak, envHop: env.hop===osc.id, fenvHop: fenv.hop===flt.id, tuning: tuneSys(tn).n, voices: voiceSeq };
  });
  check('analogue engine plays through envelope/tuning/express', ana.hasAna && ana.bendP && ana.peak>0.01 && ana.envHop && ana.fenvHop && ana.voices>0, JSON.stringify(ana));
  await page.evaluate(async()=>{ await setSoundMode('original'); });

  // B. piano hold with pressure → vibrato depth, release on pointerup
  const piano = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const osc=spawn('osc', CX+0.3*TABLE_R, CY-0.2*TABLE_R); osc.piano=true; osc.arc=0.7;
    const xp=spawn('xpress', CX-0.4*TABLE_R, CY+0.4*TABLE_R); xp.option=0; computePatch();
    const r=pianoRect(osc); const kx=r.x+r.w/26, ky=r.y+r.h/2;   // first key (C)
    const ev=(type,pressure)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:kx,clientY:ky,pointerId:77,pointerType:'pen',pressure,bubbles:true}));
    ev('pointerdown',0.9);
    await new Promise(r=>setTimeout(r,120));
    const held=[...drags.values()].some(d=>d.mode==='key');
    const vib=osc.vibG.gain.value, press=osc.press&&osc.press.pointer;
    ev('pointerup',0);
    await new Promise(r=>setTimeout(r,80));
    return { held, vib, press, after: [...drags.values()].length, vibAfter: osc.vibG.gain.value, voices: osc.activeVoices ? osc.activeVoices.size : 0 };
  });
  check('piano key held with pen pressure drives vibrato and releases', piano.held && piano.press>0.7 && piano.vib>10 && piano.after===0 && piano.vibAfter<piano.vib, JSON.stringify(piano));

  // C. camera: synthetic frames → spawn, lift → pressure, lost → replace restores state
  const camT = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const cv=document.createElement('canvas'); cv.width=1280; cv.height=800; const cx=cv.getContext('2d');
    cam.on=true; cam.w=1280; cam.h=800; cam.cv=cv; cam.ctx=cx; cam.H=[1,0,0,0,1,0,0,0,1]; cam.preview=false; cam.calibDone=performance.now(); cam.lastRefine=performance.now();
    cam.video={ readyState:2 };
    const svg=(id)=>{ const im=new Image(); im.src='data:image/svg+xml;base64,'+btoa(markerSVG(id,60)); return new Promise(r=>{ im.onload=()=>r(im); }); };
    const oscImg=await svg(0), stemImg=await svg(TUIO_TYPES.indexOf('stems')*4);
    let draw=[];   // [{img,x,y,size}]
    cx.drawImage=function(v,...rest){ if(v===cam.video){ this.fillStyle='#181c22'; this.fillRect(0,0,1280,800); for(const d of draw) CanvasRenderingContext2D.prototype.drawImage.call(this,d.img,d.x-d.size/2,d.y-d.size/2,d.size,d.size); } else CanvasRenderingContext2D.prototype.drawImage.call(this,v,...rest); };
    const X=CX+0.3*TABLE_R, Y=CY-0.2*TABLE_R;
    draw=[{img:oscImg,x:X,y:Y,size:100}];
    for(let i=0;i<4;i++){ camFrame(); await new Promise(r=>setTimeout(r,20)); }
    const osc=objects.find(o=>o.type==='osc'); const spawned=!!osc && Math.hypot(osc.x-X,osc.y-Y)<12;
    osc.angle=1.234; osc.option=2;
    // lift: the marker grows 12 %
    draw=[{img:oscImg,x:X,y:Y,size:114}];
    for(let i=0;i<6;i++){ camFrame(); await new Promise(r=>setTimeout(r,20)); }
    const lift=osc.lift||0, press=osc.press&&osc.press.lift;
    draw=[{img:oscImg,x:X,y:Y,size:100}];
    for(let i=0;i<6;i++){ camFrame(); await new Promise(r=>setTimeout(r,20)); }
    const liftBack=osc.lift||0;
    // lost for 1.6 s → gone, then replaced → restored, and a stems marker arrives
    draw=[];
    const t0=performance.now(); while(performance.now()-t0<1700){ camFrame(); await new Promise(r=>setTimeout(r,60)); }
    const gone=!objects.includes(osc), lostKept=cam.lost.size===1;
    draw=[{img:oscImg,x:X,y:Y,size:100},{img:stemImg,x:CX-0.4*TABLE_R,y:CY+0.3*TABLE_R,size:100}];
    for(let i=0;i<4;i++){ camFrame(); await new Promise(r=>setTimeout(r,20)); }
    const osc2=objects.find(o=>o.type==='osc'), st=objects.find(o=>o.type==='stems');
    const restored=!!osc2 && Math.abs(osc2.angle-1.234)<0.02 && osc2.option===2;
    cam.on=false; cam.video=null; draw=[];
    return { spawned, lift, press, liftBack, gone, lostKept, restored, stems: st ? st.stemState : null, n: objects.length };
  });
  check('camera: marker spawns, lift is pressure, lift-and-replace restores, stems arm', camT.spawned && camT.lift>0.5 && camT.press>0.5 && camT.liftBack<0.2 && camT.gone && camT.lostKept && camT.restored && camT.stems==='armed', JSON.stringify(camT));

  // D. sound-mode switch with the advanced objects present, undo, clear: no errors
  const sw = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    demoScene(); const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    for(const [t,x,y] of [['env',0.6,-0.5],['chance',0.85,0.35],['scene',-0.15,0.62],['space',-0.7,0.6],['master',0.7,0.6],['send',0.0,0.35]]) spawn(t,...P(x,y));
    computePatch(); pushUndo();
    await setSoundMode('sem'); await new Promise(r=>setTimeout(r,400));
    await setSoundMode('original'); await new Promise(r=>setTimeout(r,200));
    doUndo(); const n1=objects.length;
    for(const o of [...objects]) destroyObject(o);
    return { n1, master: audio.master.gain.value.toFixed(2) };
  });
  check('sound-mode switch, undo and clear with pucks present', sw.n1>=10 && Math.abs(+sw.master-0.55)<0.05, JSON.stringify(sw));

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
