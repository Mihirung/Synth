// Lumatable: the waterphone in the browser: bowing, striking, sloshing, hands, marbles.   node tests/waterphone.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive:true });
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION|ERR_TUNNEL/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin'); await page.waitForTimeout(500);
  const results=[]; const check=(n,ok,i)=>results.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  const level = ()=>page.evaluate(()=>{ const o=objects.find(q=>q.type==='water'); o.an.getFloatTimeDomainData(o.wave); let s=0; for(const v of o.wave) s+=v*v; return Math.sqrt(s/o.wave.length); });

  const setup = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const w = spawn('water', CX-0.1*TABLE_R, CY+0.05*TABLE_R); computePatch();
    const t0=performance.now(); while(!w.ana && performance.now()-t0<4000) await new Promise(r=>setTimeout(r,50));
    const sent=[]; const real=w.ana.send; w.ana.send=m=>{ sent.push(m); real(m); }; window.__sent=sent;
    return { ana: !!w.ana, mode: analogState.mode, rods: waterRods(w).length, rodAt: [waterRodAt(w, w.x, w.y-R_ARC1()-16*S), waterRodAt(w, w.x+R_ARC1()+16*S, w.y), waterRodAt(w, w.x, w.y)] };
  });
  check('waterphone builds its worklet voice with ten rods around the bowl', setup.ana && setup.mode==='worklet' && setup.rods===10 && setup.rodAt[0]===0 && setup.rodAt[1]>0 && setup.rodAt[2]===-1, JSON.stringify(setup));

  const quiet = await level();
  const bow = await page.evaluate(async()=>{
    const w=objects.find(q=>q.type==='water'); const r=waterRods(w)[2]; const x=(r.x1+r.x2)/2, y=(r.y1+r.y2)/2;
    const ev=(type,px,py)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:px,clientY:py,pointerId:9,pointerType:'touch',pressure:0.6,bubbles:true}));
    __sent.length=0; ev('pointerdown', x, y); await new Promise(r=>setTimeout(r,700));
    const bowed = Object.keys(w.rodBow).map(Number);
    w.an.getFloatTimeDomainData(w.wave); let s=0; for(const v of w.wave) s+=v*v; const lv=Math.sqrt(s/w.wave.length);
    ev('pointermove', x+2, y); ev('pointerup', x+2, y); await new Promise(r=>setTimeout(r,50));
    const msgs=__sent.map(m=>m.type+(m.on===false?'-off':m.on?'-on':'')).join(',');
    return { bowed, lv, after: Object.keys(w.rodBow).length, msgs };
  });
  check('holding a rod bows it: sound rises, bow stops on release', bow.bowed.length===1 && bow.bowed[0]===2 && bow.lv>quiet+0.01 && bow.after===0 && /bow-on/.test(bow.msgs) && /bow-off/.test(bow.msgs), JSON.stringify({...bow, quiet}));

  const strike = await page.evaluate(async()=>{
    const w=objects.find(q=>q.type==='water'); const r=waterRods(w)[5]; const x=(r.x1+r.x2)/2, y=(r.y1+r.y2)/2;
    const ev=(type,px,py)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:px,clientY:py,pointerId:10,pointerType:'touch',pressure:0.5,bubbles:true}));
    __sent.length=0; const t0=audio.ctx.currentTime; ev('pointerdown', x, y); await new Promise(r=>setTimeout(r,40)); ev('pointerup', x, y);
    await new Promise(r=>setTimeout(r,250));
    w.an.getFloatTimeDomainData(w.wave); let s=0; for(const v of w.wave) s+=v*v; const lv=Math.sqrt(s/w.wave.length);
    const st=__sent.find(m=>m.type==='strike');
    return { struck: !!st && st.rod===5, flash: w.rodFlash[5]>=t0, lv, types: __sent.map(m=>m.type).join(',') };
  });
  check('a tap on a rod strikes it', strike.struck && strike.flash && strike.lv>quiet+0.005, JSON.stringify(strike));

  const slosh = await page.evaluate(async()=>{
    const w=objects.find(q=>q.type==='water'); __sent.length=0;
    const ev=(type,px,py,id)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:px,clientY:py,pointerId:id,pointerType:'touch',pressure:0.5,bubbles:true}));
    ev('pointerdown', w.x, w.y, 11); ev('pointermove', w.x+0.25*TABLE_R, w.y, 11); ev('pointerup', w.x+0.25*TABLE_R, w.y, 11);
    const moveSlosh = __sent.filter(m=>m.type==='slosh').length; const v1 = w.wsV;
    for(let i=0;i<30;i++) waterTick(w, 0.03); const s1 = w.wsS;
    __sent.length=0; cycleOption(w); w.angle=0.9*TAU; applyParams(w);
    const cfg = __sent.filter(m=>m.type==='cfg'); const last = cfg[cfg.length-1];
    return { moveSlosh, v1, s1, face: w.option, cfgFace: last && last.face, cfgWater: last && +last.water.toFixed(2) };
  });
  check('moving the puck sloshes the water (sound and picture); faces and water level configure the model', slosh.moveSlosh>=1 && Math.abs(slosh.v1)>0.5 && Math.abs(slosh.s1)>0.05 && slosh.cfgFace===1 && slosh.cfgWater===0.9, JSON.stringify(slosh));

  const hd = await page.evaluate(async()=>{
    const w=objects.find(q=>q.type==='water'); w.option=0; waterCfg(w);
    hands.mode='mirror'; cam.w=640; cam.h=480; hands.list=[]; hands.last=0;
    const realNow = performance.now.bind(performance); let fake = realNow(); performance.now = ()=>fake;
    const mkHand = (px,py,tip) => { const L=[]; for(let k=0;k<21;k++) L.push({x:px,y:py,z:0});
      L[0]={x:px,y:py+0.1,z:0}; L[9]={x:px,y:py,z:0}; L[5]={x:px-0.04,y:py,z:0}; L[13]={x:px+0.04,y:py,z:0}; L[17]={x:px+0.07,y:py+0.02,z:0};
      L[4]={x:px-0.12,y:py,z:0}; L[8]=tip||{x:px+0.05,y:py-0.12,z:0}; L[12]={x:px+0.02,y:py-0.14,z:0}; L[16]={x:px+0.05,y:py-0.13,z:0}; L[20]={x:px+0.08,y:py-0.1,z:0}; return L; };
    const toN = (x,y)=>({ nx: 0.5-(x-CX)/(TABLE_R*2.3), ny: 0.5+(y-CY)/(TABLE_R*2.3) });
    const feed = (list)=>{ fake+=40; onHands({ multiHandLandmarks:list }); };
    const r = waterRods(w)[0]; const mx=(r.x1+r.x2)/2, my=(r.y1+r.y2)/2;
    __sent.length=0;
    const a=toN(mx-0.25*TABLE_R, my), b=toN(mx+0.25*TABLE_R, my);
    feed([mkHand(a.nx, a.ny+0.12, {x:a.nx,y:a.ny,z:0})]); feed([mkHand(b.nx, b.ny+0.12, {x:b.nx,y:b.ny,z:0})]);
    const struck = __sent.some(m=>m.type==='strike' && m.rod===0);
    __sent.length=0; const c=toN(mx, my);
    for(let i=0;i<4;i++) feed([mkHand(c.nx, c.ny+0.12, {x:c.nx,y:c.ny,z:0})]);
    const bowing = __sent.some(m=>m.type==='bow' && m.on && m.rod===0) && w.rodBow[0]==='h0';
    feed([]); feed([]);
    const released = w.rodBow[0]==null;
    hands.mode='off'; hands.list=[]; performance.now = realNow;
    __sent.length=0; const m = spawn('marbles', CX+0.5*TABLE_R, CY+0.4*TABLE_R); computePatch();
    launchBall(m, w.x-m.x, w.y-m.y, TABLE_R*1.5); for(let i=0;i<300 && !__sent.some(q=>q.type==='strike');i++) ballsTick(0.016);
    const marble = __sent.some(q=>q.type==='strike');
    return { struck, bowing, released, marble };
  });
  check('hands: a fast fingertip strikes a rod, a resting one bows it; a marble strikes the bowl', hd.struck && hd.bowing && hd.released && hd.marble, JSON.stringify(hd));

  const misc = await page.evaluate(async()=>{
    const json=JSON.stringify(sceneJSON()); await setSoundMode('moog'); await new Promise(r=>setTimeout(r,400));
    const w=objects.find(q=>q.type==='water'); const okAna=!!w.ana; await setSoundMode('original'); await new Promise(r=>setTimeout(r,300));
    for(const o of [...objects]) destroyObject(o); const ok=loadSceneFrom(JSON.parse(json));
    return { okAna, ok, n: objects.length, cards: cardsHTML().includes('WATERPHONE'), sheet: markerSheetHTML(60).includes('WATERPHONE') };
  });
  check('waterphone survives a sound-mode switch, persists, and prints', misc.okAna && misc.ok && misc.n===2 && misc.cards && misc.sheet, JSON.stringify(misc));

  await page.evaluate(async()=>{ for(const o of [...objects]) destroyObject(o); const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    const w=spawn('water', ...P(-0.2,0.05)); const rv=spawn('reverb', ...P(0.35,-0.15)); rv.angle=0.8*TAU; rv.arc=0.6; computePatch();
    const t0=performance.now(); while(!w.ana && performance.now()-t0<3000) await new Promise(r=>setTimeout(r,50));
    w.wsV=2.5; w.rodBow[3]='p'; w.rodFlash[7]=audio.ctx.currentTime; });
  await page.waitForTimeout(500);
  await page.screenshot({ path:path.join(SHOTS,'waterphone.png') });

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
