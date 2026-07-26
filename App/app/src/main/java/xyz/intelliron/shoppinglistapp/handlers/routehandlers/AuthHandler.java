package xyz.intelliron.shoppinglistapp.handlers.routehandlers;

import android.content.Context;
import android.util.Log;

import java.io.IOException;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.internal.EverythingIsNonNull;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.ChangePasswordRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.LoginRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.RegisterUserRequest;
import xyz.intelliron.shoppinglistapp.data.apiresponse.GenericResponse;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.UserData;
import xyz.intelliron.shoppinglistapp.handlers.SessionManager;
import xyz.intelliron.shoppinglistapp.handlers.callback.BooleanCallback;
import xyz.intelliron.shoppinglistapp.handlers.callback.DataCallback;
import xyz.intelliron.shoppinglistapp.utils.KeystoreUtils;
import xyz.intelliron.shoppinglistapp.data.ApiRoutes;

public class AuthHandler {
    private static AuthHandler instance;

    public static AuthHandler getInstance() {
        if (instance == null) {
            instance = new AuthHandler();
        }
        return instance;
    }

    private AuthHandler() {

    }

    private ApiRoutes getApiRoutes(Context context) {
        return SessionManager.getInstance(context).getApiRoutes();
    }

    /**
     * Checks if the user is logged in by verifying the presence of a valid session token in SharedPreferences.
     * @param context The context used to access SharedPreferences.
     * @return True if the user is logged in, false otherwise.
     */
    public boolean isUserLoggedIn(Context context) {
        String encryptedToken = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
                .getString("session_token", null);
        if (encryptedToken != null) {
            String token = KeystoreUtils.decrypt(encryptedToken);
            return token != null;
        } else {
            return false;
        }
    }

    /**
     * Attempts to log in a user with the provided credentials.
     * @param context The context used to access SharedPreferences.
     * @param username The username (or email) of the user.
     * @param password The password of the user.
     * @param callback A callback to handle the result of the login attempt.
     */
    public void login(Context context, String username, String password, DataCallback callback) {
        Call<GenericResponse<UserData>> call = getApiRoutes(context).loginUser(new LoginRequest(username, password));
        call.enqueue(new Callback<GenericResponse<UserData>>() {
            @Override @EverythingIsNonNull
            public void onResponse(Call<GenericResponse<UserData>> call, Response<GenericResponse<UserData>> response) {
                if (response.isSuccessful()) {
                    GenericResponse<UserData> loginResponse = response.body();
                    if (loginResponse != null) {
                        if (!loginResponse.isSuccess()) {
                            // Handle login failure
                            callback.onResult(false, loginResponse.getError().getMessage());
                            Log.e("AuthHandler", "Login failed: Code " + loginResponse.getError().getCode()
                                    + ", Message: " + loginResponse.getError().getMessage());
                            return;
                        }

                        if (loginResponse.getData() == null || loginResponse.getData().getToken() == null) {
                            // Handle missing token
                            callback.onResult(false, "Missing token in response");
                            Log.e("AuthHandler", "Login failed: Missing token in response");
                            return;
                        }

                        String sessionToken = loginResponse.getData().getToken();

                        // Store the sessiontoke in prefs using KeystoreUtils
                        String encryptedToken = KeystoreUtils.encrypt(sessionToken);
                        context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).edit()
                                .putString("session_token", encryptedToken)
                                .apply();
                        callback.onResult(true, "Login successful");
                    }
                } else {
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            Log.e("AuthHandler", "Login failed: Server error: " + response.code() + ", Body: " + errorBody);
                        } catch (IOException e) {
                            Log.e("AuthHandler", "Login failed: Server error: " + response.code(), e);
                        }
                    } else {
                        Log.e("AuthHandler", "Login failed: Server error: " + response.code());
                    }
                    callback.onResult(false, "Server error: " + response.code());
                }
            }

            @Override @EverythingIsNonNull
            public void onFailure(Call<GenericResponse<UserData>> call, Throwable t) {
                Log.e("AuthHandler", "Login failed: Network error", t);
                callback.onResult(false, "Network error: " + t.getMessage());
            }
        });
    }

    /**
     * Attempts to register a new user with the provided credentials.
     * @param context The context used to access SharedPreferences.
     * @param username The username (or email) of the user.
     * @param password The password of the user.
     * @param callback A callback to handle the result of the registration attempt.
     */
    public void register(Context context, String username, String email, String password, DataCallback callback) {
        Call<GenericResponse<UserData>> call = getApiRoutes(context).registerUser(new RegisterUserRequest(username, password, email));
        call.enqueue(new Callback<GenericResponse<UserData>>() {
            @Override @EverythingIsNonNull
            public void onResponse(Call<GenericResponse<UserData>> call, Response<GenericResponse<UserData>> response) {
                if (response.isSuccessful()) {
                    GenericResponse<UserData> registerResponse = response.body();
                    if (registerResponse != null) {
                        if (!registerResponse.isSuccess()) {
                            // Handle registration failure
                            callback.onResult(false, registerResponse.getError().getMessage());
                            Log.e("AuthHandler", "Registration failed: Code " + registerResponse.getError().getCode()
                                    + ", Message: " + registerResponse.getError().getMessage());
                            return;
                        }

                        if (registerResponse.getData() == null || registerResponse.getData().getToken() == null) {
                            // Handle missing token
                            callback.onResult(false, "Missing token in response");
                            Log.e("AuthHandler", "Registration failed: Missing token in response");
                            return;
                        }

                        String sessionToken = registerResponse.getData().getToken();

                        // Store the session token in prefs using KeystoreUtils
                        String encryptedToken = KeystoreUtils.encrypt(sessionToken);
                        context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).edit()
                                .putString("session_token", encryptedToken)
                                .apply();
                        callback.onResult(true, "Registration successful");
                    }
                } else {
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            Log.e("AuthHandler", "Registration failed: Server error: " + response.code() + ", Body: " + errorBody);
                        } catch (IOException e) {
                            Log.e("AuthHandler", "Registration failed: Server error: " + response.code(), e);
                        }
                    } else {
                        Log.e("AuthHandler", "Registration failed: Server error: " + response.code());
                    }
                    callback.onResult(false, "Server error: " + response.code());
                }
            }

            @Override @EverythingIsNonNull
            public void onFailure(Call<GenericResponse<UserData>> call, Throwable t) {
                Log.e("AuthHandler", "Registration failed: Network error", t);
                callback.onResult(false, "Network error: " + t.getMessage());
            }
        });
    }

    public void logout(Context context, DataCallback callback) {
        Call<GenericResponse<Void>> call = getApiRoutes(context).logoutUser();
        call.enqueue(new Callback<GenericResponse<Void>>() {
            @Override
            @EverythingIsNonNull
            public void onResponse(Call<GenericResponse<Void>> call, Response<GenericResponse<Void>> response) {
                if (response.isSuccessful()) {
                    // Clear the session token from SharedPreferences
                    context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).edit()
                            .remove("session_token")
                            .apply();
                    callback.onResult(true, "Logout successful");
                } else {
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            Log.e("AuthHandler", "Logout failed: Server error: " + response.code() + ", Body: " + errorBody);
                        } catch (IOException e) {
                            Log.e("AuthHandler", "Logout failed: Server error: " + response.code(), e);
                        }
                    } else {
                        Log.e("AuthHandler", "Logout failed: Server error: " + response.code());
                    }
                    callback.onResult(false, "Server error: " + response.code());
                }
            }

            @Override
            @EverythingIsNonNull
            public void onFailure(Call<GenericResponse<Void>> call, Throwable t) {
                // Handle failure if needed
                callback.onResult(false, "Network error: " + t.getMessage());
            }
        });
    }

    public void changePassword(Context context, String oldPassword, String newPassword, DataCallback callback) {
        Call<GenericResponse<Void>> call = getApiRoutes(context).changePassword(new ChangePasswordRequest(oldPassword, newPassword));
        call.enqueue(new Callback<GenericResponse<Void>>() {
            @Override
            @EverythingIsNonNull
            public void onResponse(Call<GenericResponse<Void>> call, Response<GenericResponse<Void>> response) {
                if (response.isSuccessful()) {
                    // Get the response body
                    GenericResponse<Void> changePasswordResponse = response.body();
                    if (changePasswordResponse == null) {
                        callback.onResult(false, "Change password failed: Response body is null");
                        Log.e("AuthHandler", "Change password failed: Response body is null");
                        return;
                    }
                    if (!changePasswordResponse.isSuccess()) {
                        callback.onResult(false, "Change password failed: Code " + changePasswordResponse.getError().getCode()
                                + ", Message: " + changePasswordResponse.getError().getMessage());
                        Log.e("AuthHandler", "Change password failed: Code " + changePasswordResponse.getError().getCode()
                                + ", Message: " + changePasswordResponse.getError().getMessage());
                        return;
                    }

                    callback.onResult(true, "Change password successful");
                } else {
                    if (response.errorBody() != null) {
                        try {
                            String errorBody = response.errorBody().string();
                            Log.e("AuthHandler", "Change password failed: Server error: " + response.code() + ", Body: " + errorBody);
                        } catch (IOException e) {
                            Log.e("AuthHandler", "Change password failed: Server error: " + response.code(), e);
                        }
                    } else {
                        Log.e("AuthHandler", "Change password failed: Server error: " + response.code());
                    }
                    callback.onResult(false, "Change password failed: Server error: " + response.code());
                }
            }

            @Override
            @EverythingIsNonNull
            public void onFailure(Call<GenericResponse<Void>> call, Throwable t) {
                Log.e("AuthHandler", "Change password failed: Network error", t);
                callback.onResult(false, "Change password failed: Network error: " + t.getMessage());
            }
        });
    }
}
