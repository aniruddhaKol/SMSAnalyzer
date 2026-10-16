const {chromium}=require('playwright'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:30,durationVersion:1})));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../ui/index.html')).href);
 await page.evaluate(()=>{
  const now=Date.now();training=defaultTraining();training.categories=[{id:'sample-grocery',name:'Grocery',color:'#568363'}];
  const raw=Array.from({length:25},(_,i)=>({id:i+1,sender:'AD-KOTAKB-S',date:now-(i+1)*60000,body:'Sent INR '+(500+i)+' from Kotak Bank account XX5555 to Blinkit on 15-10-2026 Ref '+(900000000000+i)+'.'}));
  training.rules=[{id:'t-'+(now-100000),type:'transaction',key:recordKey(raw[0]),category:'1',treatment:'payment'}, {id:'l-'+(now-50000),type:'learning',category:'topic:4',treatment:'unresolved',match:{entities:['Blinkit']},existing:raw.map(recordKey),historyAll:true,future:true,createdAt:now-50000}];
  nativeMessages(raw);payeeView='latest';render();
 });
 await page.locator('.latest-payment .payee-category').first().click();await page.locator('#payee-category-select').selectOption('sample-grocery');await page.getByRole('button',{name:'Preview',exact:true}).click();
 const footer=page.locator('.payee-preview-actions'),scroll=page.locator('.payee-preview-scroll');
 const start=await footer.boundingBox();assert.ok(start.y+start.height<852);assert.equal(await page.locator('.payee-preview-list .learn-example').count(),20);
 await scroll.evaluate(e=>{e.scrollTop=e.scrollHeight});const bottom=await footer.boundingBox();assert.ok(Math.abs(start.y-bottom.y)<1);assert.ok(await page.getByRole('button',{name:'Apply',exact:true}).isVisible());
 await page.getByRole('button',{name:'Load 20 more',exact:true}).click();assert.equal(await page.locator('.payee-preview-list .learn-example').count(),25);assert.ok(Math.abs((await footer.boundingBox()).y-start.y)<1);
 await page.setViewportSize({width:320,height:500});assert.ok((await footer.boundingBox()).y+(await footer.boundingBox()).height<500);await page.screenshot({path:path.resolve(__dirname,'../work/v0156-preview-small.png')});
 await page.getByRole('button',{name:'Apply',exact:true}).click();assert.deepEqual(await page.evaluate(()=>[...new Set(messages.map(learningCategoryLabel))]),['Grocery']);
 assert.equal(await page.locator('.latest-payment .payee-category').first().innerText(),'Grocery');assert.equal(await page.evaluate(()=>training.rules.some(r=>r.type==='transaction')),true);
 assert.equal(await page.evaluate(()=>totalSpend(categoryRecords(filtered(),trainingCore.groups.length))),12800);
 // Newer single-message category wins; a still newer payee category can supersede it.
 assert.deepEqual(await page.evaluate(()=>{const now=Date.now();training.corrections=[{id:'x-'+now,key:recordKey(messages[0]),type:'transaction',category:'0',treatment:'unresolved',updatedAt:now+10}];rebuildTraining();const single=learningCategoryLabel(messages[0]);training.rules.push({...training.rules.at(-1),id:'l-'+(now+20),createdAt:now+20,category:'1'});rebuildTraining();const group=learningCategoryLabel(messages[0]);training.rules.pop();rebuildTraining();const undo=learningCategoryLabel(messages[0]);return [single,group,undo]}),['Food & Dining','Shopping','Food & Dining']);
 assert.equal(await page.evaluate(()=>{const config=trainingClone(training);config.corrections=[];config.rules.find(r=>r.type==='transaction').treatment='own';const m=analyzeWithTraining(rawMessages,config)[0];return isSelfTransfer(m)&&m.amount===0;}),true);
 await page.evaluate(()=>{go('home');openPayeeCategory(recordKey(messages[0]));payeeCategoryDraft.category='';payeeCategoryDraft.preview=true;payeeCategoryForm()});assert.equal(await page.getByRole('button',{name:'Apply',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.locator('#dialog').evaluate(e=>e.classList.contains('payee-preview-dialog')),false);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS latest category wins across legacy/single/payee rules, undo/treatment preserved, docked footer at scroll/pagination and 320x500, Apply gating and Back cleanup');
})().catch(e=>{console.error(e);process.exit(1)});
