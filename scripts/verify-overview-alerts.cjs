// Synthetic due notices; unpaid amounts must never become actual spending.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:393,height:852},timezoneId:'Asia/Kolkata'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-16T12:00:00+05:30'));
 await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:7,durationVersion:1})));
 await require('./ui-server.cjs').openUi(page);
 await page.evaluate(()=>{
  training=defaultTraining();const now=Date.now(),raw=[],add=(id,sender,body,age=1)=>raw.push({id,sender,body,date:now-age*86400000});
  add(1,'AD-AXISBK-S','Electricity bill INR 500 due 19 Oct 2026.',45);add(2,'VM-AXISBK-S','Electricity bill INR 500 due 19 Oct 2026.');
  add(3,'AD-KOTAKB-S','Your card bill INR 1200. Payment due date: 27/10/2026.');
  add(4,'AD-HDFCBK-S','Your bill INR 200 due on 01/11/2026.');
  add(5,'AD-AXISBK-S','Payment INR 500 has been successfully paid for bill due 19 Oct 2026.');
  add(6,'AD-AXISBK-S','Your bill INR 600 due 01 Oct 2026.');add(7,'AD-AXISBK-S','Your bill INR 700 due 31 Feb 2027.');
  add(8,'AD-VERIFY-S','123456 is your OTP. Bill due 20 Oct 2026.');add(9,'AD-PRIZE-P','Lottery winner claim your reward! Payment INR 900 due 22 Oct 2026.');
  add(10,'AD-AXISBK-S','Your bill INR 100 is due soon.');add(11,'AD-HDFCBK-S','Your electricity bill INR 1111 due 30 Oct 2026.',45);
  for(let i=0;i<22;i++)add(20+i,'AD-KOTAKB-S','Your utility bill INR '+(2000+i)+' due 10 Nov 2026.');
  nativeMessages(raw);
 });
 assert.equal(await page.locator('[data-overview-alert=bills] strong').innerText(),'26');assert.equal(await page.locator('[data-overview-alert=bills] small').innerText(),'Bills due');
 assert.equal(await page.locator('[data-overview-alert=otp] strong').innerText(),'1');assert.equal(await page.locator('[data-overview-alert=spam] strong').innerText(),'1');
 assert.equal(await page.evaluate(()=>totalSpend(messages)),500);assert.ok(await page.evaluate(()=>dueBills(messages).some(m=>m.date<analysisWindow().start)));
 for(const width of [320,360,393]){await page.setViewportSize({width,height:852});assert.equal(await page.locator('.overview-stat small').evaluateAll(labels=>labels.every(label=>label.scrollWidth<=label.clientWidth+1)),true);assert.equal(await page.locator('.overview-stat').evaluateAll(cards=>cards.every(c=>c.scrollWidth<=c.clientWidth+1)),true);}
 await page.evaluate(()=>{alignOverviewCounts()});const centred=await page.evaluate(()=>[...document.querySelectorAll('.overview-stat')].every(card=>{const g=overviewCountGeometry(card);return Math.abs(g.numberInkCentre-(g.iconInkRight+g.cardRight)/2)<.01}));assert.equal(centred,true);
 await page.locator('[data-overview-alert=bills]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.equal(await page.locator('.learning-record').count(),20);assert.match(await page.locator('main').innerText(),/19 Oct/);assert.ok(await page.locator('[data-sms-key]').count());
 await page.locator('[data-action=moreCategorySms]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.equal(await page.locator('.learning-record').count(),26);assert.match(await page.locator('main').innerText(),/27 Oct/);await page.locator('[data-category-review]').first().click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.match(await page.locator('header h1').innerText(),/Upcoming bills/);await page.evaluate(()=>goBack());assert.equal(await page.locator('.learning-record').count(),26);await page.evaluate(()=>goBack());
 await page.locator('[data-overview-alert=otp]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.equal(await page.locator('.learning-record').count(),1);await page.locator('[data-category-review]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.match(await page.locator('header h1').innerText(),/OTPs detected/);await page.evaluate(()=>goBack());await page.evaluate(()=>goBack());
 await page.locator('[data-overview-alert=spam]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);assert.equal(await page.locator('.learning-record').count(),1);await page.evaluate(()=>goBack());
 await page.evaluate(()=>trainingAccountDialog());const sort=list=>[...list].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true}));
 const banks=await page.locator('#account-bank option').allTextContents(),types=await page.locator('#account-type option').allTextContents();assert.deepEqual(banks,sort(banks));assert.deepEqual(types,sort(types));assert.equal(await page.locator('#account-type').inputValue(),'savings');await page.locator('#account-bank-search').fill('bank of');const filtered=await page.locator('#account-bank option').allTextContents();assert.deepEqual(filtered,sort(filtered));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS alphabetical bank/type lists with selected values retained; all-upcoming bills, date/duplicate/paid/invalid guards, original SMS/pagination, OTP/spam previews and compact card labels at 320/360/393px');
})().catch(e=>{console.error(e);process.exit(1)});
