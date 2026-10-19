// Append new records without replacing existing cards, inputs or the active scroll container.
function appendListPage(button,html,selector,root=document.querySelector('main')){
 const previous=[...root.querySelectorAll(selector)],template=document.createElement('template');template.innerHTML=html;
 const fresh=[...template.content.querySelectorAll(selector)],added=fresh.slice(previous.length),last=previous[previous.length-1];
 if(!last)return;
 const positions=[];for(let node=button.parentElement;node;node=node.parentElement)positions.push({node,top:node.scrollTop,left:node.scrollLeft,anchor:node.style.overflowAnchor});
 const active=document.activeElement,windowTop=window.scrollY,windowLeft=window.scrollX;positions.forEach(p=>p.node.style.overflowAnchor='none');
 const next=last.nextSibling;for(const node of added){last.parentElement.insertBefore(node,next);enhanceCurrency(node);actionIcons(node);}
 const replacement=[...template.content.querySelectorAll('button')].find(b=>b.dataset.action&&b.dataset.action===button.dataset.action||b.dataset.learning&&b.dataset.learning===button.dataset.learning||b.dataset.training&&b.dataset.training===button.dataset.training||b.hasAttribute('data-overview-more')&&button.hasAttribute('data-overview-more'));
 if(replacement){if(button.textContent.trim()!==replacement.textContent.trim())button.innerHTML=replacement.innerHTML;button.disabled=replacement.disabled;}
 if(!replacement){if(active===button){const target=last.querySelector('button,input')||last;if(target===last&&!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}button.remove();}
 actionIcons(root);
 const restore=()=>{for(const p of positions){p.node.scrollTop=p.top;p.node.scrollLeft=p.left;}window.scrollTo(windowLeft,windowTop);};restore();requestAnimationFrame(()=>{restore();requestAnimationFrame(()=>{restore();for(const p of positions)p.node.style.overflowAnchor=p.anchor;});});
}
