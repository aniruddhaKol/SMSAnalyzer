// Public catalogues only. SMS and user-created rules are never included.
let remoteCatalogue={banks:[],merchants:[]};
function applyRemoteCatalogue(catalogue){
 if(!catalogue||!Array.isArray(catalogue.banks)||!Array.isArray(catalogue.merchants))return false;
 const icon=row=>'data:'+row.icon_mime+';base64,'+row.icon;
 for(const row of catalogue.banks){
  const existing=indianBanks.find(b=>b.code===row.code),previousKey=existing?.key;
  const bank={code:row.code,key:existing?.key||row.source_key,name:row.name,registeredName:row.registered_name,aliases:row.aliases||[],type:row.category,icon:icon(row),officialIcon:row.official_icon};
  if(existing)Object.assign(existing,bank);else indianBanks.push(bank);
  for(const name of [bank.code,bank.key,bank.name,bank.registeredName,previousKey,...bank.aliases])if(name)bankLookup.set(bankNameToken(name),existing||bank);
 }
 for(const row of catalogue.merchants){
  const entry={key:row.id,name:row.name,aliases:[...new Set([row.name,...(row.aliases||[])])],category:row.category,domain:row.domain,icon:icon(row)};
  const existing=MERCHANT_CATALOGUE.find(m=>m.key===entry.key);
  if(existing)Object.assign(existing,entry);else MERCHANT_CATALOGUE.push(entry);
  if(typeof brandAssets!=='undefined'){
   brandAssets['catalogue'+entry.key]=entry.icon;
   for(const key of Object.keys(brandPatterns))if(brandPatterns[key].test(entry.name))brandAssets[key]=entry.icon;
  }
  const knowledge=GENERIC_KNOWLEDGE.merchants.find(m=>m.name.toLowerCase()===entry.name.toLowerCase());
  const updated={name:entry.name,aliases:entry.aliases,category:entry.category,topic:null,origin:'public-catalogue'};
  if(knowledge)Object.assign(knowledge,updated);else GENERIC_KNOWLEDGE.merchants.push(updated);
 }
 KNOWLEDGE_MATCHERS.splice(0,KNOWLEDGE_MATCHERS.length,...GENERIC_KNOWLEDGE.merchants.map(entry=>({entry,patterns:entry.aliases.filter(a=>knowledgeKey(a).length>3&&!['apollo','reliance'].includes(knowledgeKey(a))).map(a=>new RegExp('(^|[^a-z0-9])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i'))})));
 if(typeof brandKeyCache!=='undefined')brandKeyCache.clear();
 if(typeof invalidateMerchantIndex==='function')invalidateMerchantIndex();
 remoteCatalogue=catalogue;
 return true;
}
if(typeof Android!=='undefined'&&typeof Android.getCatalogue==='function'){
 try{applyRemoteCatalogue(JSON.parse(Android.getCatalogue()));}catch(error){/* Bundled catalogue remains available. */}
}
let pendingCatalogue=null;
async function refreshRemoteCatalogue(){
 if(!pendingCatalogue||trainingBusy||loading||analysisJobs.size||document.querySelector('#dialog')?.open)return;
 const catalogue=pendingCatalogue;pendingCatalogue=null;
 try{
  applyRemoteCatalogue(catalogue);
  if(rawMessages.length){messages=await analyseInWorker(training,{forceFull:true});queueAnalysisCache();}
  if(!document.querySelector('#dialog')?.open)renderAtCurrentScroll(null);
 }catch(error){/* Retain the offline data and retry on the next native load. */}
}
window.nativeCatalogueUpdated=catalogue=>{pendingCatalogue=catalogue;refreshRemoteCatalogue();};
if(typeof Android!=='undefined')setInterval(()=>{if(pendingCatalogue)refreshRemoteCatalogue();},1000);
