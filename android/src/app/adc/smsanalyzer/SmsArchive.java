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
 SmsArchive(Context c,String name){super(c,name,null,2);}
 @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE sms_archive (fingerprint TEXT PRIMARY KEY, received INTEGER NOT NULL, archived INTEGER NOT NULL, payload BLOB NOT NULL)");createAnalysisCache(db);}
 private void createAnalysisCache(SQLiteDatabase db){db.execSQL("CREATE TABLE IF NOT EXISTS analysis_cache (id INTEGER PRIMARY KEY CHECK(id=1), signature TEXT NOT NULL, payload BLOB NOT NULL)");}
 @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){if(oldVersion<2)createAnalysisCache(db);}
 public synchronized String revision() throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");try(Cursor c=getReadableDatabase().rawQuery("SELECT fingerprint FROM sms_archive ORDER BY fingerprint",null)){while(c.moveToNext())digest.update(c.getString(0).getBytes("UTF-8"));}return android.util.Base64.encodeToString(digest.digest(),android.util.Base64.NO_WRAP);}
 public synchronized String analysisSignature(String revision,String training,String version) throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");return android.util.Base64.encodeToString(digest.digest((revision+"|"+version+"|"+training).getBytes("UTF-8")),android.util.Base64.NO_WRAP);}
 public synchronized JSONObject readAnalysis(String signature){try{SQLiteDatabase db=getReadableDatabase();int size;try(Cursor c=db.rawQuery("SELECT length(payload) FROM analysis_cache WHERE id=1 AND signature=?",new String[]{signature})){if(!c.moveToFirst())return null;size=c.getInt(0);}if(size<1||size>67108864)return null;java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream(size);for(int offset=1;offset<=size;offset+=524288){try(Cursor c=db.rawQuery("SELECT substr(payload,?,524288) FROM analysis_cache WHERE id=1 AND signature=?",new String[]{String.valueOf(offset),signature})){if(!c.moveToFirst())return null;bytes.write(c.getBlob(0));}}JSONObject snapshot=new JSONObject(decrypt(bytes.toByteArray()));snapshot.getJSONArray("raw");snapshot.getJSONArray("analysed");return snapshot;}catch(Exception ignored){/* Invalid cache falls back to original archived SMS. */}return null;}
 public synchronized void saveAnalysis(String signature,String json) throws Exception {JSONObject snapshot=new JSONObject(json);snapshot.getJSONArray("raw");snapshot.getJSONArray("analysed");ContentValues v=new ContentValues();v.put("id",1);v.put("signature",signature);v.put("payload",encrypt(json));getWritableDatabase().insertWithOnConflict("analysis_cache",null,v,SQLiteDatabase.CONFLICT_REPLACE);}

 private javax.crypto.SecretKey key() throws Exception {if(cachedKey!=null)return cachedKey;KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return cachedKey=g.generateKey();}return cachedKey=(javax.crypto.SecretKey)ks.getKey(KEY,null);}
 private byte[] encrypt(String value) throws Exception {Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),payload=c.doFinal(value.getBytes("UTF-8")),out=new byte[1+iv.length+payload.length];out[0]=(byte)iv.length;System.arraycopy(iv,0,out,1,iv.length);System.arraycopy(payload,0,out,1+iv.length,payload.length);return out;}
 private String decrypt(byte[] value) throws Exception {int n=value[0]&255;if(n!=12||value.length<=n+17)throw new GeneralSecurityException("Invalid archive payload");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOfRange(value,1,n+1)));return new String(c.doFinal(Arrays.copyOfRange(value,n+1,value.length)),"UTF-8");}
 private String fingerprint(JSONObject m) throws Exception {String text=m.optString("id")+"|"+m.getLong("date")+"|"+m.getString("sender")+"|"+m.getString("body");byte[] hash=MessageDigest.getInstance("SHA-256").digest(text.getBytes("UTF-8"));StringBuilder s=new StringBuilder();final char[] hex="0123456789abcdef".toCharArray();for(byte b:hash){s.append(hex[(b&255)>>>4]);s.append(hex[b&15]);}return s.toString();}
 public synchronized int merge(JSONArray inbox) throws Exception {SQLiteDatabase db=getWritableDatabase();Set<String> keys=new HashSet<>();try(Cursor c=db.rawQuery("SELECT fingerprint FROM sms_archive",null)){while(c.moveToNext())keys.add(c.getString(0));}int added=0;db.beginTransaction();try{for(int i=0;i<inbox.length();i++){JSONObject m=inbox.getJSONObject(i);String f=fingerprint(m);originals.put(f,m);if(!keys.add(f))continue;ContentValues v=new ContentValues();v.put("fingerprint",f);v.put("received",m.getLong("date"));v.put("archived",System.currentTimeMillis());v.put("payload",encrypt(m.toString()));db.insertOrThrow("sms_archive",null,v);added++;}db.setTransactionSuccessful();}finally{db.endTransaction();}return added;}
 public synchronized JSONArray readAll() throws Exception {JSONArray data=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT payload,archived,fingerprint FROM sms_archive ORDER BY received DESC,fingerprint",null)){while(c.moveToNext()){String f=c.getString(2);JSONObject m=originals.get(f);if(m==null){m=new JSONObject(decrypt(c.getBlob(0)));originals.put(f,m);}m.put("archivedAt",c.getLong(1));data.put(m);}}return data;}
}
