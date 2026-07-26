package xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync;

import com.google.gson.annotations.SerializedName;

public final class ItemUpdateData {
    @SerializedName("item_id")
    private final String itemId;
    @SerializedName("item_name")
    private final String itemName;
    @SerializedName("section_id")
    private final String sectionId;
    @SerializedName("is_completed")
    private final boolean isCompleted;
    @SerializedName("last_modified")
    private final long lastUpdateTimestamp;
    @SerializedName("operation")
    private final OperationType operationType;

    public ItemUpdateData(String itemId, String itemName, String sectionId, boolean isCompleted, long lastUpdateTimestamp, OperationType operationType) {
        this.itemId = itemId;
        this.itemName = itemName;
        this.sectionId = sectionId;
        this.isCompleted = isCompleted;
        this.lastUpdateTimestamp = lastUpdateTimestamp;
        this.operationType = operationType;
    }

    public String getItemId() {
        return itemId;
    }

    public String getItemName() {
        return itemName;
    }

    public String getSectionId() {
        return sectionId;
    }

    public boolean isCompleted() {
        return isCompleted;
    }

    public long getLastUpdateTimestamp() {
        return lastUpdateTimestamp;
    }

    public OperationType getOperationType() {
        return operationType;
    }
}
