/**
 * Sync Service
 * Handles synchronization of items with conflict resolution
 * Uses last_modified timestamps to detect conflicts
 */

const itemService = require("./itemService");
const listService = require("./listService");

/**
 * Sync items from client with server items
 * Implements conflict resolution: server version wins if timestamps conflict
 * @param {string} userId - User ID
 * @param {string} listId - List ID
 * @param {array} clientItems - Items from client with operation type and last_modified
 * @param {string} [lastSync] - Last sync timestamp (optional, reserved for future use)
 * @returns {object} Result with server items, conflicts, and sync timestamp
 */
// eslint-disable-next-line no-unused-vars
async function syncItems(userId, listId, clientItems = [], lastSync = null) {
	// Verify list exists using listService.getList()
	const list = await listService.getList(userId, listId);
	if (!list) {
		throw new Error("List not found");
	}

	// Get server items for this list
	const serverItems = await itemService.getListItems(userId, listId);

	// Map server items by ID for easy lookup
	const serverItemsMap = {};
	serverItems.forEach((item) => {
		serverItemsMap[item.item_id] = item;
	});

	// Track conflicts and created item mappings (client_id → server_id)
	const conflicts = [];
	const idMapping = {};

	// Process each client item
	for (const clientItem of clientItems) {
		// Skip invalid operations
		if (!["create", "update", "delete"].includes(clientItem.operation)) {
			continue;
		}

		const serverItem = serverItemsMap[clientItem.item_id];
		const clientTimestamp = new Date(clientItem.last_modified).getTime();

		if (clientItem.operation === "create") {
			if (serverItem) {
				// Item already exists on server - conflict
				conflicts.push({
					item_id: clientItem.item_id,
					type: "CREATE_CONFLICT",
					message: "Item already exists on server",
					server_version: convertItemForSync(serverItem),
					client_version: clientItem,
				});
			} else {
				// Safe to create - server generates its own ID and tracks mapping
				const createdItem = await itemService.createItem(
					userId,
					listId,
					clientItem.item_name,
					clientItem.section_id || null
				);
				// Track mapping from client-provided ID to server-generated ID
				idMapping[clientItem.item_id] = createdItem.item_id;
			}
		} else if (clientItem.operation === "update") {
			if (!serverItem) {
				// Item not found on server - conflict
				conflicts.push({
					item_id: clientItem.item_id,
					type: "UPDATE_CONFLICT",
					message: "Item does not exist on server",
					client_version: clientItem,
				});
			} else {
				// Check for timestamp conflict
				const serverTimestamp = new Date(serverItem.last_modified).getTime();

				if (clientTimestamp >= serverTimestamp) {
					// Client is same or newer - safe to update
					await itemService.updateItem(userId, listId, clientItem.item_id, {
						item_name: clientItem.item_name,
						section_id: clientItem.section_id || null,
						is_completed:
							clientItem.is_completed === true || clientItem.is_completed === "true",
					});
				} else {
					// Server is newer - conflict, keep server version
					conflicts.push({
						item_id: clientItem.item_id,
						type: "UPDATE_CONFLICT",
						message: "Server version is newer",
						server_version: convertItemForSync(serverItem),
						client_version: clientItem,
					});
				}
			}
		} else if (clientItem.operation === "delete") {
			if (!serverItem) {
				// Item not found on server - already deleted or never existed
				// Treat as successful delete
				continue;
			} else {
				// Check for timestamp conflict
				const serverTimestamp = new Date(serverItem.last_modified).getTime();

				if (clientTimestamp >= serverTimestamp) {
					// Client timestamp is same or newer - safe to delete
					await itemService.deleteItem(userId, listId, clientItem.item_id);
				} else {
					// Server has newer changes - conflict, keep server version
					conflicts.push({
						item_id: clientItem.item_id,
						type: "DELETE_CONFLICT",
						message: "Server version is newer",
						server_version: convertItemForSync(serverItem),
						client_version: clientItem,
					});
				}
			}
		}
	}

	// Get updated server state
	const updatedServerItems = await itemService.getListItems(userId, listId);
	const allSyncItems = updatedServerItems.map((item) => convertItemForSync(item));

	const syncTimestamp = new Date().toISOString();

	return {
		server_items: allSyncItems,
		conflicts: conflicts,
		id_mapping: idMapping,
		synced_at: syncTimestamp,
	};
}

/**
 * Convert item to sync format
 * Ensures consistent format for client-server communication
 */
function convertItemForSync(item) {
	return {
		item_id: item.item_id,
		item_name: item.item_name,
		section_id: item.section_id || null,
		is_completed: item.is_completed === "true",
		last_modified: item.last_modified,
		operation: "update", // Default operation for sync responses
	};
}

module.exports = {
	syncItems,
};
