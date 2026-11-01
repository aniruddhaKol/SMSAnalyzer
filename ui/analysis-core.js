// OTP vocabulary in a safety footer is not evidence that the SMS contains a code.
function isOtpMessage(body){
 const text=String(body).replace(/https?:\/\/\S+/gi,'').replace(/\bOTP\s*-\s*/gi,'OTP '),label='(?:OTP|one[- ]time password|verification code|security code|service code|account password)';
 return new RegExp('\\b\\d{4,8}(?!\\d)\\s+(?:(?:is|as|the|your|secret|login|google|microsoft|apple)\\s+){0,5}'+label+'\\b','i').test(text)
  ||new RegExp('\\b'+label+'\\b\\s*(?:[\\[(:#=]\\s*|is\\s*|mentioned\\s+here\\s*)?\\d{4,8}(?!\\d)','i').test(text)
  ||new RegExp('\\b'+label+'\\b[^\\r\\n]{0,100}?\\bis\\s*[:=]?\\s*\\d{4,8}(?!\\d)','i').test(text)
  ||/\b(?:OTP|service code|one[- ]time password)\b/i.test(text)&&/\b(?:providing|submitting|entering)\s+(?:the\s+)?code\s*[:=]?\s*\d{4,8}(?!\d)/i.test(text);
}
// Shared by UI and background classification worker.
const categories=['Personal','Promotional','Transactional','OTP / Verification','Others'];
function classify(m){const b=m.body.toLowerCase();m.category=isOtpMessage(m.body)?categories[3]:/\b(debited|credited|transaction|payment|paid|spent|withdrawn|a\/c|account.*balance)\b/.test(b)?categories[2]:/\b(offer|sale|discount|cashback|buy now|unsubscribe|limited time|promo)\b/.test(b)?categories[1]:/^[+\d\s()-]{7,}$/.test(m.sender)?categories[0]:categories[4];m.spam=/\b(lottery|prize|winner|claim.*reward|urgent.*click)\b/.test(b);const amount=m.body.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);m.amount=m.category===categories[2]&&/\b(debited|paid|spent|withdrawn)\b/.test(b)&&amount?Number(amount[1].replace(/,/g,'')):0;return analyzeRecord(m);}
