// Aniruddha DuttaChowdhury · ADChowdhury. All catalogue and artwork remain offline.
const bankAccountTypes=[['savings','Savings account'],['current','Current account'],['salary','Salary account'],['basic','Basic savings / Jan Dhan'],['nre','NRE account'],['nro','NRO account'],['fcnr','FCNR deposit'],['fixed','Fixed deposit'],['recurring','Recurring deposit'],['ppf','Public Provident Fund (PPF)'],['sukanya','Sukanya Samriddhi'],['cash-credit','Cash credit'],['overdraft','Overdraft'],['loan','Loan account'],['credit-card','Credit card'],['debit-card','Debit card'],['other','Other account']].sort((a,b)=>a[1].localeCompare(b[1],'en',{sensitivity:'base',numeric:true}));
const bankNameToken=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const bankLookup=new Map();
for(const bank of indianBanks){for(const name of [bank.code,bank.key,bank.name,bank.registeredName,...(bank.aliases||[])])bankLookup.set(bankNameToken(name),bank);}
const bankSmsAliases={PNBSMS:'PUNB',PNBOTP:'PUNB',PUNJAB:'PUNB',BOBTXN:'BARB',BOBSMS:'BARB',CANBNK:'CNRB',CANARA:'CNRB',BOIIND:'BKID',BOIOTP:'BKID',IOBCHN:'IOBA',IDFCFB:'IDFB',IDFCBK:'IDFB',INDUSB:'INDB',INDUS:'INDB',UNIONB:'UBIN',UBISMS:'UBIN',UNION:'UBIN',YESBNK:'YESB',YESBANK:'YESB',BANDBN:'BDBL',BANDHN:'BDBL',RBLBNK:'RATN',RBLSMS:'RATN',KARNBK:'KARB',KVBANK:'KVBL',TMBANK:'TMBL',SBIBNK:'SBIN',SBICMP:'SBIN',SBIPSG:'SBIN',SBIUPI:'SBIN',SBIINB:'SBIN',CBSSBI:'SBIN',YONOSBI:'SBIN',SIBSMS:'SIBL',IDBIBK:'IBKL',DCBBNK:'DCBL',INDBNK:'IDIB',CENBNK:'CBIN',UCOSMS:'UCBA',UCOBNK:'UCBA',AUBANK:'AUBL',AUFBNK:'AUBL',EQUITB:'ESFB',UJJIVN:'UJVN',JANSFB:'JSFB',IPBMSG:'IPOS',IPPB:'IPOS',FINOPB:'FINO',HSBCIN:'HSBC',SCBANK:'SCBL'};
for(const [alias,code] of Object.entries(bankSmsAliases)){const bank=indianBanks.find(b=>b.code===code);if(bank)bankLookup.set(alias,bank);}
function lookupBank(value){const raw=String(value||'').trim(),key=bankNameToken(raw.toUpperCase().replace(/^[A-Z]{2}[-\s]+(?=[A-Z])/,'').replace(/[-_\s]+[PSGT]$/,''));return bankLookup.get(key)||bankLookup.get(bankNameToken(raw))||null;}
function accountTypeLabel(type){return bankAccountTypes.find(([key])=>key===type)?.[1]||(type==='bank'?'Bank account':'Other account');}
function bankOptions(selected,query=''){const search=String(query).trim().toLowerCase(),seen=new Set();return indianBanks.filter(b=>{if(seen.has(b.key))return false;seen.add(b.key);return b.key===selected||!search||[b.name,b.registeredName,b.code].some(v=>v.toLowerCase().includes(search));}).sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true})||a.code.localeCompare(b.code)).map(b=>'<option value="'+esc(b.key)+'" '+(b.key===selected?'selected':'')+'>'+esc(b.name)+'</option>').join('');}
function sourceAccountCandidates(raw,config,parsed=null){
 const groups=new Map(),saved=new Set(config.accounts.map(a=>a.bank+'|'+a.last4)),dismissed=new Set(config.dismissedAccounts||[]),records=parsed||reconcileTransactions(assembleSmsRecords(raw).map(m=>classify({...m})));
 for(const m of records){
  if(m.duplicate||m.sourceKind!=='account'||!m.sourceAccount||!lookupBank(m.source.key)||m.loan||m.isOtp||!m.debit&&!m.credit||beneficiaryConfirmation(m.body)||/\b(?:credit card|debit card|loan|beneficiary|beneficiary registration|added as|request|will be|due|penalty)\b/i.test(m.body))continue;
  const key=m.source.key+'|'+m.sourceAccount;if(saved.has(key)||dismissed.has(key))continue;
  const evidence=groups.get(key)||{bank:m.source.key,last4:m.sourceAccount,records:[],references:new Set(),days:new Set(),sides:new Set()};evidence.records.push(m);if(m.reference)evidence.references.add(m.reference);evidence.days.add(new Date(m.date).toDateString());evidence.sides.add(m.debit?'outgoing':'incoming');groups.set(key,evidence);
 }
 const accounts=[...groups.values()].filter(e=>e.references.size>=2&&(e.sides.size===2||e.days.size>=2)&&e.records.length>=2).map(e=>({id:'detected-'+bankNameToken(e.bank)+'-'+e.last4,bank:e.bank,last4:e.last4,name:(lookupBank(e.bank)?.name||e.bank)+' account',type:e.records.every(m=>/\bPPF\b/i.test(m.body))?'ppf':'other',detected:true,evidenceCount:e.references.size}));
 return accounts.concat(cardCandidates(records,saved,dismissed));
}
// Cards come from repeated spend alerts on different days. They label spend sources only; own-transfer matching ignores them.
const isCardAccount=a=>a.type==='credit-card'||a.type==='debit-card';
function cardCandidates(records,saved,dismissed){
 const groups=new Map();
 for(const m of records){
  if(m.duplicate||m.sourceKind!=='card'||!m.sourceAccount||!(m.debit>0)||!lookupBank(m.source.key)||m.isOtp||m.loan)continue;
  const credit=/\bcredit\s+card\b|\b(?:avl|available)\.?\s+(?:credit\s+)?limit\b/i.test(m.body),debit=/\bdebit\s+card\b/i.test(m.body);
  if(!credit&&!debit)continue;
  const key=m.source.key+'|'+m.sourceAccount;if(saved.has(key)||dismissed.has(key))continue;
  const evidence=groups.get(key)||{bank:m.source.key,last4:m.sourceAccount,count:0,days:new Set(),credit:0,debit:0};
  evidence.count++;evidence.days.add(new Date(m.date).toDateString());if(credit)evidence.credit++;else evidence.debit++;groups.set(key,evidence);
 }
 return [...groups.values()].filter(e=>e.count>=2&&e.days.size>=2).map(e=>{const type=e.credit>=e.debit?'credit-card':'debit-card';return {id:'detected-'+bankNameToken(e.bank)+'-'+e.last4,bank:e.bank,last4:e.last4,name:(lookupBank(e.bank)?.name||e.bank)+(type==='credit-card'?' credit card':' debit card'),type,detected:true,evidenceCount:e.count};});
}
function discoverAndSaveAccounts(raw,parsed=null){const found=sourceAccountCandidates(raw,training,parsed);if(!found.length)return;const config=trainingClone(training);config.accounts.push(...found);persistTraining(config);training=config;}
let pendingAccountRemoval=null;
function confirmRemoveAccount(id){const account=training.accounts.find(a=>a.id===id);if(!account)throw Error('Account no longer exists.');pendingAccountRemoval=id;modal('<h2>Remove owned account?</h2><div class="account-remove-confirm"><p id="account-remove-message">Remove “'+esc(account.name||lookupBank(account.bank)?.name||account.bank)+'” (••'+esc(account.last4)+') from your saved accounts? Your SMS remain unchanged.</p><div class="dialog-actions"><button class="secondary" data-account-cancel>Cancel</button><button class="danger" data-account-remove>Remove</button></div></div>');document.querySelector('[data-account-cancel]').focus();}
document.addEventListener('click',async e=>{if(e.target.closest('[data-account-cancel]')){document.querySelector('#dialog').close();pendingAccountRemoval=null;}if(!e.target.closest('[data-account-remove]'))return;try{const id=pendingAccountRemoval,account=training.accounts.find(a=>a.id===id);if(!account)throw Error('Account no longer exists.');const config=trainingClone(training),scroll=document.querySelector('main').scrollTop;config.dismissedAccounts=[...new Set([...(config.dismissedAccounts||[]),account.bank+'|'+account.last4])];config.accounts=config.accounts.filter(a=>a.id!==id);await commitTrainingAsync(config);pendingAccountRemoval=null;document.querySelector('#dialog').close();render();document.querySelector('main').scrollTop=scroll;toast('Owned account removed');}catch(error){trainingError(error.message);}});
function accountList(){return '<section class="card account-list-card"><div class="management-toolbar">'+trainingButton('addAccount',ic('plus')+'Add account','',true)+'</div>'+ownerNameCard()+smsDisclaimer('Accounts detected from repeated source-account transaction alerts, and cards from repeated spend alerts, are labelled Detected. Review account types and ownership; beneficiary details alone do not establish ownership.')+'<div class="owned-account-list">'+training.accounts.map(a=>'<article class="owned-account-row"><div class="account-identity">'+brandIcon(a.bank)+'<strong>'+esc(a.name||lookupBank(a.bank)?.name||a.bank)+'</strong></div><div class="account-meta">'+esc(lookupBank(a.bank)?.name||a.bank)+' · ••'+esc(a.last4)+'<small>'+esc(accountTypeLabel(a.type))+(a.detected?' · Detected':'')+'</small></div><button class="icon bevel account-edit" data-training="editAccount" data-id="'+esc(a.id)+'" aria-label="Edit '+esc(a.name||a.bank)+'">'+ic('edit')+'</button><button class="icon account-remove" data-training="removeAccount" data-id="'+esc(a.id)+'" aria-label="Remove '+esc(a.name||a.bank)+'">'+ic('trash')+'</button></article>').join('')+'</div>'+(!training.accounts.length?emptyListImage():'')+'</section>';}
function actionIcons(root=document){for(const button of root.querySelectorAll('button')){const text=button.textContent.trim();if(/^(?:Load(?: \d+)? more|Show more|Reload\b)/i.test(text)){button.classList.add('secondary','load-more-control');if(!button.querySelector('.load-more-icon'))button.insertAdjacentHTML('afterbegin','<img class="load-more-icon" src="assets/load-more-wood.png" alt="">');}let type=/^(?:Apply|Save)\b/i.test(text)?'save':/^Preview\b/i.test(text)?'preview':/^Add\b/i.test(text)?'plus':/^Back$/i.test(text)?'back':null;if(type&&!button.querySelector('svg,.action-icon'))button.insertAdjacentHTML('afterbegin',ic(type));}}
// Owner-name suggestion from greetings in identity and service SMS. It is saved to "Your name variants" only after confirmation.
const OWNER_NAME_STOP=new Set('customer customers cardholder card member user sir madam valued investor subscriber consumer patron policyholder applicant taxpayer shareholder client account holder team guest all parent student upi your rider traveller passenger partner employee friend shopper bank the and you thank thanks greetings'.split(' '));
const OWNER_ID_SENDERS={ADHAAR:'Aadhaar',UIDAI:'Aadhaar',CKYCR:'CKYC registry',ITDCPC:'Income Tax',ITDEFL:'Income Tax',ITDTAX:'Income Tax',EPFOHO:'EPFO'};
let ownerNameCache=null;
function senderCore(sender){return String(sender||'').toUpperCase().replace(/^[A-Z]{2}[-\s]+/,'').replace(/[-_\s]+[PSGT]$/,'');}
function ownerNameSuggestion(raw=rawMessages){
 if(ownerNameCache&&ownerNameCache.raw===raw&&ownerNameCache.length===raw.length)return ownerNameCache.value;
 const groups=new Map(),greeting=/\b(?:Dear|Hi|Hello)\s+(?:(?:Mr|Ms|Mrs|Shri|Smt)\.?\s+)?([A-Z][A-Za-z]+(?:[ \t]+[A-Z][A-Za-z]+){0,4})/g;
 for(const m of raw){
  greeting.lastIndex=0;let hit;
  while((hit=greeting.exec(m.body||''))){
   const words=[];for(const w of hit[1].split(/\s+/)){if(OWNER_NAME_STOP.has(w.toLowerCase())||lookupBank(w))break;words.push(w);}
   if(words.length<2||words.length>4||words.some(w=>w.length<2))continue;
   const key=words.join('').toLowerCase(),group=groups.get(key)||{forms:new Map(),senders:new Set()},form=words.map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(' ');
   group.senders.add(senderCore(m.sender));group.forms.set(form,(group.forms.get(form)||0)+1);groups.set(key,group);
  }
 }
 let best=null;
 for(const [key,group] of groups){
  const trusted=[...group.senders].filter(s=>OWNER_ID_SENDERS[s]);
  if(group.senders.size<3||!trusted.length&&group.senders.size<5)continue;
  if(!best||trusted.length>best.trusted.length||trusted.length===best.trusted.length&&group.senders.size>best.group.senders.size)best={key,group,trusted};
 }
 const value=best?{name:[...best.group.forms].sort((a,b)=>b[1]-a[1])[0][0],key:best.key,sources:[...new Set(best.trusted.map(s=>OWNER_ID_SENDERS[s]))],senderCount:best.group.senders.size}:null;
 ownerNameCache={raw,length:raw.length,value};return value;
}
function pendingOwnerName(){
 const suggestion=rawMessages.length?ownerNameSuggestion():null;if(!suggestion)return null;
 if((training.ownNames||[]).some(n=>trainingKey(n)===trainingKey(suggestion.name))||prefs.ownerNameDismissed===suggestion.key)return null;
 return suggestion;
}
function ownerNameCard(){
 const s=pendingOwnerName();if(!s)return '';
 const more=s.senderCount-s.sources.length,where=s.sources.length?s.sources.join(', ')+(more>0?' and '+more+' more sender'+(more===1?'':'s'):''):s.senderCount+' senders';
 return '<div class="owner-suggestion" role="group" aria-label="Owner name suggestion"><div class="owner-suggestion-text"><span class="owner-emoji" aria-hidden="true">👤</span><div><strong>Is this you?</strong><b>'+esc(s.name)+'</b><small>Found in greetings from '+esc(where)+'. Used to recognise transfers between your own accounts.</small></div></div><div class="owner-actions"><button class="secondary" data-owner-dismiss>Dismiss</button><button class="primary" data-owner-accept>Use this name</button></div></div>';
}
function ownerNameChip(){const s=pendingOwnerName();return s?'<button type="button" class="secondary owner-name-chip" data-owner-fill="'+esc(s.name)+'">Suggested: '+esc(s.name)+'</button>':'';}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-owner-dismiss]')){const s=pendingOwnerName();if(s){prefs.ownerNameDismissed=s.key;save();}e.target.closest('.owner-suggestion')?.remove();return;}
 if(e.target.closest('[data-owner-accept]')){const s=pendingOwnerName();if(!s)return;try{const config=trainingClone(training);config.ownNames=[...(config.ownNames||[]),s.name];await commitTrainingAsync(config);render();toast('Name saved');}catch(error){toast(error.message);}return;}
 const fill=e.target.closest('[data-owner-fill]');if(fill){const input=document.getElementById('account-owner-names');if(input){const names=input.value.split(',').map(x=>x.trim()).filter(Boolean);if(!names.some(n=>trainingKey(n)===trainingKey(fill.dataset.ownerFill)))names.push(fill.dataset.ownerFill);input.value=names.join(', ');input.dispatchEvent(new Event('input',{bubbles:true}));}fill.remove();}
});
