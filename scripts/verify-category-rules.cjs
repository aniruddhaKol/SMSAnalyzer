// Synthetic migration, matching, incremental analysis, grouped Rules UI and rollback checks.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:360,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:0}));
  if(!localStorage.getItem('smsanalyzer.training'))localStorage.setItem('smsanalyzer.training',JSON.stringify({version:1,threshold:10000,accounts:[],categories:[],corrections:[],rules:[
   {id:'pattern-alpha',type:'learning',name:'Alpha',category:'1',treatment:'unresolved',kind:'category',match:{entities:['Alpha Demo'],direction:'outgoing'},future:true,createdAt:1},
   {id:'pattern-beta',type:'learning',name:'Beta',category:'1',treatment:'unresolved',kind:'category',match:{entities:['Beta Demo'],direction:'outgoing'},future:true,createdAt:2},
   {id:'pattern-security',type:'learning',name:'Security',category:'topic:2',treatment:'unresolved',kind:'category',match:{keywords:['OTP'],direction:'other'},future:true,createdAt:3}
  ]}));
 });
 await require('./ui-server.cjs').openUi(page);
 assert.equal(await page.evaluate(()=>training.version),2);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('smsanalyzer.training')).rules),undefined);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('smsanalyzer.training')).ruleGroups.length),2);
 await page.evaluate(()=>{
  rawMessages=Array.from({length:240},(_,i)=>({id:i,sender:i%3?'AD-KOTAKB-S':'AD-VERIFY-S',date:Date.now()-i*60000,body:i%3?'Sent INR '+(100+i)+' from Kotak Bank account XX1234 to '+(i%2?'Alpha Demo':'Beta Demo')+'. UPI Ref '+(123456789000+i)+'.':'123456 is your OTP. Do not share.'}));
  messages=analyzeWithTraining(rawMessages,training);
 });
 const checks=await page.evaluate(async()=>{
  const base=trainingBase(),config=trainingClone(training),storage=serializeTraining(config),restored=restoreCategoryRules(JSON.parse(storage));
  if(JSON.stringify(config.rules)!==JSON.stringify(restored.rules))throw Error('Migration changed priority');
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const compare=async c=>{const result=await analyseInWorker(c),stats=window.lastAnalysisStats,full=analyzeWithTraining([],c,structuredClone(base));if(!same(result,full))throw Error('Incremental/full mismatch');return stats;};
  await compare(config);const edit=trainingClone(config);edit.rules[0].category='4';edit.rules[0].updatedAt=Date.now();const fast=await compare(edit);
  if(fast.mode!=='incremental'||fast.processed>=fast.total)throw Error('Narrow change did not remain incremental');
  const correction=trainingClone(edit);correction.corrections.push({id:'x-one',type:'transaction',key:recordKey(base.find(m=>m.debit>0)),category:'0',treatment:'unresolved',updatedAt:Date.now()+1});await compare(correction);
  const removed=trainingClone(config);removed.rules=removed.rules.filter(r=>r.id!=='pattern-alpha');removed.categoryResets=[recordKey(base.find(m=>m.debit>0))];await compare(removed);
  const restricted={id:'guarded',type:'learning',kind:'category',category:'1',treatment:'unresolved',future:true,createdAt:1,match:{entities:['Alpha Demo'],senders:['AD-KOTAKB-S'],accounts:['1234'],direction:'outgoing',types:['UPI'],amount:101},additionalMatches:[{keywords:['OTP'],direction:'other'}]};
  const compiled=compileLearningMatch(restricted);for(const m of base)if(!!compiled(m)!==!!learningRuleMatches(restricted,m))throw Error('Matcher guards changed');
  const nextRaw=[...rawMessages,{id:1001,sender:'AD-KOTAKB-S',date:Date.now(),body:'Sent INR 765 from Kotak Bank account XX1234 to Alpha Demo. UPI Ref 999123456789.'}],oldRaw=rawMessages;rawMessages=nextRaw;const nextResult=await analyseInWorker(config);if(!same(nextResult,analyzeWithTraining(nextRaw,config))||lastAnalysisStats.mode!=='full')throw Error('New inbox dataset reused old results');rawMessages=oldRaw;
  const patterned=trainingClone(config);patterned.rules.push({...restricted,id:'regex',additionalMatches:[],match:{pattern:makeSmsPattern(base.find(m=>m.debit>0).body),direction:'outgoing'}});await compare(patterned);
  const originalPersist=persistTrainingAsync,before=JSON.stringify(training),beforeMessages=JSON.stringify(messages);persistTrainingAsync=()=>Promise.reject(Error('Synthetic write failure'));
  try{await commitTrainingAsync(edit);throw Error('Failed save was accepted');}catch(e){if(e.message==='Failed save was accepted')throw e;}finally{persistTrainingAsync=originalPersist;}
  if(before!==JSON.stringify(training)||beforeMessages!==JSON.stringify(messages)||trainingBusy||document.querySelector('#analysis-overlay').open)throw Error('Failed commit changed state');
  return {fast,groups:categoryRuleGroups(training).length};
 });
 assert.equal(checks.groups,2);
 await page.evaluate(()=>{go('training');learning.step='manage';trainingTab='rules';render();});
 assert.equal(await page.locator('[data-training=openRuleGroup]').count(),2);
 await page.locator('[data-training=openRuleGroup]').first().click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 assert.equal(await page.locator('.rule-group-editor').count(),1);await page.locator('[data-rule-group-back]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 await page.locator('[data-training=removeRuleGroup]').first().click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 assert.equal(await page.locator('.account-remove-confirm').count(),1);await page.locator('[data-rule-group-back]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 assert.equal(await page.evaluate(()=>training.rules.length),3);
 for(const width of [320,393]){await page.setViewportSize({width,height:800});assert.equal(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth),true);}
 await page.locator('[data-training=removeRuleGroup][data-id="Shopping"]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending);
 await page.locator('[data-rule-group-confirm]').click();await page.waitForFunction(()=>!window.buttonFeedbackPending&&!window.trainingBusy);
 assert.equal(await page.evaluate(()=>training.rules.length),1);assert.ok(await page.evaluate(()=>messages.filter(m=>m.debit>0).every(m=>learningCategoryLabel(m)==='Others')));
 await page.reload();assert.equal(await page.evaluate(()=>training.rules.length),1);assert.equal(await page.evaluate(()=>categoryRuleGroups().length),1);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS v1→category-group storage and priority; scoped compiled matching; incremental/full equality; single corrections, regex, removal and failed-save rollback; grouped Rules controls');
})().catch(error=>{console.error(error);process.exit(1)});
