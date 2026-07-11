/**
 * Sync API Integration Tests
 * Tests the Sync API with conflict resolution
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// Create a unique temp directory for this test run
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "shopping-list-tests-"));
const TEST_DB_DIR = path.join(TEST_DIR, "db");

// Set environment variables to use temp directory for tests
process.env.TEST_USERS_FILE = path.join(TEST_DB_DIR, "users.csv");
process.env.TEST_BLACKLIST_FILE = path.join(TEST_DB_DIR, "token-blacklist.csv");
process.env.TEST_DB_PATH = TEST_DB_DIR;

// Clear require cache to ensure app/services read the env vars
delete require.cache[require.resolve("../../src/app")];
delete require.cache[require.resolve("../../src/services/authService")];
delete require.cache[require.resolve("../../src/services/csvService")];
delete require.cache[require.resolve("../../src/services/itemService")];
delete require.cache[require.resolve("../../src/services/syncService")];
delete require.cache[require.resolve("../../src/services/listService")];
delete require.cache[require.resolve("../../src/middleware/authMiddleware")];
delete require.cache[require.resolve("../../src/controllers/syncController")];
delete require.cache[require.resolve("../../src/controllers/itemsController")];
delete require.cache[require.resolve("../../src/routes/sync")];
delete require.cache[require.resolve("../../src/routes/lists")];
delete require.cache[require.resolve("../../src/routes/auth")];

const request = require("supertest");
const app = require("../../src/app");

// Test constants
const TEST_USER = {
	username: "testuser",
	password: "testPassword123",
	email: "testuser@example.com",
};

describe("Sync API", () => {
	let authToken;
	let userId;
	let listId;

	// Suppress expected console.error logs during testing
	beforeAll(async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});

		// Create test user and get token
		const registerRes = await request(app).post("/api/v1/auth/register").send(TEST_USER);
		expect(registerRes.status).toBe(201);

		authToken = registerRes.body.data.token;
		userId = registerRes.body.data.user_id;

		// Create a test list
		const listRes = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Sync Test List" });

		listId = listRes.body.data.list_id;
	});

	afterAll(() => {
		jest.restoreAllMocks();
		// Clean up test directory
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe("POST /sync/items", () => {
		it("should sync empty client items", async () => {
			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: [],
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.server_items).toBeDefined();
			expect(Array.isArray(res.body.data.server_items)).toBe(true);
			expect(res.body.data.conflicts).toBeDefined();
			expect(Array.isArray(res.body.data.conflicts)).toBe(true);
			expect(res.body.data.synced_at).toBeDefined();
		});

		it("should create items via sync (create operation)", async () => {
			const clientItems = [
				{
					item_id: "i_client_1",
					item_name: "Client Apples",
					section_id: null,
					is_completed: false,
					last_modified: new Date().toISOString(),
					operation: "create",
				},
			];

			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: clientItems,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.conflicts).toHaveLength(0);
			expect(res.body.data.server_items.length).toBeGreaterThan(0);

			// Verify item was created
			const createdItem = res.body.data.server_items.find(
				(item) => item.item_name === "Client Apples"
			);
			expect(createdItem).toBeDefined();
		});

		it("should handle create conflict when item already exists", async () => {
			// First, create an item via normal API
			const createRes = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Existing Item",
				});

			const existingItemId = createRes.body.data.item_id;
			const existingTimestamp = createRes.body.data.last_modified;

			// Try to sync a create operation with the same ID
			const clientItems = [
				{
					item_id: existingItemId,
					item_name: "Different Name",
					section_id: null,
					is_completed: false,
					last_modified: new Date().toISOString(),
					operation: "create",
				},
			];

			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: clientItems,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.conflicts.length).toBeGreaterThan(0);

			// Verify conflict is reported
			const conflict = res.body.data.conflicts.find((c) => c.item_id === existingItemId);
			expect(conflict).toBeDefined();
			expect(conflict.type).toBe("CREATE_CONFLICT");
		});

		it("should update item via sync (update operation with newer timestamp)", async () => {
			// Create an item
			const createRes = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Item to Update",
				});

			const itemId = createRes.body.data.item_id;
			const originalTimestamp = new Date(createRes.body.data.last_modified).getTime();

			// Create a newer timestamp
			const newerTimestamp = new Date(originalTimestamp + 5000).toISOString();

			// Sync an update with newer timestamp
			const clientItems = [
				{
					item_id: itemId,
					item_name: "Updated Item Name",
					section_id: null,
					is_completed: true,
					last_modified: newerTimestamp,
					operation: "update",
				},
			];

			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: clientItems,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.conflicts).toHaveLength(0);

			// Verify item was updated
			const updatedItem = res.body.data.server_items.find((item) => item.item_id === itemId);
			expect(updatedItem).toBeDefined();
			expect(updatedItem.item_name).toBe("Updated Item Name");
			expect(updatedItem.is_completed).toBe(true);
		});

		it("should handle update conflict when server version is newer", async () => {
			// Create an item
			const createRes = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Item with New Server Version",
				});

			const itemId = createRes.body.data.item_id;
			const serverTimestamp = createRes.body.data.last_modified;

			// Update on server
			await request(app)
				.put(`/api/v1/lists/${listId}/items/${itemId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Server Updated Name",
				});

			// Try to sync an update with older timestamp
			const oldTimestamp = new Date(
				new Date(serverTimestamp).getTime() - 10000
			).toISOString();

			const clientItems = [
				{
					item_id: itemId,
					item_name: "Client Updated Name",
					section_id: null,
					is_completed: false,
					last_modified: oldTimestamp,
					operation: "update",
				},
			];

			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: clientItems,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.conflicts.length).toBeGreaterThan(0);

			// Verify conflict
			const conflict = res.body.data.conflicts.find((c) => c.item_id === itemId);
			expect(conflict).toBeDefined();
			expect(conflict.type).toBe("UPDATE_CONFLICT");
			expect(conflict.server_version.item_name).toBe("Server Updated Name");
		});

		it("should delete item via sync (delete operation)", async () => {
			// Create an item
			const createRes = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Item to Delete",
				});

			const itemId = createRes.body.data.item_id;
			const timestamp = createRes.body.data.last_modified;

			// Sync a delete operation
			const clientItems = [
				{
					item_id: itemId,
					item_name: "Item to Delete",
					section_id: null,
					is_completed: false,
					last_modified: timestamp,
					operation: "delete",
				},
			];

			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: clientItems,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.conflicts).toHaveLength(0);

			// Verify item was deleted
			const deletedItem = res.body.data.server_items.find((item) => item.item_id === itemId);
			expect(deletedItem).toBeUndefined();
		});

		it("should fail without list_id", async () => {
			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					client_items: [],
				});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
			expect(res.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should fail with invalid operation", async () => {
			const res = await request(app)
				.post("/api/v1/sync/items")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					list_id: listId,
					client_items: [
						{
							item_id: "i_test",
							item_name: "Test",
							operation: "invalid_operation",
						},
					],
				});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
		});

		it("should fail without authentication", async () => {
			const res = await request(app).post("/api/v1/sync/items").send({
				list_id: listId,
				client_items: [],
			});

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
		});
	});
});
