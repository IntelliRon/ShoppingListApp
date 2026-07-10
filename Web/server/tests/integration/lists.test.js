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

	// Tests for section reordering functionality
	it("should reorder a section by sort_order only", async () => {
		// Create multiple sections to test reordering
		const section1Response = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Reorder Test 1" });

		const section2Response = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Reorder Test 2" });

		const reorderTestSection1 = section1Response.body.data.section_id;
		const reorderTestSection2 = section2Response.body.data.section_id;

		// Reorder first section to position after second
		const reorderResponse = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${reorderTestSection1}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: 100 });

		expect(reorderResponse.status).toBe(200);
		expect(reorderResponse.body.success).toBe(true);
		expect(reorderResponse.body.data.section_id).toBe(reorderTestSection1);
		expect(reorderResponse.body.data.sort_order).toBe(100);
	});

	it("should rename and reorder a section simultaneously", async () => {
		// Create a section for this test
		const createResponse = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Original Name" });

		const testSectionId = createResponse.body.data.section_id;

		// Update both name and sort_order
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${testSectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Updated Name", sort_order: 50 });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.success).toBe(true);
		expect(updateResponse.body.data.section_name).toBe("Updated Name");
		expect(updateResponse.body.data.sort_order).toBe(50);
	});

	it("should reject sort_order that is not a positive integer", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${sectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: 0 }); // Invalid: not positive

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		expect(response.body.error.message).toMatch(/positive integer/i);
	});

	it("should reject sort_order that is negative", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${sectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: -5 }); // Invalid: negative

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it("should reject sort_order that is a non-integer number", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${sectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: 3.14 }); // Invalid: not integer

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it("should require at least one update parameter (section_name or sort_order)", async () => {
		const response = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${sectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({}); // No parameters

		expect(response.status).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.error.message).toMatch(/Either section_name or sort_order/i);
	});

	it("should shift other sections when reordering (moving to lower position)", async () => {
		// Create list with 5 sections
		const createListResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Shift Test List" });

		const testListId = createListResponse.body.data.list_id;

		// Create 5 sections: should get sort_order 1, 2, 3, 4, 5
		const sections = [];
		for (let i = 1; i <= 5; i++) {
			const response = await request(app)
				.post(`/api/v1/lists/${testListId}/sections`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ section_name: `Section ${i}` });
			sections.push(response.body.data);
		}

		// sections[4] should have sort_order 5
		expect(sections[4].sort_order).toBe(5);

		// Move section with sort_order 5 to sort_order 3
		// Should shift: 3->4, 4->5, 5->3
		const moveResponse = await request(app)
			.put(`/api/v1/lists/${testListId}/sections/${sections[4].section_id}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: 3 });

		expect(moveResponse.status).toBe(200);
		expect(moveResponse.body.data.sort_order).toBe(3);

		// Verify other sections shifted
		const getSectionsResponse = await request(app)
			.get(`/api/v1/lists/${testListId}/sections`)
			.set("Authorization", `Bearer ${authToken}`);

		const updatedSections = getSectionsResponse.body.data;
		expect(updatedSections).toHaveLength(5);

		// sections[2] (Section 3) should now have sort_order 4
		const section3 = updatedSections.find((s) => s.section_name === "Section 3");
		expect(section3.sort_order).toBe(4);

		// sections[3] (Section 4) should now have sort_order 5
		const section4 = updatedSections.find((s) => s.section_name === "Section 4");
		expect(section4.sort_order).toBe(5);

		// sections[4] (Section 5) should now have sort_order 3
		const section5 = updatedSections.find((s) => s.section_name === "Section 5");
		expect(section5.sort_order).toBe(3);
	});

	it("should shift other sections when reordering (moving to higher position)", async () => {
		// Create list with 5 sections
		const createListResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Shift Test List 2" });

		const testListId = createListResponse.body.data.list_id;

		// Create 5 sections
		const sections = [];
		for (let i = 1; i <= 5; i++) {
			const response = await request(app)
				.post(`/api/v1/lists/${testListId}/sections`)
				.set("Authorization", `Bearer ${authToken}`)
				.send({ section_name: `Item ${i}` });
			sections.push(response.body.data);
		}

		// Move section with sort_order 1 to sort_order 4
		// Should shift: 2->1, 3->2, 4->3, 1->4
		const moveResponse = await request(app)
			.put(`/api/v1/lists/${testListId}/sections/${sections[0].section_id}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ sort_order: 4 });

		expect(moveResponse.status).toBe(200);
		expect(moveResponse.body.data.sort_order).toBe(4);

		// Verify other sections shifted
		const getSectionsResponse = await request(app)
			.get(`/api/v1/lists/${testListId}/sections`)
			.set("Authorization", `Bearer ${authToken}`);

		const updatedSections = getSectionsResponse.body.data;
		expect(updatedSections).toHaveLength(5);

		// Item 2 should now have sort_order 1
		const item2 = updatedSections.find((s) => s.section_name === "Item 2");
		expect(item2.sort_order).toBe(1);

		// Item 3 should now have sort_order 2
		const item3 = updatedSections.find((s) => s.section_name === "Item 3");
		expect(item3.sort_order).toBe(2);

		// Item 4 should now have sort_order 3
		const item4 = updatedSections.find((s) => s.section_name === "Item 4");
		expect(item4.sort_order).toBe(3);

		// Item 1 should now have sort_order 4
		const item1 = updatedSections.find((s) => s.section_name === "Item 1");
		expect(item1.sort_order).toBe(4);
	});

	// Optimistic locking tests (version-based conflict detection)
	it("should support optimistic locking with expected_version on list updates", async () => {
		// Create a list
		const createResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Version Test List" });

		const testListId = createResponse.body.data.list_id;
		const initialVersion = createResponse.body.data.version || "1";

		// Update with correct version
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${testListId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Updated Name", expected_version: initialVersion });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.data.list_name).toBe("Updated Name");
		expect(updateResponse.body.data.version).toBe("2");
	});

	it("should reject list update with incorrect expected_version (409 CONFLICT)", async () => {
		// Create a list
		const createResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Conflict Test List" });

		const testListId = createResponse.body.data.list_id;

		// Try to update with wrong expected version
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${testListId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Updated", expected_version: "999" });

		expect(updateResponse.status).toBe(409);
		expect(updateResponse.body.success).toBe(false);
		expect(updateResponse.body.error.code).toBe("CONFLICT");
		expect(updateResponse.body.error.message).toMatch(/Version conflict/i);
	});

	it("should support optimistic locking with expected_version on section updates", async () => {
		// Create a section
		const createResponse = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Version Test Section" });

		const testSectionId = createResponse.body.data.section_id;
		const initialVersion = createResponse.body.data.version || "1";

		// Update with correct version
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${testSectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				section_name: "Updated Section",
				expected_version: initialVersion,
			});

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.data.section_name).toBe("Updated Section");
		expect(updateResponse.body.data.version).toBe("2");
	});

	it("should reject section update with incorrect expected_version (409 CONFLICT)", async () => {
		// Create a section
		const createResponse = await request(app)
			.post(`/api/v1/lists/${listId}/sections`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ section_name: "Conflict Test Section" });

		const testSectionId = createResponse.body.data.section_id;

		// Try to update with wrong expected version
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${listId}/sections/${testSectionId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				section_name: "Updated",
				expected_version: "999",
			});

		expect(updateResponse.status).toBe(409);
		expect(updateResponse.body.success).toBe(false);
		expect(updateResponse.body.error.code).toBe("CONFLICT");
		expect(updateResponse.body.error.message).toMatch(/Version conflict/i);
	});

	it("should allow update without expected_version (version checking is optional)", async () => {
		// Create a list
		const createResponse = await request(app)
			.post("/api/v1/lists")
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Optional Version Test" });

		const testListId = createResponse.body.data.list_id;

		// Update without expected_version - should succeed
		const updateResponse = await request(app)
			.put(`/api/v1/lists/${testListId}`)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ list_name: "Updated Without Version Check" });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.data.list_name).toBe("Updated Without Version Check");
		expect(updateResponse.body.data.version).toBe("2");
	});
});
