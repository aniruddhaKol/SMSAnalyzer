// Preserve live form nodes through confirmations; Save must succeed before leaving.
let editorConfirmResolve=null,editorGuardBypass=false,editingSingleCorrection=null,correctionReturn=null;
function editorConfirmation(title,message,secondary,primary,icon='save'){
 if(editorConfirmResolve)return Promise.resolve(null);
 let dialog=document.getElementById('editor-confirm');if(!dialog){dialog=document.createElement('dialog');dialog.id='editor-confirm';document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();finishEditorConfirmation(null);});dialog.addEventListener('click',e=>{const b=e.target.closest('[data-editor-choice]');if(b)finishEditorConfirmation(b.dataset.editorChoice);});}
 const style=getComputedStyle(document.getElementById('app'));for(const name of ['--chrome','--texture','--control-border'])dialog.style.setProperty(name,style.getPropertyValue(name));
 dialog.innerHTML='<div class="dialog-heading"><h2 id="editor-confirm-title">'+esc(title)+'</h2><button class="icon" data-editor-choice="stay" aria-label="Keep editing">'+ic('close')+'</button></div><p>'+esc(message)+'</p><div class="dialog-actions"><button class="secondary" data-editor-choice="secondary">'+esc(secondary)+'</button><button class="'+(icon==='trash'?'danger taskvilla-remove':'primary')+'" data-editor-choice="primary">'+(icon==='trash'?'':ic(icon))+esc(primary)+'</button></div>';
 dialog.setAttribute('aria-labelledby','editor-confirm-title');dialog.showModal();return new Promise(resolve=>{editorConfirmResolve=resolve;dialog.querySelector('[data-editor-choice=secondary]').focus();});
}
function finishEditorConfirmation(choice){document.getElementById('editor-confirm')?.close();const resolve=editorConfirmResolve;editorConfirmResolve=null;resolve?.(choice);}
function activeEditor(){
 if(document.getElementById('dialog').open){const content=document.getElementById('dialog-content');for(const [selector,kind] of [['.ruleset-editor-layout','ruleset'],['.category-editor-layout','category'],['.single-correction-editor','duplicateCorrection'],['#transaction-key','transaction'],['#teach-name','recipient'],['#search-rule-query','search'],['#account-last4','account'],['#budget-value','budget']]){const node=content.querySelector(selector);if(node)return {root:kind==='transaction'||kind==='recipient'||kind==='search'||kind==='account'||kind==='budget'?content:node,kind};}return null;}
 const root=document.querySelector('main .learning-rule');return root?{root,kind:'learning',key:learning.draft?.id}:null;
}
function editorSnapshot(editor){
 const values=[...editor.root.querySelectorAll('input,select,textarea')].filter(el=>el.id!=='account-bank-search').map(el=>[el.id||el.dataset.tokenInput||'',el.value,el.checked,el.indeterminate,el.dataset.mixed||'']);
 if(editor.kind==='category')values.push(['appearance',categoryEditor?.color,categoryEditor?.icon]);return JSON.stringify(values);
}
const editorBaselines=new WeakMap();let lastLearningBaseline=null;
function trackEditor(){const editor=activeEditor();if(!editor){if(!(screen==='training'&&learning.step==='matches'))lastLearningBaseline=null;return null;}if(!editorBaselines.has(editor.root)){const initial=editor.kind==='learning'&&lastLearningBaseline?.key===editor.key?lastLearningBaseline.value:editorSnapshot(editor);editorBaselines.set(editor.root,initial);if(editor.kind==='learning')lastLearningBaseline={key:editor.key,value:initial};}return editor;}
new MutationObserver(trackEditor).observe(document.getElementById('app'),{childList:true,subtree:true});
new MutationObserver(trackEditor).observe(document.getElementById('dialog-content'),{childList:true,subtree:true});
function flushRuleTokens(root){for(const input of root.querySelectorAll('[data-token-input]'))if(input.value.trim())addRuleToken(input.dataset.tokenInput);}
function transactionEditorConfig(){
 const key=document.querySelector('#transaction-key').value,config=trainingClone(training),old=editingSingleCorrection?(config.corrections||[]).find(c=>c.id===editingSingleCorrection):null;
 const rule={...(old||{}),id:editingSingleCorrection||trainingEditId||'t-'+Date.now(),type:'transaction',key,treatment:document.querySelector('#transaction-treatment').value,category:document.querySelector('#transaction-category').value,updatedAt:Date.now()};
 if(editingSingleCorrection){config.corrections=(config.corrections||[]).filter(r=>r.id!==rule.id&&r.key!==key);config.corrections.push(rule);}else{config.rules=config.rules.filter(r=>r.id!==rule.id&&!(r.type==='transaction'&&r.key===key));config.rules.push(rule);}return config;
}
function finishIndividualCorrection(){if(!correctionReturn)return false;const state=correctionReturn;correctionReturn=null;editingSingleCorrection=null;trainingPending=null;trainingDraft=null;document.getElementById('dialog').close();render();document.querySelector('main').scrollTop=state.scroll;[...document.querySelectorAll('[data-training=editCorrection]')].find(b=>b.dataset.id===state.id)?.focus({preventScroll:true});document.querySelector('main').scrollTop=state.scroll;return true;}
function individualCorrectionDialog(id){
 const c=(training.corrections||[]).find(r=>r.id===id);if(!c)throw Error('Correction no longer exists.');correctionReturn={id,scroll:document.querySelector('main').scrollTop};
 if(c.type!=='duplicate'){const m=trainingMessage(c.key);if(!m)throw Error('The original SMS is not loaded.');trainingRecordDialog(m,c);editingSingleCorrection=id;return;}
 editingSingleCorrection=id;const base=trainingBase(),drop=base.find(m=>recordKey(m)===c.drop),keep=base.find(m=>recordKey(m)===c.keep);if(!drop||!keep)throw Error('The original SMS are not loaded.');
 const candidates=base.filter(m=>recordKey(m)!==c.drop&&Math.abs((m.debit||m.credit)-(drop.debit||drop.credit))<.005&&(m.debit>0)===(drop.debit>0)&&Math.abs(m.date-drop.date)<=2*86400000);
 modal('<h2>Edit SMS correction</h2><div class="single-correction-editor">'+trainingSnippet(drop,true)+'<label>Keep this alert<select id="correction-keep">'+candidates.map(m=>'<option value="'+recordKey(m)+'" '+(recordKey(m)===c.keep?'selected':'')+'>'+esc(m.source.label)+' · '+smsDateTime(m.date)+'</option>').join('')+'</select></label>'+smsDisclaimer('Only this duplicate pair is corrected. No reusable rule is created.')+'<div class="dialog-actions"><button class="secondary" data-single-correction-back>'+ic('back')+'Back</button><button class="primary" data-duplicate-correction-preview>'+ic('preview')+'Preview</button></div></div>');
}
function duplicateCorrectionConfig(){const config=trainingClone(training),c=config.corrections.find(c=>c.id===editingSingleCorrection),key=document.getElementById('correction-keep').value;if(!key||key===c.drop)throw Error('Choose a different alert to keep.');if(config.corrections.some(r=>r.id!==c.id&&r.type==='duplicate'&&(r.drop===key||r.keep===c.drop)))throw Error('This alert already belongs to another duplicate correction.');c.keep=key;c.updatedAt=Date.now();return config;}
async function saveActiveEditor(editor){
 flushRuleTokens(editor.root);
 if(editor.kind==='category'){await saveCategoryEditor();return;}
 if(editor.kind==='budget'){const value=parseBudgetAmount(document.getElementById('budget-value').value);if(!Number.isFinite(value)||value<1||value>100000000)throw Error('Enter a valid monthly budget.');prefs.budget=Math.round(value);save();document.getElementById('dialog').close();render();return;}
 let config;
 if(editor.kind==='ruleset')config=readCategoryRulesetConfig();
 if(editor.kind==='transaction')config=transactionEditorConfig();
 if(editor.kind==='duplicateCorrection')config=duplicateCorrectionConfig();
 if(editor.kind==='learning'){learningReadDraft();const r=learning.draft;learning.matches=trainingBase().filter(m=>!m.duplicate&&learningRuleMatches(r,m));learning.excluded=new Set(r.excluded||[]);config=learningConfig();}
 if(editor.kind==='recipient'||editor.kind==='search'){const rule=editor.kind==='recipient'?readRecipientRule():readSearchRule();config=trainingClone(training);config.rules=config.rules.filter(r=>r.id!==rule.id);config.rules.push(rule);}
 if(editor.kind==='account'){
  const bank=document.getElementById('account-bank').value,last4=document.getElementById('account-last4').value.trim(),id=trainingEditId||'a-'+Date.now();if(!/^\d{4}$/.test(last4))throw Error('Enter exactly four account digits.');config=trainingClone(training);if(config.accounts.some(a=>a.id!==id&&a.bank===bank&&a.last4===last4))throw Error('This account is already saved.');config.accounts=config.accounts.filter(a=>a.id!==id);config.dismissedAccounts=(config.dismissedAccounts||[]).filter(key=>key!==bank+'|'+last4);config.accounts.push({id,bank,last4,name:document.getElementById('account-name').value.trim(),type:document.getElementById('account-type').value});config.ownNames=learnList(document.getElementById('account-owner-names').value);config.ownAliases=learnList(document.getElementById('account-aliases').value);
 }
 if(!config)throw Error('Save this form using its Save button.');
 const scroll=document.querySelector('main').scrollTop;await commitTrainingAsync(config);trainingPending=null;trainingDraft=null;
 if(!finishIndividualCorrection()&&!returnRulePatternToGroup()){document.getElementById('dialog').close();if(editor.kind==='learning'){learning.step='manage';trainingTab='rules';}render();document.querySelector('main').scrollTop=scroll;}toast('Changes saved');
}
async function guardEditorExit(leave){
 if(editorConfirmResolve)return;const editor=trackEditor();if(!editor||editorSnapshot(editor)===editorBaselines.get(editor.root)){editorGuardBypass=true;try{leave();}finally{editorGuardBypass=false;}return;}
 const choice=await editorConfirmation('Save changes?','Your changes have not been saved.','Discard','Save');
 if(choice==='secondary'){editorGuardBypass=true;try{leave();}finally{editorGuardBypass=false;}}
 if(choice==='primary')try{await saveActiveEditor(editor);}catch(error){trainingError(error.message);}
}
const originalEditorBack=window.goBack;window.goBack=()=>{if(editorConfirmResolve){finishEditorConfirmation(null);return true;}if(document.querySelector('.category-picker-overlay'))return originalEditorBack();if(!editorGuardBypass&&activeEditor()){guardEditorExit(()=>originalEditorBack());return true;}return originalEditorBack();};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||editorGuardBypass||editorConfirmResolve)return;
 if(b.matches('[data-rule-editor-back],[data-single-correction-back],[data-category-editor-back],[data-training=accountBack],[data-learning=back],[data-action=dialogClose],[data-go]')&&activeEditor()){e.preventDefault();e.stopImmediatePropagation();guardEditorExit(()=>b.click());}
},true);
const originalCloseTrainingDialog=closeTrainingDialog;closeTrainingDialog=()=>{
 if(!editorGuardBypass&&activeEditor()){guardEditorExit(()=>closeTrainingDialog());return;}
 if(trainingPending&&trainingDraft&&restoreTrainingPreviewDraft())return;
 const correction=!!editingSingleCorrection&&!!activeEditor();originalCloseTrainingDialog();if(correction){editingSingleCorrection=null;correctionReturn=null;}
};
document.getElementById('dialog').addEventListener('cancel',e=>{if(activeEditor()){e.preventDefault();if(!editorGuardBypass)guardEditorExit(()=>closeTrainingDialog());}});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
 if(b.dataset.training==='editCorrection')individualCorrectionDialog(b.dataset.id);
 if(b.hasAttribute('data-single-correction-back')){document.getElementById('dialog').close();editingSingleCorrection=null;correctionReturn=null;}
 if(b.dataset.action==='clearBudget'&&!editorGuardBypass){e.stopImmediatePropagation();const choice=await editorConfirmation('Remove monthly budget?','Remove the saved monthly budget?','Cancel','Remove','trash');if(choice==='primary'){editorGuardBypass=true;try{b.click();}finally{editorGuardBypass=false;}}}
 if(b.hasAttribute('data-duplicate-correction-preview'))await trainingPreview(duplicateCorrectionConfig(),'Preview SMS correction');
}catch(error){trainingError(error.message);} },true);
