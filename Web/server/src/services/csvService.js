/**
 * CSV Service
 * Handles reading and writing CSV files for data persistence
 */

const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");
const csvParser = require("csv-parser");
const config = require("../config/defaults.json");

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
		fs.createReadStream(filePath)
			.pipe(csvParser())
			.on("data", (data) => results.push(data))
			.on("end", () => resolve(results))
			.on("error", reject);
	});
}

/**
 * Write array of objects to CSV file
 */
async function writeCSV(filePath, records, headers = null) {
	return new Promise((resolve, reject) => {
		try {
			ensureDir(path.dirname(filePath));

			if (!records || records.length === 0) {
				resolve();
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
}

/**
 * Append records to CSV file
 */
async function appendCSV(filePath, records) {
	try {
		const existing = await readCSV(filePath);
		const updated = [...existing, ...records];
		await writeCSV(filePath, updated);
	} catch (error) {
		throw new Error(`Failed to append to CSV: ${error.message}`);
	}
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
 */
async function updateRecords(filePath, filterFn, updateFn) {
	const records = await readCSV(filePath);
	const updated = records.map((record) => {
		if (filterFn(record)) {
			return updateFn(record);
		}
		return record;
	});
	await writeCSV(filePath, updated);
	return updated;
}

/**
 * Delete records from CSV file
 */
async function deleteRecords(filePath, filterFn) {
	const records = await readCSV(filePath);
	const remaining = records.filter((record) => !filterFn(record));
	if (remaining.length === 0) {
		// Keep file with headers even if empty
		await writeCSV(filePath, []);
	} else {
		await writeCSV(filePath, remaining);
	}
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
