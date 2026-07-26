package xyz.intelliron.shoppinglistapp.data.apirequest.lists;

import androidx.annotation.Nullable;

import com.google.gson.annotations.SerializedName;

public class UpdateListRequest {
    @SerializedName("list_name")
    private final String listName;
    @SerializedName("expected_version")
    @Nullable
    private final String expectedVersion;

    public UpdateListRequest(String listName, @Nullable String expectedVersion) {
        this.listName = listName;
        this.expectedVersion = expectedVersion;
    }

    public String getListName() {
        return listName;
    }

    @Nullable
    public String getExpectedVersion() {
        return expectedVersion;
    }
}
