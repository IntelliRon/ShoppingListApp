package xyz.intelliron.shoppinglistapp.data.apirequest.lists;

import com.google.gson.annotations.SerializedName;

public class CreateListRequest {
    @SerializedName("list_name")
    private final String listName;

    public CreateListRequest(String listName) {
        this.listName = listName;
    }

    public String getListName() {
        return listName;
    }
}
