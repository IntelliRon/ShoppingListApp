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
 * Enqueue an operation to execute after all previous writes complete
 * Chains the operation to the existing queue and updates the queue
 * Catches errors to prevent queue poisoning
 */
function enqueueFileOperation(filePath, operation) {
	if (!writeQueues.has(filePath)) {
		writeQueues.set(filePath, Promise.resolve());
	}

	const currentQueue = writeQueues.get(filePath);
	const newQueue = currentQueue
		.then(() => operation())
		.catch((error) => {
			// Reset queue to resolved state to allow future operations
			writeQueues.set(filePath, Promise.resolve());
			throw error;
		});
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
 */
async function readCSV(filePath) {
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

				// Always write the file to properly truncate/clear it
				const csvHeaders =
					remaining.length > 0
						? Object.keys(remaining[0]).map((key) => ({ id: key, title: key }))
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
 * Initialize database directory structure
 */
function initializeDatabase() {
	const dbPath = path.join(__dirname, "..", "..", config.database.path);
	const shoppingListsDir = path.join(dbPath, "shopping-lists");

	ensureDir(dbPath);
	ensureDir(shoppingListsDir);

	console.log(`[CSV Service] Database initialized at ${dbPath}`);
}

module.exports = {
	readCSV,
	writeCSV,
	appendCSV,
	findRecords,
	findRecord,
	updateRecords,
	deleteRecords,
	ensureDir,
	initializeDatabase,
};
