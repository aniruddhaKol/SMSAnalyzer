const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:360,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:0})));
 await require('./ui-server.cjs').openUi(page);
 await page.evaluate(()=>{
  training=defaultTraining();rawMessages=Array.from({length:32},(_,i)=>({id:i,sender:'AD-KOTAKB-S',body:'Sent INR '+(100+i)+' from Kotak Bank account XX1234 to Recipient '+i+'. UPI Ref '+(123456789000+i)+'.',date:Date.now()-i*60000}));
  const base=trainingBase();training.categories=Array.from({length:10},(_,i)=>({id:'test-'+i,name:'A category '+i,color:'#66899c'}));
  training.rules=base.slice(0,30).map((m,i)=>({id:'l-'+i,type:'learning',kind:'category',name:'Pattern '+i,category:i<20?'1':'test-'+(i-20),treatment:'unresolved',createdAt:1,future:true,existing:[recordKey(m)],example:recordKey(m),match:{entities:[m.payee.label],senders:[],keywords:[],accounts:[],types:[],direction:'outgoing',amount:100+i}}));
  training.rules.push({id:'search-example',type:'search',name:'Search example',category:'1',query:'Recipient',sender:'',direction:'outgoing',treatment:'unresolved',existing:[],future:true,createdAt:1});
  messages=analyzeWithTraining(rawMessages,training);go('training');learning.step='manage';trainingTab='rules';render();
 });
 const settled=()=>page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);
 await page.locator('[data-training=openRuleGroup][data-id=Shopping]').scrollIntoViewIfNeeded();
 const mainTop=await page.locator('main').evaluate(e=>e.scrollTop);
 await page.locator('[data-training=openRuleGroup][data-id=Shopping]').click();await settled();
 async function openLearning(){const button=page.locator('.rule-group-editor [data-learning=editRule][data-id=l-12]');await button.scrollIntoViewIfNeeded();const top=await page.locator('#dialog-content').evaluate(e=>e.scrollTop);await button.click();await settled();assert.equal(await page.locator('.learning-rule').count(),1);return top;}
 async function restored(top){assert.equal(await page.locator('.rule-group-editor').count(),1);assert.ok(Math.abs(await page.locator('#dialog-content').evaluate(e=>e.scrollTop)-top)<2);assert.ok(Math.abs(await page.locator('main').evaluate(e=>e.scrollTop)-mainTop)<2);assert.equal(await page.evaluate(()=>rulePatternOrigin),null);}
 let top=await openLearning();await page.locator('[data-learning=back]').click();await settled();await restored(top);
 top=await openLearning();await page.evaluate(()=>window.goBack());await restored(top);
 top=await openLearning();await page.locator('.learn-pattern-editor').evaluate(e=>e.open=true);await page.locator('#learn-rule-name').fill('Edited pattern');await page.locator('[data-learning=preview]').click();await settled();
 const editorTop=await page.evaluate(()=>rulePatternOrigin.editorScroll);assert.equal(await page.evaluate(()=>learning.step),'matches');
 await page.evaluate(()=>window.goBack());assert.equal(await page.locator('.learn-pattern-editor').evaluate(e=>e.open),true);assert.equal(await page.locator('#learn-rule-name').inputValue(),'Edited pattern');assert.ok(Math.abs(await page.locator('main').evaluate(e=>e.scrollTop)-editorTop)<2);
 await page.locator('[data-learning=preview]').click();await settled();await page.locator('[data-learning=apply]').click();await settled();await restored(top);assert.equal(await page.locator('.rule-group-editor').innerText().then(t=>t.includes('Edited pattern')),true);
 // Legacy pattern dialogs have a two-level return: preview -> same editor -> group.
 await page.locator('.rule-group-editor [data-training=editSearch]').scrollIntoViewIfNeeded();top=await page.locator('#dialog-content').evaluate(e=>e.scrollTop);
 await page.locator('.rule-group-editor [data-training=editSearch]').click();await settled();assert.equal(await page.locator('[data-rule-editor-back]').count(),1);
 await page.locator('#search-rule-name').fill('Draft search name');await page.locator('[data-training=previewSearch]').click();await settled();await page.evaluate(()=>window.goBack());assert.equal(await page.locator('#search-rule-name').inputValue(),'Draft search name');
 await page.locator('.dialog-x').click();await settled();await restored(top);
 await page.locator('.rule-group-editor [data-training=editSearch]').click();await settled();await page.keyboard.press('Escape');await restored(await page.evaluate(()=>document.querySelector('#dialog-content').scrollTop));
 // Cancel/removal from a pattern row returns to that same group, not Learning home.
 const remove=page.locator('.rule-group-editor [data-training=removeRule][data-id=l-12]');await remove.scrollIntoViewIfNeeded();top=await page.locator('#dialog-content').evaluate(e=>e.scrollTop);await remove.click();await settled();await page.locator('[data-training-remove-cancel]').click();await settled();await restored(top);
 await page.locator('.rule-group-editor [data-training=removeRule][data-id=l-12]').click();await settled();await page.locator('[data-training-remove-confirm]').click();await settled();assert.equal(await page.locator('.rule-group-editor').count(),1);assert.equal(await page.evaluate(()=>training.rules.some(r=>r.id==='l-12')),false);
 await page.locator('[data-rule-group-back]').click();await settled();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);assert.ok(Math.abs(await page.locator('main').evaluate(e=>e.scrollTop)-mainTop)<2);
 await page.evaluate(()=>openCategorySms(0));await page.locator('[data-category-review]').last().scrollIntoViewIfNeeded();const categoryTop=await page.locator('main').evaluate(e=>e.scrollTop);
 await page.locator('[data-category-review]').last().click();await settled();assert.equal(await page.evaluate(()=>learning.context.type),'category');await page.evaluate(()=>window.goBack());assert.equal(await page.evaluate(()=>screen),'categoryMessages');assert.ok(Math.abs(await page.locator('main').evaluate(e=>e.scrollTop)-categoryTop)<2);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS Rules/group/pattern Back, Android Back, preview drafts, Apply, close/Escape, removal/Cancel and both scroll origins');
})().catch(e=>{console.error(e);process.exit(1)});
