package xyz.intelliron.shoppinglistapp.data.apirequest.items;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class UpdateItemRequest {
    @SerializedName("item_name")
    @Nullable
    private final String name;
    @SerializedName("section_id")
    @Nullable
    private final String sectionId;
    @SerializedName("is_completed")
    @Nullable
    private final Boolean isCompleted;

    public UpdateItemRequest(@Nullable String name, @Nullable String sectionId, @Nullable Boolean isCompleted) {
        this.name = name;
        this.sectionId = sectionId;
        this.isCompleted = isCompleted;
    }

    @Nullable
    public String getName() {
        return name;
    }

    @Nullable
    public String getSectionId() {
        return sectionId;
    }

    @Nullable
    public Boolean getIsCompleted() {
        return isCompleted;
    }
}
