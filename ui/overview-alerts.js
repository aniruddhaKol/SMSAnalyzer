// Compact Home notices and original-SMS previews. Amounts due are not spending.
let overviewAlignmentObserver=null;
const overviewMeasureContext=document.createElement('canvas').getContext('2d');
const overviewInkOffsets=new Map();
function overviewNumberInkOffset(text,style){
 const font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' '),scale=window.devicePixelRatio||1,key=[font,text,scale,document.fonts?.status].join('|');if(overviewInkOffsets.has(key))return overviewInkOffsets.get(key);
 const size=parseFloat(style.fontSize),pad=size,canvas=overviewMeasureContext.canvas;canvas.width=Math.ceil((text.length+4)*size*scale);canvas.height=Math.ceil(size*3*scale);const ctx=overviewMeasureContext;ctx.setTransform(scale,0,0,scale,0,0);ctx.font=font;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#000';const width=ctx.measureText(text).width;ctx.fillText(text,pad,size*2);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,right=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);}
 const offset=right>=left?(left+right+1)/(2*scale)-pad-width/2:0;overviewInkOffsets.set(key,offset);return offset;
}
function overviewCountGeometry(card){
 const glyph=card.querySelector('.overview-stat-icon path'),number=card.querySelector('strong');if(!glyph||!number)return null;
 const bounds=glyph.getBBox(),matrix=glyph.getScreenCTM();if(!matrix)return null;
 const stroke=parseFloat(getComputedStyle(glyph).strokeWidth)||0,point=new DOMPoint(bounds.x+bounds.width+stroke/2,bounds.y+bounds.height/2).matrixTransform(matrix),cardBox=card.getBoundingClientRect(),numberBox=number.getBoundingClientRect(),style=getComputedStyle(number);
 // Ignore the SVG viewBox's unused space and the number font's side bearings.
 const inkOffset=overviewNumberInkOffset(number.textContent,style);
 return {iconInkRight:point.x,cardRight:cardBox.right,numberInkCentre:(numberBox.left+numberBox.right)/2+inkOffset};
}
function alignOverviewCounts(){for(const card of document.querySelectorAll('.overview-stat')){const number=card.querySelector('strong');number.style.transform='none';const g=overviewCountGeometry(card);if(g)number.style.transform='translateX('+((g.iconInkRight+g.cardRight)/2-g.numberInkCentre).toFixed(3)+'px)';}}
function bindOverviewAlignment(){overviewAlignmentObserver?.disconnect();alignOverviewCounts();document.fonts?.ready.then(alignOverviewCounts);const stats=document.querySelector('.overview-stats');if(stats&&typeof ResizeObserver!=='undefined'){overviewAlignmentObserver=new ResizeObserver(()=>requestAnimationFrame(alignOverviewCounts));overviewAlignmentObserver.observe(stats);}}
function overviewStats(bills,otp,spam){return '<div class="overview-stats">'+[['bills',bills,'Bills due','billDue'],['otp',otp,'OTPs detected','otpMessages'],['spam',spam,'Spam flagged','spamShield']].map(([key,value,label,icon])=>'<button class="card overview-stat stat-'+key+'" data-overview-alert="'+key+'" aria-label="'+esc(label)+': '+value+'; view SMS"><span class="overview-stat-icon" aria-hidden="true">'+ic(icon)+'</span><span class="overview-stat-copy"><small>'+label+'</small><strong>'+value.toLocaleString('en-IN')+'</strong></span></button>').join('')+'</div>';}
let overviewAlertState={kind:'bills',limit:20};
function overviewAlertRecords(kind){return kind==='bills'?dueBills(messages):filtered().filter(m=>kind==='otp'?m.isOtp:m.spam).sort((a,b)=>b.date-a.date);}
function overviewAlertContent(kind){const rows=overviewAlertRecords(kind),title=kind==='bills'?'Upcoming bills':kind==='otp'?'OTPs detected':'Spam flagged';
 const cards=rows.slice(0,overviewAlertState.limit).map(m=>'<section class="learn-example overview-alert-sms"><div class="learn-source">'+brandIcon(m.source.label,true)+'<strong>'+esc(m.source.label)+'</strong><small>'+smsDateTime(m.date)+'</small></div>'+(kind==='bills'?'<div class="bill-due-details"><strong>'+ic('calendar')+'Due '+date(m.due)+'</strong>'+(currencyAmount(m.body)?'<b>'+money(transactionAmount(m.body))+' due</b>':'')+'</div>':'')+'<p class="learn-original" data-sms-key="'+recordKey(m)+'">'+esc(m.body)+'</p></section>').join('');
 return '<h2>'+title+'</h2><div class="payee-preview-layout"><div class="payee-preview-scroll"><p>'+rows.length+' '+(kind==='bills'?'upcoming due notice':'matching SMS')+(rows.length===1?'':'s')+'</p>'+smsDisclaimer(kind==='bills'?'Upcoming dates from all loaded SMS, including dues beyond this week. Paid status is not verified; check the original notice.':'Matches for the selected Home period. Opened SMS remain unchanged.')+(cards||'<p class="muted">'+(kind==='bills'?'No upcoming bills with a recognised due date.':'No matching SMS for this period.')+'</p>')+(rows.length>overviewAlertState.limit?'<button class="secondary" data-overview-more>Load 20 more</button>':'')+'</div><div class="dialog-actions payee-preview-actions"><button class="secondary" data-overview-close>Back</button></div></div>';
}
function openOverviewAlerts(kind,more=false){if(more){const button=document.querySelector('[data-overview-more]');if(button)appendListPage(button,overviewAlertContent(kind),'.overview-alert-sms',document.querySelector('#dialog-content'));return;}overviewAlertState={kind,limit:20};modal(overviewAlertContent(kind));}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.overviewAlert)openCategorySms(0,button.dataset.overviewAlert);if(button.hasAttribute('data-overview-more')){overviewAlertState.limit+=20;openOverviewAlerts(overviewAlertState.kind,true);}if(button.hasAttribute('data-overview-close'))document.querySelector('#dialog').close();});
