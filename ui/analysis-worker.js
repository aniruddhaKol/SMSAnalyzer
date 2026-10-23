// Reuse the same classification engine; UI listeners are inert in this worker.
const document={addEventListener(){}};const window=self;const native=false;let prefs={range:0},rawMessages=[],messages=[];
importScripts('analysis-core.js','standard-sms.js','screens.js','banks.js','bank-accounts.js','merchant-catalogue.js','brands.js','transactions.js','own-transfers.js','knowledge.js','category-rules.js','training.js','sms-patterns.js','learning.js','sms-context.js');
let dataset=null,baseline=null,generic=null,previousConfig=null,previousLocal=null;
function semanticSettings(config){const {rules,ruleGroups,version,defaultAppearance,threshold,categoryResets,corrections,...rest}=config;return JSON.stringify(rest);}
function affectedRecords(config){
 if(!previousConfig||semanticSettings(config)!==semanticSettings(previousConfig))return null;
 const old=new Map([...previousConfig.rules,...(previousConfig.corrections||[])].map(r=>[r.id,r])),next=new Map([...config.rules,...(config.corrections||[])].map(r=>[r.id,r])),changed=[];
 for(const id of new Set([...old.keys(),...next.keys()]))if(JSON.stringify(old.get(id))!==JSON.stringify(next.get(id))){if(old.has(id))changed.push(old.get(id));if(next.has(id))changed.push(next.get(id));}
 // Recipient renaming, arbitrary searches and duplicate pairs can affect later stages globally.
 if(changed.some(r=>!['learning','transaction'].includes(r.type)))return null;
 if(!changed.length&&JSON.stringify(previousConfig.rules.map(r=>r.id))!==JSON.stringify(config.rules.map(r=>r.id)))return null;
 const affected=new Set(),keys=new Set(),matchers=[];
 for(const rule of changed){for(const key of rule.existing||[])keys.add(key);if(rule.key)keys.add(rule.key);if(rule.type==='learning')matchers.push(compileLearningMatch(rule));}
 const oldReset=new Set(previousConfig.categoryResets||[]),newReset=new Set(config.categoryResets||[]);
 for(const key of new Set([...oldReset,...newReset]))if(oldReset.has(key)!==newReset.has(key))keys.add(key);
 for(let i=0;i<generic.length;i++)if(keys.has(recordKey(generic[i]))||matchers.some(match=>match(generic[i])))affected.add(i);
 return affected;
}
self.onmessage=({data})=>{try{
 const start=performance.now();training=restoreCategoryRules(data.config);
 if(dataset!==data.dataset){baseline=reconcileTransactions(assembleSmsRecords(data.raw).map(m=>classify({...m})));dataset=data.dataset;previousConfig=null;previousLocal=null;generic=null;}
 if(!generic||previousConfig&&semanticSettings(training)!==semanticSettings(previousConfig)){generic=structuredClone(baseline);for(const m of generic){applyGenericKnowledge(m,training);m.trainingOriginalPayee=m.payee?{...m.payee}:null;}}
 const indices=data.forceFull?null:affectedRecords(training),rows=indices?structuredClone(previousLocal):structuredClone(baseline);
 if(indices)for(const i of indices)rows[i]=structuredClone(baseline[i]);
 // Capture before ownership/duplicate reconciliation: reusing final rows would retain stale transfer flags.
 let local;const analysed=analyzeWithTraining([],training,rows,{indices,capture:records=>{local=structuredClone(records);}});
 previousLocal=local;previousConfig=structuredClone(training);
 self.postMessage({id:data.id,analysed,stats:{mode:indices?'incremental':'full',processed:indices?indices.size:rows.length,total:rows.length,analysisMs:Math.round(performance.now()-start)}});
}catch(error){previousConfig=null;previousLocal=null;generic=null;self.postMessage({id:data.id,error:error.message});}};
