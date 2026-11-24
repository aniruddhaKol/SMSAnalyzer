package app.adc.smsanalyzer;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.*;
import android.security.keystore.*;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.util.*;
import org.json.*;

/** Aniruddha DuttaChowdhury · ADChowdhury. Append-only archive, no retention purge. */
public final class SmsArchive extends SQLiteOpenHelper {
 private javax.crypto.SecretKey cachedKey;
 private final Map<String,JSONObject> originals=new HashMap<>();
 private static final String KEY="smsanalyzer.archive.v1";
 public SmsArchive(Context c){this(c,"sms_archive.db");}
 SmsArchive(Context c,String name){super(c,name,null,3);}
 @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE sms_archive (fingerprint TEXT PRIMARY KEY, received INTEGER NOT NULL, archived INTEGER NOT NULL, payload BLOB NOT NULL)");createAnalysisCache(db);createReadMarker(db);}
 private void createAnalysisCache(SQLiteDatabase db){db.execSQL("CREATE TABLE IF NOT EXISTS analysis_cache (id INTEGER PRIMARY KEY CHECK(id=1), signature TEXT NOT NULL, payload BLOB NOT NULL)");}
 @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){if(oldVersion<2)createAnalysisCache(db);if(oldVersion<3)createReadMarker(db);}
 private void createReadMarker(SQLiteDatabase db){db.execSQL("CREATE TABLE IF NOT EXISTS sms_read_marker (id INTEGER PRIMARY KEY CHECK(id=1), inbox_id INTEGER NOT NULL, read_at INTEGER NOT NULL, archive_revision TEXT NOT NULL)");}
 public synchronized long[] readMarker(){try(Cursor c=getReadableDatabase().rawQuery("SELECT inbox_id,read_at FROM sms_read_marker WHERE id=1",null)){return c.moveToFirst()?new long[]{c.getLong(0),c.getLong(1)}:new long[]{0,0};}}
 public synchronized String readMarkerRevision(){try(Cursor c=getReadableDatabase().rawQuery("SELECT archive_revision FROM sms_read_marker WHERE id=1",null)){return c.moveToFirst()?c.getString(0):null;}}
 public synchronized int mergeNew(JSONArray data,long inboxId,long readAt)throws Exception{
  SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
  try{int added=data.length()==0?0:merge(data);String revision=added==0?readMarkerRevision():null;if(revision==null)revision=revision();ContentValues marker=new ContentValues();marker.put("id",1);marker.put("inbox_id",inboxId);marker.put("read_at",readAt);marker.put("archive_revision",revision);db.insertWithOnConflict("sms_read_marker",null,marker,SQLiteDatabase.CONFLICT_REPLACE);db.setTransactionSuccessful();return added;}finally{db.endTransaction();}
 }
 public synchronized String revision() throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");try(Cursor c=getReadableDatabase().rawQuery("SELECT fingerprint FROM sms_archive ORDER BY fingerprint",null)){while(c.moveToNext())digest.update(c.getString(0).getBytes("UTF-8"));}return android.util.Base64.encodeToString(digest.digest(),android.util.Base64.NO_WRAP);}
 public synchronized String analysisSignature(String revision,String training,String version) throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");return android.util.Base64.encodeToString(digest.digest((revision+"|"+version+"|"+training).getBytes("UTF-8")),android.util.Base64.NO_WRAP);}
 public synchronized JSONObject readAnalysis(String signature){return readSnapshot("signature=?",signature);}
 /** Latest saved analysis for this analysis version, even if newer SMS, rules or catalogue rows exist. */
 public synchronized JSONObject readLatestAnalysis(String signaturePrefix){return readSnapshot("substr(signature,1,"+signaturePrefix.length()+")=?",signaturePrefix);}
 private JSONObject readSnapshot(String condition,String value){try{SQLiteDatabase db=getReadableDatabase();int size;String signature;try(Cursor c=db.rawQuery("SELECT length(payload),signature FROM analysis_cache WHERE id=1 AND "+condition,new String[]{value})){if(!c.moveToFirst())return null;size=c.getInt(0);signature=c.getString(1);}if(size<1||size>67108864)return null;java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream(size);for(int offset=1;offset<=size;offset+=524288){try(Cursor c=db.rawQuery("SELECT substr(payload,?,524288) FROM analysis_cache WHERE id=1 AND signature=?",new String[]{String.valueOf(offset),signature})){if(!c.moveToFirst())return null;bytes.write(c.getBlob(0));}}JSONObject snapshot=new JSONObject(decode(bytes.toByteArray()));snapshot.getJSONArray("raw");snapshot.getJSONArray("analysed");return snapshot;}catch(Exception ignored){/* Invalid cache falls back to original archived SMS. */}return null;}
 public synchronized void saveAnalysis(String signature,String json) throws Exception {JSONObject snapshot=new JSONObject(json);snapshot.getJSONArray("raw");snapshot.getJSONArray("analysed");ContentValues v=new ContentValues();v.put("id",1);v.put("signature",signature);v.put("payload",plain(json));getWritableDatabase().insertWithOnConflict("analysis_cache",null,v,SQLiteDatabase.CONFLICT_REPLACE);}

 private javax.crypto.SecretKey key() throws Exception {if(cachedKey!=null)return cachedKey;KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return cachedKey=g.generateKey();}return cachedKey=(javax.crypto.SecretKey)ks.getKey(KEY,null);}
 private byte[] encrypt(String value) throws Exception {Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),payload=c.doFinal(value.getBytes("UTF-8")),out=new byte[1+iv.length+payload.length];out[0]=(byte)iv.length;System.arraycopy(iv,0,out,1,iv.length);System.arraycopy(payload,0,out,1+iv.length,payload.length);return out;}
 private String decrypt(byte[] value) throws Exception {int n=value[0]&255;if(n!=12||value.length<=n+17)throw new GeneralSecurityException("Invalid archive payload");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOfRange(value,1,n+1)));return new String(c.doFinal(Arrays.copyOfRange(value,n+1,value.length)),"UTF-8");}
 // The archive is stored as plain JSON (user decision, v0.1.170). Rows written by earlier versions are
 // AES-GCM encrypted with the Keystore key; they start with the IV length (12), never '{'.
 private static byte[] plain(String value) throws Exception {return value.getBytes("UTF-8");}
 private String decode(byte[] value) throws Exception {return value.length>0&&value[0]=='{'?new String(value,"UTF-8"):decrypt(value);}
 /** Converts up to {@code limit} encrypted rows to plain JSON. Returns how many were converted; 0 when done. */
 public synchronized int convertToPlain(int limit) throws Exception {
  SQLiteDatabase db=getWritableDatabase();int done=0;
  String cached=null;try(Cursor c=db.rawQuery("SELECT signature FROM analysis_cache WHERE id=1 AND substr(payload,1,1)<>X'7B'",null)){if(c.moveToFirst())cached=c.getString(0);}
  if(cached!=null){JSONObject snapshot=readSnapshot("signature=?",cached);if(snapshot!=null){ContentValues v=new ContentValues();v.put("payload",plain(snapshot.toString()));db.update("analysis_cache",v,"id=1",null);}else db.delete("analysis_cache",null,null);done++;}
  List<String> prints=new ArrayList<>();List<byte[]> payloads=new ArrayList<>();
  try(Cursor c=db.rawQuery("SELECT fingerprint,payload FROM sms_archive WHERE substr(payload,1,1)<>X'7B' LIMIT "+limit,null)){while(c.moveToNext()){prints.add(c.getString(0));payloads.add(c.getBlob(1));}}
  if(prints.isEmpty())return done;
  db.beginTransaction();
  try{for(int i=0;i<prints.size();i++){ContentValues v=new ContentValues();v.put("payload",plain(decrypt(payloads.get(i))));db.update("sms_archive",v,"fingerprint=?",new String[]{prints.get(i)});done++;}db.setTransactionSuccessful();}finally{db.endTransaction();}
  return done;
 }
 private String fingerprint(JSONObject m) throws Exception {String text=m.optString("id")+"|"+m.getLong("date")+"|"+m.getString("sender")+"|"+m.getString("body");byte[] hash=MessageDigest.getInstance("SHA-256").digest(text.getBytes("UTF-8"));StringBuilder s=new StringBuilder();final char[] hex="0123456789abcdef".toCharArray();for(byte b:hash){s.append(hex[(b&255)>>>4]);s.append(hex[b&15]);}return s.toString();}
 public synchronized int merge(JSONArray inbox) throws Exception {SQLiteDatabase db=getWritableDatabase();Set<String> keys=new HashSet<>();try(Cursor c=db.rawQuery("SELECT fingerprint FROM sms_archive",null)){while(c.moveToNext())keys.add(c.getString(0));}int added=0;db.beginTransaction();try{for(int i=0;i<inbox.length();i++){JSONObject m=inbox.getJSONObject(i);String f=fingerprint(m);originals.put(f,m);if(!keys.add(f))continue;ContentValues v=new ContentValues();v.put("fingerprint",f);v.put("received",m.getLong("date"));v.put("archived",System.currentTimeMillis());v.put("payload",plain(m.toString()));db.insertOrThrow("sms_archive",null,v);added++;}db.setTransactionSuccessful();}finally{db.endTransaction();}return added;}
 /** Decrypts every archived SMS. Keystore decryption is per message, so it runs on a few threads. */
 public synchronized JSONArray readAll() throws Exception {
  key();
  List<String> prints=new ArrayList<>();List<Long> archived=new ArrayList<>();List<byte[]> pending=new ArrayList<>();List<Integer> slots=new ArrayList<>();
  try(Cursor c=getReadableDatabase().rawQuery("SELECT payload,archived,fingerprint FROM sms_archive ORDER BY received DESC,fingerprint",null)){while(c.moveToNext()){String f=c.getString(2);prints.add(f);archived.add(c.getLong(1));if(!originals.containsKey(f)){pending.add(c.getBlob(0));slots.add(prints.size()-1);}}}
  JSONObject[] decoded=decryptAll(pending);
  JSONArray data=new JSONArray();int next=0;
  for(int i=0;i<prints.size();i++){String f=prints.get(i);JSONObject m=originals.get(f);if(m==null){m=decoded[next++];originals.put(f,m);}m.put("archivedAt",archived.get(i));data.put(m);}
  return data;
 }
 private JSONObject[] decryptAll(final List<byte[]> payloads) throws Exception {
  final JSONObject[] out=new JSONObject[payloads.size()];if(out.length==0)return out;
  int threads=Math.max(1,Math.min(4,out.length/200));java.util.concurrent.ExecutorService pool=java.util.concurrent.Executors.newFixedThreadPool(threads);
  try{List<java.util.concurrent.Future<?>> jobs=new ArrayList<>();final int step=(out.length+threads-1)/threads;
   for(int t=0;t<threads;t++){final int from=t*step,to=Math.min(out.length,from+step);jobs.add(pool.submit(new java.util.concurrent.Callable<Void>(){public Void call() throws Exception{for(int i=from;i<to;i++)out[i]=new JSONObject(decode(payloads.get(i)));return null;}}));}
   for(java.util.concurrent.Future<?> job:jobs){try{job.get();}catch(java.util.concurrent.ExecutionException ignored){/* Retried one at a time below. */}}
  }finally{pool.shutdownNow();}
  for(int i=0;i<out.length;i++)if(out[i]==null)out[i]=new JSONObject(decode(payloads.get(i)));
  return out;
 }
 /** Adds archived SMS missing from a saved snapshot, in readAll order. Returns null when the snapshot does not match the archive. */
 public synchronized JSONArray mergeSnapshot(JSONArray raw,int[] addedOut) throws Exception {
  Map<String,JSONObject> rows=new HashMap<>();
  for(int i=0;i<raw.length();i++){JSONObject m=raw.getJSONObject(i);rows.put(fingerprint(m),m);}
  List<String> prints=new ArrayList<>();List<Long> archived=new ArrayList<>();List<byte[]> pending=new ArrayList<>();
  try(Cursor c=getReadableDatabase().rawQuery("SELECT fingerprint,archived FROM sms_archive ORDER BY received DESC,fingerprint",null)){while(c.moveToNext()){prints.add(c.getString(0));archived.add(c.getLong(1));}}
  if(!new HashSet<>(prints).containsAll(rows.keySet()))return null;
  final int known=rows.size();List<String> missing=new ArrayList<>();
  for(String f:prints)if(!rows.containsKey(f)){if(originals.containsKey(f))rows.put(f,originals.get(f));else missing.add(f);}
  for(String f:missing)try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM sms_archive WHERE fingerprint=?",new String[]{f})){if(!c.moveToFirst())return null;pending.add(c.getBlob(0));}
  JSONObject[] decoded=decryptAll(pending);
  for(int i=0;i<missing.size();i++){originals.put(missing.get(i),decoded[i]);rows.put(missing.get(i),decoded[i]);}
  JSONArray data=new JSONArray();
  for(int i=0;i<prints.size();i++){JSONObject m=rows.get(prints.get(i));m.put("archivedAt",archived.get(i));data.put(m);}
  addedOut[0]=prints.size()-known;
  return data;
 }
}
