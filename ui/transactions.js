// Aniruddha DuttaChowdhury · ADChowdhury
// Sender identity is a source; body text supplies merchant/recipient evidence.
function accountToken(text){const hit=text.match(/\b(?:a\/?c|ac|account)(?:\s*(?:no\.?|number))?\s*[:#.-]?\s*([xX*0-9]{4,})/i);const digits=hit?hit[1].replace(/\D/g,''):'';return digits.length>=4?digits.slice(-4):null;}
function referenceToken(text){const hit=text.match(/\b(?:UPI\s*(?:Ref(?:erence)?|ID)|UTR|(?:Txn|Transaction)\s*(?:Ref|ID)|Ref(?:erence)?(?:\s*no\.?)?)\s*[:#.-]?\s*([A-Z0-9]{6,})/i);return hit?hit[1].toUpperCase():null;}
function payeeIdentity(text){const key=text.toUpperCase().replace(/[^A-Z0-9]/g,'');const known=[[/^(?:AMAZON(?:INDI|INDIA|IN|PAY|PAYINDIA|RETAIL|SELLERSERVICES)?(?:PVTLTD|PRIVATELIMITED)?|AMZN(?:PAY)?)$/,'Amazon'],[/^SWIGGY(?:LIQU|LIQUOR|INSTAMART)?$/,'Swiggy'],[/^ZOMATO(?:LIMITED|LTD)?$/,'Zomato'],[/^BLINKIT/,'Blinkit'],[/^MEESHO(?:TECH|TECHNOLOGIES)?$/,'Meesho'],[/^AIRINDIA(?:L|LIMITED|LTD)?$/,'Air India'],[/^PVRINOX(?:LI|LIMITED|LTD)?$/,'PVR INOX'],[/^FLIPKART(?:INTERNET|PAYMENTS)?$/,'Flipkart'],[/^(?:AIRTEL|BHARTIAIRT?|BHARTIAIRTEL|AIRTELPREPAID|AIRTELRECHARGE)$/,'Airtel']];const alias=known.find(([pattern])=>pattern.test(key)),label=alias?alias[1]:text.trim();const business=/shop|store|mart|enterprise|trader|limited|ltd|pvt/i.test(label);const person=!business&&(/^(?:md|mohd|mohammed|muhammad)\b/i.test(label)||/^mr\b|^mrs\b|^ms\b/i.test(label)||/\b(?:bera|biswa|biswas|majumd|majumdar|sarkar|bairagi|dutta|chowdhury|das)\b/i.test(label));const kind=/air india|airline|airways|indigo/i.test(label)?'airline':/zomato|swiggy|cafe|restaurant|dhaba|kitchen|biryani|vegit|eatery/i.test(label)?'eatery':person?'person':'shop';return {key:alias?alias[1].toUpperCase():key,label,kind};}
function validPayee(text){return text&&text.length<=80&&/[a-z]/i.test(text)&&!/(?:\[account\]|\[recipient\]|\[sender\]|^loan\b|^your\b|^a\/?c\b|^account\b|balance|limit|not you|sms block|^\d|^rs\.?|^inr\b|^http|\{payeeName\})/i.test(text);}
function extractPayee(body){
 const lines=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),limit=lines.findIndex(line=>/^(?:avl|available)\.?\s*(?:limit|balance)/i.test(line));
 if(/\bcard\b/i.test(body)&&limit>0&&validPayee(lines[limit-1]))return payeeIdentity(lines[limit-1]);
 const hit=body.match(/\b(?:spent|paid|payment|purchase|card|used)\b[\s\S]{0,160}?\bat\s+([^\n;]+?)(?=\s+(?:on|using|via|with|ref|avl|available)\b|\.|$)/i);
 if(hit&&validPayee(hit[1].trim()))return payeeIdentity(hit[1]);
 const upiTarget=body.match(/\bto\s+(?:UPI(?:\s+ID)?\s*[:.-]?\s*)?([a-z0-9][a-z0-9._-]*@[a-z][a-z0-9.-]*)/i);if(upiTarget)return payeeIdentity(upiTarget[1].replace(/[.;,]+$/,''));
 const recipient=body.replace(/\b(Mr|Mrs|Ms)\./gi,'$1').match(/\b(?:transferred to|transfer to|trf to|sent\b[^\n]{0,120}?\bto)\s+([^\n]+?)(?=\s+(?:on|dt|ref(?:no|erence)?|a\/?c|ac|avl|available)\b|\.|$)/i);
 return recipient&&validPayee(recipient[1].trim())?payeeIdentity(recipient[1]):null;
}
function describePayment(m){
 m.debit=m.amount;
 m.source=merchantIdentity(m.sender);
 m.sourceKind=/\bcard\b/i.test(m.body)||m.source.label==='Scapia'?'card':'account';
 m.sourceCard=/\bscapia\b/i.test(m.body)&&m.source.label!=='Scapia'?'Scapia':null;
 const instructionSource=m.body.match(/\bfrom\s+([xX*0-9]{4,})\s+to\s+bene/i);m.sourceAccount=(instructionSource?instructionSource[1].replace(/\D/g,'').slice(-4):null)||accountToken(m.body)||accountToken(m.body.replace(/\bcard\s*(?:no\.?|number)?\s*/ig,'account '));
 m.reference=referenceToken(m.body);
 m.payee=extractPayee(m.body);
 m.isEmiRepayment=m.debit>0&&m.loan&&/\b(?:emi|repayment|repaid|instalment|installment)\b|standing instruction[\s\S]*\bloan\b/i.test(m.body);
 m.isBankTransfer=m.debit>0&&!m.loan&&/\b(?:transferred|transfer|sent\s+(?:rs\.?|inr|₹)|neft|imps|rtgs|trf to)\b/i.test(m.body);
 const target=m.body.match(/\b(?:transferred to|transfer to|to\s+(?:(?:your|bene(?:ficiary)?)\s+)?(?:a\/?c|account))\b[\s\S]{0,120}/i);
 m.destinationAccount=target?accountToken(target[0]):null;
 const explicitOwn=m.isBankTransfer&&/\b(?:self[- ]?transfer|own account|between (?:my|your|own) accounts)\b/i.test(m.body);
 const cardSettlement=m.debit>0&&!m.loan&&/\bcredit card\b[\s\S]{0,50}\b(?:payment|bill|repayment)\b|\bpayment\b[\s\S]{0,50}\bcredit card\b/i.test(m.body);
 m.transferKind=explicitOwn?'own':cardSettlement?'card-settlement':m.isBankTransfer?'unmatched':null;
 if(m.transferKind==='own'||m.transferKind==='card-settlement'){m.amount=0;m.group=14;}
 return m;
}
function reconcileTransactions(records){
 records.forEach(m=>{m.detectedCredit=m.credit;m.detectedDebit=m.debit;});
 consolidateAlerts(records);
 const isBank=m=>/bank|^SBI$/i.test(m.source.label);
 const accounts=new Set(records.filter(m=>isBank(m)&&m.sourceAccount&&(m.debit>0||m.credit>0)).map(m=>m.sourceAccount));
 const credits=new Map();records.filter(m=>!m.duplicate&&isBank(m)&&m.credit>0&&m.reference&&!m.loan&&!/refund|reversal/i.test(m.body)).forEach(m=>{const list=credits.get(m.reference)||[];list.push(m);credits.set(m.reference,list);});
 for(const m of records){if(m.duplicate||!m.isBankTransfer||m.transferKind==='own')continue;
  const matches=(credits.get(m.reference)||[]).filter(c=>Math.abs(c.credit-m.debit)<0.005&&Math.abs(c.date-m.date)<=2*86400000&&c.source.key!==m.source.key);
  const ownerNamed=false; // Ownership comes from account evidence or explicit local rules.
  const ownedTarget=m.destinationAccount&&accounts.has(m.destinationAccount)&&m.destinationAccount!==m.sourceAccount&&(ownerNamed||/\bto\s+your\s+(?:a\/?c|account)\b/i.test(m.body));
  if(matches.length===1||ownedTarget){m.transferKind='own';m.amount=0;m.group=14;if(matches.length===1){matches[0].transferKind='own-credit';matches[0].group=14;}}
  else if(ownerNamed)m.transferKind='possible-own';
 }
 return records;
}
function consolidateAlerts(records){
 const duplicate=(m,reason)=>{m.duplicate=true;m.duplicateReason=reason;m.amount=0;m.credit=0;};
 const exact=new Map(),refs=new Map();
 for(const m of [...records].sort((a,b)=>a.date-b.date)){
  if(!m.debit&&!m.credit)continue;
  const side=m.debit>0?'debit':'credit',value=m.debit||m.credit,body=m.body.toLowerCase().replace(/\s+/g,' ').trim(),key=m.source.key+'|'+side+'|'+body;
  const same=exact.get(key);if(same&&Math.abs(same.date-m.date)<=2*86400000){duplicate(m,'Repeated identical alert');continue;}exact.set(key,m);
  if(m.reference){const refKey=m.source.key+'|'+side+'|'+value+'|'+m.reference,prior=refs.get(refKey);if(prior&&Math.abs(prior.date-m.date)<=2*86400000){duplicate(m,'Repeated transaction reference');continue;}refs.set(refKey,m);}
 }
 const loanReceipts=records.filter(m=>!m.duplicate&&m.isEmiRepayment&&/standing instruction[\s\S]*successfully executed/i.test(m.body));
 for(const receipt of loanReceipts){const candidates=records.filter(m=>m!==receipt&&!m.duplicate&&!m.isEmiRepayment&&m.isBankTransfer&&m.source.key===receipt.source.key&&m.sourceAccount&&m.sourceAccount===receipt.sourceAccount&&Math.abs(m.debit-receipt.debit)<0.005&&Math.abs(m.date-receipt.date)<=30*60000);if(candidates.length===1)duplicate(candidates[0],'Debit also confirmed by loan standing instruction');}
 for(const receipt of records.filter(m=>!m.duplicate&&m.debit>0&&/recharge[\s\S]*(?:successful|completed)/i.test(m.body))){const provider=payeeIdentity(receipt.source.label),candidates=records.filter(m=>m!==receipt&&!m.duplicate&&m.sourceKind==='card'&&m.payee?.key===provider.key&&Math.abs(m.debit-receipt.debit)<0.005&&Math.abs(m.date-receipt.date)<=30*60000);if(candidates.length===1)duplicate(receipt,'Recharge also reported by source card');}
}
function budgetSpend(data){return totalSpend(data.filter(m=>!m.isEmiRepayment));}
function monthlyBudgetRecords(now=new Date()){const start=new Date(now.getFullYear(),now.getMonth(),1).getTime();return messages.filter(m=>m.date>=start&&m.date<=now.getTime());}

