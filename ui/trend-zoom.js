// Zoom only the SVG viewport, leaving page chrome and legend controls unchanged.
const trendChartViews=new Map(),trendChartGestures=new WeakMap();
function trendChartView(label){const key=trendPeriod+'|'+label;if(!trendChartViews.has(key))trendChartViews.set(key,{scale:1,x:0,y:0});return trendChartViews.get(key);}
function trendChartViewBox(label){const v=trendChartView(label);return [v.x,v.y,320/v.scale,184/v.scale].join(' ');}
function setTrendChartView(svg,next){
 const label=svg.closest('[data-trend-chart]').dataset.trendChart,v=trendChartView(label);v.scale=Math.max(1,Math.min(6,next.scale));v.x=Math.max(0,Math.min(320-320/v.scale,next.x));v.y=Math.max(0,Math.min(184-184/v.scale,next.y));if(v.scale<1.01){v.scale=1;v.x=0;v.y=0;}
 svg.setAttribute('viewBox',trendChartViewBox(label));svg.classList.toggle('chart-zoomed',v.scale>1);
 const tools=svg.closest('[data-trend-chart]').querySelector('.trend-zoom-tools');tools.querySelector('[data-trend-zoom-reset]').hidden=v.scale===1;tools.querySelector('small').textContent=v.scale>1?'Pinch to zoom · drag to pan':'Pinch to zoom';
}
function trendZoomTools(label){const zoomed=trendChartView(label).scale>1;return '<div class="trend-zoom-tools"><small>'+(zoomed?'Pinch to zoom · drag to pan':'Pinch to zoom')+'</small><button class="secondary" data-trend-zoom-reset '+(zoomed?'':'hidden')+'>Reset</button></div>';}
function trendTouches(e,svg){return [...e.touches].filter(t=>t.target instanceof Element&&t.target.closest('.multi-series-chart')===svg);}
function startTrendGesture(svg,touches){
 const v={...trendChartView(svg.closest('[data-trend-chart]').dataset.trendChart)},rect=svg.getBoundingClientRect();
 if(touches.length>=2){const [a,b]=touches,mid={x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};trendChartGestures.set(svg,{count:2,view:v,distance:Math.max(1,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)),anchor:{x:v.x+(mid.x-rect.left)/rect.width*320/v.scale,y:v.y+(mid.y-rect.top)/rect.height*184/v.scale}});}
 else if(touches.length===1&&v.scale>1)trendChartGestures.set(svg,{count:1,view:v,x:touches[0].clientX,y:touches[0].clientY});else trendChartGestures.delete(svg);
}
document.addEventListener('touchstart',e=>{const svg=e.target.closest?.('.multi-series-chart');if(!svg)return;const touches=trendTouches(e,svg);startTrendGesture(svg,touches);if(touches.length>=2||trendChartView(svg.closest('[data-trend-chart]').dataset.trendChart).scale>1)e.preventDefault();},{passive:false});
document.addEventListener('touchmove',e=>{
 const svg=e.target.closest?.('.multi-series-chart');if(!svg||!svg.isConnected)return;const touches=trendTouches(e,svg),g=trendChartGestures.get(svg);if(!g)return;
 if((touches.length>=2?2:touches.length)!==g.count){startTrendGesture(svg,touches);return;}
 const rect=svg.getBoundingClientRect();e.preventDefault();
 if(g.count===2){const [a,b]=touches,scale=Math.max(1,Math.min(6,g.view.scale*Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)/g.distance)),fx=((a.clientX+b.clientX)/2-rect.left)/rect.width,fy=((a.clientY+b.clientY)/2-rect.top)/rect.height;setTrendChartView(svg,{scale,x:g.anchor.x-fx*320/scale,y:g.anchor.y-fy*184/scale});}
 else if(g.count===1){setTrendChartView(svg,{scale:g.view.scale,x:g.view.x-(touches[0].clientX-g.x)/rect.width*320/g.view.scale,y:g.view.y-(touches[0].clientY-g.y)/rect.height*184/g.view.scale});}
},{passive:false});
document.addEventListener('touchend',e=>{const svg=e.target.closest?.('.multi-series-chart');if(svg)startTrendGesture(svg,trendTouches(e,svg));},{passive:true});
document.addEventListener('touchcancel',e=>{const svg=e.target.closest?.('.multi-series-chart');if(svg)trendChartGestures.delete(svg);},{passive:true});
document.addEventListener('click',e=>{const button=e.target.closest('[data-trend-zoom-reset]');if(!button)return;const svg=button.closest('[data-trend-chart]').querySelector('svg');trendChartGestures.delete(svg);setTrendChartView(svg,{scale:1,x:0,y:0});});
