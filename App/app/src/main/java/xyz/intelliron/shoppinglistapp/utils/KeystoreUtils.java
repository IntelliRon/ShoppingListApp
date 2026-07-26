package xyz.intelliron.shoppinglistapp.utils;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Log;

import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public class KeystoreUtils {
    private static final String KEY_ALIAS = "secure_keystore_key";

    // Create a key in the Keystore
    public static void createKey() {
        try {
            java.security.KeyStore keyStore = java.security.KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                KeyGenerator keyGenerator = KeyGenerator.getInstance(
                        KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                keyGenerator.init(
                        new KeyGenParameterSpec.Builder(
                                KEY_ALIAS,
                                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                                .build());
                keyGenerator.generateKey();
            }
        } catch (Exception e) {
            Log.e("KEYSTORE_UTILS", Log.getStackTraceString(e));
        }
    }

    public static SecretKey getKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.getKey(KEY_ALIAS, null) == null) {
            createKey();
        }
        return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }

    public static String encrypt(String data) {
        try {
            SecretKey key = getKey();

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key);

            byte[] iv = cipher.getIV();
            byte[] encryption = cipher.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encryption.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryption, 0, combined, iv.length, encryption.length);

            return android.util.Base64.encodeToString(combined, android.util.Base64.DEFAULT);
        } catch (Exception e) {
            Log.e("KEYSTORE_UTILS", Log.getStackTraceString(e));
        }
        return null;
    }

    public static String decrypt(String encryptedData) {
        try {
            SecretKey key = getKey();

            byte[] combined = android.util.Base64.decode(encryptedData, android.util.Base64.DEFAULT);
            byte[] iv = new byte[12]; // GCM IV length is 12 bytes
            byte[] encryption = new byte[combined.length - iv.length];

            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encryption, 0, encryption.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new javax.crypto.spec.GCMParameterSpec(128, iv));

            byte[] decrypted = cipher.doFinal(encryption);
            return new String(decrypted, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            Log.e("KEYSTORE_UTILS", Log.getStackTraceString(e));
        }
        return null;
    }
}
