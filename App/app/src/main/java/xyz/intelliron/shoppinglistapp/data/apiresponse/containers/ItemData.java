package xyz.intelliron.shoppinglistapp.data.apiresponse.containers;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class ItemData {
    @SerializedName("item_id")
    private String id;
    @SerializedName("item_name")
    private String name;
    @SerializedName("section_id")
    private String sectionId;
    @SerializedName("is_completed")
    private boolean isCompleted;
    @SerializedName("created_at")
    private @Nullable String createdAt;
    @SerializedName("last_modified")
    private String lastModified;

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSectionId() {
        return sectionId;
    }

    public boolean isCompleted() {
        return isCompleted;
    }

    /**
     * Get the creation timestamp of the item.
     * Is null for item updates, as that field is not returned by the API.
     *
     * @return The creation timestamp of the item, or null if not available.
     */
    public @Nullable String getCreatedAt() {
        return createdAt;
    }

    public String getLastModified() {
        return lastModified;
    }
}
