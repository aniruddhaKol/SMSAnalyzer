const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage({viewport:{width:393,height:852}});await p.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:30})));await require('./ui-server.cjs').openUi(p);
for(const theme of ['wood','stone','brick','bookshelves']){
 const styles=await p.evaluate(theme=>{prefs.theme=theme;go('insights');const read=selector=>{const e=document.querySelector(selector),s=getComputedStyle(e);return [s.backgroundImage,s.backgroundColor,s.color,s.boxShadow,s.borderRadius]};const ref=[read('.trend-tabs'),read('.trend-tabs [aria-pressed=true]'),read('.trend-tabs [aria-pressed=false]')];go('training');learning.step='manage';trainingTab='categories';render();return {ref,actual:[read('.training-tabs'),read('.training-tabs [aria-pressed=true]'),read('.training-tabs [aria-pressed=false]')]};},theme);assert.deepEqual(styles.actual,styles.ref);assert.equal(await p.locator('.training-tabs').evaluate(e=>getComputedStyle(e).position),'static');
 for(const width of [320,393]){await p.setViewportSize({width,height:852});assert.equal(await p.locator('.training-tabs').evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await p.locator('.training-tabs button').evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth)),true)}
}
await b.close();console.log('PASS Learning tabs match Trends in all four themes; no overflow at 320/393px');})().catch(e=>{console.error(e);process.exit(1)});

