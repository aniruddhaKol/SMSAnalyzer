// Aniruddha DuttaChowdhury · ADChowdhury. Home-only view over existing analysis.
let payeeView='top',latestPaymentLimit=5;
const paymentDateCache=new WeakMap();
function paymentDate(m){
 if(paymentDateCache.has(m))return paymentDateCache.get(m);
 let result={value:m.date,source:'sms',hasTime:true};
 // Restrict extraction to transaction wording; do not mistake due dates for payments.
 const body=m.body.replace(/https?:\/\/\S+/gi,'').replace(/\b(?:due(?:\s+(?:on|by|date|is))?|renews?(?:\s+on)?)\s*[:.-]?\s*(?:\d{4}-\d{2}-\d{2}|\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3,9})[-/ ]\d{2,4})/gi,'');
 const hit=body.match(/\b(?:on|dated?|dt\.?)\s*[:.-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3,9})[-/ ]\d{2,4})(?:(?:[T, ]+|\s+at\s+)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(AM|PM))?(?:\s*(Z|[+-]\d{2}:?\d{2}|IST))?)?/i);
 if(hit){
  let year,month,day;const bits=hit[1].split(/[-/ ]/);
  if(bits[0].length===4){[year,month,day]=bits.map(Number);month--;}
  else{day=Number(bits[0]);month=/^\d+$/.test(bits[1])?Number(bits[1])-1:['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(bits[1].slice(0,3).toLowerCase());year=Number(bits[2]);if(bits[2].length===2)year+=year<70?2000:1900;}
  const parts=hit[2]?hit[2].split(':').map(Number):[0,0,0];let [hour,minute,second=0]=parts;
  const validHour=hit[3]?hour>=1&&hour<=12:hour>=0&&hour<=23;if(hit[3])hour=hour%12+(/pm/i.test(hit[3])?12:0);
  const d=new Date(year,month,day,hour,minute,second);
  if(year>=1970&&month>=0&&month<12&&d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day&&validHour&&minute<60&&second<60){let value=d.getTime();if(hit[4]){let offset=0;if(/^IST$/i.test(hit[4]))offset=330;else if(hit[4]!=='Z'&&hit[4]!=='z'){const z=hit[4].replace(':','');offset=(Number(z.slice(1,3))*60+Number(z.slice(3)))*(z[0]==='-'?-1:1);}value=Date.UTC(year,month,day,hour,minute,second)-offset*60000;}result={value,source:'transaction',hasTime:!!hit[2]};}
 }
 paymentDateCache.set(m,result);return result;
}
function latestPayments(){return messages.filter(m=>m.amount>0&&m.debit>0&&!m.credit&&!m.duplicate&&!m.ignored&&!isSelfTransfer(m)&&m.transferKind!=='card-settlement').sort((a,b)=>paymentDate(b).value-paymentDate(a).value||b.date-a.date||recordKey(a).localeCompare(recordKey(b)));}
function paymentName(m){return m.payee?.label||m.sourceCard||m.source.label;}
function paymentSource(m){return (m.sourceCard?m.sourceCard+' · ':'')+m.source.label+' '+(m.sourceKind||'account')+(m.sourceAccount?' · ••'+m.sourceAccount:'');}
function paymentDateLabel(m){const stamp=paymentDate(m);return (stamp.hasTime?smsDateTime(stamp.value):date(stamp.value)+' · time unavailable')+(stamp.source==='sms'?' · SMS time':'');}
function payeeSectionHeader(){return '<div class="payee-heading '+(payeeView==='latest'?'latest-view':'')+'">'+compactOptions('payee-view','Payment list view',[['top','Top payee'],['latest','Latest payments']],payeeView,'data-payment-view')+(payeeView==='top'?payeeToggle():'')+'</div>';}
function latestPaymentRows(){return latestPayments().slice(0,latestPaymentLimit).map(m=>'<div class="row merchant-row latest-payment category-accent" style="--category-accent:'+categoryRecordAppearance(m).color+'" role="button" tabindex="0" data-payment="'+recordKey(m)+'" aria-label="Open payment to '+esc(paymentName(m))+'"><span class="merchant-avatar">'+brandIcon(paymentName(m),false,m.payee?.kind||'payment')+'</span><div class="merchant-body"><div class="merchant-name"><strong>'+esc(paymentName(m))+'</strong><b>'+flowMoney(m.amount,'debit')+'</b></div><small class="payment-date">'+esc(paymentDateLabel(m))+'</small><div class="merchant-details"><span class="merchant-source-count">'+brandIcon(m.sourceCard||m.source.label,true)+'</span><small class="merchant-source-label">'+esc(paymentSource(m))+'</small><div class="merchant-meta"><small class="merchant-sms">1 SMS</small><button class="secondary payee-category" data-action="paymentCategory" data-key="'+recordKey(m)+'" aria-label="Edit category for '+esc(paymentName(m))+'">'+categoryAppearanceIcon(categoryRecordAppearance(m))+'<span>'+esc(learningCategoryLabel(m))+'</span></button></div></div></div></div>').join('')||'<p class="muted">No outgoing payments found.</p>';}
function payeeSectionBody(){if(payeeView==='top'){const data=payeeRecords(),ranked=rankedPayees(data);return merchantRows(data,ranked)+merchantMore(data,ranked)+transferSummary(data);}return smsDisclaimer('Showing latest payments first. Period filter is not applicable. SMS received time is used when a transaction date is unavailable; these entries show SMS time.')+latestPaymentRows()+(latestPayments().length>latestPaymentLimit?'<button class="merchant-more" data-action="morePayments">Load more</button>':'');}
function openPayment(key){const m=messages.find(m=>recordKey(m)===key);if(!m)return;modal('<h2>Payment · '+esc(paymentName(m))+'</h2><p>'+esc(paymentDateLabel(m))+'</p>'+trainingSnippet(m,true)+'<p>'+esc(learningCategoryLabel(m))+'</p>'+smsDisclaimer('Original source SMS. Long-press the message to copy its full content.'));}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(b?.dataset.paymentView){const top=document.querySelector('main').scrollTop;payeeView=b.dataset.paymentView==='latest'?'latest':'top';render();document.querySelector('main').scrollTop=top;return;}if(b?.dataset.action==='morePayments'){latestPaymentLimit+=5;appendListPage(b,payeeSectionBody(),'.latest-payment',document.querySelector('.merchants-card'));}
 if(b?.dataset.action==='paymentCategory'){const m=messages.find(m=>recordKey(m)===b.dataset.key);if(!m)return;const group=rankedPayees(messages).find(g=>g.records.some(r=>recordKey(r)===recordKey(m)));if(group){openPayeeCategory(recordKey(m));return;}payeeCategoryGroup={sender:paymentName(m),records:[m]};payeeCategoryDraft={category:m.customCategoryId||(m.isInvestment?'topic:13':m.isEmiRepayment?'3':m.spendGroup!==5?String(m.spendGroup):''),name:'',preview:false,limit:20};payeeCategoryForm();return;}
 if(!e.target.closest('button,input,select,a,label')){const row=e.target.closest('[data-payment]');if(row)openPayment(row.dataset.payment);}
});
document.addEventListener('keydown',e=>{if(e.target.matches('[data-payment]')&&['Enter',' '].includes(e.key)){e.preventDefault();openPayment(e.target.dataset.payment);}});
