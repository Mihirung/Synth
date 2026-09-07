// Lumatable: the phone layout. Trays become pages of the bottom dock, a tap places an object,
// back returns the main tray; the desktop keeps stacked drawers.   node tests/phone.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
const SHOTS=path.join(__dirname,'shots'); fs.mkdirSync(SHOTS,{recursive:true});
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor:2 });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror', e=>errors.push(e.message)); page.on('console', m=>{ if(m.type()==='error' && !/ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname);
    if(!fs.existsSync(p)) return route.fulfill({status:404,body:'nope'}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await page.goto('http://localhost/prototype/index.html');
  await page.tap('#begin'); await page.waitForTimeout(500);
  const info = async()=>page.evaluate(()=>{ const r=id=>{ const el=document.getElementById(id); const b=el.getBoundingClientRect(); return { disp:getComputedStyle(el).display, top:Math.round(b.top), bottom:Math.round(b.bottom) }; };
    return { vh:innerHeight, dock:r('dock'), dock2:r('dock2'), dock3:r('dock3'), back:r('playBack'), tableR:Math.round(TABLE_R), n:objects.length, types:objects.map(o=>o.type).join(',') }; });
  const res=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+' · '+i);
  const b0 = await info();
  await page.tap('#playBtn'); await page.waitForTimeout(400);
  const b1 = await info();
  check('phone: play tray replaces the dock at the bottom, table keeps its size', b1.dock.disp==='none' && b1.dock3.disp==='flex' && b1.dock3.bottom>=b1.vh-2 && b1.tableR>=b0.tableR-2 && b1.back.disp==='flex', JSON.stringify(b1));
  await page.screenshot({ path:path.join(SHOTS,'phone-play.png') });
  // a plain tap on a tray button places the object on the disc
  await page.tap('#dock3 [data-type="theremin"]'); await page.waitForTimeout(300);
  const b2 = await info();
  check('phone: a tap on a tray button places the object on the disc', b2.n===b1.n+1 && /theremin/.test(b2.types), JSON.stringify({n:b2.n, types:b2.types}));
  const onDisc = await page.evaluate(()=>{ const o=objects.find(q=>q.type==='theremin'); return o && Math.hypot(o.x-CX,o.y-CY) < TABLE_R-8; });
  check('placed object sits inside the disc', !!onDisc, String(onDisc));
  await page.tap('#playBack'); await page.waitForTimeout(300);
  const b3 = await info();
  check('back returns the main dock', b3.dock.disp==='flex' && b3.dock3.disp==='none', JSON.stringify(b3.dock));
  await page.tap('#advBtn'); await page.waitForTimeout(300);
  await page.tap('#dock2 [data-type="euclid"]'); await page.waitForTimeout(300);
  const b4 = await info();
  check('advanced page: tap places a puck', b4.dock2.disp==='flex' && b4.dock.disp==='none' && /euclid/.test(b4.types), JSON.stringify({dock2:b4.dock2, types:b4.types}));
  await page.screenshot({ path:path.join(SHOTS,'phone-advanced.png') });
  await page.tap('#advBack'); await page.waitForTimeout(200);
  // desktop: the drawers still stack above the dock
  const d = await browser.newPage({ viewport:{ width:1280, height:800 } });
  await d.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const p=path.join(ROOT,u.pathname); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(p)}); });
  await d.goto('http://localhost/prototype/index.html'); await d.click('#begin'); await d.click('#advBtn'); await d.waitForTimeout(300);
  const dd = await d.evaluate(()=>({ dock:getComputedStyle($('dock')).display, back:getComputedStyle($('advBack')).display, d2top:Math.round($('dock2').getBoundingClientRect().bottom), dockTop:Math.round($('dock').getBoundingClientRect().top) }));
  check('desktop: advanced tray stacks above a visible dock, no back button', dd.dock==='flex' && dd.back==='none' && dd.d2top<=dd.dockTop, JSON.stringify(dd));
  await d.click('[data-type="scene"]'); await d.waitForTimeout(200);
  const dn = await d.evaluate(()=>objects.filter(o=>o.type==='scene').length);
  check('desktop: a click on a tray button places the object too', dn===1, 'scenes='+dn);
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})();
