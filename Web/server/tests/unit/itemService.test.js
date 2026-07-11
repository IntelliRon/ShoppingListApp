/**
 * Unit tests for itemService.js
 * Tests core item CRUD logic, ID generation, constraints, and cascade behaviors
 */

const fs = require("fs");
const path = require("path");
const config = require("../../src/config/defaults.json");

// Setup temp DB for testing
const TEST_DB_PATH = path.join(__dirname, "../fixtures/test_db_items_unit");
const TEST_USERS_FILE = path.join(TEST_DB_PATH, "users.csv");

// Clear require cache before each test to avoid cross-test pollution
beforeEach(() => {
	delete require.cache[require.resolve("../../src/services/csvService")];
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

describe("itemService", () => {
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

	describe("ID generation uniqueness", () => {
		test("generateItemId should produce sequential IDs", () => {
			const itemService = require("../../src/services/itemService");

			const items = [
				{ item_id: "i001", list_id: "l1", item_name: "Item 1" },
				{ item_id: "i002", list_id: "l1", item_name: "Item 2" },
			];

			const nextId = itemService.generateItemId(items);
			expect(nextId).toBe("i003");
		});

		test("generateItemId should handle empty item list", () => {
			const itemService = require("../../src/services/itemService");

			const nextId = itemService.generateItemId([]);
			expect(nextId).toBe("i001");
		});

		test("generateItemId should start from highest ID across lists", () => {
			const itemService = require("../../src/services/itemService");

			const items = [
				{ item_id: "i001", list_id: "l1", item_name: "Item 1" },
				{ item_id: "i005", list_id: "l2", item_name: "Item 2" },
				{ item_id: "i003", list_id: "l1", item_name: "Item 3" },
			];

			const nextId = itemService.generateItemId(items);
			expect(nextId).toBe("i006");
		});
	});

	describe("max_items_per_list enforcement", () => {
		test("createItem should throw error when list item limit reached", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Fill up to max items
			const maxItems = config.limits.max_items_per_list;
			for (let i = 0; i < maxItems; i++) {
				await itemService.createItem(userId, list.list_id, `Item ${i + 1}`);
			}

			// Verify max reached
			const items = await itemService.getListItems(userId, list.list_id);
			expect(items.length).toBe(maxItems);

			// Next create should fail
			await expect(
				itemService.createItem(userId, list.list_id, `Item ${maxItems + 1}`)
			).rejects.toThrow(`Maximum ${maxItems} items per list reached`);
		}, 120000); // 120 second timeout for large item creation

		test("createItem should succeed for different lists independently", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test456";

			// Create two lists
			await listService.createList(userId, "List 1");
			await listService.createList(userId, "List 2");
			const lists = await listService.getAllLists(userId);
			const [list1, list2] = lists;

			// Add items to both lists
			await itemService.createItem(userId, list1.list_id, "Item 1");
			await itemService.createItem(userId, list2.list_id, "Item A");

			const items1 = await itemService.getListItems(userId, list1.list_id);
			const items2 = await itemService.getListItems(userId, list2.list_id);

			expect(items1.length).toBe(1);
			expect(items2.length).toBe(1);
			expect(items1[0].item_name).toBe("Item 1");
			expect(items2[0].item_name).toBe("Item A");
		});
	});

	describe("section validation", () => {
		test("createItem with valid section should succeed", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list and section
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];
			const section = await listService.createSection(userId, list.list_id, "Produce");

			// Create item in section
			const item = await itemService.createItem(
				userId,
				list.list_id,
				"Apples",
				section.section_id
			);

			expect(item.section_id).toBe(section.section_id);
			expect(item.item_name).toBe("Apples");
		});

		test("createItem with invalid section should throw error", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list but no section
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Try to create item with non-existent section
			await expect(
				itemService.createItem(userId, list.list_id, "Apples", "s_fake")
			).rejects.toThrow("Section not found");
		});

		test("createItem with null/empty section should succeed (ungrouped)", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Create item without section
			const item1 = await itemService.createItem(userId, list.list_id, "Item 1", null);
			const item2 = await itemService.createItem(userId, list.list_id, "Item 2");

			expect(item1.section_id).toBe("");
			expect(item2.section_id).toBe("");
		});
	});

	describe("item validation", () => {
		test("createItem should throw on empty item name", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			await expect(itemService.createItem(userId, list.list_id, "")).rejects.toThrow(
				"Item name is required"
			);
		});

		test("createItem should throw on whitespace-only item name", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			await expect(itemService.createItem(userId, list.list_id, "   ")).rejects.toThrow(
				"Item name is required"
			);
		});

		test("createItem should throw if item name exceeds max length", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const longName = "x".repeat(config.limits.max_item_name_length + 1);
			await expect(itemService.createItem(userId, list.list_id, longName)).rejects.toThrow(
				`Item name must be ${config.limits.max_item_name_length} characters or less`
			);
		});
	});

	describe("deleteListItems cascade", () => {
		test("deleteListItems should remove all items from specified list", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create two lists with items
			await listService.createList(userId, "List 1");
			await listService.createList(userId, "List 2");
			const lists = await listService.getAllLists(userId);
			const [list1, list2] = lists;

			await itemService.createItem(userId, list1.list_id, "Item 1");
			await itemService.createItem(userId, list1.list_id, "Item 2");
			await itemService.createItem(userId, list2.list_id, "Item A");

			// Delete items from list1
			await itemService.deleteListItems(userId, list1.list_id);

			// Verify list1 items deleted
			const items1 = await itemService.getListItems(userId, list1.list_id);
			expect(items1.length).toBe(0);

			// Verify list2 items untouched
			const items2 = await itemService.getListItems(userId, list2.list_id);
			expect(items2.length).toBe(1);
			expect(items2[0].item_name).toBe("Item A");
		});

		test("deleteListItems should not crash if list has no items", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create empty list
			await listService.createList(userId, "Empty List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			// Should not throw
			await expect(itemService.deleteListItems(userId, list.list_id)).resolves.not.toThrow();
		});
	});

	describe("deleteSectionItems cascade", () => {
		test("deleteSectionItems should remove items from specified section only", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list and two sections
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const section1 = await listService.createSection(userId, list.list_id, "Produce");
			const section2 = await listService.createSection(userId, list.list_id, "Dairy");

			// Add items to both sections
			await itemService.createItem(userId, list.list_id, "Apples", section1.section_id);
			await itemService.createItem(userId, list.list_id, "Bananas", section1.section_id);
			await itemService.createItem(userId, list.list_id, "Milk", section2.section_id);

			// Delete section1 items
			await itemService.deleteSectionItems(userId, list.list_id, section1.section_id);

			// Verify section1 items deleted
			const items1 = await itemService.getListItems(userId, list.list_id);
			expect(items1.length).toBe(1);
			expect(items1[0].item_name).toBe("Milk");
			expect(items1[0].section_id).toBe(section2.section_id);
		});

		test("deleteSectionItems should not crash if section has no items", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";

			// Create list and empty section
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];
			const section = await listService.createSection(userId, list.list_id, "Empty");

			// Should not throw
			await expect(
				itemService.deleteSectionItems(userId, list.list_id, section.section_id)
			).resolves.not.toThrow();
		});
	});

	describe("updateItem validation", () => {
		test("updateItem should throw on empty item name", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const item = await itemService.createItem(userId, list.list_id, "Original");

			await expect(
				itemService.updateItem(userId, list.list_id, item.item_id, {
					item_name: "",
				})
			).rejects.toThrow("Item name must be a non-empty string");
		});

		test("updateItem should handle non-existent item with correct error", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			await expect(
				itemService.updateItem(userId, list.list_id, "i_fake", {
					item_name: "New Name",
				})
			).rejects.toThrow("Item not found");
		});

		test("updateItem should handle invalid section with correct error", async () => {
			const itemService = require("../../src/services/itemService");
			const listService = require("../../src/services/listService");

			const userId = "u_test123";
			await listService.createList(userId, "Test List");
			const lists = await listService.getAllLists(userId);
			const list = lists[0];

			const item = await itemService.createItem(userId, list.list_id, "Original");

			await expect(
				itemService.updateItem(userId, list.list_id, item.item_id, {
					section_id: "s_fake",
				})
			).rejects.toThrow("Section not found");
		});
	});

	describe("list existence verification", () => {
		test("verifyList should return false when list doesn't exist", async () => {
			const itemService = require("../../src/services/itemService");

			// Query non-existent list - should return false (file doesn't exist = no lists)
			const result = await itemService.verifyList("u_test123", "l_nonexistent");
			expect(result).toBe(false);
		});
	});

	describe("section verification", () => {
		test("verifySection should return false when section doesn't exist", async () => {
			const itemService = require("../../src/services/itemService");

			// Query non-existent section - should return false (file doesn't exist = no sections)
			const result = await itemService.verifySection("u_test123", "l_test", "s_nonexistent");
			expect(result).toBe(false);
		});

		test("verifySection should return true for null section (ungrouped items)", async () => {
			const itemService = require("../../src/services/itemService");

			// Null/empty section should always return true
			const result1 = await itemService.verifySection("u_test123", "l_test", null);
			const result2 = await itemService.verifySection("u_test123", "l_test", "");

			expect(result1).toBe(true);
			expect(result2).toBe(true);
		});
	});
});
