// Lumatable: widescreen layout. On a wide window the tray sits on the left, the buttons on the right, the drawers beside the tray, and the disc takes the whole height; a squarer window keeps the classic layout.   node tests/wide.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
const SHOTS=path.join(__dirname,'shots'); fs.mkdirSync(SHOTS,{recursive:true});
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const res=[]; const errors=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  const open = async(w,h)=>{ const p = await browser.newPage({ viewport:{ width:w, height:h } });
    p.on('pageerror', e=>errors.push('pageerror: '+e.message));
    await p.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const f=path.join(ROOT,u.pathname); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(f)}); });
    await p.goto('http://localhost/prototype/index.html'); await p.click('#begin'); await p.waitForTimeout(300); return p; };
  const layout = p => p.evaluate(()=>{ const r=id=>{ const b=document.getElementById(id); if(!b || b.hidden) return null; const q=b.getBoundingClientRect(); return { l:Math.round(q.left), t:Math.round(q.top), r:Math.round(q.right), b:Math.round(q.bottom), w:Math.round(q.width), h:Math.round(q.height) }; };
    const hb=document.querySelector('header').getBoundingClientRect();
    return { W:innerWidth, H:innerHeight, wide: WIDE.matches, dock:r('dock'), dock2:r('dock2'), dock3:r('dock3'), header:{ l:Math.round(hb.left), t:Math.round(hb.top), w:Math.round(hb.width), h:Math.round(hb.height) },
             CX:Math.round(CX), CY:Math.round(CY), R:Math.round(TABLE_R), chipsCol: getComputedStyle(document.querySelector('.chips')).flexDirection, n: objects.length }; });

  // 1. a 16:9 window: everything to the sides, the disc full height and centred between the columns
  const p = await open(1600, 800);
  const a = await layout(p);
  const discFits = a.dock.r + 6 < a.CX - a.R && a.CX + a.R < a.header.l - 6;
  check('wide: the tray is a column on the left, the buttons a column on the right, the disc fills the height between them', a.wide && a.dock.l < 40 && a.dock.h > a.dock.w && a.dock.h > 300 && a.header.l > a.W - 200 && a.header.h >= a.H - 2 && a.chipsCol==='column' && a.R >= a.H/2 - 16 && Math.abs(a.CY - a.H/2) <= 1 && discFits && Math.abs((a.CX - a.dock.r) - (a.header.l - a.CX)) < 40, JSON.stringify(a));

  // 2. the drawers open beside the tray, not above it, and the disc moves over to make room
  await p.click('#advBtn'); await p.waitForTimeout(250);
  const b = await layout(p);
  check('wide: the advanced drawer stands beside the tray, the disc shifts right to clear it', b.dock2 && b.dock2.l > b.dock.r && b.dock2.l < b.dock.r + 40 && b.dock2.h > b.dock2.w && Math.abs(b.dock2.t + b.dock2.h/2 - b.H/2) < 40 && b.CX > a.CX + 40 && b.CX - b.R > b.dock2.r, JSON.stringify({ dock:b.dock, dock2:b.dock2, CX:b.CX, R:b.R }));
  await p.click('[data-type="scene"]'); await p.waitForTimeout(150);
  await p.click('#playBtn'); await p.waitForTimeout(250);
  const c = await layout(p);
  check('wide: the play drawer replaces the advanced one in the same place; a click places a puck on the disc', !c.dock2 && c.dock3 && c.dock3.l > c.dock.r && c.n === a.n + 1, JSON.stringify({ dock3:c.dock3, n:c.n }));
  const placed = await p.evaluate(()=>{ const o=objects.find(x=>x.type==='scene'); return o ? Math.hypot(o.x-CX,o.y-CY) < TABLE_R : false; });
  check('wide: the placed puck sits inside the disc', placed);
  await p.click('#playBtn'); await p.waitForTimeout(250);
  await p.screenshot({ path:path.join(SHOTS,'wide.png') });

  // 3. the header chips still work in their column: BPM up
  const bpm0 = await p.evaluate(()=>state.bpm); await p.click('#bpmUp'); const bpm1 = await p.evaluate(()=>state.bpm);
  check('wide: the BPM buttons in the side column work', bpm1 === bpm0 + 4, bpm0+' → '+bpm1);

  // 4. a squarer window keeps the classic layout: header across the top, tray along the bottom
  const q = await open(1100, 800);
  const d = await layout(q);
  check('classic: a 1100×800 window keeps the header on top and the tray at the bottom', !d.wide && d.header.t === 0 && d.header.w >= d.W - 2 && d.dock.b >= d.H - 20 && d.dock.w > d.dock.h && d.chipsCol==='row', JSON.stringify(d));

  // 5. resizing the same page from wide to squarer and back re-lays the table and keeps the pucks on the disc
  await p.setViewportSize({ width:1000, height:800 }); await p.waitForTimeout(250);
  const e = await layout(p);
  await p.setViewportSize({ width:1600, height:800 }); await p.waitForTimeout(250);
  const f = await layout(p);
  const inside = await p.evaluate(()=>objects.every(o=>Math.hypot(o.x-CX,o.y-CY) < TABLE_R));
  check('resize: squarer goes classic, wide again goes back to the sides, the pucks stay on the disc', !e.wide && e.dock.w > e.dock.h && f.wide && f.dock.h > f.dock.w && inside, JSON.stringify({ e:{wide:e.wide,dock:e.dock}, f:{wide:f.wide,dock:f.dock}, inside }));

  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
