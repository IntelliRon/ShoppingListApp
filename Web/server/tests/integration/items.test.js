/**
 * Items API Integration Tests
 * Tests the full Items API flow with real CSV files (in temp directory)
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
delete require.cache[require.resolve("../../src/services/listService")];
delete require.cache[require.resolve("../../src/services/itemService")];
delete require.cache[require.resolve("../../src/middleware/authMiddleware")];
delete require.cache[require.resolve("../../src/controllers/listsController")];
delete require.cache[require.resolve("../../src/controllers/itemsController")];
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

describe("Items API", () => {
	let authToken;
	let userId;
	let listId;
	let sectionId;
	let itemId;

	// Suppress expected console.error logs during testing
	beforeAll(async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});

		// Create test user and get token
		const registerRes = await request(app).post("/api/v1/auth/register").send(TEST_USER);
		expect(registerRes.status).toBe(201);

		authToken = registerRes.body.data.token;
		userId = registerRes.body.data.user_id;
	});

	afterAll(() => {
		jest.restoreAllMocks();
		// Clean up test directory
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe("GET /lists/:list_id/items", () => {
		beforeAll(async () => {
			// Create a test list
			const listRes = await request(app)
				.post("/api/v1/lists")
				.set("Authorization", `Bearer ${authToken}`)
				.send({ list_name: "Test List" });

			listId = listRes.body.data.list_id;

			// Create a test section
			const sectionRes = await request(app)
				.post(`/api/v1/lists/${listId}/sections`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ section_name: "Test Section" });

			sectionId = sectionRes.body.data.section_id;
		});

		it("should return empty items array for a new list", async () => {
			const res = await request(app)
				.get(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(Array.isArray(res.body.data)).toBe(true);
			expect(res.body.data.length).toBe(0);
		});
	});

	describe("POST /lists/:list_id/items", () => {
		it("should create a new item with section", async () => {
			const res = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Apples",
					section_id: sectionId,
				});

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.data.item_id).toBeDefined();
			expect(res.body.data.item_name).toBe("Apples");
			expect(res.body.data.section_id).toBe(sectionId);
			expect(res.body.data.is_completed).toBe(false);
			expect(res.body.data.created_at).toBeDefined();
			expect(res.body.data.last_modified).toBeDefined();

			itemId = res.body.data.item_id;
		});

		it("should create a new ungrouped item (no section)", async () => {
			const res = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Milk",
				});

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.data.item_id).toBeDefined();
			expect(res.body.data.item_name).toBe("Milk");
			expect(res.body.data.section_id).toBeNull();
			expect(res.body.data.is_completed).toBe(false);
		});

		it("should fail without item_name", async () => {
			const res = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					section_id: sectionId,
				});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
			expect(res.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should fail with invalid section_id", async () => {
			const res = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Invalid Item",
					section_id: "invalid_section",
				});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
			expect(res.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should fail for non-existent list", async () => {
			const res = await request(app)
				.post(`/api/v1/lists/invalid_list/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Apples",
				});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
		});

		it("should fail without authentication", async () => {
			const res = await request(app).post(`/api/v1/lists/${listId}/items`).send({
				item_name: "Apples",
			});

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
		});
	});

	describe("PUT /lists/:list_id/items/:item_id", () => {
		it("should update item name", async () => {
			const res = await request(app)
				.put(`/api/v1/lists/${listId}/items/${itemId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "Red Apples",
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.item_id).toBe(itemId);
			expect(res.body.data.item_name).toBe("Red Apples");
			expect(res.body.data.last_modified).toBeDefined();
		});

		it("should toggle item completion", async () => {
			const res = await request(app)
				.put(`/api/v1/lists/${listId}/items/${itemId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					is_completed: true,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.is_completed).toBe(true);
		});

		it("should move item to different section", async () => {
			// Create another section
			const sectionRes = await request(app)
				.post(`/api/v1/lists/${listId}/sections`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ section_name: "New Section" });

			const newSectionId = sectionRes.body.data.section_id;

			const res = await request(app)
				.put(`/api/v1/lists/${listId}/items/${itemId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					section_id: newSectionId,
				});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.section_id).toBe(newSectionId);
		});

		it("should fail without updates", async () => {
			const res = await request(app)
				.put(`/api/v1/lists/${listId}/items/${itemId}`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({});

			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
		});

		it("should fail for non-existent item", async () => {
			const res = await request(app)
				.put(`/api/v1/lists/${listId}/items/invalid_item`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "New Name",
				});

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
			expect(res.body.error.code).toBe("NOT_FOUND");
		});
	});

	describe("DELETE /lists/:list_id/items/:item_id", () => {
		let deleteItemId;

		beforeAll(async () => {
			// Create an item to delete
			const res = await request(app)
				.post(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					item_name: "To Delete",
				});
			deleteItemId = res.body.data.item_id;
		});

		it("should delete an item", async () => {
			const res = await request(app)
				.delete(`/api/v1/lists/${listId}/items/${deleteItemId}`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data).toBeNull();
		});

		it("should fail for non-existent item", async () => {
			const res = await request(app)
				.delete(`/api/v1/lists/${listId}/items/invalid_item`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
		});

		it("should fail without authentication", async () => {
			const res = await request(app).delete(`/api/v1/lists/${listId}/items/${itemId}`);

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
		});
	});

	describe("GET /lists/:list_id/items (with multiple items)", () => {
		it("should return all items for a list", async () => {
			const res = await request(app)
				.get(`/api/v1/lists/${listId}/items`)
				.set("Authorization", `Bearer ${authToken}`);

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(Array.isArray(res.body.data)).toBe(true);
			expect(res.body.data.length).toBeGreaterThan(0);

			// Check item structure
			res.body.data.forEach((item) => {
				expect(item.item_id).toBeDefined();
				expect(item.item_name).toBeDefined();
				expect(typeof item.is_completed).toBe("boolean");
				expect(item.created_at).toBeDefined();
				expect(item.last_modified).toBeDefined();
			});
		});
	});
});
