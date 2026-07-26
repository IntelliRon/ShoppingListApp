package xyz.intelliron.shoppinglistapp.data;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.ChangePasswordRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.LoginRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.auth.RegisterUserRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.items.CreateItemRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.items.UpdateItemRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.lists.CreateListRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.lists.UpdateListRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.sections.CreateSectionRequest;
import xyz.intelliron.shoppinglistapp.data.apirequest.sections.UpdateSectionRequest;
import xyz.intelliron.shoppinglistapp.data.apiresponse.GenericResponse;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.UserData;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.ItemData;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.ListData;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.SectionData;
import xyz.intelliron.shoppinglistapp.data.apiresponse.containers.sync.ItemConflictData;
import xyz.intelliron.shoppinglistapp.data.apirequest.sync.SyncItemListRequest;

public interface ApiRoutes {

    // Auth routes
    @POST("auth/register")
    Call<GenericResponse<UserData>> registerUser(@Body RegisterUserRequest request);

    @POST("auth/login")
    Call<GenericResponse<UserData>> loginUser(@Body LoginRequest request);

    @POST("auth/logout")
    Call<GenericResponse<Void>> logoutUser();

    @POST("auth/change-password")
    Call<GenericResponse<Void>> changePassword(@Body ChangePasswordRequest request);


    // Shopping list routes
    @GET("/lists")
    Call<GenericResponse<ListData>> getShoppingLists();

    @POST("/lists")
    Call<GenericResponse<ListData>> createShoppingList(@Body CreateListRequest request);

    @PUT("/lists/{listId}")
    Call<GenericResponse<ListData>> updateShoppingList(@Path("listId") String listId, @Body UpdateListRequest request);

    @DELETE("/lists/{listId}")
    Call<GenericResponse<Void>> deleteShoppingList(@Path("listId") String listId);


    // Sections routes
    @GET("/lists/{listId}/sections")
    Call<GenericResponse<SectionData>> getSections(@Path("listId") String listId);

    @POST("/lists/{listId}/sections")
    Call<GenericResponse<SectionData>> createSection(@Path("listId") String listId, @Body CreateSectionRequest request);

    @PUT("/lists/{listId}/sections/{sectionId}")
    Call<GenericResponse<SectionData>> updateSection(@Path("listId") String listId, @Path("sectionId") String sectionId, @Body UpdateSectionRequest request);

    @DELETE("/lists/{listId}/sections/{sectionId}")
    Call<GenericResponse<Void>> deleteSection(@Path("listId") String listId, @Path("sectionId") String sectionId);


    // Items routes
    @GET("/lists/{listId}/items")
    Call<GenericResponse<ItemData>> getItems(@Path("listId") String listId);

    @POST("/lists/{listId}/items")
    Call<GenericResponse<ItemData>> createItem(@Path("listId") String listId, @Body CreateItemRequest request);

    @PUT("/lists/{listId}/items/{itemId}")
    Call<GenericResponse<ItemData>> updateItem(@Path("listId") String listId, @Path("itemId") String itemId, @Body UpdateItemRequest request);

    @DELETE("/lists/{listId}/items/{itemId}")
    Call<GenericResponse<Void>> deleteItem(@Path("listId") String listId, @Path("itemId") String itemId);


    // Sync routes
    @POST("/sync/items")
    Call<GenericResponse<ItemConflictData>> syncItems(@Body SyncItemListRequest updates);
}
