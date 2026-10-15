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
 SmsArchive(Context c,String name){super(c,name,null,1);}
 @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE sms_archive (fingerprint TEXT PRIMARY KEY, received INTEGER NOT NULL, archived INTEGER NOT NULL, payload BLOB NOT NULL)");}
 @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){throw new IllegalStateException("Archive migration required");}
 private javax.crypto.SecretKey key() throws Exception {if(cachedKey!=null)return cachedKey;KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return cachedKey=g.generateKey();}return cachedKey=(javax.crypto.SecretKey)ks.getKey(KEY,null);}
 private byte[] encrypt(String value) throws Exception {Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),payload=c.doFinal(value.getBytes("UTF-8")),out=new byte[1+iv.length+payload.length];out[0]=(byte)iv.length;System.arraycopy(iv,0,out,1,iv.length);System.arraycopy(payload,0,out,1+iv.length,payload.length);return out;}
 private String decrypt(byte[] value) throws Exception {int n=value[0]&255;if(n!=12||value.length<=n+17)throw new GeneralSecurityException("Invalid archive payload");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOfRange(value,1,n+1)));return new String(c.doFinal(Arrays.copyOfRange(value,n+1,value.length)),"UTF-8");}
 private String fingerprint(JSONObject m) throws Exception {String text=m.optString("id")+"|"+m.getLong("date")+"|"+m.getString("sender")+"|"+m.getString("body");byte[] hash=MessageDigest.getInstance("SHA-256").digest(text.getBytes("UTF-8"));StringBuilder s=new StringBuilder();final char[] hex="0123456789abcdef".toCharArray();for(byte b:hash){s.append(hex[(b&255)>>>4]);s.append(hex[b&15]);}return s.toString();}
 public synchronized int merge(JSONArray inbox) throws Exception {SQLiteDatabase db=getWritableDatabase();Set<String> keys=new HashSet<>();try(Cursor c=db.rawQuery("SELECT fingerprint FROM sms_archive",null)){while(c.moveToNext())keys.add(c.getString(0));}int added=0;db.beginTransaction();try{for(int i=0;i<inbox.length();i++){JSONObject m=inbox.getJSONObject(i);String f=fingerprint(m);originals.put(f,m);if(!keys.add(f))continue;ContentValues v=new ContentValues();v.put("fingerprint",f);v.put("received",m.getLong("date"));v.put("archived",System.currentTimeMillis());v.put("payload",encrypt(m.toString()));db.insertOrThrow("sms_archive",null,v);added++;}db.setTransactionSuccessful();}finally{db.endTransaction();}return added;}
 public synchronized JSONArray readAll() throws Exception {JSONArray data=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT payload,archived,fingerprint FROM sms_archive ORDER BY received DESC,fingerprint",null)){while(c.moveToNext()){String f=c.getString(2);JSONObject m=originals.get(f);if(m==null){m=new JSONObject(decrypt(c.getBlob(0)));originals.put(f,m);}m.put("archivedAt",c.getLong(1));data.put(m);}}return data;}
}
