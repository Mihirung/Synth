// Lumatable: the ? help panel: three tabs, opens and closes, on desktop and a phone.   node tests/help.test.js
const { chromium, devices } = (()=>{ try{ return require('playwright'); }catch(e){ return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs=require('fs'), path=require('path'); const ROOT=path.resolve(__dirname,'..');
(async()=>{
  const browser = await chromium.launch({ executablePath:process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args:['--use-gl=angle','--use-angle=swiftshader'] });
  const serve = async p => p.route('http://localhost/**', route=>{ const u=new URL(route.request().url()); const f=path.join(ROOT,u.pathname); if(!fs.existsSync(f)) return route.fulfill({status:404,body:''}); route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(f)}); });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } }); await serve(page);
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://localhost/prototype/index.html'); await page.click('#begin'); await page.click('#helpChip'); await page.waitForTimeout(300);
  const a = await page.evaluate(()=>({ shown: getComputedStyle($('hint')).display!=='none', pages: [...document.querySelectorAll('#hint .page')].map(p=>p.dataset.page+':'+(p.hidden?'off':'on')).join(' ') }));
  await page.screenshot({ path:path.join(ROOT,'tests/shots/help-start.png') });
  await page.click('#hint .tab[data-page="play"]'); await page.waitForTimeout(200);
  const b = await page.evaluate(()=>[...document.querySelectorAll('#hint .page')].map(p=>p.dataset.page+':'+(p.hidden?'off':'on')).join(' '));
  await page.screenshot({ path:path.join(ROOT,'tests/shots/help-play.png') });
  await page.click('#hint .tab[data-page="grown"]'); await page.waitForTimeout(200);
  await page.click('#hintClose'); await page.waitForTimeout(100);
  const c = await page.evaluate(()=>getComputedStyle($('hint')).display);
  console.log(JSON.stringify({a,b,closed:c,errors}));
  const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const m = await ctx.newPage(); await serve(m);
  await m.goto('http://localhost/prototype/index.html'); await m.tap('#begin'); await m.tap('#helpChip'); await m.waitForTimeout(300);
  await m.screenshot({ path:path.join(ROOT,'tests/shots/help-phone.png') });
  await browser.close();
  process.exit(a.shown && /start:on play:off/.test(a.pages) && /start:off play:on/.test(b) && c==='none' && !errors.length ? 0 : 1);
})();
