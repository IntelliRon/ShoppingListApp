/**
 * Item Service
 * Handles shopping list items operations
 * Uses csvService for data persistence with single-writer pattern for concurrency
 */

const path = require("path");
const csvService = require("./csvService");
const configService = require("./configService");

// Support test database path via environment variable
const dbPath =
	process.env.TEST_DB_PATH ||
	path.join(__dirname, "..", "..", configService.get("database.path"));

/**
 * Generate item ID (i001, i002, etc.)
 */
function generateItemId(items) {
	if (!items || items.length === 0) return "i001";
	const ids = items.map((item) => {
		const match = item.item_id.match(/i(\d+)/);
		return match ? parseInt(match[1]) : 0;
	});
	const maxId = Math.max(...ids);
	return `i${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Get user's shopping lists directory path
 */
function getShoppingListsDir() {
	return process.env.TEST_DB_PATH
		? path.join(dbPath, "shopping-lists")
		: path.join(__dirname, "..", "..", configService.get("database.shopping_lists_dir"));
}

/**
 * Get user's items CSV file path
 */
function getItemsFilePath(userId) {
	return path.join(getShoppingListsDir(), `${userId}_items.csv`);
}

/**
 * Get user's lists CSV file path
 */
function getListsFilePath(userId) {
	return path.join(getShoppingListsDir(), `${userId}.csv`);
}

/**
 * Get user's sections CSV file path
 */
function getSectionsFilePath(userId) {
	return path.join(getShoppingListsDir(), `${userId}_sections.csv`);
}

/**
 * Get all items for a user (from all lists)
 */
async function getAllItems(userId) {
	try {
		const itemsPath = getItemsFilePath(userId);
		const items = await csvService.readCSV(itemsPath);
		return items;
	} catch (error) {
		throw new Error(`Failed to get items: ${error.message}`);
	}
}

/**
 * Get all items for a specific list
 */
async function getListItems(userId, listId) {
	try {
		const items = await getAllItems(userId);
		return items.filter((item) => item.list_id === listId);
	} catch (error) {
		throw new Error(`Failed to get list items: ${error.message}`);
	}
}

/**
 * Get all items in a section
 */
async function getSectionItems(userId, listId, sectionId) {
	try {
		const items = await getListItems(userId, listId);
		return items.filter((item) => item.section_id === sectionId);
	} catch (error) {
		throw new Error(`Failed to get section items: ${error.message}`);
	}
}

/**
 * Get single item by ID (verify ownership)
 */
async function getItem(userId, listId, itemId) {
	try {
		const items = await getListItems(userId, listId);
		const item = items.find((i) => i.item_id === itemId);
		return item || null;
	} catch (error) {
		throw new Error(`Failed to get item: ${error.message}`);
	}
}

/**
 * Verify section exists in the list
 * csvService.readCSV returns [] for missing files, so other errors are real failures
 */
async function verifySection(userId, listId, sectionId) {
	if (!sectionId) {
		return true; // null section is valid (ungrouped items)
	}

	const sectionsPath = getSectionsFilePath(userId);
	const sections = await csvService.readCSV(sectionsPath);
	const section = sections.find((s) => s.section_id === sectionId && s.list_id === listId);
	return section !== undefined;
}

/**
 * Verify list exists
 * csvService.readCSV returns [] for missing files, so other errors are real failures
 */
async function verifyList(userId, listId) {
	const listsPath = getListsFilePath(userId);
	const lists = await csvService.readCSV(listsPath);
	const list = lists.find((l) => l.list_id === listId);
	return list !== undefined;
}

/**
 * Create new item in a list
 */
async function createItem(userId, listId, itemName, sectionId = null) {
	// Validate input
	if (!itemName || typeof itemName !== "string" || itemName.trim().length === 0) {
		throw new Error("Item name is required");
	}
	if (itemName.trim().length > configService.get("limits.max_item_name_length")) {
		throw new Error(
			`Item name must be ${configService.get("limits.max_item_name_length")} characters or less`
		);
	}

	// Verify list exists
	const listExists = await verifyList(userId, listId);
	if (!listExists) {
		throw new Error("List not found");
	}

	// Verify section exists (if provided)
	if (sectionId) {
		const sectionExists = await verifySection(userId, listId, sectionId);
		if (!sectionExists) {
			throw new Error("Section not found");
		}
	}

	const itemsPath = getItemsFilePath(userId);
	const now = new Date().toISOString();

	// ATOMICITY IMPLEMENTATION:
	// This creates a new item atomically by using a read-verify-append-verify pattern.
	// While not perfectly atomic at filesystem level, it detects and rejects collisions.
	let allItems = await csvService.readCSV(itemsPath);
	const listItems = allItems.filter((item) => item.list_id === listId);
	if (listItems.length >= configService.get("limits.max_items_per_list")) {
		throw new Error(
			`Maximum ${configService.get("limits.max_items_per_list")} items per list reached`
		);
	}
	const itemId = generateItemId(allItems);

	const newItem = {
		item_id: itemId,
		list_id: listId,
		section_id: sectionId || "",
		item_name: itemName.trim(),
		is_completed: "false",
		created_at: now,
		last_modified: now,
	};

	// Append new item to CSV
	await csvService.appendCSV(itemsPath, [newItem]);

	// Post-append verification: Detect if concurrent creates caused ID collision
	// If collision detected, file is already corrupted and caller must retry
	allItems = await csvService.readCSV(itemsPath);
	const createdItem = allItems.find(
		(item) =>
			item.item_id === itemId && item.list_id === listId && item.item_name === itemName.trim()
	);

	if (!createdItem) {
		throw new Error("Failed to create item - append failure detected");
	}

	// Additional safety check: Detect if ID collision occurred with concurrent write
	// Only check within the same list since IDs are unique per user across all lists
	const duplicateIds = allItems.filter(
		(item) => item.item_id === itemId && item.list_id === listId
	);
	if (duplicateIds.length > 1) {
		// File has been corrupted by concurrent ID collision. This should never happen
		// in single-user access patterns, but can occur with true concurrent calls.
		// Client should retry, which will generate a new ID on next attempt.
		throw new Error(
			"Concurrent write conflict detected - ID collision, file corrupted, request retry"
		);
	}

	return newItem;
}

/**
 * Update item (rename, move to section, toggle completion)
 * @param {string} userId - User ID
 * @param {string} listId - List ID
 * @param {string} itemId - Item ID to update
 * @param {object} updates - Object with optional keys: item_name, section_id, is_completed
 * @returns {object} Updated item record
 * @throws {Error} If item not found or validation fails
 */
async function updateItem(userId, listId, itemId, updates = {}) {
	// Validate item_name if provided - fail if invalid rather than silently ignoring
	if (updates.item_name !== undefined) {
		if (typeof updates.item_name !== "string" || updates.item_name.trim().length === 0) {
			throw new Error("Item name must be a non-empty string");
		}
		if (updates.item_name.trim().length > configService.get("limits.max_item_name_length")) {
			throw new Error(
				`Item name must be ${configService.get("limits.max_item_name_length")} characters or less`
			);
		}
	}

	// Validate that at least one update parameter is provided
	const hasItemName = updates.item_name !== undefined && updates.item_name.trim().length > 0;
	const hasSectionId = updates.section_id !== undefined;
	const hasIsCompleted = updates.is_completed !== undefined;

	if (!hasItemName && !hasSectionId && !hasIsCompleted) {
		throw new Error("At least one of item_name, section_id, or is_completed must be provided");
	}

	// Validate item name max length (already validated above)
	if (
		hasItemName &&
		updates.item_name.trim().length > configService.get("limits.max_item_name_length")
	) {
		throw new Error(
			`Item name must be ${configService.get("limits.max_item_name_length")} characters or less`
		);
	}

	// Verify section exists (if provided)
	if (hasSectionId && updates.section_id) {
		const sectionExists = await verifySection(userId, listId, updates.section_id);
		if (!sectionExists) {
			throw new Error("Section not found");
		}
	}

	// Verify item exists
	const item = await getItem(userId, listId, itemId);
	if (!item) {
		throw new Error("Item not found");
	}

	const itemsPath = getItemsFilePath(userId);
	const now = new Date().toISOString();

	const updated = await csvService.updateRecords(
		itemsPath,
		(record) => record.item_id === itemId && record.list_id === listId,
		(record) => {
			const updatedRecord = { ...record };

			if (hasItemName) {
				updatedRecord.item_name = updates.item_name.trim();
			}

			if (hasSectionId) {
				updatedRecord.section_id = updates.section_id || "";
			}

			if (hasIsCompleted) {
				updatedRecord.is_completed = String(
					updates.is_completed === true || updates.is_completed === "true"
				);
			}

			updatedRecord.last_modified = now;

			return updatedRecord;
		}
	);

	const updatedItem = updated.find((r) => r.item_id === itemId);
	if (!updatedItem) {
		throw new Error(
			"Failed to update item - post-update lookup failed (concurrent delete or write conflict)"
		);
	}

	return updatedItem;
}

/**
 * Delete item
 */
async function deleteItem(userId, listId, itemId) {
	try {
		// Verify item exists
		const item = await getItem(userId, listId, itemId);
		if (!item) {
			throw new Error("Item not found");
		}

		const itemsPath = getItemsFilePath(userId);

		// Delete the item
		await csvService.deleteRecords(
			itemsPath,
			(record) => record.item_id === itemId && record.list_id === listId
		);

		return { success: true };
	} catch (error) {
		throw new Error(`Failed to delete item: ${error.message}`);
	}
}

/**
 * Delete all items in a section
 * Used when section is deleted
 */
async function deleteSectionItems(userId, listId, sectionId) {
	try {
		const itemsPath = getItemsFilePath(userId);

		// Check if there are items to delete before attempting write
		const allItems = await csvService.readCSV(itemsPath);
		const hasItems = allItems.some(
			(record) => record.list_id === listId && record.section_id === sectionId
		);

		// Only delete if items exist (avoid creating empty file)
		if (hasItems) {
			await csvService.deleteRecords(
				itemsPath,
				(record) => record.list_id === listId && record.section_id === sectionId
			);
		}

		return { success: true };
	} catch (error) {
		throw new Error(`Failed to delete section items: ${error.message}`);
	}
}

/**
 * Delete all items in a list
 * Used when list is deleted
 */
async function deleteListItems(userId, listId) {
	try {
		const itemsPath = getItemsFilePath(userId);

		// Check if there are items to delete before attempting write
		const allItems = await csvService.readCSV(itemsPath);
		const hasItems = allItems.some((record) => record.list_id === listId);

		// Only delete if items exist (avoid creating empty file)
		if (hasItems) {
			await csvService.deleteRecords(itemsPath, (record) => record.list_id === listId);
		}

		return { success: true };
	} catch (error) {
		throw new Error(`Failed to delete list items: ${error.message}`);
	}
}

module.exports = {
	getAllItems,
	getListItems,
	getSectionItems,
	getItem,
	createItem,
	updateItem,
	deleteItem,
	deleteSectionItems,
	deleteListItems,
	generateItemId, // Exported for testing
	verifyList, // Exported for testing
	verifySection, // Exported for testing
};
