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
 const values=daily.slice(0,now.getDate()).map(amount=>(spent+=amount)/budget*100);
 const highest=Math.max(...values),normalizedMax=Math.round(highest*100)/100,scale=normalizedMax<=100?100:(Math.floor(normalizedMax/25)+1)*25;
 const left=44,right=300,top=22,bottom=145;
 const x=day=>left+(day-1)*(right-left)/(days-1),y=value=>bottom-value*(bottom-top)/scale;
 const coordinates=values.map((value,i)=>x(i+1)+','+y(value)).join(' ');
 const line='<polyline points="'+coordinates+'" fill="none" stroke-width="2.5" stroke-linejoin="round"/>';
 const ticks=[0,25,50,75,100,...Array.from({length:Math.max(0,(scale-100)/25)},(_,i)=>125+i*25)];
 const grid=ticks.map(value=>'<line x1="'+left+'" x2="'+right+'" y1="'+y(value)+'" y2="'+y(value)+'" class="chart-grid"/><text x="36" y="'+(y(value)+4)+'" text-anchor="end">'+value+'%</text>').join('');
 const labels=Array.from({length:days},(_,i)=>i+1).filter(d=>d===1||d%5===0).map(day=>'<text x="'+x(day)+'" y="168" text-anchor="middle">'+day+'</text>').join('');
 const threshold=highest>100?'<line x1="'+left+'" x2="'+right+'" y1="'+y(100)+'" y2="'+y(100)+'" stroke="#a98657" stroke-dasharray="2 3"/><text x="'+right+'" y="'+(y(100)-5)+'" text-anchor="end">100% budget</text>':'';
 let crossing='';
 for(let i=0;i<values.length;i++){
  if(values[i]<100)continue;
  const previous=i?values[i-1]:0;
  const day=i===0?1:i+(100-previous)/(values[i]-previous||1);
  crossing='<line x1="'+x(day)+'" x2="'+x(day)+'" y1="'+top+'" y2="'+bottom+'" stroke="#a98657" stroke-width="1.5" stroke-dasharray="4 3"/>';
  break;
 }
 const endpoint='<circle cx="'+x(values.length)+'" cy="'+y(values.at(-1))+'" r="3" fill="'+(values.at(-1)>100?'#b84237':'#36834f')+'"/>';
 return '<section class="card">'+heading+'<svg class="line-chart" viewBox="0 0 320 184" role="img" aria-label="Cumulative spending through day '+values.length+' of '+days+': '+displayNumber(values.at(-1))+'% of monthly budget"><defs><clipPath id="expense-under"><rect width="320" y="'+y(100)+'" height="'+(184-y(100))+'"/></clipPath><clipPath id="expense-over"><rect width="320" height="'+y(100)+'"/></clipPath></defs>'+grid+threshold+crossing+'<g clip-path="url(#expense-under)" stroke="#36834f">'+line+'</g><g clip-path="url(#expense-over)" stroke="#b84237">'+line+'</g>'+endpoint+labels+'</svg></section>';
}
function trendsScreen(){const buckets=trendBuckets(),data=filtered(),breakdown=spendBreakdown(data),spent=totalSpend(data),top=breakdown.indexOf(Math.max(...breakdown)),fixed=data.filter(m=>m.amount>0&&(m.subscription||m.spendGroup===3)),period={week:'Weekly',month:'Monthly',year:'Yearly'}[trendPeriod],caption={week:'Last 6 weeks',month:'Last 6 months',year:'Last 5 years'}[trendPeriod];
 const now=new Date(),month={start:new Date(now.getFullYear(),now.getMonth(),1).getTime(),end:now.getTime()};
 const tabs='<div class="trend-tabs" role="group" aria-label="Trend period">'+['week','month','year'].map(p=>'<button data-trend="'+p+'" aria-pressed="'+(trendPeriod===p)+'" class="'+(trendPeriod===p?'selected':'')+'">'+p[0].toUpperCase()+p.slice(1)+'</button>').join('')+'</div>';
 return expenseTrendChart()+'<section class="card trend-weekday-bars"><div class="split section-heading"><h2>Spend by weekday</h2><small class="trend-period-pill">'+ic('calendar')+'Current month</small></div>'+weekdayChart(monthlyBudgetRecords(now),month,false)+'</section>'+tabs+'<section class="card trend-category-chart"><div class="split section-heading"><h2>Spend by category</h2><small class="trend-period-pill">'+ic('calendar')+caption+'</small></div>'+multiSeriesLineChart(buckets,trendCategorySeries(buckets),'Amounts by category')+'</section><section class="card trend-weekday-lines"><div class="split section-heading"><h2>Spend by weekday</h2><small class="trend-period-pill">'+ic('calendar')+caption+'</small></div>'+multiSeriesLineChart(buckets,trendWeekdaySeries(buckets),'Weekday spending by period')+'</section><section class="card"><h2>Insights</h2><div class="row">'+ic('chart')+'<div>'+(spent?esc(spendNames[top])+' leads with '+flowMoney(breakdown[top],'debit')+', '+displayNumber(breakdown[top]/spent*100)+'% of spend.':'No spending detected in this period.')+'</div></div><div class="row">'+ic('calendar')+'<div>EMI and subscription debit alerts total '+flowMoney(totalSpend(fixed),'debit')+' in this period.</div></div></section>';
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
document.addEventListener('click',e=>{const svg=e.target.closest('.multi-series-chart');if(svg)selectTrendPoint(svg,e.clientX,e.clientY);});
