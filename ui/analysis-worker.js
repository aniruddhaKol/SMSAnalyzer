// Reuse the same classification engine; UI listeners are inert in this worker.
const document={addEventListener(){}};const window=self;const native=false;let prefs={range:0},rawMessages=[],messages=[];
importScripts('analysis-core.js','standard-sms.js','screens.js','banks.js','bank-accounts.js','merchant-catalogue.js','brands.js','transactions.js','own-transfers.js','knowledge.js','training.js','sms-patterns.js','learning.js','sms-context.js');
let dataset=null,baseline=null;
self.onmessage=({data})=>{try{training=data.config;if(dataset!==data.dataset){baseline=reconcileTransactions(assembleSmsRecords(data.raw).map(m=>classify({...m})));dataset=data.dataset;}const analysed=analyzeWithTraining([],training,structuredClone(baseline));self.postMessage({id:data.id,analysed});}catch(error){self.postMessage({id:data.id,error:error.message});}};
