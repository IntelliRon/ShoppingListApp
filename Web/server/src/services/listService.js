/**
 * List Service
 * Handles shopping lists and sections operations
 * Uses csvService for data persistence with single-writer pattern for concurrency
 */

const path = require("path");
const csvService = require("./csvService");
const config = require("../config/defaults.json");

// Support test database path via environment variable
const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, "..", "..", config.database.path);

/**
 * Generate list ID (l001, l002, etc.)
 */
function generateListId(lists) {
	if (!lists || lists.length === 0) return "l001";
	const ids = lists.map((list) => {
		const match = list.list_id.match(/l(\d+)/);
		return match ? parseInt(match[1]) : 0;
	});
	const maxId = Math.max(...ids);
	return `l${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Generate section ID (sec001, sec002, etc.)
 */
function generateSectionId(sections) {
	if (!sections || sections.length === 0) return "sec001";
	const ids = sections.map((section) => {
		const match = section.section_id.match(/sec(\d+)/);
		return match ? parseInt(match[1]) : 0;
	});
	const maxId = Math.max(...ids);
	return `sec${String(maxId + 1).padStart(3, "0")}`;
}

/**
 * Get next sort order for sections in a list
 */
function getNextSortOrder(sections, listId) {
	const listSections = sections.filter((s) => s.list_id === listId);
	if (listSections.length === 0) return 1;
	const orders = listSections.map((s) => parseInt(s.sort_order) || 0);
	return Math.max(...orders) + 1;
}

/**
 * Get user's lists CSV file path
 */
function getListsFilePath(userId) {
	return path.join(dbPath, "shopping-lists", `${userId}.csv`);
}

/**
 * Get user's sections CSV file path
 */
function getSectionsFilePath(userId) {
	return path.join(dbPath, "shopping-lists", `${userId}_sections.csv`);
}

/**
 * Get all lists for a user
 */
async function getAllLists(userId) {
	try {
		const listPath = getListsFilePath(userId);
		const lists = await csvService.readCSV(listPath);
		return lists;
	} catch (error) {
		throw new Error(`Failed to get lists: ${error.message}`);
	}
}

/**
 * Get all sections for a user
 */
async function getAllSections(userId) {
	try {
		const sectionsPath = getSectionsFilePath(userId);
		const sections = await csvService.readCSV(sectionsPath);
		return sections;
	} catch (error) {
		throw new Error(`Failed to get sections: ${error.message}`);
	}
}

/**
 * Create new list
 */
async function createList(userId, listName) {
	try {
		// Validate input
		if (!listName || typeof listName !== "string" || listName.trim().length === 0) {
			throw new Error("List name is required");
		}
		if (listName.trim().length > config.limits.max_list_name_length) {
			throw new Error(
				`List name must be ${config.limits.max_list_name_length} characters or less`
			);
		}

		// Check max lists per user
		const lists = await getAllLists(userId);
		if (lists.length >= config.limits.max_lists_per_user) {
			throw new Error(`Maximum ${config.limits.max_lists_per_user} lists per user reached`);
		}

		const listPath = getListsFilePath(userId);
		const now = new Date().toISOString();

		// Generate next ID
		const listId = generateListId(lists);

		const newList = {
			list_id: listId,
			list_name: listName.trim(),
			created_at: now,
			last_modified: now,
			version: "1",
		};

		// Append new list
		await csvService.appendCSV(listPath, [newList]);

		return newList;
	} catch (error) {
		throw error;
	}
}

/**
 * Get single list by ID (verify ownership)
 */
async function getList(userId, listId) {
	try {
		const lists = await getAllLists(userId);
		const list = lists.find((l) => l.list_id === listId);
		return list || null;
	} catch (error) {
		throw new Error(`Failed to get list: ${error.message}`);
	}
}

/**
 * Update list (rename)
 */
async function updateList(userId, listId, listName) {
	try {
		// Validate input
		if (!listName || typeof listName !== "string" || listName.trim().length === 0) {
			throw new Error("List name is required");
		}
		if (listName.trim().length > config.limits.max_list_name_length) {
			throw new Error(
				`List name must be ${config.limits.max_list_name_length} characters or less`
			);
		}

		const listPath = getListsFilePath(userId);
		const now = new Date().toISOString();

		const updated = await csvService.updateRecords(
			listPath,
			(record) => record.list_id === listId,
			(record) => ({
				...record,
				list_name: listName.trim(),
				last_modified: now,
				version: String(parseInt(record.version || 0) + 1),
			})
		);

		// Return updated record
		return updated.find((r) => r.list_id === listId) || null;
	} catch (error) {
		throw error;
	}
}

/**
 * Delete list and all its sections and items
 */
async function deleteList(userId, listId) {
	try {
		const listPath = getListsFilePath(userId);
		const sectionsPath = getSectionsFilePath(userId);

		// Delete the list
		await csvService.deleteRecords(listPath, (record) => record.list_id === listId);

		// Delete all sections in this list
		await csvService.deleteRecords(sectionsPath, (record) => record.list_id === listId);

		// TODO: Delete items when items service is implemented

		return { success: true };
	} catch (error) {
		throw new Error(`Failed to delete list: ${error.message}`);
	}
}

/**
 * Get all sections for a list
 */
async function getListSections(userId, listId) {
	try {
		const sections = await getAllSections(userId);
		const listSections = sections.filter((s) => s.list_id === listId);
		// Sort by sort_order
		return listSections.sort((a, b) => parseInt(a.sort_order) - parseInt(b.sort_order));
	} catch (error) {
		throw new Error(`Failed to get sections: ${error.message}`);
	}
}

/**
 * Create new section in a list
 */
async function createSection(userId, listId, sectionName) {
	try {
		// Validate input
		if (!sectionName || typeof sectionName !== "string" || sectionName.trim().length === 0) {
			throw new Error("Section name is required");
		}
		if (sectionName.trim().length > config.limits.max_section_name_length) {
			throw new Error(
				`Section name must be ${config.limits.max_section_name_length} characters or less`
			);
		}

		// Verify list exists
		const list = await getList(userId, listId);
		if (!list) {
			throw new Error("List not found");
		}

		const sectionsPath = getSectionsFilePath(userId);
		const now = new Date().toISOString();

		// Get all sections to check max sections per list
		const sections = await getAllSections(userId);
		const listSections = sections.filter((s) => s.list_id === listId);
		if (listSections.length >= config.limits.max_sections_per_list) {
			throw new Error(
				`Maximum ${config.limits.max_sections_per_list} sections per list reached`
			);
		}
		const sectionId = generateSectionId(sections);
		const sortOrder = getNextSortOrder(sections, listId);

		const newSection = {
			section_id: sectionId,
			list_id: listId,
			section_name: sectionName.trim(),
			sort_order: String(sortOrder),
			created_at: now,
			last_modified: now,
		};

		// Append new section
		await csvService.appendCSV(sectionsPath, [newSection]);

		return newSection;
	} catch (error) {
		throw error;
	}
}

/**
 * Get single section (verify it belongs to user's list)
 */
async function getSection(userId, listId, sectionId) {
	try {
		const sections = await getListSections(userId, listId);
		const section = sections.find((s) => s.section_id === sectionId);
		return section || null;
	} catch (error) {
		throw new Error(`Failed to get section: ${error.message}`);
	}
}

/**
 * Update section (rename and/or reorder)
 */
async function updateSection(userId, listId, sectionId, sectionName) {
	try {
		// Validate input
		if (!sectionName || typeof sectionName !== "string" || sectionName.trim().length === 0) {
			throw new Error("Section name is required");
		}
		if (sectionName.trim().length > config.limits.max_section_name_length) {
			throw new Error(
				`Section name must be ${config.limits.max_section_name_length} characters or less`
			);
		}

		// Verify section exists and belongs to this list
		const section = await getSection(userId, listId, sectionId);
		if (!section) {
			throw new Error("Section not found");
		}

		const sectionsPath = getSectionsFilePath(userId);
		const now = new Date().toISOString();

		const updated = await csvService.updateRecords(
			sectionsPath,
			(record) => record.section_id === sectionId,
			(record) => ({
				...record,
				section_name: sectionName.trim(),
				last_modified: now,
			})
		);

		// Return updated record
		return updated.find((r) => r.section_id === sectionId) || null;
	} catch (error) {
		throw error;
	}
}

/**
 * Delete section from a list
 */
async function deleteSection(userId, listId, sectionId) {
	try {
		// Verify section exists and belongs to this list
		const section = await getSection(userId, listId, sectionId);
		if (!section) {
			throw new Error("Section not found");
		}

		const sectionsPath = getSectionsFilePath(userId);

		// Delete the section
		await csvService.deleteRecords(sectionsPath, (record) => record.section_id === sectionId);

		// TODO: Handle items in this section (move to ungrouped or delete when items service is implemented)

		return { success: true };
	} catch (error) {
		throw new Error(`Failed to delete section: ${error.message}`);
	}
}

module.exports = {
	getAllLists,
	getAllSections,
	createList,
	getList,
	updateList,
	deleteList,
	getListSections,
	createSection,
	getSection,
	updateSection,
	deleteSection,
};
