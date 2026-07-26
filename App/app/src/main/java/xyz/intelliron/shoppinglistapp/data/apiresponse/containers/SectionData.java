package xyz.intelliron.shoppinglistapp.data.apiresponse.containers;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class SectionData {
    @SerializedName("section_id")
    private String id;
    @SerializedName("list_id")
    private String listId;
    @SerializedName("section_name")
    private String name;
    @SerializedName("sort_order")
    private int sortOrder;
    private String version;
    @SerializedName("created_at")
    private @Nullable String createdAt;
    @SerializedName("last_modified")
    private String lastModified;

    public String getId() {
        return id;
    }

    public String getListId() {
        return listId;
    }

    public String getName() {
        return name;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public String getVersion() {
        return version;
    }

    /**
     * Get the creation timestamp of the section.
     * Is null for section updates, as that field is not returned by the API.
     *
     * @return The creation timestamp of the section, or null if not available.
     */
    public @Nullable String getCreatedAt() {
        return createdAt;
    }

    /**
     * Get the last modified timestamp of the section.
     *
     * @return The last modified timestamp of the section.
     */
    public String getLastModified() {
        return lastModified;
    }
}
