// Lumatable: the bodies kit. Every function on 32 bodies: a face is a mode, the turn the control, the slider the level. Ids for up to eight faces, every type through every face, the new faces doing what they say, a flipped body keeping its state, old scenes migrating, the sheets by body.   node tests/kit.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
const SHOTS=path.join(__dirname,'shots'); fs.mkdirSync(SHOTS,{recursive:true});
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors=[]; page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html'); await page.click('#begin'); await page.waitForTimeout(400);
  const res=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));

  // 1. the kit table and its ids
  const k = await page.evaluate(()=>{
    const bodies = kitBodies(), seen = new Map(), bad = [];
    for(const b of bodies) for(const [t,v] of b.faces){ const id = markerId(t,v); const mt = markerType(id);
      if(id<0 || id>255 || !mt || mt.type!==t || mt.variant!==v) bad.push(t+v+':'+id); if(seen.has(id)) bad.push('dup '+id); seen.set(id, 1);
      if(v >= nOptions(t)) bad.push('no such face '+t+v); }
    const shapes = {}; for(const b of bodies) shapes[b.shape] = (shapes[b.shape]||0)+1;
    const every = TUIO_TYPES.filter(t=>!Object.keys(BODY_OF).includes(t));
    return { n: bodies.length, faces: seen.size, max: Math.max(...seen.keys()), extra: EXTRA_FACES.length, shapes, bad, unplaced: every, base: TUIO_TYPES.length*4, none: markerType(250) };
  });
  check('32 bodies (28 cubes, 3 truncated octahedra, 1 two-sided puck) carry every type; 191 faces, ids unique, round-trip, within 8 bits; ids past the kit decode to nothing', k.n===32 && k.shapes.cube===28 && k.shapes.to===3 && k.shapes.puck===1 && k.faces===191 && k.max<=255 && k.bad.length===0 && k.unplaced.length===0 && k.none===null, JSON.stringify(k));

  // 2. every type through every face by tapping (rec and stems arm on a double tap, so their faces are set directly), then everything sounds at once
  const all = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);   // the demo patch goes
    const bad = []; let i = 0;
    for(const t of TUIO_TYPES){
      const o = spawn(t, CX + Math.cos(i)*TABLE_R*0.55, CY + Math.sin(i)*TABLE_R*0.55); i += 0.9;
      const n = nOptions(t), names = new Set();
      for(let f=0; f<n; f++){
        if(t==='rec' || t==='stems' || (f===0 && o.option!==0)) setOption(o, f); else if(f) cycleOption(o);   // loops and the delay spawn on their second face
        if(o.option!==f) bad.push(t+' face '+f+' got '+o.option);
        const [a,b] = readout(o); if(typeof a!=='string' || typeof b!=='string') bad.push('readout '+t+f); names.add(a);
        o.angle = ((f+0.5)/n)*TAU; o.arc = 0.2 + 0.7*f/n; applyParams(o);
      }
      if(names.size!==n && !['stems','marbles'].includes(t)) bad.push(t+' names '+names.size+'/'+n);
      if(t!=='rec' && t!=='stems'){ cycleOption(o); if(o.option!==0) bad.push(t+' does not wrap: '+o.option); }
    }
    await new Promise(r=>setTimeout(r, 1200));
    let lv = 0; for(const o of objects) lv = Math.max(lv, o.lv||0);
    return { n: objects.length, types: TUIO_TYPES.length, bad, lv };
  });
  check('every type steps through all its faces by tapping and wraps; the readout names each face; the whole kit on the table sounds', all.n===all.types && all.bad.length===0 && all.lv>0.02, JSON.stringify(all));
  await page.screenshot({ path:path.join(SHOTS,'kit-all.png') });

  // 3. the oscillator's six waves: PULSE is a periodic wave, NOISE a looped buffer through a band-pass that follows the ring
  const osc = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const o = spawn('osc', CX, CY-TABLE_R*0.4); const types = [];
    for(let f=0; f<6; f++){ setOption(o, f); types.push(o.src ? (o.src.type || (o.src.buffer ? 'buffer' : '?')) : 'none'); }
    setOption(o, 5); o.angle = 0.8*TAU; applyParams(o);
    const an = audio.ctx.createAnalyser(); an.fftSize = 2048; o.out.connect(an); const w = new Float32Array(2048); let lv = 0;
    for(let k=0; k<10 && lv<0.01; k++){ await new Promise(r=>setTimeout(r, 150)); an.getFloatTimeDomainData(w); let s=0; for(const v of w) s+=v*v; lv = Math.max(lv, Math.sqrt(s/w.length)); }
    const bp = o.preF && o.preF.type, fHi = o.preF && o.preF.frequency.value, want = oscFreq(o);
    setOption(o, 0); const back = o.src && o.src.type;
    return { types, bp, fHi: Math.round(fHi), want: Math.round(want), lv, back };
  });
  check('OSC: sine, saw, square, triangle, a custom periodic wave (PULSE), a noise buffer (NOISE) whose band-pass sits on the ring\'s note and sounds; back to sine rebuilds a tone', osc.types.join()==='sine,sawtooth,square,triangle,custom,buffer' && osc.bp==='bandpass' && Math.abs(osc.fHi-osc.want)<2 && osc.lv>0.01 && osc.back==='sine', JSON.stringify(osc));

  // 4. the filter's six shapes, the delay's six times, the reverb's six rooms, the dirt's curves, the mod's faces
  const fx = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const f = spawn('filter', CX+TABLE_R*0.3, CY); const kinds = [];
    for(let k=0;k<6;k++){ setOption(f, k); kinds.push(f.biq ? f.biq.type : f.fmt ? 'formant×'+f.fmt.length : '?'); }
    const vowelParams = ctlParamOf(f).params.length; setOption(f, 0);
    const wait = ms => new Promise(r=>setTimeout(r, ms));
    const d = spawn('delay', CX-TABLE_R*0.3, CY); const times = [];
    for(let k=0;k<6;k++){ setOption(d, k); await wait(350); times.push(+d.dl.delayTime.value.toFixed(3)); }
    const bar = +(4*60/state.bpm).toFixed(3); d.angle = 0.5*TAU; d.arc = 1; applyParams(d); await wait(300);
    const r = spawn('reverb', CX, CY+TABLE_R*0.3); r.angle = 0.5*TAU; const lens = [];
    for(let k=0;k<6;k++){ setOption(r, k); lens.push(+r.conv.buffer.duration.toFixed(2)); }
    const g = r.conv.buffer.getChannelData(0), n = g.length; setOption(r, 5); const gg = r.conv.buffer.getChannelData(0), m = gg.length;
    const rmsAt = (a, from, to) => { let s=0, c=0; for(let i=Math.floor(from*a.length); i<Math.floor(to*a.length); i++){ s+=a[i]*a[i]; c++; } return Math.sqrt(s/Math.max(1,c)); };
    const gated = rmsAt(gg, 0.6, 0.7) > rmsAt(gg, 0.9, 1.0)*20;
    const di = spawn('dist', CX+TABLE_R*0.5, CY+TABLE_R*0.4); di.angle = 0.3*TAU; const curves = [];
    for(let k=0;k<4;k++){ setOption(di, k); const c = di.shaper.curve; curves.push([+c[768].toFixed(2), +c[1023].toFixed(2), +c[896].toFixed(2)]); }
    const cr = spawn('crush', CX-TABLE_R*0.5, CY+TABLE_R*0.4); setOption(cr, 1); await wait(350); const lofi = Math.round(cr.lp.frequency.value); setOption(cr, 0); await wait(350); const clean = Math.round(cr.lp.frequency.value);
    const mo = spawn('mod', CX-TABLE_R*0.5, CY-TABLE_R*0.4); mo.angle = 0.5*TAU; setOption(mo, 0); const ringHz = Math.round(modFreq(mo)); setOption(mo, 1); await wait(350); const tremHz = +modFreq(mo).toFixed(2), tremDc = mo.dc ? +mo.dc.offset.value.toFixed(2) : null;
    const ch = spawn('chorus', CX+TABLE_R*0.5, CY-TABLE_R*0.4); const faces = [];
    for(let k=0;k<4;k++){ setOption(ch, k); await wait(350); faces.push({ fb:+ch.fbG.gain.value.toFixed(2), ap:+ch.apG.gain.value.toFixed(2), dl:+ch.dlG.gain.value.toFixed(2) }); }
    return { kinds, vowelParams, times, bar, lens, gated, curves, lofi, clean, ringHz, tremHz, tremDc, faces, fb: delayFb(d), wet: +d.wet.gain.value.toFixed(2) };
  });
  const fuzzClips = fx.curves[2][0] >= 0.99 && fx.curves[2][1] >= 0.99, foldTurns = fx.curves[3][2] < fx.curves[3][0] || fx.curves[3][1] < fx.curves[3][2];
  check('FILTER: low, high, band, notch, peak and a three-formant vowel (an LFO drives all three); DELAY: the six faces are 1/16 … 1 bar of the tempo, the ring is feedback, the slider mix', fx.kinds.join()==='lowpass,highpass,bandpass,notch,peaking,formant×3' && fx.vowelParams===3 && Math.abs(fx.times[5]-fx.bar)<0.01 && fx.times[0]<fx.times[1] && fx.times[1]<fx.times[2] && fx.times[2]<fx.times[3] && fx.times[3]<fx.times[4] && Math.abs(fx.fb-0.425)<0.01 && fx.wet===0.9, JSON.stringify({kinds:fx.kinds, vowelParams:fx.vowelParams, times:fx.times, bar:fx.bar, fb:fx.fb, wet:fx.wet}));
  check('REVERB: room shorter than hall, cathedral twice a hall, gated shuts; DIRT: fuzz clips flat, fold turns back; CRUSH: lo-fi darkens to 2.6 kHz; MOD: ring 200 Hz, tremolo a few Hz with a lifted carrier; the chorus faces set flanger feedback, phaser all-passes, vibrato all-wet', fx.lens[0]<fx.lens[1] && fx.lens[4]>fx.lens[1]*1.8 && fx.gated && fuzzClips && foldTurns && Math.abs(fx.lofi-2600)<60 && fx.clean>19000 && fx.ringHz===200 && fx.tremHz<20 && fx.tremDc===0.5 && fx.faces[1].fb===0.55 && fx.faces[2].ap===1 && fx.faces[2].dl===0 && fx.faces[3].dl===1 && fx.faces[0].fb===0, JSON.stringify({lens:fx.lens, gated:fx.gated, curves:fx.curves, lofi:fx.lofi, ringHz:fx.ringHz, tremHz:fx.tremHz, tremDc:fx.tremDc, faces:fx.faces}));

  // 5. loops, the record cube, the clock
  const gen = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const s = spawn('sampler', CX-TABLE_R*0.4, CY); const loops = []; for(let k=0;k<6;k++){ setOption(s, k); loops.push(LOOPS[samplerLoop(s)]); }
    s.angle = (4/16)*TAU + 0.01; applyParams(s); const shift = loopShift(s), ro = readout(s)[1];
    const r = spawn('rec', CX+TABLE_R*0.4, CY); const bars = []; for(let k=0;k<5;k++){ setOption(r, k); bars.push(recBars(r)); }
    setOption(r, 1); cycleOption(r); await new Promise(x=>setTimeout(x, 450)); const flipped = r.option, notArmed = r.recState;   // one tap: the next face, after the double-tap window
    cycleOption(r); cycleOption(r); const armed = r.recState;                                                                       // two taps: armed
    const c = spawn('tempo', CX, CY-TABLE_R*0.5); setOption(c, 0); c.angle = 0.5*TAU; applyParams(c); const bpm = state.bpm;
    setOption(c, 1); c.angle = 0.5*TAU; applyParams(c); const swing = swingAmt(), chip = document.getElementById('swingv').textContent;
    setOption(c, 2); c.arc = 1; c.angle = 0.25*TAU; applyParams(c); const clickHzV = Math.round(clickHz(c));
    let clicks = 0; const orig = clickTick; clickTick = (o,t,a)=>{ clicks++; orig(o,t,a); };
    await new Promise(x=>setTimeout(x, 1900)); clickTick = orig;
    document.getElementById('swingChip').click(); const swingOff = state.swingV;
    return { loops, shift, ro, bars, flipped, notArmed, armed, bpm, swing, chip, clickHzV, clicks, swingOff };
  });
  check('LOOPS: six loops on six faces, the ring shifts the bar\'s start (step 5); RECORD: five lengths on five faces, one tap flips, a double tap arms', gen.loops.join()==='KICK,BEAT,HATS,BASS,CHORD,ARP' && gen.shift===4 && /from step 5/.test(gen.ro) && gen.bars.join()==='1,2,4,8,16' && gen.flipped===2 && gen.notArmed==='idle' && gen.armed==='armed', JSON.stringify({loops:gen.loops, shift:gen.shift, ro:gen.ro, bars:gen.bars, flipped:gen.flipped, notArmed:gen.notArmed, armed:gen.armed}));
  check('CLOCK: TEMPO sets 120 BPM from the ring; SWING sets a continuous 18 % that the chip shows; CLICK ticks every beat at the ring\'s pitch; the chip takes the swing back', gen.bpm===120 && Math.abs(gen.swing-0.18)<0.01 && gen.chip==='18%' && gen.clickHzV===707 && gen.clicks>=3 && gen.swingOff===null, JSON.stringify({bpm:gen.bpm, swing:gen.swing, chip:gen.chip, clickHz:gen.clickHzV, clicks:gen.clicks, swingOff:gen.swingOff}));

  // 6. key and tuning on their truncated octahedra; envelope and express
  const tonal = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const k = spawn('key', CX, CY); const scales = []; for(let f=0; f<8; f++){ setOption(k, f); applyParams(k); scales.push(SCALES[state.scaleIdx].name); }
    setOption(k, 1); k.angle = (7.5/12)*TAU; applyParams(k); const key = NOTE_NAMES[state.key]; k.arc = 1; applyParams(k); const octUp = keyOct(); k.arc = 0; applyParams(k); const octDn = keyOct();
    k.arc = 1/3; applyParams(k); destroyObject(k); state.key = 0; state.scaleIdx = 0;
    const t = spawn('tune', CX, CY); setOption(t, 1); t.arc = 1; const fifth = pitchHz(67)/pitchHz(60); t.arc = 0; const equal = pitchHz(67)/pitchHz(60); t.arc = 1; t.angle = 0.5*TAU; const ref = tuneRef(t);
    const names = []; for(let f=0; f<8; f++){ setOption(t, f); names.push(tuneSys(t).n); }
    let rebuilt = 0; const orig = tonalSoon; tonalSoon = ()=>{ rebuilt++; orig(); }; setOption(t, 0); applyParams(t); tonalSoon = orig; destroyObject(t);
    const e = spawn('env', CX, CY); const shapes = []; for(let f=0; f<6; f++){ setOption(e, f); shapes.push(ENV_SHAPES[e.option%6].n); }
    setOption(e, 4); const perc = envAttack(e); setOption(e, 0); const pluck = envAttack(e); destroyObject(e);
    const o = spawn('osc', CX, CY-TABLE_R*0.3), x = spawn('xpress', CX, CY-TABLE_R*0.3-CTL_LINK()*0.6); computePatch();
    const wait = ms => new Promise(r=>setTimeout(r, ms));
    setOption(x, 4); setPressure(o, 1, 'test'); await wait(350); const pan = +o.panG.gain.value.toFixed(2); setPressure(o, 0, 'test');
    setOption(x, 5); setPressure(o, 1, 'test'); await wait(350); const growlHz = Math.round(o.vib.frequency.value), growlDepth = Math.round(o.vibG.gain.value); setPressure(o, 0, 'test');
    return { scales, key, octUp, octDn, fifth, equal, ref, names, rebuilt, shapes, perc, pluck, pan, growlHz, growlDepth, bound: x.hop===o.id };
  });
  check('KEY: eight scales on eight faces, the ring is the key (G), the slider the octave (+2 … −1); TUNING: JUST all the way gives a 3:2 fifth, the slider at 0 gives equal temperament, the ring is A = 440, eight systems on the faces, and the loops rebuild', tonal.scales.join()==='penta,major,minor,dorian,mixo,harmo,blues,chroma' && tonal.key==='G' && tonal.octUp===24 && tonal.octDn===-12 && Math.abs(tonal.fifth-1.5)<1e-3 && Math.abs(tonal.equal-Math.pow(2,7/12))<1e-6 && Math.abs(tonal.ref-440)<0.01 && tonal.names.join()==='12-TET,JUST,PYTHAG,MEANTONE,WERCK III,31-EDO,SLENDRO,PELOG' && tonal.rebuilt>=1, JSON.stringify({scales:tonal.scales, key:tonal.key, oct:[tonal.octUp,tonal.octDn], fifth:tonal.fifth, equal:tonal.equal, ref:tonal.ref, names:tonal.names, rebuilt:tonal.rebuilt}));
  check('ENVELOPE: six shapes, PERC the shortest attack; EXPRESS: PAN swings the pan by pressure, GROWL wobbles the pitch at 31 Hz', tonal.shapes.join()==='PLUCK,KEYS,PAD,SWELL,PERC,GATE' && tonal.perc<tonal.pluck && tonal.bound && tonal.pan>0.5 && tonal.growlHz===31 && tonal.growlDepth>=60, JSON.stringify({shapes:tonal.shapes, perc:tonal.perc, pluck:tonal.pluck, bound:tonal.bound, pan:tonal.pan, growlHz:tonal.growlHz, growlDepth:tonal.growlDepth}));

  // 7. the sequencer's helpers: walk, euclid, chance, chain; scenes with six slots
  const seqs = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const q = spawn('seq', CX, CY+TABLE_R*0.3), w = spawn('steps', CX+CTL_LINK()*0.6, CY+TABLE_R*0.3); computePatch();
    w.angle = (4/15)*TAU; const len = stepsLen(w);
    const walk = {}; for(const [f, name] of [[4,'drunk'],[5,'skip']]){ setOption(w, f); walk[name] = Array.from({length:8}, (_,n)=>seqPosAt(q, n)); }
    destroyObject(w);
    const e = spawn('euclid', CX+CTL_LINK()*0.6, CY+TABLE_R*0.3); computePatch(); e.angle = (7/15)*TAU; applyEuclid(e);
    const degs = f => { setOption(e, f); return q.steps.filter(s=>s.on).map(s=>s.deg); };
    const falling = degs(4), updown = degs(5); destroyObject(e);
    const c = spawn('chain', CX+CTL_LINK()*0.6, CY+TABLE_R*0.3); computePatch(); c.arc = 1; c.angle = 0;   // every bar, six patterns
    const walkChain = f => { setOption(c, f); c.pos = 0; const seen = []; for(let b=1;b<=12;b++){ c.lastBar = -1; chainTick(c, b); seen.push(q.option); } return seen; };
    const once = walkChain(4), shuffle = walkChain(5); destroyObject(c);
    const ch = spawn('chance', CX+CTL_LINK()*0.6, CY+TABLE_R*0.3); computePatch(); ch.angle = 0.95*TAU;   // 10 %
    const count = async f => { setOption(ch, f); let n = 0; const orig = noteOn; noteOn = (...a)=>{ n++; orig(...a); }; await new Promise(r=>setTimeout(r, 16*stepDur()*1000*2.2)); noteOn = orig; return n; };
    const o = spawn('osc', CX, CY+TABLE_R*0.3-CTL_LINK()*0.6); computePatch(); for(const s of q.steps) s.on = true;
    const ghosts = await count(4), drops = await count(5), dice = await count(0);
    destroyObject(ch);
    const sc = spawn('scene', CX-TABLE_R*0.4, CY); const marks = []; for(let f=0; f<6; f++){ setOption(sc, f); marks.push(readout(sc)[0]); }
    return { len, walk, falling, updown, once, shuffle, ghosts, drops, dice, slots: sc.slots.length, filled: sc.slots.filter(Boolean).length, marks };
  });
  const within = a => a.every(p=>p>=0 && p<seqs.len), skipOk = seqs.walk.skip.slice(0,3).join()==='0,2,4', fallOk = seqs.falling.length>=3 && seqs.falling[0]>seqs.falling[1] && seqs.falling[1]>=seqs.falling[2], udOk = seqs.updown.length>=4 && seqs.updown[0]<seqs.updown[1];
  const onceOk = seqs.once.slice(0,6).join()==='1,2,3,4,5,5' && seqs.once[11]===5, shuffleOk = seqs.shuffle.every((v,i)=>i===0 || v!==seqs.shuffle[i-1]);
  check('WALK: DRUNK stays within the pattern, SKIP goes 0 2 4; EUCLID: FALLING descends, UP AND DOWN rises first; CHAIN: ONCE walks to F and stays, SHUFFLE never repeats a pattern', within(seqs.walk.drunk) && skipOk && fallOk && udOk && onceOk && shuffleOk, JSON.stringify({len:seqs.len, walk:seqs.walk, falling:seqs.falling, updown:seqs.updown, once:seqs.once, shuffle:seqs.shuffle}));
  check('CHANCE at 10 %: GHOST fires more notes than DICE, DROP fires none or all of a bar; SCENE: six faces A–F, six slots, each face captured on first sight', seqs.ghosts>seqs.dice && seqs.drops<=seqs.ghosts && seqs.slots===6 && seqs.filled===6 && seqs.marks.join()==='SCENE · A,SCENE · B,SCENE · C,SCENE · D,SCENE · E,SCENE · F', JSON.stringify({ghosts:seqs.ghosts, drops:seqs.drops, dice:seqs.dice, slots:seqs.slots, filled:seqs.filled, marks:seqs.marks}));

  // 8. warp's stutter and freeze on a loop, send, space, master, song forms
  const misc = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const s = spawn('sampler', CX, CY-TABLE_R*0.4), w = spawn('warp', CX+CTL_LINK()*0.6, CY-TABLE_R*0.4); computePatch();
    const grains = f => { setOption(w, f); const offs = []; const orig = audio.ctx.createBufferSource.bind(audio.ctx);
      audio.ctx.createBufferSource = ()=>{ const src = orig(); const st = src.start.bind(src); src.start = (t, off, d)=>{ offs.push(off); return st(t, off, d); }; return src; };
      scheduleWarpBar(s, w, entryFor(s), audio.ctx.currentTime+0.05, 0); audio.ctx.createBufferSource = orig; if(s.playing) s.playing.stop(audio.ctx.currentTime+0.06); return offs; };
    w.angle = 0.25*TAU; const frozen = grains(5), stut = grains(4), pitched = grains(0);
    const spread = a => Math.max(...a) - Math.min(...a);
    destroyObject(w); destroyObject(s);
    const sd = spawn('send', CX, CY); sd.arc = 0.7; sd.angle = 0.5*TAU; const level = sendLevel(sd), reach = sendReach(sd)/TABLE_R; destroyObject(sd);
    const o1 = spawn('osc', CX+TABLE_R*0.5, CY); const sp = spawn('space', CX, CY+TABLE_R*0.5); sp.angle = TAU*0.999; const pans = [];
    for(const f of [0,3,5]){ setOption(sp, f); updateSpace(); await new Promise(r=>setTimeout(r, 250)); pans.push(+o1.pan.pan.value.toFixed(2)); }
    destroyObject(sp);
    const m = spawn('master', CX, CY-TABLE_R*0.5); m.arc = 1; m.angle = 0.5*TAU; const faces = [];
    for(let f=0; f<6; f++){ setOption(m, f); await new Promise(r=>setTimeout(r, 200)); faces.push({ vol:+audio.master.gain.value.toFixed(2), warm:+audio.warmWet.gain.value.toFixed(2), ratio:Math.round(audio.comp.ratio.value) }); }
    destroyObject(m);
    const sg = spawn('song', CX-TABLE_R*0.4, CY+TABLE_R*0.4); const forms = []; for(let f=0; f<6; f++){ setOption(sg, f); forms.push(songForm().n+':'+songBars()); } destroyObject(sg);
    return { frozen: spread(frozen), stut: spread(stut), pitched: spread(pitched), nGrains: frozen.length, level, reach, pans, faces, forms };
  });
  const bufDur = 2;
  check('WARP on a loop: FREEZE reads one point (grains within a hair of each other), STUTTER one sixteenth over and over (a narrow spread), PITCH the whole loop; SEND: the slider is the level, the ring the reach', misc.nGrains>10 && misc.frozen<0.02 && misc.stut<bufDur*0.1 && misc.pitched>bufDur*0.8 && Math.abs(misc.level-0.7)<1e-9 && Math.abs(misc.reach-0.45)<1e-6, JSON.stringify({frozen:misc.frozen, stut:misc.stut, pitched:misc.pitched, n:misc.nGrains, level:misc.level, reach:misc.reach}));
  check('SPACE: POSITION pans a right-hand sound right, MIRROR left, MONO to the centre; MASTER: the slider is the volume, WARM drives the warm stage, LOUD limits; SONG: 88, 40, 48, 64, 72 and 64 bars', misc.pans[0]>0.3 && misc.pans[1]<-0.3 && Math.abs(misc.pans[2])<0.05 && misc.faces[0].vol>0.9 && misc.faces[4].warm>0.7 && misc.faces[0].warm<0.05 && misc.faces[5].ratio===20 && misc.faces[3].ratio===20 && misc.forms.join()==='POP SONG:88,LITTLE SONG:40,BLUES:48,AABA:64,BUILD:72,FREE:64', JSON.stringify({pans:misc.pans, faces:misc.faces, forms:misc.forms}));

  // 9. the play bodies' new faces, and the voice cube's TUNED face
  const play = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const d = spawn('drums', CX, CY); const kits = [4,5].map(f=>{ setOption(d, f); return [0,1,2,3].map(p=>drumSample(d,p)).join('/'); }); destroyObject(d);
    const h = spawn('harp', CX, CY); const durs = [3,4,5].map(f=>+ksBuffer(220, f).duration.toFixed(1)); destroyObject(h);
    const w = spawn('water', CX, CY); const sent = []; w.ana = { send(m){ sent.push(m); }, node:{ connect(){}, disconnect(){} } }; setOption(w, 4); setOption(w, 5); destroyObject(w);
    const mic = spawn('mic', CX, CY); setOption(mic, 1); const wanted = micFxWanted(mic), names = micFxNames(mic).join(',');
    const msgs = []; mic.voice = { node:{ connect(){}, disconnect(){} }, send(m){ msgs.push(m); } };
    const sr = audio.ctx.sampleRate; mic.humBuf = new Float32Array(2048); mic.humAn = { getFloatTimeDomainData(b){ for(let i=0;i<b.length;i++) b[i] = 0.4*Math.sin(2*Math.PI*225*i/sr); } };
    micTuneTick(mic); micTuneTick(mic); mic.micState = 'live'; const tune = mic.tuneSemis, note = mic.micNote, ro = readout(mic)[1];
    mic.voice = null; destroyObject(mic);
    return { kits, durs, sent: sent.map(m=>m.face+':'+m.size).join(' '), wanted, names, tune, note, ro, cfgTune: msgs.length ? msgs[msgs.length-1].cfg.tune : null };
  });
  check('DRUMS: ELECTRO and WOOD kits; HARP: BELL, GLASS, KOTO ring for different times; WATER: RAIN and DEEP (a bigger bowl) reach the model; VOICE: the TUNED face wants the processor and pulls 225 Hz toward A (57) by a fraction of a semitone', play.kits.join('|')==='EKICK/ESNARE/EHAT/CLAP|BLOCK/BONGO/SHAKER/COWBELL' && play.durs[1]>play.durs[0] && play.durs[2]<play.durs[0] && play.sent==='4:1 5:1.7' && play.wanted && play.names==='tuned' && play.note===57 && play.tune<0 && play.tune>-1 && Math.abs(play.cfgTune-play.tune)<1e-9 && /A3/.test(play.ro), JSON.stringify(play));

  // 10. a body turned over on the table keeps its state; a scene from before the kit migrates; the sheets are by body
  const cam = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const tnow = performance.now();
    const o = spawn('scene', CX, CY); setOption(o, 1); o.arc = 0.8; o.slots[1] = { x:1 }; o.slots[3] = { y:2 };
    cam.markers.set(markerId('scene', 1), { obj:o, last: tnow-500, ang:0, r0:20, lift:0 });
    const st = camKin(markerId('scene', 3), tnow);
    const gone = !objects.includes(o), cleared = !cam.markers.has(markerId('scene', 1));
    const o2 = spawn('scene', CX, CY); restoreObjectState(o2, st); setOption(o2, 3);
    const kept = o2.arc===0.8 && !!o2.slots[1] && o2.option===3 && !!o2.slots[3];
    const none = camKin(markerId('osc', 2), tnow);
    for(const q of [...objects]) destroyObject(q);
    const ok = loadSceneFrom({ v:5, bpm:112, key:0, scaleIdx:0, swingIdx:0, objects:[
      { type:'sampler', nx:0.3, ny:0, angle:(2.5/6)*TAU, arc:0.8, option:0 }, { type:'delay', nx:-0.3, ny:0, angle:(3.5/6)*TAU, arc:0.5, option:0 },
      { type:'rec', nx:0, ny:0.3, angle:(2.5/5)*TAU, arc:0.8, option:0 }, { type:'send', nx:0, ny:-0.3, angle:0.25*TAU, arc:0.75, option:0 },
      { type:'key', nx:0.5, ny:0.5, angle:0.1, arc:(2.5/8), option:1 } ] });
    const by = t => objects.find(q=>q.type===t);
    const mig = { sampler:LOOPS[samplerLoop(by('sampler'))], delay:delayDiv(by('delay')).n, fb:delayFb(by('delay')), rec:recBars(by('rec')), sendLevel:+sendLevel(by('send')).toFixed(2), sendReach:+(sendReach(by('send'))/TABLE_R).toFixed(2), scale:SCALES[by('key').option].name, oct:keyOct() };
    const sheet = markerSheetHTML(52), heads = (sheet.match(/<h2>/g)||[]).length, ids = [...sheet.matchAll(/id (\d+)</g)].map(m=>+m[1]);
    return { gone, cleared, kept, none, ok, mig, heads, nIds: ids.length, maxId: Math.max(...ids), hasTO: /truncated octahedron/.test(sheet), cards: cardsHTML().includes('NOISE') };
  });
  check('camera: the same body on another face takes over the state (slots, slider), the old face goes; a different type does not; a v5 scene migrates ring choices to faces (HATS, 1/4, 4 bars, send and master swapped, key scale from the slider, octave +1)', cam.gone && cam.cleared && cam.kept && cam.none===null && cam.ok && cam.mig.sampler==='HATS' && cam.mig.delay==='1/4' && Math.abs(cam.mig.fb-0.425)<0.01 && cam.mig.rec===4 && cam.mig.sendLevel===0.25 && cam.mig.sendReach===0.6 && cam.mig.scale==='minor' && cam.mig.oct===12, JSON.stringify(cam));
  check('the marker sheet is 32 bodies, 191 discs, ids within 8 bits, the truncated octahedra named; the cards know the new faces', cam.heads===32 && cam.nIds===191 && cam.maxId<=255 && cam.hasTO && cam.cards, JSON.stringify({heads:cam.heads, nIds:cam.nIds, maxId:cam.maxId, hasTO:cam.hasTO, cards:cam.cards}));

  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
