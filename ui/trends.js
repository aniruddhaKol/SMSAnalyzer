// Chart periods are calendar buckets; series reuse existing financial semantics.
function isoWeekNumber(value){const d=new Date(Date.UTC(value.getFullYear(),value.getMonth(),value.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();return {year,week:Math.ceil((((d-new Date(Date.UTC(year,0,1)))/86400000)+1)/7)};}
function trendBuckets(now=new Date()){
 const buckets=[],n=trendPeriod==='year'?5:6;
 for(let i=n-1;i>=0;i--){let start,end,label,description;
  if(trendPeriod==='week'){start=new Date(now.getFullYear(),now.getMonth(),now.getDate());start.setDate(start.getDate()-((start.getDay()+6)%7)-7*i);end=new Date(start);end.setDate(end.getDate()+7);const iso=isoWeekNumber(start);label=String(iso.week);description='Week '+iso.week+', '+iso.year;}
  else if(trendPeriod==='month'){start=new Date(now.getFullYear(),now.getMonth()-i,1);end=new Date(start.getFullYear(),start.getMonth()+1,1);label=start.toLocaleDateString('en-GB',{month:'short'});description=start.toLocaleDateString('en-GB',{month:'long',year:'numeric'});}
  else{start=new Date(now.getFullYear()-i,0,1);end=new Date(start.getFullYear()+1,0,1);label=String(start.getFullYear());description=label;}
  const rows=messages.filter(m=>m.date>=start.getTime()&&m.date<end.getTime()&&m.date<=now.getTime());buckets.push({label,description,start:start.getTime(),end:end.getTime(),rows,value:totalSpend(rows)});
 }return buckets;
}
function categoryChartOrder(){return groupNames.map((name,i)=>({name,i})).sort((a,b)=>{const rank=i=>i===1?0:i===0?1:2;return rank(a.i)-rank(b.i)||a.name.localeCompare(b.name,'en',{sensitivity:'base'});});}
function trendCategoryAmount(rows,index){if(index===0)return totalSpend(rows);if(index===1)return totalCredit(rows);return categoryRecords(rows,index).reduce((sum,m)=>sum+spendAmount(m)+(isSelfTransfer(m)?0:m.credit||0),0);}
function trendCategorySeries(buckets){return categoryChartOrder().map(({name,i})=>({name,color:groupColors[i],values:buckets.map(b=>trendCategoryAmount(b.rows,i))})).filter(s=>s.values.some(v=>v>0));}
function trendWeekdaySeries(buckets){return [1,2,3,4,5,6,0].map((day,i)=>({name:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],color:weekdayColors[day],values:buckets.map(b=>totalSpend(b.rows.filter(m=>new Date(m.date).getDay()===day)))}));}
const trendHiddenSeries=new Map();
function hiddenTrendSeries(label){if(!trendHiddenSeries.has(label))trendHiddenSeries.set(label,new Set());return trendHiddenSeries.get(label);}
function trendSeriesLegend(series,label){const hidden=hiddenTrendSeries(label);return '<div class="category-tag-ring trend-legend"><div class="legend">'+series.map(s=>'<button type="button" class="trend-series-toggle" data-trend-series="'+esc(s.name)+'" aria-pressed="'+!hidden.has(s.name)+'" aria-label="'+(hidden.has(s.name)?'Show ':'Hide ')+esc(s.name)+'"><span class="dot" style="background:'+s.color+'"></span><span>'+esc(s.name)+'</span></button>').join('')+'</div></div>';}

function multiSeriesLineChart(buckets,series,label){
 const visible=series.filter(s=>!hiddenTrendSeries(label).has(s.name)),max=Math.max(1,...visible.flatMap(s=>s.values))*1.15,x=i=>44+i*248/Math.max(1,buckets.length-1),y=v=>145-v/max*115;
 return '<div class="interactive-trend-plot" data-trend-chart="'+esc(label)+'"><svg class="line-chart multi-series-chart'+(trendChartView(label).scale>1?' chart-zoomed':'')+'" viewBox="'+trendChartViewBox(label)+'" role="img" aria-label="'+esc(label)+'">'+[0,1,2,3].map(i=>'<line x1="44" y1="'+(30+i*38.33)+'" x2="295" y2="'+(30+i*38.33)+'" class="chart-grid"/><text class="flow-debit" x="36" y="'+(34+i*38.33)+'" text-anchor="end">'+compactMoney(max*(3-i)/3)+'</text>').join('')+visible.map(s=>'<polyline points="'+s.values.map((v,i)=>x(i)+','+y(v)).join(' ')+'" fill="none" stroke="'+s.color+'" stroke-width="2"/>'+s.values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="2.6" fill="#faf7f1" stroke="'+s.color+'" stroke-width="1.5"><title>'+esc(s.name+' · '+buckets[i].description+': '+money(v))+'</title></circle>').join('')).join('')+buckets.map((b,i)=>'<text x="'+x(i)+'" y="170" text-anchor="middle">'+esc(b.label)+'</text>').join('')+'</svg>'+trendZoomTools(label)+trendSeriesLegend(series,label)+(!series.length?'<p class="muted">No financial amounts in these periods.</p>':'')+'</div>';
}
function expenseTrendChart(now=new Date()){
 const heading='<div class="split section-heading"><h2>Expense trend</h2><small class="trend-period-pill">'+ic('calendar')+'Current month</small></div>';
 const budget=Number(prefs.budget);
 if(!(budget>0))return '<section class="card">'+heading+'<p class="muted">Set a monthly budget in Settings to see this trend.</p></section>';
 const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
 const daily=Array(days).fill(0);
 for(const m of monthlyBudgetRecords(now))daily[new Date(m.date).getDate()-1]+=spendAmount(m);
 let spent=0;
 const totals=daily.slice(0,now.getDate()).map(amount=>spent+=amount),values=totals.map(total=>total/budget*100);
 const highest=Math.max(...values),normalizedMax=Math.round(highest*100)/100;
 // At most six label intervals, so far-over-budget months keep readable axis labels.
 const step=[25,50,100,200,500,1000].find(s=>normalizedMax<=s*6)||Math.ceil(normalizedMax/6000)*1000,scale=normalizedMax<=100?100:(Math.floor(normalizedMax/step)+1)*step;
 const left=44,right=300,top=22,bottom=145;
 const x=day=>left+(day-1)*(right-left)/(days-1),y=value=>bottom-value*(bottom-top)/scale;
 const coordinates=values.map((value,i)=>x(i+1)+','+y(value)).join(' ');
 const line='<polyline points="'+coordinates+'" fill="none" stroke-width="2.5" stroke-linejoin="round"/>';
 const ticks=Array.from({length:scale/step+1},(_,i)=>i*step);
 const grid=ticks.map(value=>'<line x1="'+left+'" x2="'+right+'" y1="'+y(value)+'" y2="'+y(value)+'" class="chart-grid"/><text x="36" y="'+(y(value)+4)+'" text-anchor="end">'+value+'%</text>').join('');
 const labels=Array.from({length:days},(_,i)=>i+1).filter(d=>d===1||d%5===0).map(day=>'<text x="'+x(day)+'" y="168" text-anchor="middle">'+day+'</text>').join('');
 // The label sits on the side away from where the budget was crossed, so it never covers that marker.
 const threshold=()=>{if(!(highest>100))return '';const atRight=crossingX!==null&&crossingX<(left+right)/2;return '<line x1="'+left+'" x2="'+right+'" y1="'+y(100)+'" y2="'+y(100)+'" stroke="#a98657" stroke-dasharray="2 3"/><text x="'+(atRight?right-4:left+4)+'" y="'+(y(100)-5)+'" text-anchor="'+(atRight?'end':'start')+'">100% budget</text>';};
 let crossing='',crossingX=null;
 for(let i=0;i<values.length;i++){
  if(values[i]<100)continue;
  const previous=i?values[i-1]:0;
  const day=i===0?1:i+(100-previous)/(values[i]-previous||1);
  crossingX=x(day);crossing='<line x1="'+x(day)+'" x2="'+x(day)+'" y1="'+top+'" y2="'+bottom+'" stroke="#a98657" stroke-width="1.5" stroke-dasharray="4 3"/>';
  break;
 }
 // Tappable markers: first spend, budget reached and today; the selected point is described below the chart.
 const markers=new Map(),mark=(i,label,color)=>{if(i<0)return;const existing=markers.get(i);if(existing)existing.labels.push(label);else markers.set(i,{labels:[label],color});};
 mark(daily.findIndex((amount,i)=>i<values.length&&amount>0),'First spend','#654633');
 mark(values.findIndex(value=>value>=100),'Budget reached','#a98657');
 mark(values.length-1,'Current',values.at(-1)>100?'#b84237':'#36834f');
 const endpoint=[...markers].map(([i,m])=>'<circle class="expense-point" cx="'+x(i+1)+'" cy="'+y(values[i])+'" r="3.6" fill="'+m.color+'" stroke="#faf7f1" stroke-width="1.5"><title>'+esc(m.labels.join(' · ')+' · '+date(new Date(now.getFullYear(),now.getMonth(),i+1))+': '+money(totals[i])+' ('+displayNumber(values[i])+'% of budget)')+'</title></circle>').join('');
 return '<section class="card">'+heading+'<svg class="line-chart expense-trend-chart" viewBox="0 0 320 184" role="img" aria-label="Cumulative spending through day '+values.length+' of '+days+': '+displayNumber(values.at(-1))+'% of monthly budget"><defs><clipPath id="expense-under"><rect width="320" y="'+y(100)+'" height="'+(184-y(100))+'"/></clipPath><clipPath id="expense-over"><rect width="320" height="'+y(100)+'"/></clipPath></defs>'+grid+threshold()+crossing+'<g clip-path="url(#expense-under)" stroke="#36834f">'+line+'</g><g clip-path="url(#expense-over)" stroke="#b84237">'+line+'</g>'+endpoint+labels+'</svg></section>';
}
// Spend by source: which card or account the current month's money left from.
// Gross counts every debit (EMI, transfers, card-bill payments) except self transfers and duplicates; Net applies Home's spend rules.
let sourceSpendMode='gross';
const sourceColors=['#f0a030','#2fae74','#8a63d6','#2f95d8','#e0507c','#d8b13c','#8798a6'];
function grossSpendAmount(m){return m.duplicate||m.ignored||isSelfTransfer(m)?0:m.debit||0;}
function spendSource(m){
 const sender=m.source||merchantIdentity(m.sender),bank=sender.label,last4=m.sourceAccount,token=value=>String(value||'').toLowerCase().replace(/bank|ltd|limited|[^a-z0-9]/g,'');
 if(last4){
  const owned=training.accounts.filter(a=>a.last4===last4),account=owned.find(a=>token(lookupBank(a.bank)?.name||a.bank)===token(bank))||owned[0];
  if(account)return {key:'account:'+account.id,label:(account.name||lookupBank(account.bank)?.name||account.bank)+' ••'+last4,detail:accountTypeLabel(account.type)};
  return {key:'last4:'+sender.key+'|'+last4,label:bank+' ••'+last4,detail:'Not in My accounts'};
 }
 return bank?{key:'bank:'+sender.key,label:bank,detail:'Account not stated'}:{key:'unidentified',label:'Unidentified source',detail:'Payment app or account not stated'};
}
function spendSourceSlices(rows,mode){
 const sources=new Map();
 for(const m of rows){const amount=mode==='gross'?grossSpendAmount(m):spendAmount(m);if(!(amount>0))continue;const source=spendSource(m),entry=sources.get(source.key)||{...source,amount:0};entry.amount+=amount;sources.set(source.key,entry);}
 const sorted=[...sources.values()].sort((a,b)=>b.amount-a.amount);
 if(sorted.length<=sourceColors.length)return sorted;
 const rest=sorted.slice(sourceColors.length-1);
 return [...sorted.slice(0,sourceColors.length-1),{key:'others',label:'Other sources',detail:rest.length+' sources',amount:rest.reduce((sum,s)=>sum+s.amount,0)}];
}
function sourceSpendCard(now=new Date()){
 const slices=spendSourceSlices(monthlyBudgetRecords(now),sourceSpendMode),total=slices.reduce((sum,s)=>sum+s.amount,0);
 const tabs='<div class="trend-tabs source-tabs" role="group" aria-label="Spend measure">'+[['gross','Gross Spend'],['net','Net Spend']].map(([mode,label])=>'<button data-source-mode="'+mode+'" aria-pressed="'+(sourceSpendMode===mode)+'" class="'+(sourceSpendMode===mode?'selected':'')+'">'+label+'</button>').join('')+'</div>';
 let angle=0;const stops=slices.map((s,i)=>{const start=angle;angle+=s.amount/total*360;return sourceColors[i]+' '+start+'deg '+angle+'deg';});
 const body=total>0?'<div class="source-pie-layout"><div class="source-donut" role="img" aria-label="'+esc((sourceSpendMode==='gross'?'Gross':'Net')+' spend '+money(total)+': '+slices.map(s=>s.label+' '+Math.round(s.amount/total*100)+'%').join(', '))+'" style="background:conic-gradient('+stops.join(',')+')"><div class="source-donut-center"><small>'+(sourceSpendMode==='gross'?'Gross':'Net')+'</small><strong>'+compactMoney(total)+'</strong></div></div><div class="source-legend"><div class="source-total"><span>Total</span><b>'+money(total)+'</b></div>'+slices.map((s,i)=>'<div><span class="dot" style="background-color:'+sourceColors[i]+'"></span><span><strong>'+esc(s.label)+'</strong><small>'+esc(s.detail)+'</small></span><b>'+money(s.amount)+'</b><em>'+Math.round(s.amount/total*100)+'%</em></div>').join('')+'</div></div>':'<p class="muted">No debits detected this month.</p>';
 return '<section class="card source-spend-card"><div class="split section-heading"><h2>Spend by source</h2><small class="trend-period-pill">'+ic('calendar')+'Current month</small></div>'+tabs+body+'</section>';
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-source-mode]');if(!button||button.dataset.sourceMode===sourceSpendMode)return;sourceSpendMode=button.dataset.sourceMode;const card=button.closest('.source-spend-card'),main=document.querySelector('main'),scroll=main.scrollTop,next=document.createElement('div');next.innerHTML=sourceSpendCard();card.replaceWith(next.firstElementChild);main.scrollTop=scroll;});
function trendsScreen(){const buckets=trendBuckets(),data=filtered(),breakdown=spendBreakdown(data),spent=totalSpend(data),top=breakdown.indexOf(Math.max(...breakdown)),fixed=data.filter(m=>m.amount>0&&(m.subscription||m.spendGroup===3)),period={week:'Weekly',month:'Monthly',year:'Yearly'}[trendPeriod],caption={week:'Last 6 weeks',month:'Last 6 months',year:'Last 5 years'}[trendPeriod];
 const now=new Date(),month={start:new Date(now.getFullYear(),now.getMonth(),1).getTime(),end:now.getTime()};
 const tabs='<div class="trend-tabs" role="group" aria-label="Trend period">'+['week','month','year'].map(p=>'<button data-trend="'+p+'" aria-pressed="'+(trendPeriod===p)+'" class="'+(trendPeriod===p?'selected':'')+'">'+p[0].toUpperCase()+p.slice(1)+'</button>').join('')+'</div>';
 return expenseTrendChart()+sourceSpendCard()+'<section class="card trend-weekday-bars"><div class="split section-heading"><h2>Spend by weekday</h2><small class="trend-period-pill">'+ic('calendar')+'Current month</small></div>'+weekdayChart(monthlyBudgetRecords(now),month,false)+'</section>'+tabs+'<section class="card trend-category-chart"><div class="split section-heading"><h2>Spend by category</h2><small class="trend-period-pill">'+ic('calendar')+caption+'</small></div>'+multiSeriesLineChart(buckets,trendCategorySeries(buckets),'Amounts by category')+'</section><section class="card trend-weekday-lines"><div class="split section-heading"><h2>Spend by weekday</h2><small class="trend-period-pill">'+ic('calendar')+caption+'</small></div>'+multiSeriesLineChart(buckets,trendWeekdaySeries(buckets),'Weekday spending by period')+'</section><section class="card"><h2>Insights</h2><div class="row">'+ic('chart')+'<div>'+(spent?esc(spendNames[top])+' leads with '+flowMoney(breakdown[top],'debit')+', '+displayNumber(breakdown[top]/spent*100)+'% of spend.':'No spending detected in this period.')+'</div></div><div class="row">'+ic('calendar')+'<div>EMI and subscription debit alerts total '+flowMoney(totalSpend(fixed),'debit')+' in this period.</div></div></section>';
}

document.addEventListener('click',e=>{
 const button=e.target.closest('[data-trend-series]');if(!button)return;
 const plot=button.closest('[data-trend-chart]'),label=plot.dataset.trendChart,name=button.dataset.trendSeries,hidden=hiddenTrendSeries(label),main=document.querySelector('main'),scroll=main.scrollTop;
 if(hidden.has(name))hidden.delete(name);else hidden.add(name);
 const buckets=trendBuckets(),series=label==='Amounts by category'?trendCategorySeries(buckets):trendWeekdaySeries(buckets),replacement=document.createElement('div');replacement.innerHTML=multiSeriesLineChart(buckets,series,label);
 plot.querySelector('svg').replaceWith(replacement.querySelector('svg'));
 for(const item of plot.querySelectorAll('[data-trend-series]')){const shown=!hidden.has(item.dataset.trendSeries);item.setAttribute('aria-pressed',String(shown));item.setAttribute('aria-label',(shown?'Hide ':'Show ')+item.dataset.trendSeries);}
 main.scrollTop=scroll;
});

// Compare in screen pixels so the tap target stays usable at every zoom level.
function selectTrendPoint(svg,clientX,clientY){
 const matrix=svg.getScreenCTM();if(!matrix)return;
 const point=svg.createSVGPoint(),view=svg.viewBox.baseVal;
 let nearest=null,distance=30;
 for(const dot of svg.querySelectorAll('circle')){
  point.x=dot.cx.baseVal.value;point.y=dot.cy.baseVal.value;
  if(point.x<view.x||point.x>view.x+view.width||point.y<view.y||point.y>view.y+view.height)continue;
  const position=point.matrixTransform(matrix);
  const offset=Math.hypot(clientX-position.x,clientY-position.y);
  if(offset<=distance){nearest=dot;distance=offset;}
 }
 if(!nearest)return;
 let output=svg.parentElement.querySelector('.trend-tap-value');
 if(!output){output=document.createElement('output');output.className='trend-tap-value';output.setAttribute('aria-live','polite');svg.after(output);}
 output.textContent=nearest.querySelector('title')?.textContent||'';
}
document.addEventListener('click',e=>{const svg=e.target.closest('.multi-series-chart,.expense-trend-chart');if(svg)selectTrendPoint(svg,e.clientX,e.clientY);});
