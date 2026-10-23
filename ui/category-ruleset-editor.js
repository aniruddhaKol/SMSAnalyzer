// One category owns one ruleset. Legacy source scopes remain private matching
// metadata so viewing or editing another field cannot widen a bank restriction.
let categoryRulesetEditor=null;
function rulesetValues(group){
 const rules=group.patterns.map(p=>p.rule),entry=categoryRulesetEntry(group),common=get=>{const v=rules.map(get);return !v.length?undefined:v.every(x=>JSON.stringify(x)===JSON.stringify(v[0]))?v[0]:null;};
 return {entry,entities:entry.rule.match.entities,keywords:entry.rule.match.keywords,patterns:[...new Set(rules.flatMap(r=>[r.match?.pattern,...(r.additionalMatches||[]).map(m=>m.pattern)]).filter(Boolean))],treatment:common(r=>r.treatment||'unresolved'),direction:common(r=>r.match?.direction||r.direction||'all'),amount:common(r=>r.match?.amount||0),future:common(r=>!!r.future),history:common(r=>!!r.historyAll),recurring:common(r=>!!r.recurring),senders:common(r=>r.match?.senders||(r.sender?[r.sender]:[])),accounts:common(r=>r.match?.accounts||[]),destination:common(r=>r.match?.destination||''),types:common(r=>r.match?.types||[])};
}
function categoryRulesetSummary(group){
 const v=rulesetValues(group),cell=(label,value,wide=false)=>ruleField(label,esc(value),wide);
 return (!group.patterns.length?'<p class="muted">No matching conditions yet. Edit this ruleset to add names or keywords.</p>':'')+'<div class="rule-detail-grid">'+cell('Match entities',v.entities.join(' · ')||'None',true)+cell('Keywords',v.keywords.join(' · ')||'None',true)+cell('Treatment',v.treatment===null?'Per match':trainingTreatmentName(v.treatment||'unresolved'))+cell('Direction',v.direction===null?'Per match':ruleDirectionLabel({direction:v.direction||'all'}))+(v.patterns.length?cell('SMS formats',String(v.patterns.length)+' saved format'+(v.patterns.length===1?'':'s'),true):'')+cell('Amount',v.amount===null?'Per match':v.amount?money(v.amount):'Any amount')+cell('History',v.history===null?'Per match':v.history?'All history':'Selected SMS')+'</div>';
}
function openCategoryRulesetEditor(key){
 const group=categoryRuleGroups().find(g=>g.key===key);if(!group)throw Error('Category no longer exists.');
 const v=rulesetValues(group);categoryRulesetEditor={key,category:group.category,initial:v,group:trainingClone(group)};
 const choice=(id,items,value,fallback)=>'<select id="'+id+'">'+(value===null?'<option value="__keep">Keep individual restrictions</option>':'')+items.map(([val,label])=>'<option value="'+esc(val)+'" '+(value!==null&&val===(value??fallback)?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select>';
 const field=(id,value,placeholder='')=>'<input id="'+id+'" value="'+esc(Array.isArray(value)?value.join(', '):value??'')+'" placeholder="'+esc(value===null?'Keep individual restrictions':placeholder)+'">';
 const toggle=(id,label,value)=>ruleOptionToggle(id,label,value??id!=='set-recurring',value===null);
 modal('<h2>'+esc(group.name)+'</h2><div class="payee-preview-layout ruleset-editor-layout"><div class="payee-preview-scroll"><div class="rule-detail-grid">'+ruleField('Rule name','<strong>'+esc(group.name)+'</strong>',true)+ruleField('Treatment',choice('set-treatment',Object.entries({unresolved:'Keep automatic treatment',payment:'Payment',own:'Self-transfer',salary:'Salary',income:'Income / credit',refund:'Refund / reversal',ignore:'Not a transaction'}),v.treatment,'unresolved'))+ruleField('Direction',choice('set-direction',[['all','All SMS'],['incoming','Incoming only'],['outgoing','Outgoing only'],['other','Other SMS']],v.direction,'all'))+'</div><details class="rule-form-section" open><summary>Matching conditions '+ic('chevronDown')+'</summary>'+ruleTokens('set-entities','Match entities',v.entities)+ruleTokens('set-keywords','Keywords',v.keywords)+'<div class="rule-detail-grid">'+ruleField('Amount',field('set-amount',v.amount, '0 = any amount'))+ruleField('Transaction types',field('set-types',v.types,'UPI, IMPS, NEFT'))+'</div><details class="rule-restrictions"><summary>Account and SMS restrictions '+ic('chevronDown')+'</summary><div class="rule-detail-grid">'+ruleField('Sender IDs',field('set-senders',v.senders,'Any sender'),true)+ruleField('Source · last four',field('set-accounts',v.accounts,'Any account'))+ruleField('Destination · last four',field('set-destination',v.destination,'Any account'))+ruleField('SMS text patterns','<textarea id="set-patterns" rows="3" aria-label="SMS text patterns">'+esc(v.patterns.join('\n'))+'</textarea><small>One pattern per line</small>',true)+'</div></details></details><details class="rule-form-section" open><summary>Additional options '+ic('chevronDown')+'</summary><div class="rule-option-rows">'+toggle('set-future','Apply to future SMS',v.future)+toggle('set-history','Apply to all history',v.history)+toggle('set-recurring','Recurring payment',v.recurring)+'</div></details>'+smsDisclaimer('Existing account and SMS restrictions are retained unless changed. Preview the result before applying.')+'</div><div class="dialog-actions payee-preview-actions"><button class="secondary" data-rule-editor-back>'+ic('back')+'Back</button><button class="primary" data-ruleset-preview>'+ic('preview')+'Preview</button></div></div>');
 document.querySelectorAll('.ruleset-editor-layout [data-mixed]').forEach(el=>el.indeterminate=true);
}
function readCategoryRulesetConfig(){
 const state=categoryRulesetEditor,v=state.initial,config=trainingClone(training),base=trainingBase(),byKey=new Map(base.map(m=>[recordKey(m),m])),get=id=>document.getElementById(id).value.trim(),entities=learnList(get('set-entities')),keywords=learnList(get('set-keywords'));
 const patterns=[...new Set(document.getElementById('set-patterns').value.split('\n').map(x=>x.trim()).filter(Boolean))];for(const pattern of patterns)validateSmsPattern(pattern);
 const changed=(value,old)=>JSON.stringify(value)!==JSON.stringify(old),optional=(id,old,list=false)=>{const value=get(id);if(old===null&&!value)return undefined;return list?learnList(value):value;};
 const treatment=get('set-treatment'),direction=get('set-direction'),amount=get('set-amount'),updates={};
 if(treatment!=='__keep'&&treatment!==(v.treatment??'unresolved'))updates.treatment=treatment;
 const future=document.getElementById('set-future'),history=document.getElementById('set-history'),recurring=document.getElementById('set-recurring');
 for(const [field,input,old] of [['future',future,v.future],['historyAll',history,v.history],['recurring',recurring,v.recurring]])if(!input.dataset.mixed&&(old===null||input.checked!==(old??(field!=='recurring'))))updates[field]=input.checked;
 const patch={};if(direction!=='__keep'&&direction!==(v.direction??'all'))patch.direction=direction;
 if(!(v.amount===null&&!amount)){if(!Number.isFinite(Number(amount))||Number(amount)<0)throw Error('Enter a valid amount.');if(Number(amount)!==(v.amount??0))patch.amount=Number(amount);}
 for(const [field,id,list] of [['senders','set-senders',true],['accounts','set-accounts',true],['destination','set-destination',false],['types','set-types',true]]){const value=optional(id,v[field],list);if(value!==undefined&&changed(value,v[field]??(list?[]:'')))patch[field]=value;}
 if(patch.accounts?.some(a=>!/^\d{4}$/.test(a))||patch.destination&&!/^\d{4}$/.test(patch.destination))throw Error('Use only the last four account digits.');
 const entityChanged=changed(entities,v.entities),keywordChanged=changed(keywords,v.keywords),patternChanged=changed(patterns,v.patterns),ids=new Set(state.group.patterns.map(p=>p.rule.id)),removed=new Set(),keys=new Set();
 config.rules=config.rules.flatMap(original=>{
  if(!ids.has(original.id))return [original];const r=trainingClone(original);Object.assign(r,updates);
  if(r.type==='learning'){
   r.match={...r.match,...patch};
   if(entityChanged)r.match.entities=(r.match.entities||[]).filter(e=>entities.includes(e));
   if(keywordChanged)r.match.keywords=(r.match.keywords||[]).filter(k=>keywords.includes(k));
   if(patternChanged){if(r.match.pattern&&!patterns.includes(r.match.pattern))r.match.pattern='';r.additionalMatches=(r.additionalMatches||[]).filter(m=>!m.pattern||patterns.includes(m.pattern));}
   if(entityChanged||keywordChanged||patternChanged){r.existing=(r.existing||[]).filter(k=>byKey.has(k)&&learningRuleMatches(r,byKey.get(k)));for(const key of original.existing||[])if(!r.existing.includes(key))keys.add(key);if(!r.match.entities?.length&&!r.match.keywords?.length&&!r.match.pattern&&!r.match.senderOnly&&!r.match.accountPair&&!r.additionalMatches?.length){removed.add(r.id);for(const key of original.existing||[])keys.add(key);return [];}}
  }else if(r.type==='recipient'&&entityChanged){r.aliases=r.aliases.filter(e=>entities.includes(e));if(!r.aliases.length){removed.add(r.id);return [];}}
  else if(r.type==='search'&&keywordChanged&&!keywords.includes(r.query)){removed.add(r.id);return [];}
  if(r.type==='search'){if(patch.direction)r.direction=patch.direction;if(patch.senders)r.sender=patch.senders[0]||'';}
  if(r.type==='learning'&&r.match.accountPair&&(!r.match.accounts?.length||!r.match.destination))throw Error('Keep both account suffixes for a self-transfer account pair.');
  if(r.type==='learning'&&r.treatment==='salary'&&r.match.direction!=='incoming')throw Error('Salary rules require Incoming only.');
  return [r];
 });
 const addedEntities=entities.filter(e=>!v.entities.includes(e)),addedKeywords=keywords.filter(k=>!v.keywords.includes(k)),addedPatterns=patterns.filter(p=>!v.patterns.includes(p));
 if(addedEntities.length||addedKeywords.length||addedPatterns.length){
  if((v.treatment===null&&treatment==='__keep')||(v.direction===null&&direction==='__keep'))throw Error('Choose a treatment and direction for the new names or keywords.');
  const r={id:'l-'+Date.now(),type:'learning',name:state.group.name,kind:state.category==='action:own'?'own':'category',category:state.category,treatment:treatment==='__keep'?'unresolved':treatment,createdAt:Date.now(),future:future.checked,historyAll:history.checked,recurring:recurring.checked,existing:[],excluded:[],match:{entities:addedEntities,keywords:addedKeywords,senders:patch.senders||v.senders||[],accounts:patch.accounts||v.accounts||[],destination:patch.destination??v.destination??'',types:patch.types||v.types||[],amount:patch.amount??v.amount??0,direction:direction==='__keep'?'all':direction,pattern:addedPatterns[0]||'',senderOnly:false}};r.additionalMatches=addedPatterns.slice(1).map(pattern=>({...r.match,entities:[],keywords:[],pattern}));
  if(r.treatment==='salary'&&r.match.direction!=='incoming')throw Error('Salary rules require Incoming only.');
  if(history.checked)r.existing=base.filter(m=>learningRuleMatches(r,m)).map(recordKey);config.rules.push(r);
 }
 for(const m of messages)if(removed.has(m.trainingRule))keys.add(recordKey(m));
 if(keys.size)config.categoryResets=[...new Set([...(config.categoryResets||[]),...keys])];
 return config;
}
document.addEventListener('change',e=>{if(e.target.matches('.ruleset-editor-layout input[type=checkbox]'))delete e.target.dataset.mixed;});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
 if(b.dataset.training==='editCategoryRuleset'){captureRulePatternOrigin(b);openCategoryRulesetEditor(b.dataset.id);}
 if(b.hasAttribute('data-ruleset-preview'))await trainingPreview(readCategoryRulesetConfig(),'Preview '+categoryRulesetEditor.group.name);
}catch(error){trainingError(error.message);}});
