package xyz.intelliron.shoppinglistapp.data.apiresponse;

import androidx.annotation.Nullable;

public class GenericResponse<T> {
    private boolean success;
    private @Nullable T data;
    private String timestamp;
    private @Nullable ErrorData error;

    public boolean isSuccess() {
        return success;
    }

    public @Nullable T getData() {
        return data;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public @Nullable ErrorData getError() {
        return error;
    }
}
