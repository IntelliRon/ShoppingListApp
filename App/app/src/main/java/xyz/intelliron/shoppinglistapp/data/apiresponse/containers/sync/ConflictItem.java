package xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync;

import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.ItemData;

public class ConflictItem extends ItemData {
    private String operation;

    public String getOperation() {
        return operation;
    }
}
