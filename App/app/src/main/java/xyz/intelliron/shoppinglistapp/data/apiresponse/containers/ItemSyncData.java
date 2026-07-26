package xyz.intelliron.shoppinglistapp.data.apiresponse.containers;

import com.google.gson.annotations.SerializedName;

import java.util.Map;

import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync.ItemConflictData;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync.ItemUpdateData;

public class ItemSyncData {
    private ItemUpdateData[] data; // All successful updates
    private ItemConflictData[] conflicts;
    @SerializedName("id_mapping")
    private Map<String, String> idMappings; // server_id -> client_id
    @SerializedName("synced_at")
    private String syncedAt;

    public ItemUpdateData[] getData() {
        return data;
    }

    public ItemConflictData[] getConflicts() {
        return conflicts;
    }

    public Map<String, String> getIdMappings() {
        return idMappings;
    }

    public String getSyncedAt() {
        return syncedAt;
    }
}
