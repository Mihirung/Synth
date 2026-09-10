// Lumatable: the song. A rec take becomes a blob, blobs go on the rim timeline, play/pause/stop at the centre, a render to file, and it all survives a reload.   node tests/song.test.js
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
  page.on('console', m=>{ if(m.type()==='error' && !/ERR_CONNECTION|ERR_TUNNEL|ERR_NAME|ERR_FAILED|net::/.test(m.text())) errors.push(m.type()+': '+m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.click('#begin'); await page.waitForTimeout(500);
  const results=[]; const check=(n,ok,i)=>results.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  const drag = async(from, to, steps=14)=>{ await page.mouse.move(from.x, from.y); await page.mouse.down(); for(let i=1;i<=steps;i++) await page.mouse.move(from.x+(to.x-from.x)*i/steps, from.y+(to.y-from.y)*i/steps); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(120); };

  // 1. the song puck: in the main tray; placed, the rim becomes 88 bars of pop song
  const s1 = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const inTray = !!document.querySelector('#dock .spawn[data-type="song"]');
    const p = spawn('song', CX+0.5*TABLE_R, CY-0.5*TABLE_R);
    const parts = songParts();
    return { inTray, on: song.puck===p, bars: songBars(), parts: parts.map(x=>x.n).join(','), range: songLoopRange().join('-'), ro: readout(p)[0], secs: Math.round(songBars()*barDur()) };
  });
  check('song puck in the tray; placed, the rim is 88 bars: intro, verses, choruses, middle 8, outro', s1.inTray && s1.on && s1.bars===88 && s1.parts==='intro,verse 1,chorus,verse 2,chorus,middle 8,last chorus,outro' && s1.range==='0-88' && /^SONG · POP SONG/.test(s1.ro), JSON.stringify(s1));

  // 2. a real take: an osc plays, the rec block is tapped, one bar later a blob floats beside it (and the rec does not loop)
  const s2 = await page.evaluate(async()=>{
    const osc = spawn('osc', CX-0.2*TABLE_R, CY-0.3*TABLE_R); computePatch();
    const rec = spawn('rec', CX-0.5*TABLE_R, CY+0.15*TABLE_R); rec.angle = 0.05*TAU; computePatch();   // one bar
    cycleOption(rec);   // a tap arms it
    const armed = rec.recState==='armed';
    const t0 = performance.now();
    while(rec.recState!=='idle' || audio.captures.size){ if(performance.now()-t0 > 9000) break; await new Promise(r=>setTimeout(r,100)); }
    const b = song.blobs[0];
    return { armed, n: song.blobs.length, noLoop: rec.ownLoop===null, state: rec.recState, bars: b && b.bars, free: b && !b.placed, inside: b ? Math.hypot(b.x-CX,b.y-CY) < TABLE_R*0.86 : false,
             peak: b ? Math.max(...Array.from(b.buf.getChannelData(0)).map(Math.abs)) : 0, name: b && b.name };
  });
  check('a tapped rec block makes a one-bar blob of the table\'s sound, floating inside the disc, and does not loop it', s2.armed && s2.n===1 && s2.noLoop && s2.state==='idle' && s2.bars===1 && s2.free && s2.inside && s2.peak>0.5 && s2.name==='take 1', JSON.stringify(s2));

  // 3. blobs onto the rim: bar 20 in verse 1; a second on the same bars lands in the next lane; a third at bar 40
  const pos = await page.evaluate(()=>{
    const rec = objects.find(o=>o.type==='rec');
    const mk = (hz, bars)=>{ const sr=audio.ctx.sampleRate, n=Math.round(bars*barDur()*sr), buf=audio.ctx.createBuffer(1,n,sr), d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=0.5*Math.sin(i/sr*hz*TAU); return buf; };
    songAddBlob(rec, mk(330, 2), 2); songAddBlob(rec, mk(220, 2), 2);
    const rim = (bar, laneF)=>{ const a=songAngleOfBar(bar), r=songR0()+(songR1()-songR0())*laneF; return { x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r }; };
    return { blobs: song.blobs.map(b=>({x:b.x,y:b.y})), t20: rim(20.2, 0.17), t40: rim(40.2, 0.17) };
  });
  await drag(pos.blobs[0], pos.t20);
  await drag(pos.blobs[1], pos.t20);
  const b2 = await page.evaluate(()=>song.blobs[2]);
  await drag(b2, pos.t40);
  const s3 = await page.evaluate(()=>({ placed: song.blobs.map(b=>b.placed+':'+b.bar+':'+b.lane).join(' '), part: songPartAt(20).n, free: song.blobs.filter(b=>!b.placed).length }));
  check('drags: bar 20 lane 0, the second take on top goes to lane 1, the third lands at bar 40', s3.placed==='true:20:0 true:20:1 true:40:0' && s3.part==='verse 1' && s3.free===0, JSON.stringify(s3));

  // 4. play at the centre: the head moves, blobs sound from the song bus, and a rec take taken meanwhile hears none of it
  const s4 = await page.evaluate(async()=>{
    for(const o of objects) if(o.type==='osc') setMuted(o, true);
    const an = audio.ctx.createAnalyser(); an.fftSize = 1024; audio.songBus.connect(an); const w = new Float32Array(1024);
    const lv = ()=>{ an.getFloatTimeDomainData(w); let s=0; for(const v of w) s+=v*v; return Math.sqrt(s/w.length); };
    song.pos = 19;   // just before the first blob
    const bt = songBtns().find(b=>b.k==='play');
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX:bt.x, clientY:bt.y, pointerId:9, pointerType:'touch', bubbles:true }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX:bt.x, clientY:bt.y, pointerId:9, pointerType:'touch', bubbles:true }));
    const playing = song.playing, p0 = song.pos;
    const rec = objects.find(o=>o.type==='rec'); cycleOption(rec);   // record one bar while the song plays
    const t0 = performance.now(); let peakLv = 0;
    while(performance.now()-t0 < 6500){ await new Promise(r=>setTimeout(r,50)); if(song.pos>20.1 && song.pos<22) peakLv = Math.max(peakLv, lv()); }
    return { playing, p0, pos: song.pos, moved: song.pos > p0+1, sources: song.sources.length, peakLv, blobs: song.blobs.length, rec: rec.recState, captures: audio.captures.size };
  });
  check('play: the head advances from bar 19, the blobs at bar 20 sound on the song bus, and a take recorded meanwhile stays silent (no new blob)', s4.playing && s4.moved && s4.peakLv>0.05 && s4.blobs===3 && s4.rec==='idle' && s4.captures===0, JSON.stringify(s4));

  // 5. pause holds the bar, stop returns to the start; the ring loops one part; a flip changes the shape
  const s5 = await page.evaluate(async()=>{
    const bt = songBtns();
    const tap = k=>{ const b=bt.find(x=>x.k===k); canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX:b.x, clientY:b.y, pointerId:9, pointerType:'touch', bubbles:true })); canvas.dispatchEvent(new PointerEvent('pointerup', { clientX:b.x, clientY:b.y, pointerId:9, pointerType:'touch', bubbles:true })); };
    tap('play'); const paused = !song.playing, held = song.pos >= 20 && Number.isInteger(song.pos), src0 = song.sources.length;
    tap('stop'); const stopped = !song.playing && song.pos===0;
    const p = song.puck; p.angle = (3/9)*TAU; applyParams(p);   // the third part: chorus
    const loop = songLoopRange().join('-'), lp = readout(p)[1];
    tap('play'); await new Promise(r=>setTimeout(r,80));
    const inLoop = song.playing && song.pos>=24 && song.pos<32 && Math.abs((song.wrapAt - song.t0)/barDur() - 32) < 0.01;
    tap('stop'); p.angle = 0; applyParams(p);
    cycleOption(p); const little = songForm().n+':'+songBars(); cycleOption(p); const free = songForm().n+':'+songBars(); cycleOption(p); const pop = songForm().n+':'+songBars();
    return { paused, held, src0, stopped, loop, lp, inLoop, little, free, pop, still: song.blobs.map(b=>b.bar).join(',') };
  });
  check('pause holds the bar, stop goes home, the ring loops the chorus (bars 24–32), faces flip the shape and the blobs keep their bars', s5.paused && s5.held && s5.src0===0 && s5.stopped && s5.loop==='24-32' && /loop CHORUS/.test(s5.lp) && s5.inLoop && s5.little==='LITTLE SONG:40' && s5.free==='FREE:64' && s5.pop==='POP SONG:88' && s5.still==='20,20,40', JSON.stringify(s5));

  // 6. saving: an offline render of the rim, then a file (WAV here: the MP3 encoder cannot load without the network)
  const s6 = await page.evaluate(async()=>{
    const r = await songRender();
    let peak=0, first=-1; for(let i=0;i<r.pcm.length;i++){ const a=Math.abs(r.pcm[i]); if(a>peak) peak=a; if(first<0 && a>0.01) first=i; }
    const endBar = 42, expect = Math.ceil((endBar*barDur()+1)*r.sr);
    await songExport();
    return { peak, firstBar: first/r.sr/barDur(), len: r.pcm.length, expect, file: song.lastExport, msg: song.msg && song.msg.txt };
  });
  check('save: the render starts at bar 20, runs to the last blob, and a song file is handed over', s6.peak>0.2 && s6.peak<=0.95 && Math.abs(s6.firstBar-20)<0.05 && s6.len===s6.expect && s6.file && s6.file.size>1000 && /\.(wav|mp3)$/.test(s6.file.name), JSON.stringify(s6));

  // 6b. four tracks; the grip at the end of the bar-40 blob stretches it to bar 48: four loops of a two-bar take, scheduled as four repeats, rendered to bar 48
  const grip = await page.evaluate(()=>{ const b=song.blobs[2]; const h=(songR1()-songR0())/SONG_LANES, r=songR0()+(b.lane+0.5)*h;
    const at=bar=>{ const a=songAngleOfBar(bar); return { x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r }; };
    return { lanes: SONG_LANES, band:+((songR1()-songR0())/TABLE_R).toFixed(3), from: at(b.bar+b.bars), to: at(48.3), hit: !!songHandleAt(at(b.bar+b.bars).x, at(b.bar+b.bars).y) }; });
  await drag(grip.from, grip.to, 20);
  const s6b = await page.evaluate(async()=>{
    const b=song.blobs[2];
    songStopSources(); song.playing=false;
    const when=audio.ctx.currentTime+0.05; song.t0=when-40*barDur(); song.playing=true; songSchedulePass(40, when);
    const reps=song.sources.filter(s=>s.blob===b).length, starts=song.sources.filter(s=>s.blob===b).map(s=>+((s.t-when)/barDur()).toFixed(2)).join(',');
    song.playing=false; songStopSources();
    const r=await songRender(); const expect=Math.ceil((48*barDur()+1)*r.sr);
    return { len:b.len, bars:b.bars, occupied: songOccupied(b.lane, 44, 1, null), reps, starts, renderLen:r.pcm.length, expect };
  });
  check('four tracks; the grip stretches a two-bar take to eight bars: it loops four times on the bar, holds its lane, and renders to bar 48', grip.lanes===4 && grip.band>0.1 && grip.hit && s6b.len===8 && s6b.bars===2 && s6b.occupied && s6b.reps===4 && s6b.starts==='0,2,4,6' && s6b.renderLen===s6b.expect, JSON.stringify({grip:{lanes:grip.lanes,band:grip.band,hit:grip.hit}, ...s6b}));

  await page.evaluate(()=>{ const rec=objects.find(o=>o.type==='rec'); const sr=audio.ctx.sampleRate, buf=audio.ctx.createBuffer(1, Math.round(4*barDur()*sr), sr); songAddBlob(rec, buf, 4); song.dragX = song.blobs[3].x; song.dragY = song.blobs[3].y; });
  await page.waitForTimeout(300);
  await page.screenshot({ path:path.join(SHOTS,'song.png') });

  // 7. the bin: a blob dragged off the disc is gone; a reload brings the rest back where they were
  const b3 = await page.evaluate(()=>({ x:song.blobs[3].x, y:song.blobs[3].y, off:{ x:CX+TABLE_R*1.12, y:CY } }));
  await drag(b3, b3.off);
  const binned = await page.evaluate(()=>song.blobs.length);
  await page.waitForTimeout(400);
  await page.reload(); await page.click('#begin'); await page.waitForTimeout(900);
  const s7 = await page.evaluate(()=>({ puck: !!song.puck, n: song.blobs.length, placed: song.blobs.map(b=>b.placed+':'+b.bar+':'+b.lane).sort().join(' '), lens: song.blobs.map(b=>b.bar+':'+(b.len||b.bars)).sort().join(' '), take: song.nextTake }));
  check('the bin takes a blob; after a reload the song puck, the three placed blobs and the stretch are back', binned===3 && s7.puck && s7.n===3 && s7.placed==='true:20:0 true:20:1 true:40:0' && s7.lens==='20:1 20:2 40:8' && s7.take===4, JSON.stringify({ binned, ...s7 }));

  // 8. taking the puck away stops the song and hides the rim; the blobs wait
  const s8 = await page.evaluate(()=>{ songPlay(); const was = song.playing; destroyObject(song.puck); return { was, off: !song.puck && !song.playing, kept: song.blobs.length }; });
  check('removing the puck stops playback; the blobs wait for it to come back', s8.was && s8.off && s8.kept===3, JSON.stringify(s8));
  await page.evaluate(async()=>{ for(const b of [...song.blobs]) songRemoveBlob(b); await new Promise(r=>setTimeout(r,200)); });

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
