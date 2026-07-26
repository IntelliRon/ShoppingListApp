package xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync;

import com.google.gson.annotations.SerializedName;

public enum OperationType {
    @SerializedName("update")
    UPDATE,
    @SerializedName("create")
    CREATE,
    @SerializedName("delete")
    DELETE
}
