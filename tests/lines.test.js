// Lumatable: cutting and mending lines by touch, and the reach of purple blocks.   node tests/lines.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive:true });
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:''}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html'); await page.tap('#begin'); await page.waitForTimeout(400);
  const res=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+' · '+i);
  const r = await page.evaluate(async()=>{
    for(const o of [...objects]) destroyObject(o);
    const s = spawn('sampler', CX-0.55*TABLE_R, CY-0.3*TABLE_R); computePatch();
    const seg = connEnds(s);
    // a wobbly tap a finger's width off the line, a quarter of the way along it
    const qx = seg.x1+(seg.x2-seg.x1)*0.3, qy = seg.y1+(seg.y2-seg.y1)*0.3;
    const dx=seg.x2-seg.x1, dy=seg.y2-seg.y1, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
    const tx = qx+nx*14*S, ty = qy+ny*14*S;
    const ev=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:3,pointerType:'touch',pressure:0.5,bubbles:true}));
    const wobble = async()=>{ ev('pointerdown',tx,ty); for(let i=0;i<6;i++){ ev('pointermove',tx+Math.sin(i)*4,ty+Math.cos(i)*4); await new Promise(r=>setTimeout(r,10)); } ev('pointerup',tx+2,ty+1); };
    await wobble(); const cut = s.muted;
    await wobble(); const mended = !s.muted;
    // a swipe across the line still cuts it
    const mx = seg.x1+dx*0.6, my = seg.y1+dy*0.6;
    ev('pointerdown', mx+nx*40*S, my+ny*40*S); for(let i=1;i<=8;i++) ev('pointermove', mx+nx*(40-10*i)*S, my+ny*(40-10*i)*S); ev('pointerup', mx-nx*40*S, my-ny*40*S);
    const swiped = s.muted;
    // purple reach: an lfo binds from further away than before
    const osc = spawn('osc', CX+0.3*TABLE_R, CY+0.2*TABLE_R); const lfo = spawn('lfo', osc.x, osc.y - 0.49*TABLE_R); computePatch();
    return { cut, mended, swiped, reach: CTL_LINK()/TABLE_R, bound: lfo.hop===osc.id };
  });
  check('a wobbly tap beside a line cuts it, a second tap mends it, a swipe still cuts', r.cut && r.mended && r.swiped, JSON.stringify(r));
  check('purple blocks reach 52% of the disc', Math.abs(r.reach-0.52)<1e-6 && r.bound, JSON.stringify({reach:r.reach, bound:r.bound}));
  await page.waitForTimeout(300); await page.screenshot({ path:path.join(SHOTS,'lines-phone.png') });
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(x=>x.startsWith('FAIL'))||errors.length?1:0);
})();
