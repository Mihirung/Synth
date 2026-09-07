// Lumatable: a warp puck beside a mic block shifts the voice live. A fake microphone plays a 220 Hz tone; the mic block's output is measured.   node tests/micwarp.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
// a WAV for the fake microphone: 220 Hz, mono, 16-bit, 90 s
const WAV = path.join(os.tmpdir(), 'lumatable-mic-220.wav');
{ const sr=48000, n=sr*90, buf=Buffer.alloc(44+n*2); const w=(o,s)=>buf.write(s,o,'ascii');
  w(0,'RIFF'); buf.writeUInt32LE(36+n*2,4); w(8,'WAVE'); w(12,'fmt '); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22);
  buf.writeUInt32LE(sr,24); buf.writeUInt32LE(sr*2,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34); w(36,'data'); buf.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++) buf.writeInt16LE(Math.round(0.5*32767*Math.sin(2*Math.PI*220*i/sr)), 44+i*2);
  fs.writeFileSync(WAV, buf); }
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+WAV+'%noloop'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION|ERR_TUNNEL|ERR_NAME|ERR_FAILED|net::/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin'); await page.waitForTimeout(400);
  const results=[]; const check=(n,ok,i)=>results.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  await page.evaluate(()=>{ for(const o of [...objects]) destroyObject(o);
    window.tone = async(o, ms)=>{   // the strongest tone in the block's output over `ms`, by Goertzel over a few candidate frequencies
      const an = audio.ctx.createAnalyser(); an.fftSize = 8192; o.amp.connect(an); const w = new Float32Array(8192);
      const cands = [110,146.8,165,220,293.7,330,440,880]; const acc = {}; for(const f of cands) acc[f]=0; let lv=0, n=0;
      const t0 = performance.now();
      while(performance.now()-t0 < ms){ await new Promise(r=>setTimeout(r,90)); an.getFloatTimeDomainData(w); let s=0; for(const v of w) s+=v*v; lv += Math.sqrt(s/w.length); n++;
        for(const f of cands){ const k=2*Math.PI*f/audio.ctx.sampleRate, c=2*Math.cos(k); let s0=0,s1=0,s2=0; for(let i=0;i<w.length;i++){ s0=w[i]+c*s1-s2; s2=s1; s1=s0; } acc[f] += Math.sqrt(Math.max(0,s1*s1+s2*s2-c*s1*s2))/w.length; } }
      an.disconnect(); let best=null; for(const f of cands) if(best===null || acc[f]>acc[best]) best=f;
      return { f: best, lv: lv/n, acc: Object.fromEntries(cands.map(f=>[f, +(acc[f]/n).toExponential(2)])) };
    }; });

  // 1. the mic block hears the fake microphone: 220 Hz comes out of it
  const s1 = await page.evaluate(async()=>{
    const mic = spawn('mic', CX-0.25*TABLE_R, CY); computePatch();
    const t0 = performance.now(); while(mic.micState==='wait' && performance.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100));
    await new Promise(r=>setTimeout(r,600));
    const t = await tone(mic, 1500);
    return { state: mic.micState, ...t, shift: !!mic.shift };
  });
  check('mic block live: the fake microphone\'s 220 Hz comes straight through, no shifter yet', s1.state==='live' && s1.f===220 && s1.lv>0.02 && !s1.shift, JSON.stringify(s1));

  // 2. a warp puck beside it: the shifter appears between microphone and block, and +12 st makes 440 Hz
  const s2 = await page.evaluate(async()=>{
    const mic = objects.find(o=>o.type==='mic');
    const wp = spawn('warp', mic.x, mic.y - 0.3*TABLE_R); wp.angle = TAU; applyParams(wp); computePatch();   // ring fully up: +12 st
    const bound = wp.hop===mic.id;
    const t0 = performance.now(); while(!mic.shift && performance.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100));
    await new Promise(r=>setTimeout(r,500));
    const t = await tone(mic, 1600);
    return { bound, shift: !!mic.shift, ro: readout(wp)[1], mro: readout(mic)[1], ...t };
  });
  check('warp beside the mic binds, wires in the live shifter, and +12 st turns 220 into 440 Hz', s2.bound && s2.shift && /live on the mic/.test(s2.ro) && /warped/.test(s2.mro) && s2.f===440 && s2.acc[440] > s2.acc[220]*2, JSON.stringify(s2));

  // 3. the ring changes the shift live; the faces give an octave down and backwards
  const s3 = await page.evaluate(async()=>{
    const mic = objects.find(o=>o.type==='mic'), wp = objects.find(o=>o.type==='warp');
    wp.angle = TAU*(19/24); applyParams(wp);   // +7 st
    await new Promise(r=>setTimeout(r,400)); const fifth = await tone(mic, 1400);
    cycleOption(wp);                            // HALF: an octave down, live
    await new Promise(r=>setTimeout(r,400)); const half = await tone(mic, 1400);
    cycleOption(wp); cycleOption(wp); wp.angle = TAU/2; applyParams(wp);   // REVERSE, ring at 0 st: backwards grains at the same pitch
    await new Promise(r=>setTimeout(r,400)); const rev = await tone(mic, 1400);
    cycleOption(wp);                            // back to PITCH
    return { fifth: fifth.f, half: half.f, rev: rev.f, revLv: rev.lv, face: wp.option };
  });
  check('turning the ring gives a fifth (330 Hz) live; HALF gives 110 Hz; REVERSE keeps a tone\'s pitch and level', s3.fifth===330 && s3.half===110 && s3.rev===220 && s3.revLv>0.008 && s3.face===0, JSON.stringify(s3));

  // 4. moving the warp away takes the shifter out again: 220 Hz straight through
  const s4 = await page.evaluate(async()=>{
    const mic = objects.find(o=>o.type==='mic'), wp = objects.find(o=>o.type==='warp');
    wp.x = CX+0.7*TABLE_R; wp.y = CY+0.7*TABLE_R; computePatch();
    await new Promise(r=>setTimeout(r,300));
    const t = await tone(mic, 1400);
    return { unbound: wp.hop==='C', shift: !!mic.shift, ...t };
  });
  check('warp moved away: unbound, the shifter is gone, 220 Hz again', s4.unbound && !s4.shift && s4.f===220, JSON.stringify(s4));

  // 5. a sound-mode switch rebuilds the mic with its shifter; removing the mic tears it down
  const s5 = await page.evaluate(async()=>{
    const mic = objects.find(o=>o.type==='mic'), wp = objects.find(o=>o.type==='warp');
    wp.x = mic.x; wp.y = mic.y - 0.3*TABLE_R; computePatch();
    let t0 = performance.now(); while(!mic.shift && performance.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100));
    const before = !!mic.shift;
    setSoundMode('moog'); await new Promise(r=>setTimeout(r,400));
    t0 = performance.now(); while(!mic.shift && performance.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100));
    const after = !!mic.shift;
    setSoundMode('original'); await new Promise(r=>setTimeout(r,300));
    destroyObject(mic);
    return { before, after, gone: !mic.shift && !objects.includes(mic) };
  });
  check('the shifter survives a sound-mode switch and is torn down with the block', s5.before && s5.after && s5.gone, JSON.stringify(s5));

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
