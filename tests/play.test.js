// Lumatable: the play tray (theremin, air drums, harp, marbles, hum, conductor, air knob)
// by touch and by synthetic hand landmarks.   node tests/play.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive:true });
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION|ERR_TUNNEL|mediapipe|hands\.js/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin'); await page.waitForTimeout(500);
  const results=[]; const check=(n,ok,i)=>results.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));

  // drawer
  await page.click('#playBtn');
  const dr = await page.evaluate(()=>({ play: getComputedStyle($('dock3')).display!=='none', n: $('dock3').querySelectorAll('.spawn').length, adv: getComputedStyle($('dock2')).display }));
  check('play drawer opens with seven instruments', dr.play && dr.n===7 && dr.adv==='none', JSON.stringify(dr));

  // drum kit and touch pads
  const drums = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const d = spawn('drums', CX-0.3*TABLE_R, CY+0.1*TABLE_R); computePatch();
    const kit = Object.fromEntries(Object.entries(audio.drums).map(([k,b])=>{ const x=b.getChannelData(0); let p=0; for(let i=0;i<x.length;i++) p=Math.max(p,Math.abs(x[i])); return [k,+p.toFixed(2)]; }));
    const pads = [[-0.15,0.15],[0.15,0.15],[-0.15,-0.15],[0.15,-0.15]].map(([dx,dy])=>drumPadAt(d, d.x+dx*TABLE_R, d.y+dy*TABLE_R));
    const ev=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:5,pointerType:'touch',pressure:0.5,bubbles:true}));
    const t0 = audio.ctx.currentTime;
    ev('pointerdown', d.x+0.15*TABLE_R, d.y+0.15*TABLE_R);            // snare
    ev('pointermove', d.x-0.15*TABLE_R, d.y+0.15*TABLE_R);            // roll onto the kick
    ev('pointerup', d.x-0.15*TABLE_R, d.y+0.15*TABLE_R);
    const hit = d.padFlash.map(t=>t>=t0);
    d.option=3; const toms = [0,1,2,3].map(i=>drumSample(d,i)).join(',');
    d.option=1; drumHit(d, 0, 0.9); const gridT = d.padFlash[0], sd=stepDur(); const onGrid = Math.abs(((gridT-transport.anchor)/sd) - Math.round((gridT-transport.anchor)/sd)) < 1e-3;
    return { kit, pads, hit, toms, onGrid };
  });
  check('drum kit synthesised, pads map to quadrants, touch hits and rolls', Object.values(drums.kit).every(v=>v>0.2) && drums.pads.join()==='0,1,2,3' && drums.hit[0] && drums.hit[1] && !drums.hit[2] && drums.toms==='TOM1,TOM2,TOM3,TOM4' && drums.onGrid, JSON.stringify(drums));

  // harp: strings, a stroke across them, Karplus-Strong decays
  const harp = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const h = spawn('harp', CX+0.45*TABLE_R, CY); computePatch();
    const s = harpStrings(h);
    const ev=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:6,pointerType:'touch',pressure:0.5,bubbles:true}));
    const mid = s[Math.floor(s.length/2)];
    const p0 = { x:(mid.x1+mid.x2)/2, y:(mid.y1+mid.y2)/2 };
    ev('pointerdown', p0.x, p0.y-TABLE_R*0.25); ev('pointermove', p0.x, p0.y+TABLE_R*0.25); ev('pointerup', p0.x, p0.y+TABLE_R*0.25);
    const plucked = Object.keys(h.strFlash).length;
    const b = ksBuffer(220, 0), x=b.getChannelData(0); const e=(a,z)=>{ let s=0; for(let i=a;i<z;i++) s+=x[i]*x[i]; return s/(z-a); };
    const head=e(0,4800), tail=e(x.length-4800, x.length);
    const midiUp = s.every((q,i)=>i===0 || q.midi>s[i-1].midi);
    return { n:s.length, plucked, head, tail, midiUp, root: noteName(harpRoot(h)), mute: !h.muted };
  });
  check('harp strings pluck under a stroke; Karplus-Strong rings and decays', harp.n>=9 && harp.plucked>=2 && harp.head>0.01 && harp.tail<harp.head*0.05 && harp.midiUp, JSON.stringify(harp));

  // theremin by touch
  const th = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const t = spawn('theremin', CX-0.2*TABLE_R, CY-0.3*TABLE_R); computePatch();
    const ev=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:7,pointerType:'touch',pressure:0.5,bubbles:true}));
    ev('pointerdown', t.x+0.3*TABLE_R, t.y); await new Promise(r=>setTimeout(r,60));
    const a = { active:t.thActive, midi:t.thMidi, f:t.src.frequency.value };
    ev('pointermove', t.x+0.12*TABLE_R, t.y); await new Promise(r=>setTimeout(r,120));
    const b = { midi:t.thMidi, f:t.src.frequency.value };
    ev('pointerup', t.x+0.12*TABLE_R, t.y); await new Promise(r=>setTimeout(r,60));
    t.option=1; ev('pointerdown', t.x+0.3*TABLE_R, t.y); const q = t.thMidi; ev('pointerup', t.x+0.3*TABLE_R, t.y);
    return { a, b, off: !t.thActive, inKey: Number.isInteger(q) && quantMidi(q)===q };
  });
  check('theremin: nearer the puck is higher; lifts off; in-key face quantises', th.a.active && th.b.midi>th.a.midi && th.b.f>th.a.f && th.off && th.inKey, JSON.stringify(th));

  // marbles: flick, rim plucks, hitting an oscillator plays it
  const mb = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const m = spawn('marbles', CX-0.5*TABLE_R, CY+0.3*TABLE_R); const osc = spawn('osc', CX+0.3*TABLE_R, CY-0.2*TABLE_R); computePatch();
    const ev=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:8,pointerType:'touch',pressure:0.5,bubbles:true}));
    const ang = Math.atan2(osc.y-m.y, osc.x-m.x), rr=(R_PAD0()+R_PAD1())/2;
    ev('pointerdown', m.x+Math.cos(ang)*rr*0.9, m.y+Math.sin(ang)*rr*0.9); await new Promise(r=>setTimeout(r,40));
    ev('pointermove', m.x+Math.cos(ang)*rr*1.1, m.y+Math.sin(ang)*rr*1.1); ev('pointerup', m.x+Math.cos(ang)*rr*1.1, m.y+Math.sin(ang)*rr*1.1);
    const launched = balls.length;
    const v0 = voiceSeq, f0 = m.flashAt;
    for(let i=0;i<400 && balls.length;i++) ballsTick(0.016);
    return { launched, oscPlayed: voiceSeq>v0, rimPlucked: m.flashAt>f0, left: balls.length };
  });
  check('marbles launch, bounce off the rim (tone circle) and play the oscillator they hit', mb.launched===1 && mb.oscPlayed && mb.rimPlucked, JSON.stringify(mb));

  // hum: pitch tracking and the synth follows
  const hum = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const h = spawn('hum', CX, CY+0.4*TABLE_R); computePatch();
    const sr = audio.ctx.sampleRate, buf = new Float32Array(2048);
    const fill = f => { for(let i=0;i<2048;i++) buf[i] = 0.3*Math.sin(TAU*f*i/sr) + 0.1*Math.sin(TAU*2*f*i/sr); };
    fill(220); const a = autoCorrelate(buf, sr); fill(330); const b = autoCorrelate(buf, sr);
    for(let i=0;i<2048;i++) buf[i] = (Math.random()-0.5)*0.002; const c = autoCorrelate(buf, sr);
    h.humAn = { getFloatTimeDomainData(x){ x.set(buf); } }; h.humBuf = new Float32Array(2048); h.humState='live';
    fill(261.63); h.option=1; humTick(h); await new Promise(r=>setTimeout(r,80));
    const note = h.humNote, g = h.humG.gain.value, f = h.src.frequency.value;
    h.option=2; humFaces(h); humTick(h); await new Promise(r=>setTimeout(r,60)); const g2 = h.humG2.gain.value, f3 = h.src3.frequency.value;
    return { a:+a.f.toFixed(1), b:+b.f.toFixed(1), quiet:c.f, note, g, f:+f.toFixed(1), g2, f3:+f3.toFixed(1) };
  });
  check('hum: autocorrelation finds 220 and 330 Hz, rejects silence; the synth follows in key and harmonises', Math.abs(hum.a-220)<2 && Math.abs(hum.b-330)<3 && hum.quiet<0 && hum.note===60 && hum.g>0.05 && Math.abs(hum.f-261.6)<2 && hum.g2>0.3 && hum.f3>hum.f, JSON.stringify(hum));

  // synthetic hands: mirror mode
  const hd = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const d = spawn('drums', CX-0.35*TABLE_R, CY+0.2*TABLE_R); const t = spawn('theremin', CX+0.4*TABLE_R, CY-0.35*TABLE_R);
    const c = spawn('conduct', CX+0.55*TABLE_R, CY+0.45*TABLE_R); const flt = spawn('filter', CX, CY-0.55*TABLE_R); flt.angle=0.1*TAU;
    const air = spawn('air', CX+0.18*TABLE_R, CY-0.62*TABLE_R); const harp = spawn('harp', CX-0.1*TABLE_R, CY+0.55*TABLE_R);
    computePatch();
    hands.mode='mirror'; cam.w=640; cam.h=480; hands.list=[]; hands.last=0;
    // a fake clock: software GL makes real frames slow, and the strike detector and conductor read performance.now
    const realNow = performance.now.bind(performance); let fake = realNow(); performance.now = ()=>fake;
    const sleep = ms => { fake += ms; return Promise.resolve(); };
    const mkHand = (px,py,tip) => { const L=[]; for(let k=0;k<21;k++) L.push({x:px,y:py,z:0});
      L[0]={x:px,y:py+0.1,z:0}; L[9]={x:px,y:py,z:0}; L[5]={x:px-0.04,y:py,z:0}; L[13]={x:px+0.04,y:py,z:0}; L[17]={x:px+0.07,y:py+0.02,z:0};
      L[4]={x:px-0.12,y:py,z:0}; L[8]=tip||{x:px+0.05,y:py-0.12,z:0}; L[12]={x:px+0.02,y:py-0.14,z:0}; L[16]={x:px+0.05,y:py-0.13,z:0}; L[20]={x:px+0.08,y:py-0.1,z:0}; return L; };
    const toN = (x,y)=>({ nx: 0.5-(x-CX)/(TABLE_R*2.3), ny: 0.5+(y-CY)/(TABLE_R*2.3) });
    const feed = async(list)=>{ onHands({ multiHandLandmarks:list }); await sleep(30); };
    // 1. strike over the snare pad (SE quadrant of the drums)
    const p = toN(d.x+0.16*TABLE_R, d.y+0.14*TABLE_R);
    const f0 = d.padFlash.slice();
    for(let i=0;i<3;i++) await feed([mkHand(p.nx, p.ny-0.22+i*0.06)]);
    await feed([mkHand(p.nx, p.ny)]); await feed([mkHand(p.nx, p.ny)]); await feed([mkHand(p.nx, p.ny)]);
    const snare = d.padFlash[1]>f0[1], others = d.padFlash.filter((v,i)=>i!==1 && v>f0[i]).length;
    // 2. theremin: a hand at the right of the frame (mirrored: screen right) is pitch; hands gone = silence
    const q = toN(CX+0.6*TABLE_R, CY);
    await feed([mkHand(q.nx, q.ny)]); await feed([mkHand(q.nx, q.ny)]);
    const thOn = t.thActive, thMidi = t.thMidi;
    const q2 = toN(CX-0.6*TABLE_R, CY); await feed([mkHand(q2.nx, q2.ny)]); await feed([mkHand(q2.nx, q2.ny)]);
    const thMidi2 = t.thMidi;
    await feed([]); await feed([]);
    const thOff = !t.thActive;
    // 3. air knob by the filter: a high hand turns it
    const a0 = flt.angle; const r = toN(air.x, air.y);
    for(let i=0;i<8;i++) await feed([mkHand(r.nx, 0.15)]);
    const turned = flt.angle > a0 + 0.3*TAU;
    // 4. harp: the fingertip sweeps across the fan
    const s = harpStrings(harp), mid = s[Math.floor(s.length/2)]; const pm={x:(mid.x1+mid.x2)/2, y:(mid.y1+mid.y2)/2};
    const n1 = toN(pm.x-0.2*TABLE_R, pm.y), n2 = toN(pm.x+0.2*TABLE_R, pm.y);
    const k0 = Object.keys(harp.strFlash).length;
    await feed([mkHand(n1.nx, n1.ny+0.1, {x:n1.nx,y:n1.ny,z:0})]); await feed([mkHand(n2.nx, n2.ny+0.1, {x:n2.nx,y:n2.ny,z:0})]);
    const swept = Object.keys(harp.strFlash).length - k0;
    // 5. the conductor: four strikes about 500 ms apart
    const bpm0 = state.bpm; const cz = toN(CX+0.2*TABLE_R, CY+0.1*TABLE_R); const times=[];
    for(let beat=0; beat<5; beat++){
      for(let i=0;i<3;i++) await feed([mkHand(cz.nx, cz.ny-0.2+i*0.07)]);
      await feed([mkHand(cz.nx, cz.ny+0.01)]); await feed([mkHand(cz.nx, cz.ny+0.01)]); times.push(performance.now());
      await sleep(250);
      for(let i=0;i<3;i++) await feed([mkHand(cz.nx, cz.ny-0.07*i)]);
      await sleep(60);
    }
    const iv=[]; for(let i=1;i<times.length;i++) iv.push(times[i]-times[i-1]);
    const expect = 60000/(iv.reduce((a,b)=>a+b,0)/iv.length);
    hands.mode='off'; hands.list=[]; performance.now = realNow;
    return { snare, others, thOn, thMidi, thMidi2, thOff, turned, a0, angle:flt.angle, swept, bpm0, bpm:state.bpm, felt:c.bpmT, expect, beats:(c.beats||[]).length };
  });
  check('hands: a strike hits the snare, the theremin follows a hand, the air knob turns the filter, a sweep plucks the harp, the conductor sets the tempo',
    hd.snare && hd.others===0 && hd.thOn && hd.thMidi2 < hd.thMidi && hd.thOff && hd.turned && hd.swept>=2 && hd.beats>=4 && Math.abs(hd.felt-hd.expect)<hd.expect*0.25 && Math.abs(hd.bpm-hd.felt)<20, JSON.stringify(hd));

  // persistence, undo, sound-mode switch with play objects
  const misc = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    for(const t of ['theremin','drums','harp','marbles','hum','conduct','air']) spawn(t, CX+(Math.random()-0.5)*TABLE_R, CY+(Math.random()-0.5)*TABLE_R);
    computePatch(); const json = JSON.stringify(sceneJSON()); pushUndo();
    await setSoundMode('ms20'); await new Promise(r=>setTimeout(r,300)); await setSoundMode('original'); await new Promise(r=>setTimeout(r,200));
    for(const o of [...objects]) destroyObject(o);
    const ok = loadSceneFrom(JSON.parse(json));
    const types = objects.map(o=>o.type).sort().join(',');
    const sheet = markerSheetHTML(60).includes('The play tray'), cards = cardsHTML().includes('AIR DRUMS');
    return { ok, types, n: objects.length, sheet, cards, ids: TUIO_TYPES.length*4 };
  });
  check('play objects persist, survive a sound-mode switch, and print on the sheets', misc.ok && misc.n===7 && misc.sheet && misc.cards && misc.ids<=256, JSON.stringify(misc));

  await page.evaluate(()=>{ for(const o of [...objects]) destroyObject(o); const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    const d=spawn('drums', ...P(-0.45,0.25)); d.padFlash[1]=audio.ctx.currentTime; spawn('harp', ...P(0.55,-0.1)); const t=spawn('theremin', ...P(-0.15,-0.45)); thereminTouch(t, t.x+0.2*TABLE_R, t.y+0.1*TABLE_R);
    const m=spawn('marbles', ...P(0.25,0.55)); spawn('osc', ...P(0.1,-0.1)); computePatch(); launchBall(m,-1,-0.6,TABLE_R*1.2); launchBall(m,-0.5,-1,TABLE_R*0.9); for(let i=0;i<20;i++) ballsTick(0.016); });
  await page.waitForTimeout(400);
  await page.screenshot({ path:path.join(SHOTS,'play-desktop.png') });

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
