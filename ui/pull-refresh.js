// Aniruddha DuttaChowdhury · ADChowdhury
// TaskVilla-style floating refresh badge; SMS reload remains Home-only.
function clearPullIndicator(){const node=document.querySelector('.refresh-indicator:not(.leaving)');if(node){node.classList.add('leaving');setTimeout(()=>node.remove(),240);}}
function refreshIndicator(text,offset=0){let node=document.querySelector('.refresh-indicator:not(.leaving)');if(!node){node=document.createElement('div');node.className='refresh-indicator';node.setAttribute('role','status');node.style.top=(document.querySelector('header').offsetHeight+4)+'px';document.querySelector('#app').append(node);requestAnimationFrame(()=>node.classList.add('shown'));}if(node.textContent!==text){node.textContent=text;}node.style.setProperty('--pull-offset',Math.min(28,offset*.3)+'px');}
function bindPullRefresh(){
 if(screen!=='home')return;
 const main=document.querySelector('main');
 if(loading&&refreshReason==='pull')refreshIndicator('Refreshing…');
 let start=null,distance=0;
 const reset=()=>{start=null;distance=0;if(!loading)clearPullIndicator();};
 main.addEventListener('touchstart',e=>{if(loading||main.scrollTop>0||e.touches.length!==1||e.target.closest('button,a,input,select,summary,dialog'))return;start={x:e.touches[0].clientX,y:e.touches[0].clientY};distance=0;},{passive:true});
 main.addEventListener('touchmove',e=>{if(!start)return;const touch=e.touches[0];if(!touch||e.touches.length!==1){reset();return;}const dy=touch.clientY-start.y,dx=Math.abs(touch.clientX-start.x);if(dy<=0||dx>dy||main.scrollTop>0){reset();return;}distance=Math.min(90,dy*.5);if(dy>12){e.preventDefault();refreshIndicator(distance>=60?'Release to refresh':'Pull to refresh',distance);}},{passive:false});
 main.addEventListener('touchend',()=>{const ready=distance>=60;start=null;distance=0;if(ready&&!loading)reloadInbox();else if(!loading)clearPullIndicator();},{passive:true});
 main.addEventListener('touchcancel',reset,{passive:true});
}
function reloadInbox(){if(loading)return;if(!native){toast('SMS access is available in the Android APK.');return;}refreshReason='pull';loading=true;refreshIndicator('Refreshing…');if(Android.hasPermission())Android.refresh();else Android.requestSms();}