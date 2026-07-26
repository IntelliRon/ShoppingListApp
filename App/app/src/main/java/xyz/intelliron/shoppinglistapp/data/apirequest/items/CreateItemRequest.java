package xyz.intelliron.shoppinglistapp.data.apirequest.items;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class CreateItemRequest {
    @SerializedName("item_name")
    private final String name;
    @SerializedName("section_id")
    @Nullable
    private final String sectionId;

    public CreateItemRequest(String name, @Nullable String sectionId) {
        this.name = name;
        this.sectionId = sectionId;
    }

    public String getName() {
        return name;
    }

    @Nullable
    public String getSectionId() {
        return sectionId;
    }
}
