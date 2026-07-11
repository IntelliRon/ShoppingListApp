/**
 * Unit tests for syncService.js
 * Tests sync conflict detection and resolution with edge cases
 */

const fs = require("fs");
const path = require("path");

// Setup temp DB for testing
const TEST_DB_PATH = path.join(__dirname, "../fixtures/test_db_sync_unit");
const TEST_USERS_FILE = path.join(TEST_DB_PATH, "users.csv");

// Clear require cache before each test to avoid cross-test pollution
beforeEach(() => {
	delete require.cache[require.resolve("../../src/services/csvService")];
	delete require.cache[require.resolve("../../src/services/syncService")];
	delete require.cache[require.resolve("../../src/services/itemService")];
	delete require.cache[require.resolve("../../src/services/listService")];
});

afterEach(() => {
	// Clean up test DB
	if (fs.existsSync(TEST_DB_PATH)) {
		fs.rmSync(TEST_DB_PATH, { recursive: true });
	}
	// Clear env vars to prevent cross-test interference
	delete process.env.TEST_DB_PATH;
	delete process.env.TEST_USERS_FILE;
});

describe("syncService", () => {
	beforeEach(() => {
		process.env.TEST_DB_PATH = TEST_DB_PATH;
		process.env.TEST_USERS_FILE = TEST_USERS_FILE;

		// Create test directory
		if (!fs.existsSync(TEST_DB_PATH)) {
			fs.mkdirSync(TEST_DB_PATH, { recursive: true });
		}

		// Create minimal users file for list verification
		const usersHeader = "user_id,username,email,password_hash,created_at\n";
		fs.writeFileSync(
			TEST_USERS_FILE,
			usersHeader + "u_test123,testuser,test@example.com,hash,2024-01-01T00:00:00Z\n"
		);
	});

	describe("create operations with offline IDs", () => {
		test("syncItems should map offline-created items to server IDs", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";
			const now = new Date().toISOString();

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Client sends create with temp/offline ID
			const clientItems = [
				{
					item_id: "i_offline_1",
					list_id: list.list_id,
					item_name: "Offline Item",
					section_id: "",
					is_completed: "false",
					operation: "create",
					last_modified: now,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// Should map temp ID to server ID
			expect(result.id_mapping["i_offline_1"]).toBeDefined();
			expect(result.id_mapping["i_offline_1"]).toMatch(/^i\d+/);

			// Item should exist with server ID
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items.length).toBe(1);
			expect(items[0].item_id).toBe(result.id_mapping["i_offline_1"]);
		});

		test("syncItems should handle multiple offline creates and map all IDs", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";
			const now = new Date().toISOString();

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Multiple offline creates
			const clientItems = [
				{
					item_id: "i_offline_1",
					list_id: list.list_id,
					item_name: "First",
					section_id: "",
					is_completed: "false",
					operation: "create",
					last_modified: now,
				},
				{
					item_id: "i_offline_2",
					list_id: list.list_id,
					item_name: "Second",
					section_id: "",
					is_completed: "false",
					operation: "create",
					last_modified: now,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// All temp IDs should map to unique server IDs
			expect(result.id_mapping["i_offline_1"]).toBeDefined();
			expect(result.id_mapping["i_offline_2"]).toBeDefined();
			expect(result.id_mapping["i_offline_1"]).not.toBe(result.id_mapping["i_offline_2"]);

			// Verify both items created
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items.length).toBe(2);
		});
	});

	describe("conflict detection", () => {
		test("syncItems should detect CREATE_CONFLICT when item already exists", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";
			const now = new Date().toISOString();

			// Create list and server item
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const serverItem = await itemService.createItem(userId, list.list_id, "Server Item");

			// Client tries to create with same ID
			const clientItems = [
				{
					item_id: serverItem.item_id,
					list_id: list.list_id,
					item_name: "Client Item",
					section_id: "",
					is_completed: "false",
					operation: "create",
					last_modified: now,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// Should detect conflict
			expect(result.conflicts.length).toBeGreaterThan(0);
			expect(result.conflicts[0].type).toBe("CREATE_CONFLICT");
		});

		test("syncItems should respect timestamp ordering for updates", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";

			// Create list and server item
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const serverItem = await itemService.createItem(userId, list.list_id, "Original");
			const serverTimestamp = new Date(serverItem.last_modified).getTime();

			// Client sends update with NEWER timestamp
			const newerTime = new Date(serverTimestamp + 2000).toISOString();

			const clientItems = [
				{
					item_id: serverItem.item_id,
					list_id: list.list_id,
					item_name: "Updated",
					section_id: "",
					is_completed: "false",
					operation: "update",
					last_modified: newerTime,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// No conflict - client timestamp newer so update applied
			const conflictForThisItem = result.conflicts.find(
				(c) => c.item_id === serverItem.item_id
			);
			expect(conflictForThisItem).toBeUndefined();

			// Verify update was applied
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items[0].item_name).toBe("Updated");
		});

		test("syncItems should detect UPDATE_CONFLICT when server is newer", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";

			// Create list and server item
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const serverItem = await itemService.createItem(userId, list.list_id, "Original");
			const serverTimestamp = new Date(serverItem.last_modified).getTime();

			// Wait a bit then update on server
			await new Promise((resolve) => setTimeout(resolve, 100));
			await itemService.updateItem(userId, list.list_id, serverItem.item_id, {
				item_name: "Recently Updated",
			});

			// Client tries to update with OLDER timestamp
			const olderTime = new Date(serverTimestamp - 1000).toISOString();

			const clientItems = [
				{
					item_id: serverItem.item_id,
					list_id: list.list_id,
					item_name: "Client Version",
					section_id: "",
					is_completed: "false",
					operation: "update",
					last_modified: olderTime,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// Should detect conflict (server timestamp is newer)
			const conflict = result.conflicts.find((c) => c.item_id === serverItem.item_id);
			expect(conflict).toBeDefined();
			expect(conflict.type).toBe("UPDATE_CONFLICT");

			// Server version should be preserved
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items[0].item_name).toBe("Recently Updated");
		});

		test("syncItems should detect DELETE_CONFLICT when server is newer", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");
			const itemService = require("../../src/services/itemService");

			const userId = "u_test123";

			// Create list and server item
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const serverItem = await itemService.createItem(userId, list.list_id, "Item");
			const serverTimestamp = new Date(serverItem.last_modified).getTime();

			// Wait then update on server to get newer timestamp
			await new Promise((resolve) => setTimeout(resolve, 100));
			await itemService.updateItem(userId, list.list_id, serverItem.item_id, {
				item_name: "Recently Updated",
			});

			// Client tries to delete with old timestamp
			const olderTime = new Date(serverTimestamp - 1000).toISOString();

			const clientItems = [
				{
					item_id: serverItem.item_id,
					list_id: list.list_id,
					item_name: "",
					section_id: "",
					is_completed: "false",
					operation: "delete",
					last_modified: olderTime,
				},
			];

			const result = await syncService.syncItems(userId, list.list_id, clientItems);

			// Should detect conflict (server newer, so delete rejected)
			const conflict = result.conflicts.find((c) => c.item_id === serverItem.item_id);
			expect(conflict).toBeDefined();
			expect(conflict.type).toBe("DELETE_CONFLICT");

			// Item should still exist
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items.length).toBe(1);
		});
	});

	describe("validation and error handling", () => {
		test("syncItems should validate list exists", async () => {
			const syncService = require("../../src/services/syncService");

			const userId = "u_test123";
			const now = new Date().toISOString();

			const clientItems = [
				{
					item_id: "i_1",
					list_id: "l_nonexistent",
					item_name: "Item",
					section_id: "",
					is_completed: "false",
					operation: "create",
					last_modified: now,
				},
			];

			await expect(
				syncService.syncItems(userId, "l_nonexistent", clientItems)
			).rejects.toThrow("List not found");
		});

		test("syncItems should skip invalid operations", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");

			const userId = "u_test123";
			const now = new Date().toISOString();

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Send item with invalid operation
			const clientItems = [
				{
					item_id: "i_1",
					list_id: list.list_id,
					item_name: "Item",
					section_id: "",
					is_completed: "false",
					operation: "invalid", // Invalid operation
					last_modified: now,
				},
			];

			// Should not throw, just skip the invalid item
			const result = await syncService.syncItems(userId, list.list_id, clientItems);
			expect(result.id_mapping).toBeDefined();
			expect(Object.keys(result.id_mapping).length).toBe(0); // Nothing created
		});

		test("syncItems should handle empty batch", async () => {
			const listService = require("../../src/services/listService");
			const syncService = require("../../src/services/syncService");

			const userId = "u_test123";

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Empty batch
			const result = await syncService.syncItems(userId, list.list_id, []);

			expect(result.conflicts).toBeDefined();
			expect(result.conflicts.length).toBe(0);
			expect(result.id_mapping).toBeDefined();
			expect(Object.keys(result.id_mapping).length).toBe(0);
		});
	});
});
