/**
 * Items Controller
 * Handles HTTP requests for item CRUD operations
 */

const itemService = require("../services/itemService");

/**
 * Get all items for a list
 * GET /lists/{list_id}/items
 */
async function getListItems(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;

		if (!list_id) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "list_id is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const items = await itemService.getListItems(userId, list_id);

		res.status(200).json({
			success: true,
			data: items.map((item) => ({
				item_id: item.item_id,
				item_name: item.item_name,
				section_id: item.section_id || null,
				is_completed: item.is_completed === "true",
				created_at: item.created_at,
				last_modified: item.last_modified,
			})),
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Items Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to get items",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Create new item
 * POST /lists/{list_id}/items
 */
async function createItem(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id } = req.params;
		const { item_name, section_id } = req.body || {};

		if (!item_name) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "item_name is required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const newItem = await itemService.createItem(userId, list_id, item_name, section_id);

		res.status(201).json({
			success: true,
			data: {
				item_id: newItem.item_id,
				item_name: newItem.item_name,
				section_id: newItem.section_id || null,
				is_completed: newItem.is_completed === "true",
				created_at: newItem.created_at,
				last_modified: newItem.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Items Error]", error.message);

		// Handle validation errors
		if (
			error.message.includes("Item name") ||
			error.message.includes("Maximum") ||
			error.message.includes("required") ||
			error.message.includes("must be") ||
			error.message.includes("not found")
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
				message: "Failed to create item",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Update item (rename, change section, toggle completion)
 * PUT /lists/{list_id}/items/{item_id}
 */
async function updateItem(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id, item_id } = req.params;
		const { item_name, section_id, is_completed } = req.body || {};

		// Build updates object
		const updates = {};
		if (item_name !== undefined) updates.item_name = item_name;
		if (section_id !== undefined) updates.section_id = section_id;
		if (is_completed !== undefined) updates.is_completed = is_completed;

		const updatedItem = await itemService.updateItem(userId, list_id, item_id, updates);

		if (!updatedItem) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Item not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(200).json({
			success: true,
			data: {
				item_id: updatedItem.item_id,
				item_name: updatedItem.item_name,
				section_id: updatedItem.section_id || null,
				is_completed: updatedItem.is_completed === "true",
				last_modified: updatedItem.last_modified,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Items Error]", error.message);

		// Handle validation errors
		if (
			error.message.includes("Item name") ||
			error.message.includes("maximum") ||
			error.message.includes("must be") ||
			error.message.includes("not found") ||
			error.message.includes("required")
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
				message: "Failed to update item",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Delete item
 * DELETE /lists/{list_id}/items/{item_id}
 */
async function deleteItem(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id, item_id } = req.params;

		await itemService.deleteItem(userId, list_id, item_id);

		res.status(200).json({
			success: true,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Items Error]", error.message);

		// Handle not found errors
		if (error.message.includes("not found")) {
			return res.status(404).json({
				success: false,
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Item not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to delete item",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

module.exports = {
	getListItems,
	createItem,
	updateItem,
	deleteItem,
};
