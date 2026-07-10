/**
 * Lists and Sections API Integration Tests
 * Tests the full Lists and Sections API flow with real CSV files (in temp directory)
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
delete require.cache[require.resolve("../../src/middleware/authMiddleware")];
delete require.cache[require.resolve("../../src/controllers/listsController")];
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

describe("Lists and Sections API", () => {
	let authToken;
	let userId;
	let listId;
	let sectionId;

	// Suppress expected console.error logs during testing
	beforeAll(async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});

		// Create test user and get token
		const response = await request(app).post("/api/v1/auth/register").send(TEST_USER);

		expect(response.status).toBe(201);
		authToken = response.body.data.token;
		userId = response.body.data.user_id;
	});

	afterAll(() => {
		// Restore console.error
		console.error.mockRestore();

		// Clear require caches
		delete require.cache[require.resolve("../../src/app")];
		delete require.cache[require.resolve("../../src/services/listService")];

		// Clean up test files and directory
		try {
			if (fs.existsSync(TEST_DIR)) {
				fs.rmSync(TEST_DIR, { recursive: true, force: true });
			}
		} catch (error) {
			console.log("Cleanup note:", error.message);
		}

		// Clear the environment variables
		delete process.env.TEST_USERS_FILE;
		delete process.env.TEST_BLACKLIST_FILE;
		delete process.env.TEST_DB_PATH;
	});

	// ========== LIST TESTS ==========

	it("should create a new list", async () => {
		const response = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Grocery Shopping" });

		expect(response.status).toBe(201);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("list_id");
		expect(response.body.data.list_name).toBe("Grocery Shopping");
		expect(response.body.data).toHaveProperty("created_at");

		listId = response.body.data.list_id;
	});

	it("should reject creating list without authorization", async () => {
		const response = await request(app)
			.post("/api/v1/lists")
			.send({ list_name: "Unauthorized List" });

		expect(response.status).toBe(401);
		expect(response.body.success).toBe(false);
		expect(response.body.error.code).toBe("UNAUTHORIZED");
	});

	it("should reject creating list with missing name", async () => {
		const response = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject creating list with name exceeding max length", async () => {
		const longName = "a".repeat(101);
		const response = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: longName });

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it("should retrieve all lists for user", async () => {
		const response = await request(app)
			.get("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);

		const list = response.body.data.find((l) => l.list_id === listId);
		expect(list).toBeDefined();
		expect(list.list_name).toBe("Grocery Shopping");
	});

	it("should rename an existing list", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Weekly Groceries" });

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.list_name).toBe("Weekly Groceries");
		expect(response.body.data).toHaveProperty("last_modified");
	});

	it("should return 404 when renaming non-existent list", async () => {
		const response = await request(app)
			.put("/api/v1/lists/l999")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "New Name" });

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
		expect(response.body.error.code).toBe("NOT_FOUND");
	});

	// ========== SECTION TESTS ==========

	it("should create a new section in a list", async () => {
		const response = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Produce" });

		expect(response.status).toBe(201);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("section_id");
		expect(response.body.data.section_name).toBe("Produce");
		expect(response.body.data).toHaveProperty("sort_order");

		sectionId = response.body.data.section_id;
	});

	it("should reject creating section without authorization", async () => {
		const response = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.send({ section_name: "Dairy" });

		expect(response.status).toBe(401);
		expect(response.body.success).toBe(false);
	});

	it("should reject creating section with missing name", async () => {
		const response = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it("should reject creating section for non-existent list", async () => {
		const response = await request(app)
			.post("/api/v1/lists/l999/sections")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Produce" });

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
		expect(response.body.error.code).toBe("NOT_FOUND");
	});

	it("should retrieve all sections for a list", async () => {
		const response = await request(app)
			.get(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThan(0);

		const section = response.body.data.find((s) => s.section_id === sectionId);
		expect(section).toBeDefined();
		expect(section.section_name).toBe("Produce");
	});

	it("should return 404 when getting sections for non-existent list", async () => {
		const response = await request(app)
			.get("/api/v1/lists/l999/sections")
			.set("Authorization", `Bearer ${authToken}`);

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
	});

	it("should rename an existing section", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${sectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Fresh Produce" });

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.section_name).toBe("Fresh Produce");
		expect(response.body.data).toHaveProperty("last_modified");
	});

	it("should return 404 when renaming non-existent section", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/sec999`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "New Name" });

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
	});

	it("should delete a section", async () => {
		// Create a section to delete
		const createResponse = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Section to Delete" });

		const sectionToDelete = createResponse.body.data.section_id;

		// Delete it
		const deleteResponse = await request(app)
			.delete(`/api/v1/lists/${listId}/sections/${sectionToDelete}`)
			.set("Authorization", `Bearer ${authToken}`);

		expect(deleteResponse.status).toBe(200);
		expect(deleteResponse.body.success).toBe(true);
	});

	it("should delete an existing list", async () => {
		// Create a list to delete
		const createResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "List to Delete" });

		const listToDelete = createResponse.body.data.list_id;

		// Delete it
		const deleteResponse = await request(app)
			.delete(`/api/v1/lists/${listToDelete}`)
			.set("Authorization", `Bearer ${authToken}`);

		expect(deleteResponse.status).toBe(200);
		expect(deleteResponse.body.success).toBe(true);
		expect(deleteResponse.body.data).toBeNull();
	});

	it("should return 404 when deleting non-existent list", async () => {
		const response = await request(app)
			.delete("/api/v1/lists/l999")
			.set("Authorization", `Bearer ${authToken}`);

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
	});
});
