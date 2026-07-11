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
 * Get user's shopping lists directory path
 */
function getShoppingListsDir() {
	return process.env.TEST_DB_PATH
		? path.join(dbPath, "shopping-lists")
		: path.join(__dirname, "..", "..", config.database.shopping_lists_dir);
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
 * @param {string} userId - User ID
 * @param {string} listId - List ID to update
 * @param {string} listName - New list name
 * @param {string} [expectedVersion] - Expected version for optimistic locking (optional)
 * @returns {object} Updated list record
 * @throws {Error} If expectedVersion provided but doesn't match current version
 */
async function updateList(userId, listId, listName, expectedVersion) {
	// Validate input
	if (!listName || typeof listName !== "string" || listName.trim().length === 0) {
		throw new Error("List name is required");
	}
	if (listName.trim().length > config.limits.max_list_name_length) {
		throw new Error(
			`List name must be ${config.limits.max_list_name_length} characters or less`
		);
	}

	// Verify list exists
	const list = await getList(userId, listId);
	if (!list) {
		throw new Error("List not found");
	}

	const listPath = getListsFilePath(userId);
	const now = new Date().toISOString();

	// Validate expectedVersion inside the locked update operation for atomicity
	const updated = await csvService.updateRecords(
		listPath,
		(record) => record.list_id === listId,
		(record) => {
			// Check version conflict inside the locked operation
			if (expectedVersion !== undefined && expectedVersion !== null) {
				if (String(record.version) !== String(expectedVersion)) {
					const error = new Error(
						`Version conflict: expected ${expectedVersion}, but current version is ${record.version}`
					);
					error.code = "CONFLICT";
					throw error;
				}
			}

			return {
				...record,
				list_name: listName.trim(),
				last_modified: now,
				version: String(parseInt(record.version || 0) + 1),
			};
		}
	);

	// Return updated record
	return updated.find((r) => r.list_id === listId) || null;
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
		throw new Error(`Maximum ${config.limits.max_sections_per_list} sections per list reached`);
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
		version: "1",
	};

	// Append new section
	await csvService.appendCSV(sectionsPath, [newSection]);

	return newSection;
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
 * Reorder sections when a section's sort_order changes.
 * Shifts adjacent sections between the old and new positions to preserve relative ordering.
 * Note: This does not clamp or normalize sort_order values; large sort_order values can create gaps.
 * @param {array} sections - All sections for the list
 * @param {string} sectionId - Section being moved
 * @param {number} newSortOrder - New sort order for the section
 * @returns {array} Updated sections with adjusted sort_order values
 */
function reorderSections(sections, sectionId, newSortOrder) {
	const section = sections.find((s) => s.section_id === sectionId);
	if (!section) {
		return sections;
	}

	const oldSortOrder = parseInt(section.sort_order);
	if (oldSortOrder === newSortOrder) {
		return sections;
	}

	const updated = [...sections];

	if (newSortOrder < oldSortOrder) {
		// Moving up: sections between newSortOrder and oldSortOrder shift down
		for (let i = 0; i < updated.length; i++) {
			const currentOrder = parseInt(updated[i].sort_order);
			if (
				updated[i].section_id !== sectionId &&
				currentOrder >= newSortOrder &&
				currentOrder < oldSortOrder
			) {
				updated[i] = {
					...updated[i],
					sort_order: String(currentOrder + 1),
				};
			}
		}
	} else {
		// Moving down: sections between oldSortOrder and newSortOrder shift up
		for (let i = 0; i < updated.length; i++) {
			const currentOrder = parseInt(updated[i].sort_order);
			if (
				updated[i].section_id !== sectionId &&
				currentOrder > oldSortOrder &&
				currentOrder <= newSortOrder
			) {
				updated[i] = {
					...updated[i],
					sort_order: String(currentOrder - 1),
				};
			}
		}
	}

	// Update the moved section
	const sectionIndex = updated.findIndex((s) => s.section_id === sectionId);
	if (sectionIndex !== -1) {
		updated[sectionIndex] = {
			...updated[sectionIndex],
			sort_order: String(newSortOrder),
		};
	}

	return updated;
}

/**
 * Update section (rename and/or reorder)
 * @param {string} userId - User ID
 * @param {string} listId - List ID
 * @param {string} sectionId - Section ID to update
 * @param {string} [sectionName] - New section name (optional)
 * @param {number} [sortOrder] - New sort order (optional)
 * @param {string} [expectedVersion] - Expected version for optimistic locking (optional)
 * @returns {object} Updated section record
 * @throws {Error} If neither sectionName nor sortOrder provided, or if validation fails
 */
async function updateSection(userId, listId, sectionId, sectionName, sortOrder, expectedVersion) {
	// Validate that at least one update parameter is provided
	const hasSectionName =
		sectionName && typeof sectionName === "string" && sectionName.trim().length > 0;
	const hasSortOrder = sortOrder !== null && sortOrder !== undefined;

	if (!hasSectionName && !hasSortOrder) {
		throw new Error("Either section name or sort order must be provided for update");
	}

	// Validate section name if provided
	if (hasSectionName && sectionName.trim().length > config.limits.max_section_name_length) {
		throw new Error(
			`Section name must be ${config.limits.max_section_name_length} characters or less`
		);
	}

	// Validate sort order if provided
	if (hasSortOrder) {
		if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 1) {
			throw new Error("Sort order must be a positive integer");
		}
	}

	// Verify section exists and belongs to this list
	const section = await getSection(userId, listId, sectionId);
	if (!section) {
		throw new Error("Section not found");
	}

	const sectionsPath = getSectionsFilePath(userId);
	const now = new Date().toISOString();

	// If reordering, we need to update affected sections
	if (hasSortOrder) {
		// Get all sections for the list to reorder them
		const allSections = await getAllSections(userId);
		const listSections = allSections.filter((s) => s.list_id === listId);

		// Calculate the reordered sections
		const reorderedSections = reorderSections(listSections, sectionId, sortOrder);

		// Update only records that actually changed, incrementing version for all modified records
		const updated = await csvService.updateRecords(
			sectionsPath,
			(record) => record.list_id === listId,
			(record) => {
				// Find the reordered version of this record
				const reordered = reorderedSections.find((s) => s.section_id === record.section_id);
				if (!reordered) {
					return record;
				}

				// Check if sort_order actually changed for this record
				const sortOrderChanged = String(record.sort_order) !== String(reordered.sort_order);

				// For target section, check if section_name will change too
				const sectionNameWillChange = record.section_id === sectionId && hasSectionName;

				// Only update if something actually changed
				if (!sortOrderChanged && !sectionNameWillChange) {
					return record;
				}

				const updateData = {
					...record,
					last_modified: now,
				};

				// Update sort_order if it changed
				if (sortOrderChanged) {
					updateData.sort_order = reordered.sort_order;
				}

				// For target section: check version, update name if provided, and increment version
				if (record.section_id === sectionId) {
					// Check version conflict inside the locked operation for atomicity
					if (expectedVersion !== undefined && expectedVersion !== null) {
						if (String(record.version) !== String(expectedVersion)) {
							const error = new Error(
								`Version conflict: expected ${expectedVersion}, but current version is ${record.version}`
							);
							error.code = "CONFLICT";
							throw error;
						}
					}

					if (sectionNameWillChange) {
						updateData.section_name = sectionName.trim();
					}
					updateData.version = String(parseInt(record.version || 0) + 1);
				} else if (sortOrderChanged) {
					// For shifted sections, also increment version since the record was modified
					updateData.version = String(parseInt(record.version || 0) + 1);
				}

				return updateData;
			}
		);

		// Return the updated section record
		return updated.find((r) => r.section_id === sectionId) || null;
	}

	// Simple update: just rename (no reordering) with version check inside the locked operation
	const updated = await csvService.updateRecords(
		sectionsPath,
		(record) => record.section_id === sectionId,
		(record) => {
			// Check version conflict inside the locked operation for atomicity
			if (expectedVersion !== undefined && expectedVersion !== null) {
				if (String(record.version) !== String(expectedVersion)) {
					const error = new Error(
						`Version conflict: expected ${expectedVersion}, but current version is ${record.version}`
					);
					error.code = "CONFLICT";
					throw error;
				}
			}

			return {
				...record,
				section_name: sectionName.trim(),
				last_modified: now,
				version: String(parseInt(record.version || 0) + 1),
			};
		}
	);

	// Return updated record
	return updated.find((r) => r.section_id === sectionId) || null;
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
