// Lumatable: the music of the spheres. The orrery's accuracy, Holst sounds on touch, God-mode physics, ships.   node tests/spheres.test.js
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
  const level = ()=>page.evaluate(()=>{ const o=spheres.puck; o.an.getFloatTimeDomainData(o.wave); let s=0; for(const v of o.wave) s+=v*v; return Math.sqrt(s/o.wave.length); });

  // 1. the orrery: bodies, moon counts, Kepler ratios
  const orr = await page.evaluate(async()=>{
    const osc = objects.find(o=>o.type==='osc');
    const p = spawn('spheres', CX+0.8*TABLE_R, CY+0.8*TABLE_R); computePatch();
    const moons = Object.fromEntries(spheres.bodies.filter(b=>!b.sun).map(b=>[b.n, b.moons.length]));
    const merc = spheres.bodies.find(b=>b.n==='Mercury'), nep = spheres.bodies.find(b=>b.n==='Neptune');
    const a0m = Math.atan2(merc.y-CY, merc.x-CX), a0n = Math.atan2(nep.y-CY, nep.x-CX);
    spheres.t = 0.2408; spheresPlaceOrrery();   // one Mercury year later
    const a1m = Math.atan2(merc.y-CY, merc.x-CX), a1n = Math.atan2(nep.y-CY, nep.x-CX);
    const dm = Math.abs(Math.atan2(Math.sin(a1m-a0m), Math.cos(a1m-a0m))), dn = Math.abs(Math.atan2(Math.sin(a1n-a0n), Math.cos(a1n-a0n)));
    const oscGain = osc && osc.out ? osc.out.gain.value : null;
    await new Promise(r=>setTimeout(r,120));
    return { on:spheres.on, n:spheres.bodies.length, moons, belt:spheres.belt.length, dm, dn, expectN: TAU*0.2408/164.79,
             radii: spheres.bodies.filter(b=>!b.sun).map(b=>+(b.orbitR/TABLE_R).toFixed(2)), oscMuted: osc ? osc.out.gain.value < 0.05 : true };
  });
  const mOK = orr.moons.Jupiter===95 && orr.moons.Saturn===146 && orr.moons.Uranus===28 && orr.moons.Neptune===16 && orr.moons.Earth===1 && orr.moons.Mars===2 && orr.moons.Pluto===5 && orr.moons.Mercury===0 && orr.moons.Venus===0;
  const rOK = orr.radii.every((r,i)=>i===0 || r>orr.radii[i-1]) && orr.radii[0]>0.15 && orr.radii[orr.radii.length-1]<0.97;
  check('orrery: Sun + 10 worlds, real moon counts, belt, orbits in order and on the disc', orr.on && orr.n===11 && mOK && orr.belt===150 && rOK, JSON.stringify({n:orr.n, moons:orr.moons, belt:orr.belt, radii:orr.radii}));
  check('Kepler: Mercury does one orbit while Neptune barely moves; the other blocks fall silent', Math.abs(orr.dm)<0.02 && Math.abs(orr.dn-orr.expectN)<0.002 && orr.oscMuted, JSON.stringify({dm:orr.dm, dn:orr.dn, expect:orr.expectN, oscMuted:orr.oscMuted}));

  // 2. touch: Jupiter's kettle drums, a moon's tinkle, Saturn's rings
  const quiet = await level();
  const touch = await page.evaluate(async()=>{
    const jup = spheres.bodies.find(b=>b.n==='Jupiter');
    const ev=(type,x,y,id)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:id||21,pointerType:'touch',pressure:0.5,bubbles:true}));
    ev('pointerdown', jup.x, jup.y); ev('pointerup', jup.x, jup.y);
    await new Promise(r=>setTimeout(r,650));
    spheres.puck.an.getFloatTimeDomainData(spheres.puck.wave); let s=0; for(const v of spheres.puck.wave) s+=v*v; const lv=Math.sqrt(s/spheres.puck.wave.length);
    const sat = spheres.bodies.find(b=>b.n==='Saturn');
    const bands = []; for(let f=1.3; f<=2.7; f+=0.1) bands.push(sphRingBand(sat, sat.x+f*sat.r, sat.y));
    const m = jup.moons[0], mp = sphMoonPos(jup, m); const hit = sphBodyAt(mp.x, mp.y);
    const sunHit = sphBodyAt(CX, CY);
    return { lv, bands: [...new Set(bands)].join(','), moonHit: !!(hit && hit.moon && hit.moon.n==='Io'), sunHit: !!(sunHit && sunHit.body && sunHit.body.sun) };
  });
  check('a tap on Jupiter sounds; rings have five bands; a moon and the Sun are touchable', touch.lv>quiet+0.01 && touch.bands.includes('0') && touch.bands.includes('4') && touch.moonHit && touch.sunHit, JSON.stringify({...touch, quiet}));

  // 3. God mode: circular orbits hold, a flick throws a world, a finger blocks an orbit
  const god = await page.evaluate(async()=>{
    const p = spheres.puck; cycleOption(p);   // ORRERY -> GOD MODE
    const earth = spheres.bodies.find(b=>b.n==='Earth'); const r0 = Math.hypot(earth.x-CX, earth.y-CY);
    for(let i=0;i<120;i++) spheresPhysics(1/60);   // two seconds of gravity
    const r1 = Math.hypot(earth.x-CX, earth.y-CY);
    const alive0 = spheres.bodies.length;
    const ev=(type,x,y,id)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:id||22,pointerType:'touch',pressure:0.5,bubbles:true}));
    const mars = spheres.bodies.find(b=>b.n==='Mars'); const v0 = Math.hypot(mars.vx, mars.vy);
    const realNow = performance.now.bind(performance); let fake = realNow(); performance.now = ()=>fake;
    ev('pointerdown', mars.x, mars.y); for(let i=1;i<=5;i++){ fake+=16; ev('pointermove', mars.x+i*30, mars.y-i*30); } ev('pointerup', mars.x+150, mars.y-150);
    performance.now = realNow;
    const v1 = Math.hypot(mars.vx, mars.vy);
    return { god:spheres.god, orbitHeld: Math.abs(r1-r0) < r0*0.06, alive0, flicked: v1 > v0*1.5, v0, v1 };
  });
  check('God mode: gravity keeps Earth on its orbit; a flick throws Mars', god.god && god.orbitHeld && god.flicked, JSON.stringify(god));

  // 4. collisions: a slow meeting merges, a fast one shatters into new worlds; the Sun eats what falls in
  const col = await page.evaluate(()=>{
    const find = n => spheres.bodies.find(b=>b.n===n && b.alive);
    const n0 = spheres.bodies.length;
    const v = find('Venus'), m = find('Mercury'); m.x = v.x + v.r*0.5; m.y = v.y; m.vx = v.vx; m.vy = v.vy;
    spheresPhysics(1/60); const afterMerge = spheres.bodies.length; const merged = spheres.bodies.find(b=>/Venus\+Mercury|Mercury\+Venus/.test(b.n));
    const j = find('Jupiter'), s = find('Saturn'); const vE = Math.sqrt(spheres.GM/(TABLE_R*0.35));
    s.x = j.x + j.r*0.5; s.y = j.y; s.vx = j.vx + vE*2; s.vy = j.vy;
    spheres.clock += 1; spheresPhysics(1/60); const afterShatter = spheres.bodies.length; const debris = spheres.bodies.filter(b=>b.debris).length;
    spheres.clock += 1; const e = find('Earth'); e.x = CX + 2; e.y = CY; const sunR0 = spheres.bodies[0].r; spheresPhysics(1/60);
    return { n0, afterMerge, merged: !!merged, afterShatter, debris, eaten: !find('Earth'), sunNote: !!(spheres.note && /EARTH HAS FALLEN INTO THE SUN/.test(spheres.note.txt)), sunGrew: spheres.bodies[0].r > sunR0, sparks: spheres.sparks.length };
  });
  check('collisions: slow = merge, fast = shatter into debris, the Sun consumes and says so', col.afterMerge===col.n0-1 && col.merged && col.afterShatter>col.afterMerge && col.debris>=3 && col.eaten && col.sunNote && col.sunGrew && col.sparks>20, JSON.stringify(col));

  // 4b. the rim: a world flung at the edge usually leaves the solar system, sometimes bounces back
  const rim = await page.evaluate(()=>{
    let left=0, bounced=0;
    for(let trial=0; trial<40; trial++){
      spheres.bodies = spheres.bodies.filter(b=>b.sun);
      const b = { n:'Testworld', x:CX+TABLE_R*0.92, y:CY, vx:TABLE_R*3, vy:0, m:1, r:5*S, col:'#fff', hue:'#888', moons:[], alive:true, spin:0 };
      spheres.bodies.push(b);
      for(let i=0;i<10;i++) spheresPhysics(1/60);   // long enough to reach the rim, short enough that a bounce cannot cross the disc and reach the Sun
      if(b.leaving || !b.alive) left++; else bounced++;
    }
    const noteShown = !!spheres.note;
    return { left, bounced, noteShown };
  });
  check('the rim: one world in five that reaches it leaves (about 20%), the rest bounce, and it says who left', rim.left>=2 && rim.left<=16 && rim.bounced>=24 && rim.left+rim.bounced===40 && rim.noteShown, JSON.stringify(rim));

  // 5. ships: a rocket to the Moon lands, a starship tries for Mars, a visitor comes and goes
  const ships = await page.evaluate(async()=>{
    spheres.bodies = spheres.bodies.filter(b=>b.sun); cycleOption(spheres.puck);   // back to the orrery: the solar system is rebuilt
    const rebuilt = spheres.bodies.length===11 && !spheres.god;
    spheres.nextRocket = 0; spheres.nextShip = 0; spheres.nextAlien = 0;
    spheresTick(1/60);
    const kinds = spheres.ships.map(s=>s.kind).sort().join(',');
    let landed = false, gone = false;
    for(let i=0;i<60*14;i++){ spheresTick(1/60); }
    const earth = spheres.bodies.find(b=>b.n==='Earth');
    landed = (earth.flags||0) >= 1;
    for(let i=0;i<60*30;i++){ spheresTick(1/60); if(!spheres.ships.some(s=>s.kind==='alien')) break; }
    gone = !spheres.ships.some(s=>s.kind==='alien');
    return { rebuilt, kinds, landed, gone, ships: spheres.ships.length };
  });
  check('ships: rocket, starship and alien appear; the rocket lands on the Moon; the visitor leaves', ships.rebuilt && ships.kinds==='alien,rocket,starship' && ships.landed && ships.gone, JSON.stringify(ships));

  // 6. leaving: the table comes back
  const exit = await page.evaluate(async()=>{
    const osc = objects.find(o=>o.type==='osc');
    destroyObject(spheres.puck); await new Promise(r=>setTimeout(r,120));
    return { on: spheres.on, oscBack: osc ? osc.out.gain.value > 0.5 : true, n: objects.length };
  });
  check('removing the puck brings the table back', !exit.on && exit.oscBack, JSON.stringify(exit));

  await page.evaluate(()=>{ for(const o of [...objects]) destroyObject(o); const p=spawn('spheres', CX+0.86*TABLE_R, CY+0.86*TABLE_R); spheres.nextRocket=0; spheres.nextAlien=0; spheresTick(1/60); for(let i=0;i<90;i++) spheresTick(1/60); });
  await page.waitForTimeout(400);
  await page.screenshot({ path:path.join(SHOTS,'spheres.png') });
  await page.evaluate(()=>{ cycleOption(spheres.puck); const j=spheres.bodies.find(b=>b.n==='Jupiter'), s=spheres.bodies.find(b=>b.n==='Saturn'); const vE=Math.sqrt(spheres.GM/(TABLE_R*0.35)); s.x=j.x+j.r*0.5; s.y=j.y; s.vx=j.vx+vE*2; s.vy=j.vy; spheresPhysics(1/60); for(let i=0;i<10;i++) spheresTick(1/60); });
  await page.waitForTimeout(200);
  await page.screenshot({ path:path.join(SHOTS,'spheres-god.png') });

  console.log(results.join('\n')); console.log('errors:', errors.length?errors.join('\n'):'none');
  await browser.close(); process.exit(results.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
