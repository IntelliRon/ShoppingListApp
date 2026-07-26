package xyz.intelliron.shoppinglistapp.data.apirequest.sync;

import java.util.ArrayList;

import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync.ItemUpdateData;

public class SyncItemListRequest {
    private final String list_id;
    private final ArrayList<ItemUpdateData> item_updates;
    private long last_update_timestamp;

    public SyncItemListRequest(String list_id) {
        this.list_id = list_id;
        this.item_updates = new ArrayList<>();
        this.last_update_timestamp = System.currentTimeMillis();
    }

    public String getListId() {
        return list_id;
    }

    public ItemUpdateData[] getItemUpdates() {
        return item_updates.toArray(new ItemUpdateData[0]);
    }

    public long getLastUpdateTimestamp() {
        return last_update_timestamp;
    }

    public void addItemUpdate(ItemUpdateData itemUpdate) {
        item_updates.add(itemUpdate);
        last_update_timestamp = System.currentTimeMillis();
    }

    /**
     * Removes an item update from the list of item updates.
     * Note that this should only be used once the item has been synced with the server and the update is no longer needed.
     *
     * @param itemUpdate The item update to be removed.
     */
    public void removeItemUpdate(ItemUpdateData itemUpdate) {
        item_updates.remove(itemUpdate);
        last_update_timestamp = System.currentTimeMillis();
    }

    /**
     * Removes an item update from the list of item updates by its position in the list.
     * Note that this should only be used once the item has been synced with the server and the update is no longer needed.
     *
     * @param updateId The ID of the item update to be removed.
     */
    public void removeItemUpdateById(int updateId) {
        item_updates.remove(updateId);
        last_update_timestamp = System.currentTimeMillis();
    }

    public void clearItemUpdates() {
        item_updates.clear();
        last_update_timestamp = System.currentTimeMillis();
    }
}
