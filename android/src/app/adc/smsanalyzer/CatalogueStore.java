package app.adc.smsanalyzer;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.*;

/** Shared public catalogue cache. Contains no inbox records or personal settings. */
final class CatalogueStore {
 private final AtomicFile file;
 private String json;
 private boolean syncing;
 CatalogueStore(Context context){file=new AtomicFile(new File(context.getFilesDir(),"public-catalogue.json"));}
 synchronized String read(){
  if(json!=null)return json;
  try{json=new String(file.readFully(),StandardCharsets.UTF_8);}catch(Exception e){json="{\"banks\":[],\"merchants\":[],\"last_updated\":0}";}
  return json;
 }
 synchronized String revision(){
  try{return new JSONObject(read()).optString("last_updated","0");}catch(Exception e){return "0";}
 }
 synchronized boolean beginSync(){
  if(syncing)return false;
  try{long last=new JSONObject(read()).optLong("last_synced",0),elapsed=System.currentTimeMillis()-last;
   if(last>0&&elapsed>=0&&elapsed<86400000L)return false;
  }catch(Exception ignored){/* Invalid cache is refreshed. */}
  syncing=true;return true;
 }
 synchronized void endSync(){syncing=false;}
 private JSONArray merge(JSONArray before,JSONArray incoming)throws Exception{
  Map<String,JSONObject> rows=new LinkedHashMap<>();
  for(int i=0;i<before.length();i++){JSONObject row=before.getJSONObject(i);rows.put(row.getString("id"),row);}
  for(int i=0;i<incoming.length();i++){
   JSONObject row=incoming.getJSONObject(i);
   if(!row.getString("icon_mime").matches("image/(png|svg\\+xml|x-icon|vnd\\.microsoft\\.icon|vnd\\.ms-icon|jpeg|webp)"))throw new IOException("Unsupported catalogue icon");
   rows.put(row.getString("id"),row);
  }
  return new JSONArray(rows.values());
 }
 String sync()throws Exception{
  JSONObject old=new JSONObject(read());
  HttpURLConnection connection=(HttpURLConnection)new URL("https://mbyyesfvbpdttztiopfd.supabase.co/rest/v1/rpc/smsanalyzer_sync_catalogue").openConnection();
  connection.setConnectTimeout(5000);connection.setReadTimeout(5000);
  connection.setRequestMethod("POST");connection.setDoOutput(true);
  connection.setRequestProperty("Content-Type","application/json");
  connection.setRequestProperty("Content-Profile","smsanalyzer");
  connection.setRequestProperty("Accept-Profile","smsanalyzer");
  connection.setRequestProperty("apikey","sb_publishable_KryGUn6_1FoKqdzuaWVI5g_HPSIYvy8");
  try{
   byte[] request=new JSONObject().put("last_updated",old.optString("last_updated","0")).toString().getBytes(StandardCharsets.UTF_8);
   try(OutputStream out=connection.getOutputStream()){out.write(request);}
   if(connection.getResponseCode()!=200)return null;
   long deadline=android.os.SystemClock.elapsedRealtime()+15000;
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();
   try(InputStream in=connection.getInputStream()){
    byte[] buffer=new byte[16384];int count;
    while((count=in.read(buffer))!=-1){if(android.os.SystemClock.elapsedRealtime()>deadline)throw new IOException("Catalogue timeout");if(bytes.size()+count>16777216)throw new IOException("Catalogue too large");bytes.write(buffer,0,count);}
   }
   JSONObject delta=new JSONObject(bytes.toString("UTF-8"));
   boolean changed=delta.has("last_updated");
   if(!changed){old.put("last_synced",System.currentTimeMillis());save(old.toString());return null;}
   JSONObject next=new JSONObject().put("banks",merge(old.getJSONArray("banks"),delta.getJSONArray("banks")))
    .put("merchants",merge(old.getJSONArray("merchants"),delta.getJSONArray("merchants"))).put("last_updated",delta.getLong("last_updated")).put("last_synced",System.currentTimeMillis());
   String nextJson=next.toString();
   save(nextJson);
   return nextJson;
  }finally{connection.disconnect();}
 }
 private synchronized void save(String nextJson)throws Exception{
  FileOutputStream out=null;
  try{out=file.startWrite();out.write(nextJson.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);json=nextJson;}
  catch(Exception e){if(out!=null)file.failWrite(out);throw e;}
 }

}
