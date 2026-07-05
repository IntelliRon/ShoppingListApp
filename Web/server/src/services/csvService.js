/**
 * CSV Service
 * Handles reading and writing CSV files for data persistence
 * Uses single-writer pattern with per-file queuing for concurrent write safety
 */

const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");
const csvParser = require("csv-parser");
const config = require("../config/defaults.json");

/**
 * File write queue manager - ensures single writer per file
 * Maps file paths to their pending write queue
 */
const writeQueues = new Map();

/**
 * Track operations currently executing to avoid deadlock in readCSV
 * Maps file paths to number of active operations
 */
const activeOperations = new Map();

/**
 * Enqueue an operation to execute after all previous writes complete
 * Chains the operation to the existing queue and updates the queue
 * Catches errors to prevent queue poisoning and ensure next operations run
 * activeOperations is incremented when operation STARTS (not enqueued) to avoid race condition
 */
function enqueueFileOperation(filePath, operation) {
	if (!writeQueues.has(filePath)) {
		writeQueues.set(filePath, Promise.resolve());
	}

	const currentQueue = writeQueues.get(filePath);
	// Chain from .catch() to ensure new operation runs even after a prior failure
	const newQueue = currentQueue
		.then(() => {
			// Mark operation as active (starts executing) - after prior operation completes
			activeOperations.set(filePath, (activeOperations.get(filePath) || 0) + 1);
			return operation();
		})
		.catch((error) => {
			// After a failure, reset queue but rethrow to propagate to caller
			writeQueues.delete(filePath);
			throw error;
		})
		// Chain a handler that cleans up activeOperations and queue when done
		.then(
			(result) => {
				// Decrement active operation count and cleanup
				const count = (activeOperations.get(filePath) || 1) - 1;
				if (count > 0) {
					activeOperations.set(filePath, count);
				} else {
					activeOperations.delete(filePath);
				}
				// On success, check if queue is now idle and clean up the key
				if (writeQueues.get(filePath) === newQueue) {
					writeQueues.delete(filePath);
				}
				return result;
			},
			(error) => {
				// Decrement active operation count and cleanup
				const count = (activeOperations.get(filePath) || 1) - 1;
				if (count > 0) {
					activeOperations.set(filePath, count);
				} else {
					activeOperations.delete(filePath);
				}
				// Error already handled above, just rethrow
				throw error;
			}
		);
	writeQueues.set(filePath, newQueue);

	return newQueue;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Read CSV file and return array of objects
 * Waits for pending writes to complete before reading to avoid stale/partial data
 * (unless called from within an enqueued operation, to avoid deadlock)
 */
async function readCSV(filePath) {
	// Wait for any pending writes to complete, but only if we're not already inside an operation
	// (to avoid deadlock where a read inside an enqueued write waits for itself)
	if (writeQueues.has(filePath) && !activeOperations.has(filePath)) {
		try {
			await writeQueues.get(filePath);
		} catch (error) {
			// Ignore errors from the write queue; we'll attempt to read anyway
		}
	}

	return new Promise((resolve, reject) => {
		if (!fs.existsSync(filePath)) {
			resolve([]);
			return;
		}

		const results = [];
		const stream = fs.createReadStream(filePath);

		stream
			.pipe(csvParser())
			.on("data", (data) => results.push(data))
			.on("end", () => resolve(results))
			.on("error", reject);

		// Handle stream errors (e.g., permission denied, IO errors)
		stream.on("error", reject);
	});
}

/**
 * Write array of objects to CSV file
 * Serializes concurrent writes to same file using single-writer pattern
 */
async function writeCSV(filePath, records, headers = null) {
	return enqueueFileOperation(filePath, async () => {
		return new Promise((resolve, reject) => {
			try {
				ensureDir(path.dirname(filePath));

				if (!records || records.length === 0) {
					// Write file with headers only even if no records
					// to ensure file is cleared/truncated properly
					const csvHeaders = headers || [{ id: "id", title: "id" }];

					const writer = createObjectCsvWriter({
						path: filePath,
						header: csvHeaders,
					});

					writer
						.writeRecords([])
						.then(() => resolve())
						.catch(reject);
					return;
				}

				// Determine headers from first record if not provided
				const csvHeaders =
					headers || Object.keys(records[0]).map((key) => ({ id: key, title: key }));

				const writer = createObjectCsvWriter({
					path: filePath,
					header: csvHeaders,
				});

				writer
					.writeRecords(records)
					.then(() => resolve())
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Append records to CSV file
 * Entire read-modify-write operation is atomic (locked)
 */
async function appendCSV(filePath, records) {
	return enqueueFileOperation(filePath, async () => {
		try {
			const existing = await readCSV(filePath);
			const updated = [...existing, ...records];

			// Re-use writeCSV internal logic but don't enqueue again
			// since we're already inside an enqueued operation
			return new Promise((resolve, reject) => {
				try {
					ensureDir(path.dirname(filePath));

					if (!updated || updated.length === 0) {
						const csvHeaders = [{ id: "id", title: "id" }];
						const writer = createObjectCsvWriter({
							path: filePath,
							header: csvHeaders,
						});
						writer
							.writeRecords([])
							.then(() => resolve())
							.catch(reject);
						return;
					}

					const csvHeaders = Object.keys(updated[0]).map((key) => ({
						id: key,
						title: key,
					}));
					const writer = createObjectCsvWriter({
						path: filePath,
						header: csvHeaders,
					});

					writer
						.writeRecords(updated)
						.then(() => resolve())
						.catch(reject);
				} catch (error) {
					reject(error);
				}
			});
		} catch (error) {
			throw new Error(`Failed to append to CSV: ${error.message}`);
		}
	});
}

/**
 * Find records matching filter criteria
 */
async function findRecords(filePath, filterFn) {
	const records = await readCSV(filePath);
	return records.filter(filterFn);
}

/**
 * Find single record matching filter criteria
 */
async function findRecord(filePath, filterFn) {
	const records = await findRecords(filePath, filterFn);
	return records[0] || null;
}

/**
 * Update records in CSV file
 * Entire read-modify-write operation is atomic (locked)
 */
async function updateRecords(filePath, filterFn, updateFn) {
	return enqueueFileOperation(filePath, async () => {
		const records = await readCSV(filePath);
		const updated = records.map((record) => {
			if (filterFn(record)) {
				return updateFn(record);
			}
			return record;
		});

		// Perform write without re-enqueueing
		return new Promise((resolve, reject) => {
			try {
				ensureDir(path.dirname(filePath));

				if (!updated || updated.length === 0) {
					const csvHeaders = [{ id: "id", title: "id" }];
					const writer = createObjectCsvWriter({
						path: filePath,
						header: csvHeaders,
					});
					writer
						.writeRecords([])
						.then(() => resolve(updated))
						.catch(reject);
					return;
				}

				const csvHeaders = Object.keys(updated[0]).map((key) => ({ id: key, title: key }));
				const writer = createObjectCsvWriter({
					path: filePath,
					header: csvHeaders,
				});

				writer
					.writeRecords(updated)
					.then(() => resolve(updated))
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Delete records from CSV file
 * Entire read-modify-write operation is atomic (locked)
 */
async function deleteRecords(filePath, filterFn) {
	return enqueueFileOperation(filePath, async () => {
		const records = await readCSV(filePath);
		const remaining = records.filter((record) => !filterFn(record));

		// Perform write without re-enqueueing
		return new Promise((resolve, reject) => {
			try {
				ensureDir(path.dirname(filePath));

				// Preserve original schema: if all records deleted, use headers from original records
				const csvHeaders =
					remaining.length > 0
						? Object.keys(remaining[0]).map((key) => ({ id: key, title: key }))
						: records.length > 0
							? Object.keys(records[0]).map((key) => ({ id: key, title: key }))
							: [{ id: "id", title: "id" }];

				const writer = createObjectCsvWriter({
					path: filePath,
					header: csvHeaders,
				});

				writer
					.writeRecords(remaining)
					.then(() => resolve())
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Atomically check for duplicates and append records
 * The entire read+check+write operation is protected by the per-file lock
 * This prevents two concurrent appends from both passing duplicate checks
 */
async function appendWithDuplicateCheck(filePath, records, checks) {
	return enqueueFileOperation(filePath, async () => {
		// Read all existing records within the lock
		const existing = await readCSV(filePath);

		// Check for duplicates within the locked section
		if (checks.usernameFn && existing.some(checks.usernameFn)) {
			throw new Error("Username already exists");
		}
		if (checks.emailFn && existing.some(checks.emailFn)) {
			throw new Error("Email already registered");
		}

		// Append new records (still within the lock)
		const updated = [...existing, ...records];

		return new Promise((resolve, reject) => {
			try {
				ensureDir(path.dirname(filePath));

				if (!updated || updated.length === 0) {
					const csvHeaders = [{ id: "id", title: "id" }];
					const writer = createObjectCsvWriter({
						path: filePath,
						header: csvHeaders,
					});
					writer
						.writeRecords([])
						.then(() => resolve())
						.catch(reject);
					return;
				}

				const csvHeaders = Object.keys(updated[0]).map((key) => ({
					id: key,
					title: key,
				}));
				const writer = createObjectCsvWriter({
					path: filePath,
					header: csvHeaders,
				});

				writer
					.writeRecords(updated)
					.then(() => resolve())
					.catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Initialize database directory structure
 */
function initializeDatabase() {
	const dbPath = path.join(__dirname, "..", "..", config.database.path);
	const shoppingListsDir = path.join(dbPath, "shopping-lists");

	ensureDir(dbPath);
	ensureDir(shoppingListsDir);

	// eslint-disable-next-line no-console
	console.log(`[CSV Service] Database initialized at ${dbPath}`);
}

module.exports = {
	readCSV,
	writeCSV,
	appendCSV,
	appendWithDuplicateCheck,
	findRecords,
	findRecord,
	updateRecords,
	deleteRecords,
	ensureDir,
	initializeDatabase,
};
