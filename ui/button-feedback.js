// Show at least one painted, briefly held bevel before a user activation runs.
// Loaded first so delegated and control-local actions share the same timing.
(()=>{
 const controls='button,a,summary,[role=button],[role=tab]',minimum=120;
 const replayed=new WeakSet(),starts=new WeakMap(),cancelled=new WeakSet();
 let held=null,pending=null;
 window.buttonFeedbackPending=false;
 const target=e=>(e.target instanceof Element?e.target:e.target?.parentElement)?.closest(controls);
 const unavailable=el=>!el||el.matches(':disabled,[aria-disabled=true]');
 function releaseHeld(cancel=false){if(!held)return;const el=held.el;if(cancel){starts.delete(el);cancelled.add(el);}el.classList.remove('ui-pressed');held=null;}
 function clearPending(){if(pending)pending.el.classList.remove('ui-pressed');pending=null;window.buttonFeedbackPending=false;}
 document.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;const el=target(e);if(unavailable(el)||pending)return;releaseHeld();cancelled.delete(el);starts.set(el,performance.now());el.classList.add('ui-pressed');held={el,x:e.clientX,y:e.clientY,id:e.pointerId};},{capture:true,passive:true});
 document.addEventListener('pointermove',e=>{if(held&&e.pointerId===held.id&&Math.hypot(e.clientX-held.x,e.clientY-held.y)>10)releaseHeld(true);},{capture:true,passive:true});
 document.addEventListener('pointercancel',()=>releaseHeld(true),{capture:true,passive:true});
 document.addEventListener('scroll',()=>releaseHeld(true),{capture:true,passive:true});
 document.addEventListener('pointerup',()=>{const el=held?.el;held=null;if(el)setTimeout(()=>{if(pending?.el!==el){el.classList.remove('ui-pressed');starts.delete(el);}},0);},{capture:true,passive:true});
 document.addEventListener('click',e=>{
  if(replayed.has(e)||!e.isTrusted||e.button!==0)return;
  const el=target(e);if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(unavailable(el)||pending||(e.detail>0&&cancelled.has(el)))return;
  const token={el};pending=token;window.buttonFeedbackPending=true;el.classList.add('ui-pressed');
  const started=starts.get(el)||performance.now();starts.delete(el);
  const options={bubbles:true,cancelable:true,composed:true,view:window,detail:e.detail,button:0,buttons:0,clientX:e.clientX,clientY:e.clientY,screenX:e.screenX,screenY:e.screenY,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey,metaKey:e.metaKey};
  // Two frames guarantee a paint opportunity even for taps shorter than a frame.
  requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{
   if(pending!==token)return;
   try{if(el.isConnected&&!unavailable(el)){const click=new MouseEvent('click',options);replayed.add(click);el.dispatchEvent(click);}}
   finally{if(pending===token)clearPending();}
  },Math.max(0,minimum-(performance.now()-started)))));
 },true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseHeld(true);clearPending();}});
})();
