// Aniruddha DuttaChowdhury · ADChowdhury
// Local SMS format patterns: escaped text plus bounded, generated placeholders.
function escapeSmsPattern(text){return String(text).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');}
function makeSmsPattern(body,{preserveMasked=true}={}){
 const text=String(body||'').trim();if(!text)return '';
 // Amounts, numeric dates/times and reference-like IDs vary. Masked account/mobile
 // tokens remain literal for self transfers; ownership is the user's decision.
 const tokens=/(?:INR|Rs\.?|₹)\s*[\d,]+(?:\.\d{1,2})?|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}[\s-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s-]+\d{2,4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b|[xX*]+\d+[xX*\d]*|\b[A-Z]{1,12}\d[A-Z0-9/-]{2,63}\b|\b\d[\d,./:-]*\b/gi;
 let pattern='^',last=0;
 for(const match of text.matchAll(tokens)){pattern+=escapeSmsPattern(text.slice(last,match.index));const value=match[0];
  if(/^(?:INR|Rs\.?|₹)/i.test(value))pattern+='(?:INR|Rs\\.?|₹)\\s*[0-9,]+(?:\\.[0-9]{1,2})?';
  else if(/^[xX*]/.test(value))pattern+=preserveMasked?escapeSmsPattern(value):'[xX*]+[0-9xX*]{1,24}';
  else if(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value))pattern+='[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}';
  else if(/^\d{1,2}:\d{2}/.test(value))pattern+='[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?';
  else if(/^\d{1,2}[\s-]+[a-z]/i.test(value))pattern+='[0-9]{1,2}[\\s-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\\s-]+[0-9]{2,4}';
  else if(/^[a-z]/i.test(value))pattern+='[A-Z]{1,12}[0-9][A-Z0-9/-]{2,63}';
  else pattern+='[0-9][0-9,./:-]{0,63}';
  last=match.index+value.length;
 }
 pattern+=escapeSmsPattern(text.slice(last))+'$';return pattern;
}
function validateSmsPattern(pattern){
 if(!pattern)return null;if(pattern.length>2400)throw Error('SMS pattern is too long. Use a shorter pattern or sender rule.');
 // Keep editable patterns regular and bounded; no nested quantified groups,
 // lookarounds or backreferences that can stall the on-device inbox scan.
 if(/\\[1-9]|\(\?[=!<]|\([^)]*[+*][^)]*\)\s*(?:[+*]|\{)|(?:\.\*|\.\+).*(?:\.\*|\.\+)/.test(pattern))throw Error('Use a simple SMS pattern without nested repetition, lookarounds or backreferences.');
 try{return new RegExp(pattern,'i');}catch(e){throw Error('The SMS pattern is invalid. Check its brackets and escapes.');}
}
const smsPatternCache=new Map();
function testSmsPattern(pattern,body){if(!pattern)return false;try{let re=smsPatternCache.get(pattern);if(!re){re=validateSmsPattern(pattern);if(smsPatternCache.size>200)smsPatternCache.clear();smsPatternCache.set(pattern,re);}return re.test(String(body||'').trim());}catch(e){return false;}}
function nonTransactionSenderRule(rule){return rule.match?.direction==='other'&&['ignore','category'].includes(rule.kind)&&rule.match.senders?.length>0;}
