package xyz.intelliron.shoppinglistapp.handlers;

import android.content.Context;

import androidx.annotation.NonNull;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.Response;
import xyz.intelliron.shoppinglistapp.utils.KeystoreUtils;

public class SessionInterceptor implements Interceptor {
    private final android.content.SharedPreferences prefs;

    public SessionInterceptor(Context context) {
        this.prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE);
    }

    @NonNull
    @Override
    public Response intercept(@NonNull Chain chain) throws IOException {
        String encryptedToken = prefs.getString("session_token", null);

        if (encryptedToken != null) {
            String token = KeystoreUtils.decrypt(encryptedToken);
            if (token != null) {
                okhttp3.Request original = chain.request();
                okhttp3.Request request = original.newBuilder()
                        .header("Authorization", "Session " + token)
                        .build();
                return chain.proceed(request);
            }
        }
        return chain.proceed(chain.request());
    }
}
