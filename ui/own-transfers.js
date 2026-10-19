// Aniruddha DuttaChowdhury · ADChowdhury
// Ownership is explicit local configuration. Bank names and amounts alone are insufficient.
function completedTransfer(body){return /\b(?:IMPS|NEFT|RTGS|transfer)\s+from\s+(?:a\/?c|account)\b[\s\S]*\b(?:sent|done)\s+from\s+YONO\b/i.test(body)||/\bFT\s+YONO\b[\s\S]*\btxn\s+of\b[\s\S]*\bfrom\s+(?:a\/?c|account)\b/i.test(body);}
function beneficiaryConfirmation(body){return /\b(?:NEFT|RTGS|IMPS)\b[\s\S]*\bcredited\s+to\s+(?:the\s+)?beneficiary\b/i.test(body);}
function destinationToken(body){const tail=body.match(/\bto\s+(?!be\b)(?:[^\r\n]{0,60}?\b(?:a\/?c|account)(?:\s+no\.?)?\s*|(?:a\/?c|account)\s*|)([x*]+\d{4}|\d{4,})\b/i);return tail?tail[1].replace(/\D/g,'').slice(-4):null;}
function confirmedOwnAccount(m,config){return m.sourceKind==='account'&&config.accounts.find(a=>a.bank===m.source.key&&a.last4===m.sourceAccount);}
function classifyOwnedTransfers(records,config){
 const accounts=config.accounts||[],aliases=(config.ownAliases||[]).map(trainingKey),active=records.filter(m=>!m.duplicate),eligible=m=>m.trainingAction!=='others'&&!['payment','income','salary','refund','ignore'].includes(m.trainingTreatment)&&!m.loan&&!m.isEmiRepayment&&!/\b(?:penalty|charges?|fee|refund|reversal)\b/i.test(m.body)&&m.transferKind!=='card-settlement';
 const bySourceReference=new Map(),creditsByReference=new Map();
 for(const m of records){if(!m.reference)continue;const key=m.source.key+'|'+m.reference,list=bySourceReference.get(key)||[];list.push(m);bySourceReference.set(key,list);if(!m.duplicate&&m.credit>0){const credits=creditsByReference.get(m.reference)||[];credits.push(m);creditsByReference.set(m.reference,credits);}}
 const own=(m,proof)=>{trainingTreatment(m,'own');m.ownMatch=proof;};
 const compatible=(a,b)=>Math.abs((a.debit||a.credit||a.confirmationAmount)-(b.debit||b.credit||b.confirmationAmount))<.005&&Math.abs(a.date-b.date)<=2*86400000;
 for(const debit of active.filter(m=>m.debit>0&&eligible(m)&&confirmedOwnAccount(m,config))){
  // Duplicate bank/YONO alerts may carry a fuller destination than the kept alert.
  const related=(bySourceReference.get(debit.source.key+'|'+debit.reference)||[]).filter(m=>m!==debit&&compatible(m,debit));
  const targets=[debit,...related].map(m=>m.destinationAccount).filter(Boolean),target=accounts.filter(a=>targets.includes(a.last4)&&!(a.bank===debit.source.key&&a.last4===debit.sourceAccount));
  const alias=debit.payee&&aliases.includes(trainingKey(debit.payee.label));
  const credits=(creditsByReference.get(debit.reference)||[]).filter(c=>c!==debit&&eligible(c)&&confirmedOwnAccount(c,config)&&!(c.source.key===debit.source.key&&c.sourceAccount===debit.sourceAccount)&&compatible(c,debit)&&(!debit.destinationAccount||debit.destinationAccount===c.sourceAccount));
  if(target.length===1||alias||credits.length===1){
   const proof=alias?'Confirmed own recipient alias':target.length===1?'Confirmed source and destination accounts':'Confirmed owned accounts and transaction reference';own(debit,proof);related.filter(eligible).forEach(m=>own(m,proof));credits.forEach(c=>own(c,proof));
   // PPF receipts often omit a reference. Require explicit owned PPF route and a unique exact-value receipt.
   if(target[0]?.type==='ppf'){
    debit.isInvestment=true;
    const receipts=active.filter(c=>c!==debit&&eligible(c)&&compatible(c,debit)&&c.source.key===target[0].bank&&c.sourceAccount===target[0].last4&&/\bPPF\b/i.test(c.body)&&Math.abs(c.date-debit.date)<=2*3600000);
    if(receipts.length===1)own(receipts[0],proof);
   }
  }
 }
 // Reference-free same-bank receipts need both registered accounts and an explicitly saved owner name.
 const names=(config.ownNames||[]).map(trainingKey),nameCache=new WeakMap(),named=m=>{if(!nameCache.has(m)){const body=trainingKey(m.body);nameCache.set(m,names.some(name=>name.length>=8&&body.includes(name)));}return nameCache.get(m);};
 for(const debit of active.filter(m=>m.debit>0&&eligible(m)&&confirmedOwnAccount(m,config)&&named(m))){
  const credits=active.filter(c=>c.credit>0&&eligible(c)&&confirmedOwnAccount(c,config)&&c.source.key===debit.source.key&&c.sourceAccount!==debit.sourceAccount&&compatible(c,debit)&&Math.abs(c.date-debit.date)<=60000&&named(c)&&!(c.reference&&debit.reference&&c.reference!==debit.reference));
  const reverse=credits.length===1?active.filter(d=>d.debit>0&&eligible(d)&&confirmedOwnAccount(d,config)&&d.source.key===debit.source.key&&named(d)&&compatible(d,credits[0])&&Math.abs(d.date-credits[0].date)<=60000):[];
  if(credits.length===1&&reverse.every(d=>d===debit||d.ownMatch&&d.sourceAccount===debit.sourceAccount&&d.destinationAccount===credits[0].sourceAccount)){own(debit,'Confirmed owned account pair, owner name and paired receipt');own(credits[0],debit.ownMatch);}
  const route=active.filter(d=>d!==debit&&d.ownMatch&&d.destinationAccount&&accounts.some(a=>a.last4===d.destinationAccount&&a.type==='ppf')&&d.source.key===debit.source.key&&d.sourceAccount===debit.sourceAccount&&compatible(d,debit)&&Math.abs(d.date-debit.date)<=2*3600000);
  if(route.length===1)own(debit,'Confirmed PPF transfer also reported by YONO');
  const ppf=accounts.filter(a=>a.bank===debit.source.key&&a.type==='ppf'),receipts=active.filter(c=>eligible(c)&&c.source.key===debit.source.key&&/\bPPF\b[\s\S]*\bdeposited\b/i.test(c.body)&&Math.abs(currencyAmount(c.body)-debit.debit)<.005&&Math.abs(c.date-debit.date)<=2*3600000);
  if(ppf.length===1&&receipts.length===1){own(debit,'Confirmed own PPF deposit receipt and owner name');own(receipts[0],debit.ownMatch);debit.isInvestment=true;}
 }
 // An unmatched transfer remains an expense/credit with unknown purpose, never inferred ownership.
 for(const m of active){if(!m.trainingCategory&&!m.trainingTreatment&&!m.ownMatch&&m.isBankTransfer&&!m.isEmiRepayment&&m.transferKind!=='own'&&m.transferKind!=='card-settlement'&&(!m.payee||/^[x*\d]+$/i.test(m.payee.label))){m.group=12;m.spendGroup=5;}}
 return records;
}
