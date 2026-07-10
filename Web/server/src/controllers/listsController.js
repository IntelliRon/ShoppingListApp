/**
 * Lists Controller
 * Handles HTTP requests for list CRUD operations
 */

const listService = require("../services/listService");

/**
 * Get all lists for authenticated user
 * GET /lists
 */
async function getAllLists(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware

		const lists = await listService.getAllLists(userId);

		// Add item_count and completed_count for each list
		// TODO: Calculate these when items service is implemented
		const enrichedLists = lists.map((list) => ({
			list_id: list.list_id,
			list_name: list.list_name,
			created_at: list.created_at,
			last_modified: list.last_modified,
			item_count: 0,
			completed_count: 0,
		}));

		res.status(200).json({
			success: true,
			data: enrichedLists,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to get lists",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Create new list
 * POST /lists
 */
async function createList(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_name } = req.body || {};

		if (!list_name) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "list_name is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const newList = await listService.createList(userId, list_name);

		res.status(201).json({
			success: true,
			data: {
				list_id: newList.list_id,
				list_name: newList.list_name,
				created_at: newList.created_at,
				updated_at: newList.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		// Handle validation errors
		if (
			error.message.includes("List name") ||
			error.message.includes("required") ||
			error.message.includes("must be")
		) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to create list",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Rename list
 * PUT /lists/{list_id}
 */
async function updateList(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;
		const { list_name } = req.body || {};

		if (!list_name) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "list_name is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const updated = await listService.updateList(userId, list_id, list_name);

		res.status(200).json({
			success: true,
			data: {
				list_id: updated.list_id,
				list_name: updated.list_name,
				last_modified: updated.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		// Handle validation errors
		if (
			error.message.includes("List name") ||
			error.message.includes("required") ||
			error.message.includes("must be")
		) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to update list",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Delete list
 * DELETE /lists/{list_id}
 */
async function deleteList(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		await listService.deleteList(userId, list_id);

		res.status(200).json({
			success: true,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to delete list",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Get all sections for a list
 * GET /lists/{list_id}/sections
 */
async function getListSections(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const sections = await listService.getListSections(userId, list_id);

		res.status(200).json({
			success: true,
			data: sections.map((section) => ({
				section_id: section.section_id,
				section_name: section.section_name,
				sort_order: section.sort_order,
				last_modified: section.last_modified,
			})),
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to get sections",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Create new section in a list
 * POST /lists/{list_id}/sections
 */
async function createSection(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;
		const { section_name } = req.body || {};

		if (!section_name) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "section_name is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const newSection = await listService.createSection(userId, list_id, section_name);

		res.status(201).json({
			success: true,
			data: {
				section_id: newSection.section_id,
				section_name: newSection.section_name,
				sort_order: newSection.sort_order,
				last_modified: newSection.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);
		// eslint-disable-next-line no-console
		console.error("[Lists Error Stack]", error.stack);

		// Handle validation errors
		if (
			error.message.includes("Section name") ||
			error.message.includes("required") ||
			error.message.includes("must be")
		) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Handle not found errors
		if (error.message.includes("not found")) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to create section",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Rename section
 * PUT /lists/{list_id}/sections/{section_id}
 */
async function updateSection(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id, section_id } = req.params;
		const { section_name } = req.body || {};

		if (!section_name) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "section_name is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Verify section exists and belongs to this list
		const section = await listService.getSection(userId, list_id, section_id);
		if (!section) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Section not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const updated = await listService.updateSection(userId, list_id, section_id, section_name);

		res.status(200).json({
			success: true,
			data: {
				section_id: updated.section_id,
				section_name: updated.section_name,
				last_modified: updated.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		// Handle validation errors
		if (
			error.message.includes("Section name") ||
			error.message.includes("required") ||
			error.message.includes("must be")
		) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Handle not found errors
		if (error.message.includes("not found")) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to update section",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Delete section
 * DELETE /lists/{list_id}/sections/{section_id}
 */
async function deleteSection(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id, section_id } = req.params;

		// Verify list exists and belongs to user
		const list = await listService.getList(userId, list_id);
		if (!list) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "List not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Verify section exists and belongs to this list
		const section = await listService.getSection(userId, list_id, section_id);
		if (!section) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Section not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		await listService.deleteSection(userId, list_id, section_id);

		res.status(200).json({
			success: true,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Lists Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to delete section",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

module.exports = {
	getAllLists,
	createList,
	updateList,
	deleteList,
	getListSections,
	createSection,
	updateSection,
	deleteSection,
};
