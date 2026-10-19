// Regression: a custom category must not remain as a stale display override.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:393,height:852}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:30,durationVersion:1})));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../ui/index.html')).href);
 await page.evaluate(()=>{
  const now=Date.now(),raw=[{id:1,sender:'AD-KOTAKB-S',date:now-10000,body:'Sent INR 500 from Kotak Bank account XX5555 to Asha Demo Ref 123456789012.'}];
  training=defaultTraining();training.categories=[{id:'sample-grocery',name:'Grocery',color:'#568363'}];
  training.rules=[{id:'sample-category',type:'learning',kind:'category',category:'sample-grocery',treatment:'unresolved',match:{entities:['Asha Demo']},existing:raw.map(recordKey),historyAll:true,future:true,createdAt:now}];
  nativeMessages(raw);payeeView='latest';render();
 });
 assert.equal(await page.locator('.latest-payment .payee-category').innerText(),'Grocery');
 await page.locator('.latest-payment .payee-category').click();await page.waitForFunction(()=>!window.buttonFeedbackPending);await page.locator('#payee-category-select').selectOption('0');
 await page.getByRole('button',{name:'Preview',exact:true}).click();await page.waitForFunction(()=>!window.buttonFeedbackPending);await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 assert.equal(await page.locator('.latest-payment .payee-category').innerText(),'Food & Dining');
 assert.deepEqual(await page.evaluate(()=>({custom:messages[0].customCategoryId||null,spending:spendNames[messages[0].spendGroup],food:totalSpend(categoryRecords(filtered(),15)),ring:spendBreakdown(filtered())[0]})),{custom:null,spending:'Food & Dining',food:500,ring:500});
 await page.evaluate(()=>{payeeView='top';render()});assert.equal(await page.locator('.merchant-meta .payee-category').innerText(),'Food & Dining');
 // Rebuild and future matching reapply the old rule before the new rule.
 await page.evaluate(()=>{nativeMessages([...rawMessages,{id:2,sender:'AD-KOTAKB-S',date:Date.now()+1000,body:'Sent INR 700 from Kotak Bank account XX5555 to Asha Demo Ref 123456789013.'}]);});
 assert.deepEqual(await page.evaluate(()=>messages.map(learningCategoryLabel)),['Food & Dining','Food & Dining']);
 // Undo restores the older custom category rather than discarding the old rule.
 await page.evaluate(()=>{training.rules.pop();rebuildTraining();render()});assert.deepEqual(await page.evaluate(()=>messages.map(learningCategoryLabel)),['Grocery','Grocery']);
 await page.evaluate(()=>{go('training');learningOpen(recordKey(messages[0]),'identified');learning.choice='category';learning.category='0';learning.remember=false;learningSaveSingle();});
 assert.deepEqual(await page.evaluate(()=>messages.map(learningCategoryLabel)),['Food & Dining','Grocery']);
 assert.equal(await page.evaluate(()=>messages[0].customCategoryId||null),null);
 // Topic replacement, another custom category, and invalid values.
 assert.deepEqual(await page.evaluate(()=>{const m={...messages[1]};trainingCategory(m,'topic:15',training);const a=[m.customCategoryId||null,learningCategoryLabel(m)];trainingCategory(m,'sample-grocery',training);const b=m.customCategoryId;trainingCategory(m,'invalid-category',training);return [a,b,m.customCategoryId];}),[[null,'Food & Dining'],'sample-grocery','sample-grocery']);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS custom-to-standard category replacement: Latest payments, Top payee, category amounts/pie, future matching, rebuild, undo, single correction and topic/invalid safeguards');
})().catch(e=>{console.error(e);process.exit(1)});
