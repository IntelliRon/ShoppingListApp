package xyz.intelliron.shoppinglistapp.handlers;

import android.content.Context;

import okhttp3.OkHttpClient;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import xyz.intelliron.shoppinglistapp.BuildConfig;
import xyz.intelliron.shoppinglistapp.data.ApiRoutes;

public class SessionManager {
    private static SessionManager instance;

    private Context context;

    private final ApiRoutes apiRoutes;

    private SessionManager(Context context) {
        // Private constructor to prevent instantiation

        this.context = context;

        // Check if the app has internet permission
        if (context.checkCallingOrSelfPermission(android.Manifest.permission.INTERNET) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            throw new RuntimeException("Internet permission is required for SessionManager");
        }

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(new SessionInterceptor(context))
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiRoutes = retrofit.create(ApiRoutes.class);
    }

    private void setContext(Context context) {
        this.context = context;
    }

    public static SessionManager getInstance(Context context) {
        if (instance == null) {
            instance = new SessionManager(context);
        } else {
            instance.setContext(context);
        }

        return instance;
    }

    public ApiRoutes getApiRoutes() {
        return apiRoutes;
    }
}
