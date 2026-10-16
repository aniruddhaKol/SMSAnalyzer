// Synthetic source-account evidence. No personal inbox, aliases or account suffixes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,range:30,durationVersion:1})));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../ui/index.html')).href);
 const result=await page.evaluate(()=>{
  training=defaultTraining();const now=Date.now(),raw=[
   {id:1,sender:'AD-PNBSMS-S',date:now-86400000,body:'Your PNB account XX1234 debited INR 400 to Demo Market. Ref PNB123456789.'},
   {id:2,sender:'AD-PNBSMS-S',date:now,body:'Your PNB account XX1234 credited INR 800. Ref PNB123456790.'},
   {id:3,sender:'AD-PNBSMS-S',date:now,body:'Your NEFT INR 400 credited to Beneficiary AC NO. XX9999. Ref PNB123456789.'},
   {id:4,sender:'AD-HDFCBK-S',date:now-86400000,body:'INR 300 spent on HDFC Bank card XX7777 Ref CARD12345678.'},
   {id:5,sender:'AD-HDFCBK-S',date:now,body:'INR 350 spent on HDFC Bank card XX7777 Ref CARD12345679.'},
   {id:6,sender:'AD-SBIINB-S',date:now-86400000,body:'Loan account XX6666 credited INR 10000 Ref LOAN12345678.'},
   {id:7,sender:'AD-SBIINB-S',date:now,body:'Loan account XX6666 debited INR 2000 EMI Ref LOAN12345679.'}
  ];nativeMessages(raw);const detected=training.accounts.map(a=>({bank:a.bank,last4:a.last4,detected:a.detected}));training.accounts.push({id:'demo-hdfc',bank:'HDFC BANK',last4:'5555',name:'Demo savings',type:'savings'});go('training');learning.step='manage';trainingTab='accounts';render();return {detected,count:indianBanks.length,icons:indianBanks.map(b=>b.icon)};
 });
 assert.ok(result.count>=1500);for(const file of result.icons)assert.ok(fs.existsSync(path.resolve(__dirname,'../ui',file)),file);
 assert.deepEqual(result.detected,[{bank:'PUNJAB NATIONAL BANK',last4:'1234',detected:true}]);
 assert.match(await page.locator('[data-training=addAccount]').evaluate(el=>getComputedStyle(el).backgroundImage),/241, 250, 233/);
 await page.evaluate(()=>{trainingTab='recipients';render()});for(const action of ['newCategory','newRecipient'])assert.equal(await page.locator('[data-training='+action+'] svg').count(),0);await page.evaluate(()=>{trainingTab='accounts';render()});
 for(const width of [320,360,393]){await page.setViewportSize({width,height:852});await page.evaluate(()=>{learning.step='home';render()});assert.equal(await page.locator('[data-learning=addCategory] svg').count(),0);assert.equal(await page.locator('.learning-manage-actions button').evaluateAll(buttons=>buttons.every(b=>{const r=document.createRange();r.selectNodeContents(b);return r.getClientRects().length===1})),true);await page.evaluate(()=>{learning.step='manage';trainingTab='recipients';render()});assert.equal(await page.locator('[data-training=newCategory],[data-training=newRecipient]').evaluateAll(buttons=>buttons.every(b=>{const r=document.createRange();r.selectNodeContents(b);return r.getClientRects().length===1})),true);}
 await page.evaluate(()=>{trainingTab='accounts';render()});
 assert.equal(await page.locator('.owned-account-row').count(),2);assert.ok(await page.locator('[data-training=addAccount] svg').count());
 const editStyle=await page.locator('.account-edit').first().evaluate(el=>{const s=getComputedStyle(el),i=getComputedStyle(el.querySelector('svg'));return [s.backgroundImage,s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.boxShadow,s.width,s.height,s.padding,i.width,i.height]});
 await page.evaluate(()=>go('settings'));const budgetStyle=await page.locator('.budget-edit').evaluate(el=>{const s=getComputedStyle(el),i=getComputedStyle(el.querySelector('svg'));return [s.backgroundImage,s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.boxShadow,s.width,s.height,s.padding,i.width,i.height]});assert.deepEqual(editStyle,budgetStyle);
 await page.evaluate(()=>{go('training');learning.step='manage';trainingTab='accounts';render()});assert.match(await page.locator('.account-remove').first().evaluate(el=>getComputedStyle(el).backgroundImage),/255, 240, 238/);
 const rows=await page.locator('.owned-account-row').evaluateAll(rows=>rows.map(r=>({color:getComputedStyle(r).backgroundColor,right:r.getBoundingClientRect().right,edit:r.querySelector('.account-edit').getBoundingClientRect().toJSON(),remove:r.querySelector('.account-remove').getBoundingClientRect().toJSON()})));
 assert.notEqual(rows[0].color,rows[1].color);assert.equal(rows[0].edit.x,rows[0].remove.x);assert.ok(rows[0].edit.y<rows[0].remove.y);
 await page.locator('[data-training=editAccount][data-id=demo-hdfc]').click();assert.equal(await page.locator('#account-type').inputValue(),'savings');
 const labels=await page.locator('#account-type option').allTextContents();for(const word of ['Savings','Current','Salary','NRE','NRO','FCNR','Fixed','Recurring','Provident','Overdraft','Loan','Other'])assert.ok(labels.some(x=>x.includes(word)),word);
 assert.ok(await page.locator('#account-bank option').count()>1000);await page.locator('#account-bank-search').fill('Punjab National');assert.ok(await page.locator('#account-bank option').count()<=3);assert.equal(await page.locator('#account-bank').inputValue(),'HDFC BANK');
 await page.locator('#account-type').selectOption('current');await page.locator('#account-name').fill('Demo current');
 assert.equal(await page.locator('[data-training=accountBack]').count(),1);await page.locator('.account-editor-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal(await page.evaluate(()=>document.querySelector('.payee-preview-actions').getBoundingClientRect().top>=document.querySelector('.account-editor-scroll').getBoundingClientRect().bottom-1),true);
 const preview=page.getByRole('button',{name:'Preview',exact:true});assert.equal(await preview.locator('svg').count(),1);await preview.click();assert.equal(await page.locator('[data-training=commit] svg').count(),1);
 await page.setViewportSize({width:320,height:500});await page.locator('.payee-preview-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
 await page.waitForFunction(()=>{const f=document.querySelector('.payee-preview-actions').getBoundingClientRect(),p=document.querySelector('.payee-preview-scroll').getBoundingClientRect();return f.bottom<=innerHeight&&f.top>=p.bottom-1});
 const rects=await page.evaluate(()=>({footer:document.querySelector('.payee-preview-actions').getBoundingClientRect().toJSON(),pane:document.querySelector('.payee-preview-scroll').getBoundingClientRect().toJSON(),height:innerHeight}));assert.ok(rects.footer.bottom<=rects.height&&rects.footer.top>=rects.pane.bottom-1);
 await page.locator('[data-training=previewBack]').click();assert.equal(await page.locator('#account-type').inputValue(),'current');assert.equal(await page.locator('#account-name').inputValue(),'Demo current');assert.equal(await page.locator('#dialog').evaluate(e=>e.classList.contains('payee-preview-dialog')),true);
 await page.getByRole('button',{name:'Preview',exact:true}).click();await page.locator('[data-training=commit]').click();assert.equal(await page.evaluate(()=>training.accounts.find(a=>a.id==='demo-hdfc').type),'current');
 await page.locator('[data-training=removeAccount]').first().click();assert.match(await page.locator('#dialog-title').innerText(),/Remove owned account/);assert.equal(await page.evaluate(()=>training.accounts.length),2);assert.equal(await page.locator('.training-impact,.training-sms,.payee-preview-layout').count(),0);await page.locator('[data-account-cancel]').click();assert.equal(await page.evaluate(()=>training.accounts.length),2);
 await page.locator('[data-training=removeAccount]').first().click();await page.locator('[data-account-remove]').click();assert.equal(await page.evaluate(()=>training.accounts.length),1);
 await page.evaluate(()=>nativeMessages(rawMessages));assert.equal(await page.evaluate(()=>training.accounts.length),1);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS offline catalogue/icons, source-only detection, card/loan/beneficiary guards, account types/search, alternate rows/right actions, confirmation/cancel, docked preview, draft restoration, action icons and detection dismissal');
})().catch(e=>{console.error(e);process.exit(1)});
