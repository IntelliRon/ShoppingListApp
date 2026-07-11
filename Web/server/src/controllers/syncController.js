/**
 * Sync Controller
 * Handles HTTP requests for sync operations
 */

const syncService = require("../services/syncService");

/**
 * Sync items with server
 * POST /sync/items
 */
async function syncItems(req, res) {
	try {
		const userId = req.userId; // Set by requireAuth middleware
		const { list_id, client_items, last_sync } = req.body || {};

		// Validate required fields
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

		const clientItems = client_items || [];

		// Validate client_items format
		if (!Array.isArray(clientItems)) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "client_items must be an array",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Validate each client item
		for (const item of clientItems) {
			if (!item.item_id || !item.operation) {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "VALIDATION_ERROR",
						message: "Each client_item must have item_id and operation",
					},
					timestamp: new Date().toISOString(),
				});
			}

			if (!["create", "update", "delete"].includes(item.operation)) {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "VALIDATION_ERROR",
						message: "operation must be one of: create, update, delete",
					},
					timestamp: new Date().toISOString(),
				});
			}

			// Validate last_modified is valid ISO 8601 timestamp for update/delete
			if (["update", "delete"].includes(item.operation) && item.last_modified) {
				const timestamp = new Date(item.last_modified).getTime();
				if (isNaN(timestamp)) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "VALIDATION_ERROR",
							message: "last_modified must be valid ISO 8601 timestamp",
						},
						timestamp: new Date().toISOString(),
					});
				}
			}

			// Require item_name for create/update operations
			if (["create", "update"].includes(item.operation) && !item.item_name) {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "VALIDATION_ERROR",
						message: `item_name is required for ${item.operation} operation`,
					},
					timestamp: new Date().toISOString(),
				});
			}
		}

		// Perform sync
		const result = await syncService.syncItems(userId, list_id, clientItems, last_sync);

		res.status(200).json({
			success: true,
			data: {
				server_items: result.server_items,
				conflicts: result.conflicts,
				synced_at: result.synced_at,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Sync Error]", error.message);

		// Handle not found errors (list doesn't exist)
		if (error.message.includes("not found")) {
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

		// Handle validation errors from service layer (item_name too long, max items, invalid section, etc.)
		if (
			error.message.includes("must be") ||
			error.message.includes("Maximum") ||
			error.message.includes("Section")
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
				message: "Sync failed",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

module.exports = {
	syncItems,
};
