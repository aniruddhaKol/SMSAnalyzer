// Category groups are the persisted rule structure. Flat patterns retain legacy priority at runtime.
function ruleGroupCategory(rule){
 if(rule.type==='duplicate')return 'action:duplicate';
 if(['own','salary','income','refund'].includes(rule.treatment))return 'action:'+rule.treatment;
 return canonicalTrainingCategory(rule.category)||'action:others';
}
function categoryRuleGroups(config=training){
 const groups=new Map(rulesetCategoryDefinitions(config).map(c=>[c.category,{...c,key:c.name,patterns:[]}]));
 for(const [order,rule] of config.rules.entries()){
  const category=rulesetCategoryKey(ruleGroupCategory(rule)),name=config.categories.find(c=>c.id===category)?.name||(category==='action:duplicate'?'Duplicate SMS':trainingCategoryName(category));
  if(!groups.has(category))groups.set(category,{key:name,category,name,patterns:[]});
  groups.get(category).patterns.push({order,rule});
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
}
function rulesetCategoryKey(value){value=canonicalTrainingCategory(String(value));return ({'topic:3':'2','topic:12':'action:others','5':'action:others'})[value]||value;}
function rulesetCategoryDefinitions(config){
 const entries=[...trainingCore.names.map((name,i)=>({category:rulesetCategoryKey(i),name})),...[2,4,6,7,8,9,10,11,13].map(i=>({category:'topic:'+i,name:trainingCore.groups[i]})),...trainingActionCategories.filter(([key])=>!['recipient','recurring','duplicate'].includes(key)).map(([key,name])=>({category:'action:'+key,name})),...config.categories.map(c=>({category:c.id,name:c.name}))];
 const byId=new Map();for(const c of entries)byId.set(c.category,c);return [...byId.values()];
}
function categoryRulesetEntry(group){
 const list=group.patterns,first=list[0]?.rule||{},rules=list.map(p=>p.rule),union=get=>[...new Set(rules.flatMap(get).filter(Boolean))],common=get=>{const values=rules.map(get);return values.length&&values.every(v=>JSON.stringify(v)===JSON.stringify(values[0]))?values[0]:null;};
 const match={entities:union(r=>r.match?.entities||r.aliases||[]),keywords:union(r=>r.match?.keywords||(r.type==='search'?[r.query]:[])),senders:union(r=>r.match?.senders||(r.sender?[r.sender]:[])),accounts:union(r=>r.match?.accounts||[]),types:union(r=>r.match?.types||[]),direction:common(r=>r.match?.direction||r.direction||'all')||'all',destination:common(r=>r.match?.destination||'')||'',amount:common(r=>r.match?.amount||0)||0,pattern:common(r=>r.match?.pattern||'')||'',senderOnly:!!common(r=>!!r.match?.senderOnly),accountPair:!!common(r=>!!r.match?.accountPair)};
 const rule={...first,id:'set:'+group.category,name:group.name,type:'learning',kind:'category',category:group.category,treatment:common(r=>r.treatment||'unresolved')||'unresolved',match,recurring:!!common(r=>!!r.recurring),future:list.length?!!common(r=>!!r.future):true,historyAll:list.length?!!common(r=>!!r.historyAll):true,existing:union(r=>r.existing||[]),excluded:union(r=>r.excluded||[])};
 delete rule.additionalMatches;delete rule.aliases;delete rule.query;
 const sources=list.map(p=>{const values={},missing=Object.keys(rule).filter(k=>!(k in p.rule));for(const k of Object.keys(p.rule))if(JSON.stringify(p.rule[k])!==JSON.stringify(rule[k]))values[k]=p.rule[k];return {order:p.order,values,missing};});
 return {order:list[0]?.order||0,rule,sources};
}
// Only union OR alternatives when every common guard and output is identical.
// Per-source deltas retain dates, exclusions and interleaved priority on reload.
function compatibleRuleKey(r){
 if(r.type!=='learning'||!r.match||r.additionalMatches?.length||r.match.pattern||r.match.senderOnly||r.match.accountPair||!(r.match.entities?.length||r.match.keywords?.length))return null;
 const {id,name,createdAt,updatedAt,existing,excluded,example,match,...output}=r;
 const {entities,keywords,...guards}=match;
 return JSON.stringify([output,guards]);
}
function consolidateCategoryPatterns(patterns){
 const entries=[],keys=new Map();
 for(const entry of patterns){const key=compatibleRuleKey(entry.rule);if(key&&keys.has(key))keys.get(key).push(entry);else{const list=[entry];entries.push(list);if(key)keys.set(key,list);}}
 return entries.map(list=>{
  if(list.length===1)return list[0];
  const rule=JSON.parse(JSON.stringify(list[0].rule)),union=field=>[...new Set(list.flatMap(p=>p.rule.match[field]||[]))];
  rule.match.entities=union('entities');rule.match.keywords=union('keywords');
  rule.name=trainingCategoryName(ruleGroupCategory(rule))+' · '+trainingTreatmentName(rule.treatment);
  if(rule.name.length>80)rule.name=rule.name.slice(0,80);
  const sources=list.map(p=>{const values={},missing=Object.keys(rule).filter(k=>!(k in p.rule));for(const k of Object.keys(p.rule))if(JSON.stringify(p.rule[k])!==JSON.stringify(rule[k]))values[k]=p.rule[k];return {order:p.order,values,missing};});
  return {order:list[0].order,rule,sources};
 });
}
function expandCategoryPattern(entry){
 return entry.sources?.length?entry.sources.map(s=>{const rule={...entry.rule,...s.values};for(const k of s.missing||[])delete rule[k];return {order:s.order,rule};}):[entry];
}
function consolidatedRuleEntry(id){for(const group of categoryRuleGroups())for(const entry of consolidateCategoryPatterns(group.patterns))if(entry.rule.id===id)return entry;return null;}
function ruleEditorComparable(value){
 const r=JSON.parse(JSON.stringify(value)),p=r.match||{};
 for(const k of ['entities','keywords','senders','accounts','types'])p[k]=p[k]||[];
 for(const k of ['senderOnly','accountPair'])p[k]=!!p[k];
 p.pattern=p.pattern||'';p.destination=p.destination||'';p.amount=Number(p.amount)||0;p.direction=p.direction||'all';
 r.match=p;r.recurring=!!r.recurring;r.future=!!r.future;
 const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
 return JSON.stringify(sort(r));
}
function restoreCategoryRules(value){
 if(!value||![1,2].includes(value.version))throw Error('Unsupported rules');
 if(!Array.isArray(value.rules)){
  if(value.version!==2||!Array.isArray(value.ruleGroups))throw Error('Invalid category rules');
  const patterns=value.ruleGroups.flatMap(g=>g.ruleset?(g.ruleset.sources?.length?expandCategoryPattern(g.ruleset):[]):g.patterns.flatMap(expandCategoryPattern));
  if(patterns.some(p=>!Number.isInteger(p.order)||!p.rule||!p.rule.id))throw Error('Invalid saved pattern');
  value.rules=patterns.sort((a,b)=>a.order-b.order).map(p=>p.rule);
 }
 for(const field of ['rules','accounts','categories'])if(!Array.isArray(value[field]))throw Error('Invalid rules');
 value.version=2;delete value.ruleGroups;delete value.patternFormat;
 if(!Array.isArray(value.corrections))value.corrections=[];
 return value;
}
function categoryRulesStorage(config){
 const {rules,ruleGroups,...rest}=config;
 return {...rest,version:2,patternFormat:2,ruleGroups:categoryRuleGroups(config).map(g=>({category:g.category,name:g.name,ruleset:categoryRulesetEntry(g)}))};
}
function serializeTraining(config){return JSON.stringify(categoryRulesStorage(config));}
function compileLearningMatch(rule){
 const p=rule.match||{},extra=(rule.additionalMatches||[]).map(match=>compileLearningMatch({...rule,additionalMatches:[],match}));
 const senders=new Set((p.senders||[]).map(trainingSenderKey)),accounts=new Set(p.accounts||[]),entities=(p.entities||[]).filter(Boolean),keywords=(p.keywords||[]).filter(Boolean).map(k=>k.toLowerCase());
 const entityKeys=new Set(entities.map(e=>payeeIdentity(e).key)),entityPatterns=entities.map(e=>new RegExp('(^|[^a-z0-9])'+e.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i'));
 const types=(p.types||[]).map(t=>new RegExp('\\b'+t+'\\b','i'));
 return m=>{
  if(extra.some(match=>match(m)))return true;
  if(p.direction==='incoming'&&!m.credit||p.direction==='outgoing'&&!m.debit||p.direction==='other'&&(m.debit||m.credit))return false;
  if(senders.size&&!senders.has(trainingSenderKey(m.sender)))return false;
  if(accounts.size&&!accounts.has(m.sourceAccount)||p.destination&&m.destinationAccount!==p.destination)return false;
  if(p.amount&&Math.abs((m.debit||m.credit||0)-p.amount)>.005)return false;
  if(types.length&&!types.some(re=>re.test(m.body)))return false;
  if(p.senderOnly)return nonTransactionSenderRule(rule);
  if(p.accountPair&&rule.kind==='own'&&accounts.size&&p.destination)return true;
  if(!entities.length&&!keywords.length&&!p.pattern)return !!(accounts.size&&p.destination);
  const identity=learningEntity(m),original=m.trainingOriginalPayee?.label;
  return [identity,original].filter(Boolean).some(n=>entityKeys.has(payeeIdentity(n).key))||entityPatterns.some(re=>re.test(m.body))||keywords.some(k=>m.body.toLowerCase().includes(k))||testSmsPattern(p.pattern,m.body);
 };
}
function buildTrainingIndex(config){
 const runtime=new Map(),recipients=new Map(),search=[],learning=[];
 for(const rule of config.rules){
  runtime.set(rule,{existing:new Set(rule.existing||[]),excluded:new Set(rule.excluded||[]),match:rule.type==='learning'?compileLearningMatch(rule):null});
  if(rule.type==='recipient')for(const alias of new Set((rule.aliases||[]).map(trainingKey))){const list=recipients.get(alias)||[];list.push(rule);recipients.set(alias,list);}
  if(rule.type==='search')search.push(rule);if(rule.type==='learning')learning.push(rule);
 }
 const order=new Map(config.rules.map((r,i)=>[r,i]));
 return {runtime,search,learning,recipientsFor:m=>{if(!m.payee)return [];return [...new Set([...(recipients.get(trainingKey(m.payee.label))||[]),...(recipients.get(trainingKey(m.payee.key))||[])])].sort((a,b)=>order.get(a)-order.get(b));},applies:(rule,m)=>{const r=runtime.get(rule),key=recordKey(m);return !r.excluded.has(key)&&((rule.historyAll&&m.date<=rule.createdAt)||r.existing.has(key)||(rule.future&&m.date>=rule.createdAt));}};
}

let pendingRuleGroupRemoval=null,ruleGroupReturnScroll=0,activeRuleGroup=null,rulePatternOrigin=null;
function groupedRulesBody(){
 const groups=categoryRuleGroups();
 return '<section class="card"><div class="owned-account-list">'+groups.map(g=>managementRow(g.name,g.patterns.length?'Category ruleset':'No conditions yet','openRuleGroup','',g.key)).join('')+'</div></section>';
}
function openRuleGroup(key){
 const group=categoryRuleGroups().find(g=>g.key===key);if(!group)throw Error('Category ruleset no longer exists.');
 activeRuleGroup=key;ruleGroupReturnScroll=document.querySelector('main')?.scrollTop||0;
 modal('<h2>'+esc(group.name)+'</h2><div class="rule-group-editor"><div class="rule-summary-heading"><small>Category ruleset</small><button class="icon rule-silver" data-training="editCategoryRuleset" data-id="'+esc(group.key)+'" aria-label="Edit '+esc(group.name)+'">'+ic('edit')+'</button></div>'+categoryRulesetSummary(group)+'</div><div class="dialog-actions rule-group-back-actions"><button class="secondary" data-rule-group-back>Back</button></div>');
}
function captureRulePatternOrigin(button){
 rulePatternOrigin={group:activeRuleGroup,pattern:button.dataset.id,kind:button.dataset.learning==='editRule'?'learning':'dialog',mainScroll:document.querySelector('main').scrollTop,groupScroll:document.querySelector('#dialog-content').scrollTop,learning:{...learning,skipped:new Set(learning.skipped),excluded:new Set(learning.excluded),extraKeys:new Set(learning.extraKeys)}};
 trainingPending=null;trainingDraft=null;
 // Rules management must not inherit an earlier SMS/category review origin.
 learning.context=null;learning.reviewReturn=null;learning.bucket='all';
 document.querySelector('#dialog').close();
}
function returnRulePatternToGroup(){
 const origin=rulePatternOrigin;if(!origin)return false;
 rulePatternOrigin=null;trainingPending=null;trainingDraft=null;
 document.querySelector('#dialog').close();
 for(const key of Object.keys(learning))if(!(key in origin.learning))delete learning[key];
 Object.assign(learning,origin.learning);learning.step='manage';trainingTab='rules';screen='training';render();
 const main=document.querySelector('main');main.scrollTop=origin.mainScroll;
 const groups=categoryRuleGroups(),group=groups.find(g=>g.key===origin.group)||groups.find(g=>g.patterns.some(p=>p.rule.id===origin.pattern));
 if(group){openRuleGroup(group.key);const content=document.querySelector('#dialog-content');content.scrollTop=origin.groupScroll;[...content.querySelectorAll('button')].find(b=>b.dataset.id===origin.pattern)?.focus({preventScroll:true});content.scrollTop=origin.groupScroll;}
 main.scrollTop=origin.mainScroll;return true;
}
function captureRulePatternEditor(){
 if(!rulePatternOrigin)return;
 rulePatternOrigin.editorScroll=document.querySelector('main').scrollTop;
 rulePatternOrigin.editorOpen=!!document.querySelector('.learn-pattern-editor')?.open;
}
function restoreRulePatternEditor(){
 if(!rulePatternOrigin)return;
 const editor=document.querySelector('.learn-pattern-editor');if(editor)editor.open=!!rulePatternOrigin.editorOpen;
 document.querySelector('main').scrollTop=rulePatternOrigin.editorScroll||0;
}
function restoreTrainingPreviewDraft(){
 if(!trainingDraft)return false;
 const draft=trainingDraft;trainingPending=null;trainingDraft=null;
 document.querySelector('#dialog-title').textContent=draft.title;document.querySelector('#dialog-content').replaceChildren(...draft.nodes);
 document.querySelector('#dialog').classList.toggle('payee-preview-dialog',!!document.querySelector('#dialog .payee-preview-layout'));syncDialogViewport();document.querySelector('#dialog-content').scrollTop=draft.scroll||0;return true;
}
function closeTrainingDialog(){
 if(rulePatternOrigin?.kind==='dialog'&&!document.querySelector('.rule-group-editor')){if(trainingPending&&restoreTrainingPreviewDraft())return;returnRulePatternToGroup();return;}
 document.querySelector('#dialog').close();
}
function decorateRulePatternDialog(content){
 if(rulePatternOrigin?.kind!=='dialog'||content.querySelector('[data-training=previewBack],[data-rule-editor-back],.account-remove-confirm,.rule-group-editor'))return;
 const actions=content.querySelector('.dialog-actions');if(!actions)return;
 actions.classList.remove('single-action');actions.insertAdjacentHTML('afterbegin','<button class="secondary" data-rule-editor-back>'+ic('back')+'Back</button>');
}
function confirmRuleGroupRemoval(key){
 const group=categoryRuleGroups().find(g=>g.key===key);if(!group)throw Error('Category rule no longer exists.');
 pendingRuleGroupRemoval=key;ruleGroupReturnScroll=document.querySelector('main')?.scrollTop||0;
 modal('<h2>Remove category rule?</h2><div class="account-remove-confirm"><p>Remove all '+group.patterns.length+' matching patterns for '+esc(group.name)+'?</p>'+smsDisclaimer('Original SMS stay unchanged. Transactional matches return to Others unless another saved classification applies.')+'<div class="dialog-actions"><button class="secondary" data-rule-group-back>Cancel</button><button class="danger" data-rule-group-confirm>'+ic('trash')+'Remove</button></div></div>');
}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(rulePatternOrigin&&button.hasAttribute('data-training-remove-cancel')){returnRulePatternToGroup();e.stopImmediatePropagation();return;}
 if(document.querySelector('.rule-group-editor')&&(button.dataset.learning==='editRule'||['editRecipient','editSearch','editTransaction','removeRule'].includes(button.dataset.training)))captureRulePatternOrigin(button);
},true);
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;
 try{
  if(button.dataset.training==='openRuleGroup')openRuleGroup(button.dataset.id);
  if(button.dataset.training==='removeRuleGroup')confirmRuleGroupRemoval(button.dataset.id);
  if(button.hasAttribute('data-rule-group-back')){pendingRuleGroupRemoval=null;document.querySelector('#dialog').close();}
  if(button.hasAttribute('data-rule-editor-back'))returnRulePatternToGroup();
  if(button.hasAttribute('data-rule-group-confirm')){
   const group=categoryRuleGroups().find(g=>g.key===pendingRuleGroupRemoval);if(!group)throw Error('Category rule no longer exists.');
   const ids=new Set(group.patterns.map(p=>p.rule.id)),keys=new Set(group.patterns.flatMap(p=>[...(p.rule.existing||[]),p.rule.key,p.rule.keep,p.rule.drop].filter(Boolean)));
   for(const m of messages)if(ids.has(m.trainingRule))keys.add(recordKey(m));
   const config=trainingClone(training);config.rules=config.rules.filter(r=>!ids.has(r.id));config.categoryResets=[...new Set([...(config.categoryResets||[]),...keys])];
   await commitTrainingAsync(config);pendingRuleGroupRemoval=null;document.querySelector('#dialog').close();render();document.querySelector('main').scrollTop=ruleGroupReturnScroll;toast('Category rule removed');
  }
 }catch(error){trainingError(error.message);}
});
if(typeof document.querySelector==='function')document.querySelector('#dialog')?.addEventListener('cancel',e=>{if(rulePatternOrigin?.kind==='dialog'){e.preventDefault();closeTrainingDialog();}});
