/**
 * Item Service
 * Handles shopping list items operations
 * Uses csvService for data persistence with single-writer pattern for concurrency
 */

const path = require("path");
const csvService = require("./csvService");
const config = require("../config/defaults.json");

// Support test database path via environment variable
const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, "..", "..", config.database.path);

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
		: path.join(__dirname, "..", "..", config.database.shopping_lists_dir);
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
 */
async function verifySection(userId, listId, sectionId) {
	if (!sectionId) {
		return true; // null section is valid (ungrouped items)
	}

	try {
		const sectionsPath = getSectionsFilePath(userId);
		const sections = await csvService.readCSV(sectionsPath);
		const section = sections.find((s) => s.section_id === sectionId && s.list_id === listId);
		return section !== undefined;
	} catch (error) {
		return false;
	}
}

/**
 * Verify list exists
 */
async function verifyList(userId, listId) {
	try {
		const listsPath = getListsFilePath(userId);
		const lists = await csvService.readCSV(listsPath);
		const list = lists.find((l) => l.list_id === listId);
		return list !== undefined;
	} catch (error) {
		return false;
	}
}

/**
 * Create new item in a list
 */
async function createItem(userId, listId, itemName, sectionId = null) {
	// Validate input
	if (!itemName || typeof itemName !== "string" || itemName.trim().length === 0) {
		throw new Error("Item name is required");
	}
	if (itemName.trim().length > config.limits.max_item_name_length) {
		throw new Error(
			`Item name must be ${config.limits.max_item_name_length} characters or less`
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

	// Atomically generate ID and create item (single-writer pattern)
	// This prevents duplicate IDs under concurrent creates
	const allItems = await csvService.readCSV(itemsPath);
	if (allItems.length >= config.limits.max_items_per_list) {
		throw new Error(`Maximum ${config.limits.max_items_per_list} items per list reached`);
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

	// Append new item
	await csvService.appendCSV(itemsPath, [newItem]);

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
	// Validate that at least one update parameter is provided
	const hasItemName =
		updates.item_name &&
		typeof updates.item_name === "string" &&
		updates.item_name.trim().length > 0;
	const hasSectionId = updates.section_id !== undefined;
	const hasIsCompleted = updates.is_completed !== undefined;

	if (!hasItemName && !hasSectionId && !hasIsCompleted) {
		throw new Error("At least one of item_name, section_id, or is_completed must be provided");
	}

	// Validate item name if provided
	if (hasItemName && updates.item_name.trim().length > config.limits.max_item_name_length) {
		throw new Error(
			`Item name must be ${config.limits.max_item_name_length} characters or less`
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

	return updated.find((r) => r.item_id === itemId) || null;
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

		await csvService.deleteRecords(
			itemsPath,
			(record) => record.list_id === listId && record.section_id === sectionId
		);

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

		await csvService.deleteRecords(itemsPath, (record) => record.list_id === listId);

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
};
