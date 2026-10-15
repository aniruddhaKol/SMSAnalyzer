// Aniruddha DuttaChowdhury · ADChowdhury
// Public message formats only. No inbox text, personal names or account suffixes.
function standardSmsContext(m){const text=m.body.replace(/https?:\/\/\S+/gi,' '),b=text.toLowerCase(),sender=String(m.sender).toUpperCase(),bank=/HDFCB|KOTAK|SBI|AXISB|ICICIB|SCB|SCAPIA/.test(sender)||/\b(?:hdfc|kotak|axis|icici) bank\b|\b-sbi\b/i.test(text);
 const investment=/\b(?:folio|mutual funds?|pran|ppf|epfo?|demat|securities)\b|\bsip\b.{0,50}\b(?:purchase|fund|processed|allotted)\b|\bnps\b.{0,50}\b(?:tier|trust|contribution|account|a\/c)\b|\bnational pension\b/i.test(text)||/KFNCRA|NSDLNP|EPFOHO|HDFCMF|ABSLMF|ABCAMC|DSPAMC|CAMSDP|SUNDMF|STARMF/.test(sender);
 const investmentReceipt=investment&&/\bcontribution\b[\s\S]*\b(?:credited|received)\b|fund confirmation|purchase[\s\S]*\b(?:processed|allotted)\b|\bppf\b[\s\S]*\bdeposited\b/i.test(text);
 const investmentValuation=investment&&/value of investments|portfolio value|current value|valuation|passbook balance/i.test(text);
 const pending=/\b(?:requested money|on approv(?:al|ing)|yet to receive|still in process|pending|will be|scheduled|please pay|payable|due on|due date)\b/i.test(text);
 const receipt=!bank&&!investment&&/\b(?:we have received (?:a |your )?payment|payment (?:of [\s\S]{0,35})?(?:is updated|received)|thank you for (?:making (?:a )?)?payment|payment received for certificate)\b/i.test(text);
 const debit=bank&&/\b(?:has a debit by transfer|standing instruction[\s\S]*processed successfully)\b/i.test(text);
 const credit=bank&&/\btransferred to your (?:bank )?account\b/i.test(text);
 let group=null,label='';
 if(investment){group=13;label=investmentReceipt?'Investment confirmation':investmentValuation?'Investment valuation':'Investment notice';}
 else if(/\b(?:otp|one time password|accessed profile|logged in|login alert|password[\s\S]{0,25}(?:changed|reset)|usage.{0,20}limit.{0,25}updated|adding credit card)\b/i.test(text)){group=2;label='Security / account notice';}
 else if(/VAAHAN|VAAHAN|EPFOHO|REGINF|WBGOVT|WBIFMS|TCSPSK|ITDCPC/.test(sender)||/\b(?:morth|cert-in|govt|government|aadhaar|passport|puc certificate)\b/i.test(text)){group=8;label='Government notice';}
 else if(/\b(?:shipment|parcel|courier|will deliver|out for delivery|order.{0,30}(?:delivered|shipped|dispatched))\b/i.test(text)){group=4;label='Delivery / order update';}
 else if(/AIRMCA|AIROAM|AIRDOT|AIRDTH|AIRBIL|MSEDCL|WBSEDC|JIOINF/.test(sender)&&!/\b(?:offer|discount|buy now|sale)\b/i.test(text)){group=3;label='Telecom / utility notice';}
 else if(bank&&!debit&&!credit&&/\b(?:avl|available|combined|comb)\s*\.?\s*bal(?:ance)?\b/i.test(text)&&!/\b(?:debited|credited|sent|paid|transferred|spent)\b/i.test(text)){label='Account balance update';}
 else if(pending){label='Payment request / pending';}
 if(receipt){group=/VAAHAN/.test(sender)||/certificate|morth/i.test(text)?8:3;label='Payment receipt';}
 return {investment,investmentReceipt,investmentValuation,pending,receipt,debit,credit,group,label};
}
function bareBankTransactionAmount(body){const hit=body.match(/\b(?:a\/?c|account)\s*[xX*\d]+\s+(?:has a debit by transfer of|debited(?:\s+by)?|credited(?:\s+by)?)\s*[:.-]?\s*(?:INR|Rs\.?:?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);return hit?Number(hit[1].replace(/,/g,'')):0;}
