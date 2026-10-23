const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:360,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:0})));await require('./ui-server.cjs').openUi(page);
 const settle=()=>page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);
 const checks=await page.evaluate(async()=>{
  training=defaultTraining();rawMessages=Array.from({length:18},(_,i)=>({id:i,sender:'AD-KOTAKB-S',date:Date.now()-i*60000,body:'Sent INR '+(101+i)+' from Kotak Bank account XX1234 to '+['Alpha Demo','Beta Demo','Gamma Demo'][i%3]+'. UPI Ref '+(123456789000+i)+'.'}));
  const base=trainingBase();training.rules=['Alpha Demo','Beta Demo','Gamma Demo'].map((name,i)=>({id:'l-demo-'+i,type:'learning',name:name+' payment',kind:'payment',category:'2',treatment:'payment',match:{entities:[name],keywords:[],senders:[],accounts:[],types:[],direction:'outgoing',amount:0,destination:'',pattern:'',senderOnly:false},future:true,historyAll:true,existing:base.filter(m=>m.payee?.label===name).map(recordKey),excluded:[],createdAt:Date.now()-i*100,example:recordKey(base[i]),recurring:false,recipientName:''}));
  const stored=categoryRulesStorage(training),entries=stored.ruleGroups.flatMap(g=>g.patterns);
  if(entries.length!==1||entries[0].rule.match.entities.length!==3||entries[0].sources.length!==3)throw Error('Compatible recipients not consolidated');
  const restored=restoreCategoryRules(trainingClone(stored));
  if(JSON.stringify(restored.rules)!==JSON.stringify(training.rules))throw Error('Priority, scope or metadata lost');
  messages=analyzeWithTraining(rawMessages,training);const before=JSON.stringify(messages);
  if(before!==JSON.stringify(analyzeWithTraining(rawMessages,restored)))throw Error('Consolidation changed analysis');
  const guards=trainingClone(training);guards.rules[1].match.accounts=['9999'];guards.rules[2].recurring=true;
  if(categoryRulesStorage(guards).ruleGroups.flatMap(g=>g.patterns).length!==3)throw Error('Different conditions merged');
  const worker=await analyseInWorker(restored);if(JSON.stringify(worker)!==before)throw Error('Worker changed outputs');
  go('training');learning.step='manage';trainingTab='rules';render();return {before:JSON.stringify(training.rules)};
 });
 await page.locator('[data-training=openRuleGroup]').click();await settle();assert.equal(await page.locator('.rule-summary-card').count(),1);
 const silver=await page.locator('.rule-summary-actions button').evaluateAll(bs=>bs.map(b=>getComputedStyle(b).backgroundImage));assert.equal(silver[0],silver[1]);
 await page.locator('.rule-summary-card [data-learning=editRule]').click();await settle();assert.equal(await page.locator('.rule-editor h2').innerText(),'Edit rule');assert.equal(await page.locator('[data-token-list=learn-entities]>span').count(),3);
 // Untouched editing/preview is exactly a no-op, despite optional match defaults.
 await page.locator('[data-learning=preview]').click();await settle();assert.equal(await page.evaluate(()=>JSON.stringify(learningConfig().rules)),checks.before);
 await page.locator('[data-learning=back]').click();await settle();assert.equal(await page.locator('[data-token-list=learn-entities]>span').count(),3);
 await page.locator('[data-token-input=learn-entities]').fill('Delta Demo');await page.locator('[data-token-add=learn-entities]').click();await settle();assert.equal(await page.locator('[data-token-list=learn-entities]>span').count(),4);
 await page.locator('[data-token-remove=learn-entities][data-index="3"]').click();await settle();assert.equal(await page.locator('[data-token-list=learn-entities]>span').count(),3);
 await page.locator('#learn-rule-name').fill('Bills & Utilities · Outgoing payments');await page.locator('[data-learning=preview]').click();await settle();assert.equal(await page.evaluate(()=>learningConfig().rules.length),1);
 await page.locator('[data-learning=apply]').click();await settle();assert.equal(await page.locator('.rule-group-editor').count(),1);assert.equal(await page.evaluate(()=>training.rules.length),1);
 // Deletion cancels safely, then removes the entire visible consolidated rule.
 await page.locator('.rule-summary-card [data-training=removeRule]').click();await settle();await page.locator('[data-training-remove-cancel]').click();await settle();assert.equal(await page.locator('.rule-group-editor').count(),1);assert.equal(await page.evaluate(()=>training.rules.length),1);
 for(const width of [320,393]){await page.setViewportSize({width,height:850});assert.ok(await page.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth));}
 await page.locator('.rule-summary-card [data-learning=editRule]').click();await settle();assert.ok(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:'work/rules-editor-v0106.png',fullPage:true});await page.evaluate(()=>window.goBack());assert.equal(await page.locator('.rule-group-editor').count(),1);
 await page.locator('.rule-summary-card [data-training=removeRule]').click();await settle();await page.locator('[data-training-remove-confirm]').click();await settle();assert.equal(await page.evaluate(()=>training.rules.length),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS compatible consolidation, exact scoped round trip/analysis, worker equality, no-op preview, chips, edit/Apply, Back, delete confirmation and narrow layouts');
})().catch(e=>{console.error(e);process.exit(1)});
