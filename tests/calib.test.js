// Lumatable: while the camera calibrates, no overlay may cover a calibration dot: the camera preview, trays and header step aside, on a phone and on a wide screen.   node tests/calib.test.js
let pw; try{ pw = require('playwright'); }catch(e){ pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async()=>{
  const browser = await chromium.launch({ executablePath:CHROME, args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const res=[]; const errors=[]; const check=(n,ok,i)=>res.push((ok?'PASS ':'FAIL ')+n+(i?' · '+i:''));
  const probe = async(page, label)=>{
    await page.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const f=path.join(ROOT,u.pathname); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(f)}); });
    page.on('pageerror', e=>errors.push('pageerror: '+e.message));
    await page.goto('http://localhost/prototype/index.html'); await page.click('#begin'); await page.waitForTimeout(300);
    const r = await page.evaluate(async()=>{
      $('camWrap').hidden = false; $('calChip').hidden = false;   // the camera is on and its preview shows, as when tracking
      const covered = ()=>calibTargets().map(t=>{ const el=document.elementFromPoint(t.x, t.y); return el ? (el.id || el.tagName.toLowerCase()) : 'none'; });
      const before = covered();
      camCalibrate();                                  // the four dots, one at a time
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const during = covered(), cls = document.body.classList.contains('calib');
      const vis = ['camWrap','dock','header'].map(id=>{ const el = id==='header' ? document.querySelector('header') : $(id); return getComputedStyle(el).visibility; });
      cam.calib = null;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const after = covered(), cls2 = document.body.classList.contains('calib'), visAfter = getComputedStyle($('camWrap')).visibility;
      return { before, during, cls, vis, after, cls2, visAfter };
    });
    check(label+': every calibration dot is on bare canvas while calibrating, the preview, tray and header are hidden, and they come back after', r.during.every(x=>x==='stage') && r.cls && r.vis.every(v=>v==='hidden') && !r.cls2 && r.visAfter==='visible', JSON.stringify(r));
  };
  const phone = await browser.newContext({ ...devices['iPhone 13'] }); const pp = await phone.newPage(); await probe(pp, 'phone (mirrored to a TV)');
  const wide = await browser.newPage({ viewport:{ width:1600, height:800 } }); await probe(wide, 'widescreen');
  const classic = await browser.newPage({ viewport:{ width:1100, height:800 } }); await probe(classic, 'classic');
  console.log(res.join('\n')); console.log('errors', errors);
  await browser.close(); process.exit(res.some(r=>r.startsWith('FAIL'))||errors.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
