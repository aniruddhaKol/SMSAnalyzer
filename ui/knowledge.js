// Aniruddha DuttaChowdhury · ADChowdhury
// Shareable generic merchant/category knowledge; no personal SMS or account identifiers.
const GENERIC_KNOWLEDGE={
  "schema": "app.adc.smsanalyzer.generic-learning",
  "version": 1,
  "appVersion": "0.1.40",
  "author": "Aniruddha DuttaChowdhury",
  "brand": "ADChowdhury",
  "scope": "Generic merchant aliases and categories only",
  "merchants": [
    {
      "name": "Blinkit",
      "aliases": [
        "Blinkit",
        "Blinkit Groceries",
        "Blinkt"
      ],
      "category": "Food & Dining",
      "topic": "Orders",
      "origin": "confirmed-category"
    },
    {
      "name": "Amazon",
      "aliases": [
        "Amazon",
        "Amazon India",
        "Amazon Pay",
        "Amazon Retail",
        "Amazon Seller Services",
        "AMZN",
        "AMZNPAY"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "confirmed-category"
    },
    {
      "name": "Flipkart",
      "aliases": [
        "Flipkart",
        "Flipkart Internet",
        "Flipkart Payments"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Meesho",
      "aliases": [
        "Meesho",
        "Meesho Technologies"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Myntra",
      "aliases": [
        "Myntra"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Ajio",
      "aliases": [
        "Ajio"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Nykaa",
      "aliases": [
        "Nykaa"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "BigBasket",
      "aliases": [
        "BigBasket",
        "BBNow"
      ],
      "category": "Food & Dining",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Zepto",
      "aliases": [
        "Zepto"
      ],
      "category": "Food & Dining",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "JioMart",
      "aliases": [
        "JioMart"
      ],
      "category": "Shopping",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Swiggy",
      "aliases": [
        "Swiggy",
        "Swiggy Instamart",
        "Instamart"
      ],
      "category": "Food & Dining",
      "topic": "Orders",
      "origin": "generic"
    },
    {
      "name": "Zomato",
      "aliases": [
        "Zomato",
        "Zomato Limited"
      ],
      "category": "Food & Dining",
      "topic": "Orders",
      "origin": "confirmed-category"
    },
    {
      "name": "Air India",
      "aliases": [
        "Air India",
        "AirIndia",
        "Air India Limited"
      ],
      "category": "Travel",
      "topic": "Travel",
      "origin": "generic"
    },
    {
      "name": "IndiGo",
      "aliases": [
        "IndiGo",
        "Indigo Airlines"
      ],
      "category": "Travel",
      "topic": "Travel",
      "origin": "generic"
    },
    {
      "name": "IRCTC",
      "aliases": [
        "IRCTC"
      ],
      "category": "Travel",
      "topic": "Travel",
      "origin": "generic"
    },
    {
      "name": "Uber",
      "aliases": [
        "Uber"
      ],
      "category": "Travel",
      "topic": "Travel",
      "origin": "generic"
    },
    {
      "name": "Ola",
      "aliases": [
        "Ola Cabs"
      ],
      "category": "Travel",
      "topic": "Travel",
      "origin": "generic"
    },
    {
      "name": "Airtel",
      "aliases": [
        "Airtel",
        "Bharti Airtel",
        "Airtel Recharge"
      ],
      "category": "Bills & Utilities",
      "topic": "Bills",
      "origin": "generic"
    },
    {
      "name": "Jio",
      "aliases": [
        "Reliance Jio",
        "Jio Recharge"
      ],
      "category": "Bills & Utilities",
      "topic": "Bills",
      "origin": "generic"
    },
    {
      "name": "PVR INOX",
      "aliases": [
        "PVR INOX",
        "PVRINOX"
      ],
      "category": "Other",
      "topic": "Orders",
      "origin": "generic"
    }
  ]
};
function knowledgeKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function knowledgeMerchant(text){const key=knowledgeKey(text);return GENERIC_KNOWLEDGE.merchants.find(m=>m.aliases.some(a=>knowledgeKey(a)===key));}
const KNOWLEDGE_MATCHERS=GENERIC_KNOWLEDGE.merchants.map(entry=>({entry,patterns:entry.aliases.map(a=>new RegExp('(^|[^a-z0-9])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i'))}));
function knowledgeFromRecord(m){if(m.payee){const found=knowledgeMerchant(m.payee.label);if(found)return found;}return KNOWLEDGE_MATCHERS.find(e=>e.patterns.some(p=>p.test(m.body)))?.entry;}
function initKnowledgeCategories(){const candidate=JSON.parse(JSON.stringify(training));let changed=false;const core=['Food & Dining','Shopping','Bills & Utilities','EMI & Loans','Travel','Other'];for(const entry of GENERIC_KNOWLEDGE.merchants){if(core.includes(entry.category)||candidate.categories.some(c=>c.name.toLowerCase()===entry.category.toLowerCase()))continue;candidate.categories.push({id:'generic-'+knowledgeKey(entry.category),name:entry.category,color:'#66899c'});changed=true;}if(changed){persistTraining(candidate);training=candidate;}}
function applyGenericKnowledge(m,config){const entry=knowledgeFromRecord(m);if(!entry||m.isOtp||m.spam)return;if(m.payee)m.payee={...m.payee,label:entry.name,key:knowledgeKey(entry.name).toUpperCase()};if(entry.topic==='Orders')m.isEcommerce=true;if(m.amount>0){const index=trainingCore.names.indexOf(entry.category);if(index>=0){m.spendGroup=index;if(index===3)m.isEmiRepayment=true;}else{const custom=config.categories.findIndex(c=>c.name.toLowerCase()===entry.category.toLowerCase());if(custom>=0){m.spendGroup=trainingCore.names.length+custom;m.group=trainingCore.groups.length+custom;m.customCategoryId=config.categories[custom].id;}}}else if(!m.credit&&entry.topic==='Orders')m.group=4;}
