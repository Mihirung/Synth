// Lumatable: the playing gestures recovered from the original Reactable Live! manual — hardlinks (bump to secure a connection), the tonality object's twelve fields, locking a finger parameter, holding a finger on a line to mute it, and turning an oscillator to trigger its envelope.   node tests/original.test.js
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

  // 1. hardlinks: bump a sequencer into an oscillator and the link is secured; it survives being pulled apart; a second bump undoes it
  const hard = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const osc = spawn('osc', CX-TABLE_R*0.3, CY), far = spawn('osc', CX+TABLE_R*0.45, CY+TABLE_R*0.3);
    const q = spawn('seq', CX-TABLE_R*0.3+CTL_LINK()*0.5, CY); computePatch();
    const near = q.hop===osc.id;
    q.x = osc.x + R_BODY()*1.2; q.y = osc.y; computePatch();            // bump them together
    const made = q.hard===osc.id, hopped = q.hop===osc.id;
    q.x = CX+TABLE_R*0.5; q.y = CY-TABLE_R*0.45; computePatch();        // right across the table
    const held = q.hop===osc.id, dd = Math.round(dist(q,osc)/CTL_LINK()*100);
    const nearerOther = dist(q,far) < dist(q,osc);
    q.x = osc.x + R_BODY()*1.2; q.y = osc.y; computePatch();            // bump a second time
    const undone = !q.hard;
    q.x = CX+TABLE_R*0.5; q.y = CY-TABLE_R*0.45; computePatch();        // and now proximity rules again
    const free = q.hop!==osc.id;
    return { near, made, hopped, held, dd, nearerOther, undone, free };
  });
  check('hardlink: bumping a sequencer into an oscillator secures the link; it holds right across the table even with a nearer target; a second bump undoes it and proximity takes over again',
        hard.near && hard.made && hard.hopped && hard.held && hard.dd>100 && hard.nearerOther && hard.undone && hard.free, JSON.stringify(hard));

  // the same gesture with a real mouse drag, and the line is drawn red
  const drag = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const osc = spawn('osc', CX-TABLE_R*0.25, CY+TABLE_R*0.1);
    const f = spawn('filter', CX+TABLE_R*0.25, CY-TABLE_R*0.1); computePatch();
    return { oscId:osc.id, fId:f.id, from:{x:f.x,y:f.y}, to:{x:osc.x+R_BODY()*1.1, y:osc.y}, before: osc.hop===f.id };
  });
  await page.mouse.move(drag.from.x, drag.from.y); await page.mouse.down();
  for(let i=1;i<=12;i++) await page.mouse.move(drag.from.x+(drag.to.x-drag.from.x)*i/12, drag.from.y+(drag.to.y-drag.from.y)*i/12);
  await page.mouse.up(); await page.waitForTimeout(120);
  const dragged = await page.evaluate(()=>{ const osc=objects.find(o=>o.type==='osc'), f=objects.find(o=>o.type==='filter');
    const made = osc.hard===f.id && isHard(osc);
    f.x = CX+TABLE_R*0.6; f.y = CY+TABLE_R*0.5; computePatch();
    return { made, still: osc.hop===f.id, red: isHard(osc) }; });
  await page.screenshot({ path:path.join(SHOTS,'original-hardlink.png') });
  check('hardlink by hand: dragging a filter onto an oscillator secures their link and draws it red; dragging the filter away leaves it connected', dragged.made && dragged.still && dragged.red, JSON.stringify(dragged));

  // 2. the tonality object: twelve fields around it, tapped one at a time, override the scale presets
  const tone = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const k = spawn('key', CX, CY); k.angle = 0.02;                       // key of C
    const preset = scaleSteps().join(','), face = SCALES[k.option].name;
    const at = i => { const a = -Math.PI/2 + i/12*TAU, r = (R_PAD0()+R_PAD1())/2; return { x:k.x+Math.cos(a)*r, y:k.y+Math.sin(a)*r }; };
    const tap = i => { const p = at(i); canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX:p.x, clientY:p.y, pointerId:20+i, pointerType:'touch', bubbles:true }));
                       canvas.dispatchEvent(new PointerEvent('pointerup', { clientX:p.x, clientY:p.y, pointerId:20+i, pointerType:'touch', bubbles:true })); };
    tap(1); const added = scaleSteps().join(',');                          // a flat second: not in any preset here
    tap(1); const removed = scaleSteps().join(',');
    for(let i=0;i<12;i++) if(![0,3,5,7,10].includes(i) && scaleSteps().includes(i)) tap(i);
    for(const i of [0,3,5,7,10]) if(!scaleSteps().includes(i)) tap(i);
    const built = scaleSteps().join(',');                                  // a minor pentatonic, built by hand
    const o = spawn('osc', CX+TABLE_R*0.4, CY); o.angle = 0.5*TAU; applyParams(o);
    const rel = ((oscMidi(o)-state.key)%12+12)%12, inScale = built.split(',').map(Number).includes(rel);
    const json = JSON.stringify(sceneJSON());
    for(const q of [...objects]) destroyObject(q);
    loadSceneFrom(JSON.parse(json));
    const back = scaleSteps().join(',');
    const k2 = objects.find(q=>q.type==='key'); setOption(k2, (k2.option+1)%SCALES.length);
    const reloaded = scaleSteps().join(','), presetNow = SCALES[k2.option].steps.join(',');
    return { preset, face, added, removed, built, inScale, back, reloaded, presetNow, ro: readout(k2)[0] };
  });
  check('tonality: tapping the twelve fields adds and removes single notes, a scale built by hand quantises the oscillators, it survives a reload, and flipping a face reloads that preset',
        tone.added!==tone.preset && tone.removed===tone.preset && tone.built==='0,3,5,7,10' && tone.inScale && tone.back==='0,3,5,7,10' && tone.reloaded===tone.presetNow, JSON.stringify(tone));

  // 3. locking the finger parameter: drag the handle away from the object
  const lockGeom = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const o = spawn('filter', CX, CY); o.arc = 0.5; applyParams(o);
    const am = (R_ARC0()+R_ARC1())/2, ha = ARC_START+ARC_SPAN*o.arc;
    return { on:{ x:o.x+Math.cos(ha)*am, y:o.y+Math.sin(ha)*am }, out:{ x:o.x+Math.cos(ha)*(R_ARC1()+50), y:o.y+Math.sin(ha)*(R_ARC1()+50) },
             mid:{ x:o.x+Math.cos(ARC_START+ARC_SPAN*0.2)*am, y:o.y+Math.sin(ARC_START+ARC_SPAN*0.2)*am }, arc:o.arc };
  });
  const pull = async(from, to)=>{ await page.mouse.move(from.x, from.y); await page.mouse.down();
    for(let i=1;i<=10;i++) await page.mouse.move(from.x+(to.x-from.x)*i/10, from.y+(to.y-from.y)*i/10); await page.mouse.up(); await page.waitForTimeout(80); };
  await pull(lockGeom.on, lockGeom.out);
  const locked = await page.evaluate(()=>({ lock: !!objects[0].lock, arc: +objects[0].arc.toFixed(3) }));
  await pull(lockGeom.on, lockGeom.mid);                                   // a normal drag, which must now do nothing
  const afterTry = await page.evaluate(()=>+objects[0].arc.toFixed(3));
  await pull(lockGeom.on, lockGeom.out);                                   // the same gesture unlocks it
  const unlocked = await page.evaluate(()=>!objects[0].lock);
  await pull(lockGeom.on, lockGeom.mid);
  const moved = await page.evaluate(()=>+objects[0].arc.toFixed(3));
  check('lock: pulling the arc handle away from the object locks the parameter so a finger cannot knock it, the same pull unlocks it, and then the slider moves again',
        locked.lock && Math.abs(afterTry-locked.arc)<1e-6 && unlocked && Math.abs(moved-locked.arc)>0.1, JSON.stringify({ locked, afterTry, unlocked, moved }));

  // 4. holding a finger over a connection mutes it for as long as the finger is down
  const lineAt = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const o = spawn('osc', CX-TABLE_R*0.45, CY-TABLE_R*0.2); computePatch();
    const s = connEnds(o);
    return { x:(s.x1+s.x2)/2, y:(s.y1+s.y2)/2, muted:o.muted };
  });
  await page.mouse.move(lineAt.x, lineAt.y); await page.mouse.down(); await page.waitForTimeout(420);
  const whileDown = await page.evaluate(()=>objects[0].muted);
  await page.mouse.up(); await page.waitForTimeout(150);
  const afterUp = await page.evaluate(()=>objects[0].muted);
  // and a swipe across the same line still cuts it for good
  await page.mouse.move(lineAt.x, lineAt.y-60); await page.mouse.down(); await page.mouse.move(lineAt.x, lineAt.y+60, { steps:8 }); await page.mouse.up(); await page.waitForTimeout(150);
  const afterSwipe = await page.evaluate(()=>objects[0].muted);
  check('hold to mute: a finger held on a connection drops it out and lifting brings it back; a swipe across it still cuts it for good',
        !lineAt.muted && whileDown && !afterUp && afterSwipe, JSON.stringify({ whileDown, afterUp, afterSwipe }));

  // 5. turning an oscillator with an envelope beside it triggers the envelope on every new note
  const turn = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const o = spawn('osc', CX-TABLE_R*0.2, CY); o.angle = 0.2*TAU; applyParams(o);
    await new Promise(r=>setTimeout(r, 200));
    const droning = +o.gate.gain.value.toFixed(2);
    const bare = (o.turnNote=null, oscTurnTrigger(o), +o.gate.gain.value.toFixed(2));     // no envelope puck: nothing happens
    const e = spawn('env', o.x+CTL_LINK()*0.5, o.y); setOption(e, 0); computePatch();      // PLUCK, sustain 0
    const bound = e.hop===o.id;
    const n0 = oscMidi(o);
    o.angle = 0.6*TAU; applyParams(o); oscTurnTrigger(o);
    const n1 = oscMidi(o), fired = o.turnNote===n1 && n1!==n0;
    await new Promise(r=>setTimeout(r, 30));
    const attacking = o.gate.gain.value;
    await new Promise(r=>setTimeout(r, 700));
    const decayed = o.gate.gain.value;                                                     // PLUCK: the note has died away
    destroyObject(e); await new Promise(r=>setTimeout(r, 250));
    const reopened = +o.gate.gain.value.toFixed(1);                                        // take the envelope away and it drones again
    return { droning, bare, bound, fired, n0, n1, attacking:+attacking.toFixed(3), decayed:+decayed.toFixed(3), reopened };
  });
  check('turn to play: an oscillator drones on its own, but with an envelope beside it every new note you turn to re-articulates, a PLUCK dies away, and taking the envelope off returns it to a drone',
        turn.droning===1 && turn.bare===1 && turn.bound && turn.fired && turn.decayed < 0.2 && turn.decayed < turn.attacking && turn.reopened===1, JSON.stringify(turn));

  // 6. none of it disturbs the ordinary patch
  const sane = await page.evaluate(()=>{
    for(const o of [...objects]) destroyObject(o);
    const o = spawn('osc', CX-TABLE_R*0.4, CY), f = spawn('filter', CX-TABLE_R*0.15, CY); computePatch();
    const chained = o.hop===f.id && f.hop==='C';
    f.x = CX+TABLE_R*0.6; f.y = CY+TABLE_R*0.5; computePatch();
    return { chained, freed: o.hop==='C', noHard: !o.hard && !f.hard, bumps: bumps.size };
  });
  check('proximity patching is untouched when nothing has been bumped: a filter dragged near an oscillator takes it, dragged away releases it, and no hardlink is left behind',
        sane.chained && sane.freed && sane.noHard, JSON.stringify(sane));

  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
