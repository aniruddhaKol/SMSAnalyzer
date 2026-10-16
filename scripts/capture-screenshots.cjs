// Aniruddha DuttaChowdhury · ADChowdhury. Synthetic documentation data only.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'docs','screenshots');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:process.env.SCREENSHOT_BROWSER||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,timezoneId:'Asia/Kolkata'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+05:30'));
 await page.addInitScript(()=>localStorage.setItem('smsanalyzer.settings',JSON.stringify({started:true,theme:'wood',range:30,durationVersion:1,budget:15000,payeeScope:'all'})));
 await page.goto(pathToFileURL(path.join(root,'ui','index.html')).href);
 await page.evaluate(()=>{
  const now=Date.now(),day=86400000,merchants=['Amazon','Swiggy','Air India','Blinkit','Airtel','Flipkart'];
  const raw=Array.from({length:42},(_,i)=>{const d=new Date(now-(i+1)*day),stamp=String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear(),value=[1299,485,8460,620,399,2199][i%6];return {id:i+1,sender:i%2?'AD-KOTAKB-S':'AD-AXISBK-S',date:d.getTime()+60000,body:'INR '+value+' spent on card XX4444 at '+merchants[i%6]+' on '+stamp+' at 10:30 Ref '+(900000000000+i)+'.'};});
  raw.push({id:80,sender:'AD-KOTAKB-S',date:now-14*day,body:'Salary INR 65000 credited to your Kotak Bank account XX5555 from DEMO COMPANY Ref 999888777666.'},
   {id:81,sender:'AD-KOTAKB-S',date:now-3*day,body:'INR 2500 credited to your Kotak Bank account XX5555. Refund processed Ref 999888777665.'},
   {id:82,sender:'AD-SBIINB-S',date:now-8*day,body:'Your EMI repayment of INR 12000 has been successfully collected from account XX6666. Ref 999888777664.'},
   {id:83,sender:'AD-KOTAKB-S',date:now-2*day,body:'Sent INR 1200 from Kotak Bank account XX5555 to Asha Demo on 13-10-2026 at 14:20 Ref 999888777663.'},
   {id:84,sender:'AD-AXISBK-S',date:now-2*day,body:'Your electricity bill of INR 1820 is due on 18 Oct 2026.'},
   {id:85,sender:'AD-VERIFY-S',date:now-day,body:'123456 is your OTP. Do not share this verification code.'},
   {id:86,sender:'AD-SAMPLE-P',date:now-day,body:'Lottery prize winner! Claim your reward. Urgent click to claim.'},
   {id:87,sender:'AD-AMAZON-S',date:now-day,body:'Your Amazon order DEMO123456 has been dispatched.'},
   {id:88,sender:'AD-GOVMSG-G',date:now-day,body:'Your sample government certificate application DEMO24680 is approved.'});
  nativeMessages(raw);go('home');
 });
 await page.evaluate(()=>document.fonts.ready);
 const capture=async(file,screen,theme,section=false)=>{await page.evaluate(({screen,theme,section})=>{prefs.theme=theme;go(screen);if(section){const main=document.querySelector('main'),card=document.querySelector('.merchants-card');main.scrollTop+=card.getBoundingClientRect().top-main.getBoundingClientRect().top;}},{screen,theme,section});await page.screenshot({path:path.join(output,file),animations:'disabled'});};
 await capture('home.png','home','wood');
 await capture('top-payee.png','home','stone',true);
 await page.evaluate(()=>{payeeView='latest';render();});await capture('latest-payments.png','home','stone',true);
 await capture('categories.png','categories','brick');await capture('trends.png','insights','wood');
 await capture('alerts.png','alerts','brick');await capture('settings.png','settings','stone');await capture('learning-centre.png','training','wood');
 await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log('Captured eight current-source screens using synthetic SMS only.');
})().catch(e=>{console.error(e);process.exit(1)});
