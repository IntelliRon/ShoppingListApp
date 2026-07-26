package xyz.intelliron.shoppinglistapp.data.apirequest.sections;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class UpdateSectionRequest {
    @SerializedName("section_name")
    @Nullable
    private final String name;
    @SerializedName("sort_order")
    @Nullable
    private final Integer sortOrder;
    @SerializedName("expected_version")
    @Nullable
    private final String expectedVersion;

    public UpdateSectionRequest(@Nullable String name, @Nullable Integer sortOrder, @Nullable String expectedVersion) {
        this.name = name;
        this.sortOrder = sortOrder;
        this.expectedVersion = expectedVersion;
    }

    @Nullable
    public String getName() {
        return name;
    }


    @Nullable
    public Integer getSortOrder() {
        return sortOrder;
    }

    @Nullable
    public String getExpectedVersion() {
        return expectedVersion;
    }
}
