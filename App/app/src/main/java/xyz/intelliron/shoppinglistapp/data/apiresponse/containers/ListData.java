package xyz.intelliron.shoppinglistapp.data.apiresponse.containers;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class ListData {
    @SerializedName("list_id")
    private String id;
    @SerializedName("list_name")
    private String name;
    @SerializedName("created_at")
    private @Nullable String createdAt;
    @SerializedName("last_modified")
    private String lastModified;
    @SerializedName("version")
    private String version;
    @SerializedName("item_count")
    private @Nullable String itemCount;
    @SerializedName("completed_count")
    private @Nullable String completedCount;

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    /**
     * Get the creation timestamp of the list.
     * Is null for item updates, as that field is not returned by the API.
     *
     * @return The creation timestamp of the list, or null if not available.
     */
    public @Nullable String getCreatedAt() {
        return createdAt;
    }

    /**
     * Get the last modified timestamp of the list.
     *
     * @return The last modified timestamp of the list.
     */

    public String getLastModified() {
        return lastModified;
    }

    /**
     * Get the version of the list.
     *
     * @return The version of the list.
     */
    public String getVersion() {
        return version;
    }

    /**
     * Get the item count of the list.
     * Is only available for Get list responses. Null in all other cases.
     *
     * @return The item count of the list, or null if not available.
     */
    public @Nullable String getItemCount() {
        return itemCount;
    }

    /**
     * Get the completed count of the list.
     * Is only available for Get list responses. Null in all other cases.
     *
     * @return The completed count of the list, or null if not available.
     */
    public @Nullable String getCompletedCount() {
        return completedCount;
    }
}
