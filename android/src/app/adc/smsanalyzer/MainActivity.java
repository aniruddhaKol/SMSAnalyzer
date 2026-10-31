package app.adc.smsanalyzer;

import android.app.Activity;
import android.os.Bundle;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.*;
import org.json.*;

/** Author: Aniruddha DuttaChowdhury · ADChowdhury */
public class MainActivity extends Activity {
 private WebView web;
 private volatile boolean reading;
 // Bump only when parsing/classification semantics change, not for UI-only releases.
 private static final String ANALYSIS_VERSION="0.1.132";
 private SmsArchive archive;
 @Override public void onCreate(Bundle b) {
  super.onCreate(b);
  archive=new SmsArchive(this);
  if(android.os.Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(true);
  getWindow().setStatusBarColor(0xff000000); getWindow().setNavigationBarColor(0xff000000);
  web=new WebView(this); setContentView(web);
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setAllowFileAccess(true);
  web.getSettings().setAllowContentAccess(false);
  web.getSettings().setAllowFileAccessFromFileURLs(false);
  web.getSettings().setAllowUniversalAccessFromFileURLs(false);
  WebView.setWebContentsDebuggingEnabled(true);
  web.addJavascriptInterface(new Bridge(),"Android");
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(!"https".equals(uri.getScheme())||!"appassets.androidplatform.net".equals(uri.getHost()))return null;String path=uri.getPath();if(path==null||!path.startsWith("/assets/ui/")||path.contains(".."))return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));try{String asset=path.substring("/assets/".length()),mime=asset.endsWith(".js")?"text/javascript":asset.endsWith(".css")?"text/css":asset.endsWith(".html")?"text/html":asset.endsWith(".svg")?"image/svg+xml":asset.endsWith(".gif")?"image/gif":asset.endsWith(".png")?"image/png":asset.endsWith(".ttf")?"font/ttf":asset.endsWith(".json")?"application/json":"application/octet-stream";return new WebResourceResponse(mime,"UTF-8",getAssets().open(asset));}catch(java.io.IOException e){return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));}}

   @Override public void onPageFinished(WebView v,String url){syncViewport();}
   @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r){
    Uri u=r.getUrl(); String s=u.getScheme();if("appassets.androidplatform.net".equals(u.getHost()))return false;
    if ("https".equals(s)||"mailto".equals(s)||"tel".equals(s)) {
     try { startActivity(new Intent("mailto".equals(s)?Intent.ACTION_SENDTO:"tel".equals(s)?Intent.ACTION_DIAL:Intent.ACTION_VIEW,u)); } catch(Exception e) { notifyError("No app available to open this link."); }
    }
    return true;
   }
  });
  web.addOnLayoutChangeListener((v,l,t,r,bottom,oldL,oldT,oldR,oldB)->syncViewport());
  web.loadUrl("https://appassets.androidplatform.net/assets/ui/index.html");
 }
 private void syncViewport(){
  if(web==null||web.getHeight()<=0)return;
  float height=web.getHeight()/getResources().getDisplayMetrics().density;
  web.evaluateJavascript("document.documentElement.style.setProperty('--app-height','"+height+"px')",null);
 }
 private boolean allowed(){return checkSelfPermission(Manifest.permission.READ_SMS)==PackageManager.PERMISSION_GRANTED;}
 private void notifyError(String s){runOnUiThread(()->web.evaluateJavascript("window.nativeError("+JSONObject.quote(s)+")",null));}
 private void loadSms(){loadSms(false);}
 private void loadSms(boolean startup){
  if(reading)return; reading=true;
  new Thread(()->{
   long started=android.os.SystemClock.elapsedRealtime();JSONArray data=new JSONArray();
   try{

    if(allowed())try(Cursor c=getContentResolver().query(Uri.parse("content://sms/inbox"),new String[]{"_id","address","body","date"},null,null,"date DESC")){
     if(c!=null)while(c.moveToNext()){
     JSONObject m=new JSONObject();m.put("id",c.getLong(0));m.put("sender",c.isNull(1)?"Unknown":c.getString(1));m.put("body",c.isNull(2)?"":c.getString(2));m.put("date",c.getLong(3));data.put(m);
     }
    }
    int added=archive.merge(data);String revision=archive.revision(),training=getSharedPreferences("settings",0).getString("training",""),version=ANALYSIS_VERSION;
    JSONObject snapshot=archive.readAnalysis(archive.analysisSignature(revision,training,version));
    data=snapshot==null?archive.readAll():snapshot.getJSONArray("raw");String analysis=snapshot==null?"null":snapshot.getJSONArray("analysed").toString();
    String result=data.toString();JSONObject meta=new JSONObject();meta.put("loadMs",android.os.SystemClock.elapsedRealtime()-started);meta.put("archiveRevision",revision);meta.put("cacheHit",snapshot!=null);meta.put("count",data.length());meta.put("added",added);meta.put("retention","indefinite");meta.put("encrypted",true);String summary=meta.toString();
    runOnUiThread(()->web.evaluateJavascript("window.nativeMessages("+result+","+summary+","+analysis+")",value->android.util.Log.i("SMSAnalyzerLoad","fullHomeReadyMs="+(android.os.SystemClock.elapsedRealtime()-started))));
   }catch(Exception e){notifyError("Could not load the SMS archive. Your stored messages were kept. Check available device storage and try again.");}
   finally{reading=false;}
  }).start();
 }
 public class Bridge {
  @JavascriptInterface public void startup(){runOnUiThread(()->loadSms(true));}
  @JavascriptInterface public void saveAnalysisCache(String revision,String json){if(json==null||json.length()>33554432)return;final String training=getSharedPreferences("settings",0).getString("training","");new Thread(()->{try{if(!revision.equals(archive.revision()))return;String version=ANALYSIS_VERSION;archive.saveAnalysis(archive.analysisSignature(revision,training,version),json);}catch(Exception ignored){/* Optional cache cannot prevent SMS loading. */}}).start();}

  @JavascriptInterface public boolean copySms(String text){if(text==null)return false;try{android.content.ClipboardManager clipboard=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);clipboard.setPrimaryClip(android.content.ClipData.newPlainText("SMS",text));return true;}catch(Exception e){return false;}}
  @JavascriptInterface public String getTraining(){return getSharedPreferences("settings",0).getString("training","");}
  @JavascriptInterface public void saveTrainingAsync(int id,String json){new Thread(()->{boolean saved=false;if(json!=null&&json.length()<=524288){try{new JSONObject(json);saved=getSharedPreferences("settings",0).edit().putString("training",json).commit();}catch(Exception ignored){}}final boolean ok=saved;runOnUiThread(()->web.evaluateJavascript("window.nativeTrainingSaved("+id+","+ok+")",null));}).start();}
  @JavascriptInterface public boolean saveTraining(String json){if(json==null||json.length()>524288)return false;try{new JSONObject(json);return getSharedPreferences("settings",0).edit().putString("training",json).commit();}catch(Exception e){return false;}}

  @JavascriptInterface public boolean hasPermission(){return allowed();}
  @JavascriptInterface public void requestSms(){runOnUiThread(()->{if(allowed())loadSms();else requestPermissions(new String[]{Manifest.permission.READ_SMS},7);});}
  @JavascriptInterface public void refresh(){runOnUiThread(()->loadSms());}
  @JavascriptInterface public String getPreferences(){return getSharedPreferences("settings",0).getString("ui","{}");}
  @JavascriptInterface public void savePreferences(String json){if(json.length()<4096)getSharedPreferences("settings",0).edit().putString("ui",json).apply();}
  @JavascriptInterface public void appSettings(){runOnUiThread(()->startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName()))));}
 }
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==7){if(allowed())loadSms();else notifyError("SMS access was declined. You can allow it in Android settings.");}}
 @Override public void onBackPressed(){web.evaluateJavascript("window.goBack ? window.goBack() : false",result->{if("false".equals(result))finish();});}
 @Override protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("window.checkAccess && window.checkAccess()",null);}
}

