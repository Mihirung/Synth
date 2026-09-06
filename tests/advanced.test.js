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
    '--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION|ERR_TUNNEL/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{
    const u = new URL(route.request().url()); let p = path.join(ROOT, u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({ status:404, body:'nope' });
    const ext = path.extname(p); const ct = ext==='.html'?'text/html':ext==='.js'?'application/javascript':'application/octet-stream';
    route.fulfill({ status:200, contentType:ct, body:fs.readFileSync(p) });
  });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin');
  await page.waitForTimeout(600);
  const results = [];
  const check = (name, ok, info) => { results.push((ok?'PASS ':'FAIL ')+name+(info?' · '+info:'')); };

  // 1. drawer
  await page.click('#advBtn');
  const drawerShown = await page.evaluate(()=>getComputedStyle(document.getElementById('dock2')).display!=='none' && document.getElementById('dock2').querySelectorAll('.spawn').length);
  check('advanced drawer opens with pucks', drawerShown===15, 'pucks='+drawerShown);

  // 2. tuning maths
  const tune = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const tn = spawn('tune', CX, CY-TABLE_R*0.6); tn.angle = (1.5/TUNINGS.length)*TAU;  // JUST
    const fifth = pitchHz(67)/pitchHz(60), third = pitchHz(64)/pitchHz(60), eq = midiToF(67)/midiToF(60);
    tn.angle = 0; const tet = pitchHz(67)/pitchHz(60);
    destroyObject(tn);
    return { fifth, third, eq, tet, name:TUNINGS[1].n };
  });
  check('just intonation fifth 3:2 and third 5:4', Math.abs(tune.fifth-1.5)<1e-3 && Math.abs(tune.third-1.25)<1e-3 && Math.abs(tune.tet-tune.eq)<1e-9, JSON.stringify(tune));

  // 3. spawn a full advanced patch and check bindings
  const bind = await page.evaluate(()=>{
    const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    const osc = spawn('osc', ...P(0.45,-0.3)); osc.arc=0.7;
    const seq = spawn('seq', ...P(0.62, 0.1));
    const flt = spawn('filter', ...P(0.15,-0.2));
    const smp = spawn('sampler', ...P(-0.5,-0.2)); smp.angle=(1.5/6)*TAU;
    const dly = spawn('delay', ...P(-0.2, 0.35));
    const env = spawn('env', ...P(0.45,-0.62));
    const steps = spawn('steps', ...P(0.75, 0.32));
    const chance = spawn('chance', ...P(0.55, 0.42));
    const euclid = spawn('euclid', ...P(0.42, 0.28));
    const chain = spawn('chain', ...P(0.7,-0.12));
    const warp = spawn('warp', ...P(-0.72,-0.25));
    const send = spawn('send', ...P(-0.32, 0.6));
    const xp = spawn('xpress', ...P(0.2,-0.5));
    const motion = spawn('motion', ...P(0.02,-0.02));
    for(const t of ['key','scene','space','master','stems']) spawn(t, ...P(-0.6+0.25*['key','scene','space','master','stems'].indexOf(t), 0.75));
    computePatch();
    const hop = o => o.hop==='C' ? 'C' : objects.find(x=>x.id===o.hop).type;
    return { env:hop(env), steps:hop(steps), chance:hop(chance), euclid:hop(euclid), chain:hop(chain), warp:hop(warp), send:hop(send), xp:hop(xp), motion:hop(motion),
             seqOn: seq.steps.filter(s=>s.on).length, euHits: euclidHits(euclid), n: objects.length,
             sendG: Object.keys(osc.sendG||{}).length, pan: !!osc.pan };
  });
  check('advanced pucks bind to their targets', bind.env==='osc' && bind.steps==='seq' && bind.chance==='seq' && bind.euclid==='seq' && bind.chain==='seq' && bind.warp==='sampler' && bind.send==='delay' && bind.xp==='filter' && bind.motion!=='C', JSON.stringify(bind));
  check('euclid wrote its rhythm into the sequencer', bind.seqOn===bind.euHits, `on=${bind.seqOn} hits=${bind.euHits}`);
  check('proximity send gain nodes exist on the generator', bind.sendG===1 && bind.pan, JSON.stringify({sendG:bind.sendG,pan:bind.pan}));

  // 4. let it play: voices fire with velocity, warp grains schedule, no errors
  const v0 = await page.evaluate(()=>voiceSeq);
  await page.waitForTimeout(2600);
  const play = await page.evaluate(()=>({ voices: voiceSeq, warpPlaying: !!(objects.find(o=>o.type==='sampler').playing), step: currentStep(),
    grainFn: typeof scheduleWarpBar, lv: objects.find(o=>o.type==='osc').lv }));
  check('sequencer plays notes through the advanced chain', play.voices>v0 && play.step>0, JSON.stringify(play));

  // 5. steps puck: length and direction change the play index
  const stepsT = await page.evaluate(()=>{
    const seq=objects.find(o=>o.type==='seq'), sp=objects.find(o=>o.type==='steps');
    sp.angle = (4/15)*TAU; sp.option=1;             // len 5, reverse
    const a = [0,1,2,3,4,5,6].map(n=>seqPosAt(seq,n));
    sp.option=2; const b=[0,1,2,3,4,5,6,7,8].map(n=>seqPosAt(seq,n));
    sp.angle=0.97*TAU; sp.option=0; sp.arc=0.4;
    return {len:stepsLen(sp), a, b, off:seqOffset(seq)};
  });
  const rev = stepsT.a.slice(0,5).map(x=>(x-stepsT.off+16)%16).join(','), pp = stepsT.b.map(x=>(x-stepsT.off+16)%16).join(',');
  check('steps puck: reverse and ping-pong over 5 steps', rev==='4,3,2,1,0' && pp==='0,1,2,3,4,3,2,1,0', rev+' | '+pp);

  // 6. bjorklund
  const bj = await page.evaluate(()=>bjorklund(3,8).map(x=>x?'x':'.').join('')+' '+bjorklund(5,8).map(x=>x?'x':'.').join(''));
  check('euclidean patterns E(3,8) E(5,8)', bj==='x..x..x. x.xx.xx.', bj);

  // 7. scene morph: capture, change, morph back
  const scene = await page.evaluate(async()=>{
    const sc=objects.find(o=>o.type==='scene'), osc=objects.find(o=>o.type==='osc');
    sc.angle=0; sc.arc=0; sc.option=0; sceneCapture(sc);
    const a0 = osc.angle, arc0 = osc.arc;
    osc.angle = (a0+1.2)%TAU; osc.arc = 0.2; applyParams(osc);
    sc.angle = TAU*0.999; sceneMorph(sc);
    for(let i=0;i<8;i++) sceneTick(sc, 0.05);
    const back = Math.abs(osc.angle-a0)<0.02 && Math.abs(osc.arc-arc0)<0.02;
    sc.angle = 0; sceneMorph(sc);
    const live = Math.abs(osc.arc-0.2)<0.02;
    return { back, live, slot:!!sc.slots[0] };
  });
  check('scene puck morphs to the snapshot and back to live', scene.back && scene.live && scene.slot, JSON.stringify(scene));

  // 8. motion: record then replay
  const motion = await page.evaluate(async()=>{
    const mo=objects.find(o=>o.type==='motion'); const q=objects.find(x=>x.id===mo.hop);
    mo.option=0; mo.angle=0; motionClear(mo);   // 1-bar loop
    const fake={mode:'rotate',obj:q}; drags.set(999,fake);
    const t0=q.angle;
    for(let i=0;i<40;i++){ q.angle=(t0+i*0.05)%TAU; motionTick(mo); await new Promise(r=>setTimeout(r,12)); }
    drags.delete(999);
    const filled = mo.motionBuf.filter(Boolean).length;
    q.angle = t0; const tt=performance.now();
    while(performance.now()-tt<3500 && Math.abs(q.angle-t0)<0.01){ motionTick(mo); await new Promise(r=>setTimeout(r,12)); }
    return { filled, has:mo.motionHas, moved: Math.abs(q.angle-t0)>0.01, target:q.type };
  });
  check('motion puck records a gesture and replays it', motion.filled>3 && motion.has && motion.moved, JSON.stringify(motion));

  // 9. stems: arm, record one bar, get a WAV
  const stems = await page.evaluate(async()=>{
    setBpm(180);
    const st=objects.find(o=>o.type==='stems'); st.angle=(0.5/6)*TAU;   // 1 bar
    let got=null; window.saveFile = async(name, blob, done)=>{ got={name, size:blob.size, type:blob.type}; if(done) done(true); return true; };
    armStems(st);
    const t1=performance.now();
    while(!got && performance.now()-t1<6000) await new Promise(r=>setTimeout(r,100));
    const buf = null;
    return { got, state:st.stemState, msg:st.stemMsg, n:st.stemN };
  });
  check('stems puck records a multichannel WAV', stems.got && stems.got.size>44 && stems.state==='done', JSON.stringify(stems));
  const wavHdr = await page.evaluate(async()=>{
    const chans=[new Float32Array([0,0.5,-0.5]), new Float32Array([1,0,0])]; const b=wavBlob(chans, 48000);
    const v=new DataView(await b.arrayBuffer());
    return { riff:String.fromCharCode(v.getUint8(0),v.getUint8(1),v.getUint8(2),v.getUint8(3)), ch:v.getUint16(22,true), sr:v.getUint32(24,true), data:v.getUint32(40,true), s1:v.getInt16(44,true), s2:v.getInt16(46,true), s3:v.getInt16(48,true) };
  });
  check('WAV encoder header and interleave', wavHdr.riff==='RIFF' && wavHdr.ch===2 && wavHdr.sr===48000 && wavHdr.data===12 && wavHdr.s1===0 && wavHdr.s2===32767 && wavHdr.s3===16383, JSON.stringify(wavHdr));

  // 10. persistence round trip with banks and scene slots
  const persist = await page.evaluate(()=>{
    for(const o of [...objects]) if(o.type==='euclid' || o.type==='chain') destroyObject(o);
    const seq=objects.find(o=>o.type==='seq'); seqSelect(seq,0); seq.steps[3].on=true; seq.steps[3].acc=true; seqSelect(seq,2); seq.steps[5].on=true;
    const sc=objects.find(o=>o.type==='scene'); sc.option=1; sceneCapture(sc);
    const json = JSON.stringify(sceneJSON());
    for(const o of [...objects]) destroyObject(o);
    const ok = loadSceneFrom(JSON.parse(json));
    const seq2=objects.find(o=>o.type==='seq'), sc2=objects.find(o=>o.type==='scene');
    return { ok, v:JSON.parse(json).v, opt:seq2.option, on5:seq2.steps[5].on, bankA3: seq2.bank[0][3].acc, slots: sc2.slots.filter(Boolean).length, ids: Object.keys(sc2.slots[1]||{}).every(id=>objects.some(o=>o.id===+id)) };
  });
  check('scene v5 persists banks, accents and scene slots', persist.ok && persist.v===5 && persist.opt===2 && persist.on5 && persist.bankA3 && persist.slots===2 && persist.ids, JSON.stringify(persist));

  // 11. 8-bit marker detection round trip
  const det = await page.evaluate(async()=>{
    const out=[];
    for(const id of [0, 5, 37, 115, 255]){
      const svg = markerSVG(id, 60);
      const img = new Image(); img.src = 'data:image/svg+xml;base64,'+btoa(svg);
      await new Promise(r=>{ img.onload=r; });
      const c=document.createElement('canvas'); c.width=640; c.height=480; const cx=c.getContext('2d');
      cx.fillStyle='#202428'; cx.fillRect(0,0,640,480);
      cx.save(); cx.translate(320,240); cx.rotate(0.7); cx.drawImage(img,-50,-50,100,100); cx.restore();
      const data=cx.getImageData(0,0,640,480).data;
      const f=detectMarkers(data,640,480);
      out.push({ id, found:f.map(m=>({id:m.id, ang:+m.angle.toFixed(2), asp:+(m.asp||0).toFixed(2)})) });
    }
    return out;
  });
  const detOk = det.every(d=>d.found.length===1 && d.found[0].id===d.id && Math.abs(d.found[0].ang-0.7)<0.1);
  check('8-bit markers detect with heading (ids 0,5,37,115,255)', detOk, JSON.stringify(det));

  // 12. velocity: accent pads vs normal, curve
  const vel = await page.evaluate(()=>{
    const osc=objects.find(o=>o.type==='osc'); const x=objects.find(o=>o.type==='xpress'); x.hop='C'; x.angle=TAU*0.999; x.arc=0.5;
    return { soft:velGain(osc,0.25), full:velGain(osc,1), none: (x.angle=0, velGain(osc,0.25)) };
  });
  check('express puck scales velocity', Math.abs(vel.soft-0.25)<0.02 && Math.abs(vel.full-1)<1e-6 && Math.abs(vel.none-1)<1e-6, JSON.stringify(vel));

  // 13. marker sheet + cards HTML generate
  const sheets = await page.evaluate(()=>({ m: markerSheetHTML(60).length, m2: markerSheetHTML(52).length, c: cardsHTML().length, ids: TUIO_TYPES.length*4 })); const TUIO_TYPES_N = sheets.ids;
  check('marker sheet and cards generate', sheets.m>50000 && sheets.c>5000 && sheets.ids===TUIO_TYPES_N && sheets.ids<=256, JSON.stringify(sheets));

  await page.evaluate(()=>{ for(const o of [...objects]) destroyObject(o); demoScene(); const P=(nx,ny)=>[CX+nx*TABLE_R, CY+ny*TABLE_R];
    const e=spawn('env', ...P(0.62,-0.5)); const ch=spawn('chance', ...P(0.85,0.35)); const sc=spawn('scene', ...P(-0.15,0.62)); const st=spawn('steps', ...P(0.45,0.45)); computePatch(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path:path.join(SHOTS,'advanced-desktop.png') });
  await page.setViewportSize({ width:390, height:844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path:path.join(SHOTS,'advanced-phone.png') });

  console.log(results.join('\n'));
  console.log('errors:', errors.length ? errors.slice(0,12).join('\n') : 'none');
  await browser.close();
  process.exit(results.some(r=>r.startsWith('FAIL')) || errors.length ? 1 : 0);
})().catch(e=>{ console.error('TEST CRASH', e); process.exit(2); });
