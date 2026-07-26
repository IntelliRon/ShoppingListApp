package xyz.intelliron.shoppinglistapp.data.apiresponse.containers;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class UserData {
    @SerializedName("user_id")
    private String id;
    private String username;
    private String email;
    private String token;
    @SerializedName("created_at")
    private @Nullable String createdAt;
    @SerializedName("is_developer")
    private @Nullable Boolean isDeveloper;
    @SerializedName("expires_in")
    private long expiresIn;

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getToken() {
        return token;
    }

    /**
     * Get the account creation timestamp of the user.
     * This field is null when the user is logged in.
     * This field should not be null when the user is first registered.
     *
     * @return The account creation timestamp, or null if the user is logged in.
     */
    public @Nullable String getCreatedAt() {
        return createdAt;
    }

    /**
     * Get the developer status of the user.
     * This field is not returned when the user is first registered, as the developer flag is set manually in the database. Therefore, this field may be null if the information is not available.
     *
     * @return True if the user is a developer, false if not, or null if the information is not available.
     */
    public @Nullable Boolean getIsDeveloper() {
        return isDeveloper;
    }

    /**
     * Get the token expiration time in seconds.
     *
     * @return The number of seconds until the token expires.
     */
    public long getExpiresIn() {
        return expiresIn;
    }
}
