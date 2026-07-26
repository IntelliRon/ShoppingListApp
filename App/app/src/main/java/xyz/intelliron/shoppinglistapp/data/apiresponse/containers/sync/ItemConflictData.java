package xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync;

import com.google.gson.annotations.SerializedName;

import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.ItemData;

public class ItemConflictData {
    @SerializedName("item_id")
    private String itemId;
    @SerializedName("type")
    private String conflictType;
    @SerializedName("message")
    private String message;
    @SerializedName("server_version")
    private ConflictItem serverVersion;
    @SerializedName("client_version")
    private ConflictItem clientVersion;
}
