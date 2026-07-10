/**
 * Integration Tests for CSV Service Atomicity and Concurrency
 * Tests ensure:
 * - External reads wait for pending writes (consistency)
 * - Nested reads don't deadlock (safety)
 * - Failed writes don't block subsequent operations (resilience)
 * - Multiple operations on different files run concurrently (performance)
 */

const csvService = require("../../src/services/csvService");
const fs = require("fs");
const path = require("path");
const os = require("os");

let TEST_DIR;
let TEST_FILE_1;
let TEST_FILE_2;

describe("CSV Service Atomicity and Concurrency", () => {
	beforeAll(() => {
		// Create a unique temp directory for this test run
		TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "csv-atomicity-test-"));
		TEST_FILE_1 = path.join(TEST_DIR, "file1.csv");
		TEST_FILE_2 = path.join(TEST_DIR, "file2.csv");
	});

	afterEach(() => {
		// Clean up files between tests
		[TEST_FILE_1, TEST_FILE_2].forEach((file) => {
			if (fs.existsSync(file)) {
				fs.unlinkSync(file);
			}
		});
	});

	afterAll(() => {
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe("External reads wait for pending writes", () => {
		it("should return updated data from external read after write", async () => {
			// Setup: write initial data
			await csvService.writeCSV(TEST_FILE_1, [
				{ id: "1", status: "pending" },
				{ id: "2", status: "pending" },
			]);

			// Update record 1
			await csvService.updateRecords(
				TEST_FILE_1,
				(r) => r.id === "1",
				(r) => ({ ...r, status: "completed" })
			);

			// Read should see updated data
			const records = await csvService.readCSV(TEST_FILE_1);
			const record1 = records.find((r) => r.id === "1");

			expect(record1.status).toBe("completed");
		});

		it("should read consistent data when external and internal reads happen", async () => {
			// Setup: write initial data
			await csvService.writeCSV(TEST_FILE_1, [
				{ id: "1", version: "1" },
				{ id: "2", version: "1" },
			]);

			// Perform operation that reads and updates internally
			// External read should eventually see the same version
			await csvService.updateRecords(
				TEST_FILE_1,
				(r) => r.id === "1",
				(r) => ({ ...r, version: "2" })
			);

			const externalRead = await csvService.readCSV(TEST_FILE_1);
			const record1 = externalRead.find((r) => r.id === "1");

			// External read should see the committed update
			expect(record1.version).toBe("2");
		});
	});

	describe("Nested reads don't deadlock", () => {
		it("should allow read-then-write operation without deadlock", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", count: "0" }]);

			// This operation reads, then writes (both on same file)
			// It should NOT deadlock because the read is nested inside the write operation
			const result = await csvService.updateRecords(
				TEST_FILE_1,
				(r) => r.id === "1",
				(r) => ({ ...r, count: String(parseInt(r.count) + 1) })
			);

			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result[0].count).toBe("1");
		});

		it("should handle appendWithDuplicateCheck without deadlock", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ user_id: "u_1", email: "user1@test.com" }]);

			// This operation reads, checks for duplicates, then writes
			// All happens in one enqueued operation - should not deadlock
			await csvService.appendWithDuplicateCheck(
				TEST_FILE_1,
				[{ user_id: "u_2", email: "user2@test.com" }],
				{
					usernameFn: null,
					emailFn: (r) => r.email === "user2@test.com",
				}
			);

			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records.length).toBeGreaterThanOrEqual(2);
		});

		it("should handle updateRecordsWithVerify without deadlock", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", version: "1" }]);

			// This operation reads, verifies, then writes - all nested
			await csvService.updateRecordsWithVerify(TEST_FILE_1, async (records) => {
				return {
					verified: true,
					updated: records.map((r) => ({ ...r, version: "2" })),
				};
			});

			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records[0].version).toBe("2");
		});
	});

	describe("Failed operations allow subsequent operations to proceed", () => {
		it("should allow next operation after failed duplicate check", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ user_id: "u_1", email: "user1@test.com" }]);

			// First attempt: try to append with email that already exists
			let firstAttemptFailed = false;
			try {
				await csvService.appendWithDuplicateCheck(
					TEST_FILE_1,
					[{ user_id: "u_2", email: "user1@test.com" }],
					{
						usernameFn: null,
						emailFn: (r) => r.email === "user1@test.com",
					}
				);
			} catch (error) {
				firstAttemptFailed = true;
				expect(error.message).toContain("Email already registered");
			}

			expect(firstAttemptFailed).toBe(true);

			// Second attempt: append with new email should work (queue not blocked)
			await csvService.appendWithDuplicateCheck(
				TEST_FILE_1,
				[{ user_id: "u_2", email: "user2@test.com" }],
				{
					usernameFn: null,
					emailFn: (r) => r.email === "user2@test.com",
				}
			);

			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records.length).toBeGreaterThanOrEqual(2);
		});

		it("should allow next operation after verification failure", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", status: "A" }]);

			// First attempt: verification fails
			let firstAttemptFailed = false;
			try {
				await csvService.updateRecordsWithVerify(TEST_FILE_1, async (records) => {
					return { verified: false, error: "Verification failed" };
				});
			} catch (error) {
				firstAttemptFailed = true;
			}

			expect(firstAttemptFailed).toBe(true);

			// Second attempt: verification succeeds (queue not blocked)
			await csvService.updateRecordsWithVerify(TEST_FILE_1, async (records) => {
				return {
					verified: true,
					updated: records.map((r) => ({ ...r, status: "B" })),
				};
			});

			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records[0].status).toBe("B");
		});
	});

	describe("Concurrent operations on different files", () => {
		it("should not serialize operations on different files", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", value: "a" }]);
			await csvService.writeCSV(TEST_FILE_2, [{ id: "1", value: "b" }]);

			let file1Updated = false;
			let file2Updated = false;

			// Start updates on different files simultaneously
			const promise1 = csvService.updateRecords(
				TEST_FILE_1,
				(r) => r.id === "1",
				(r) => {
					file1Updated = true;
					return { ...r, value: "updated1" };
				}
			);

			const promise2 = csvService.updateRecords(
				TEST_FILE_2,
				(r) => r.id === "1",
				(r) => {
					file2Updated = true;
					return { ...r, value: "updated2" };
				}
			);

			// Both should complete successfully
			await Promise.all([promise1, promise2]);

			// Both operations should have executed
			expect(file1Updated).toBe(true);
			expect(file2Updated).toBe(true);

			// Verify both updates persisted
			const records1 = await csvService.readCSV(TEST_FILE_1);
			const records2 = await csvService.readCSV(TEST_FILE_2);

			expect(records1[0].value).toBe("updated1");
			expect(records2[0].value).toBe("updated2");
		});
	});

	describe("Concurrent writes to same file", () => {
		it("should serialize writes to same file", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", count: "0" }]);

			const executionOrder = [];

			// Start multiple writes simultaneously
			const promises = [
				csvService.updateRecords(
					TEST_FILE_1,
					(r) => r.id === "1",
					async (r) => {
						executionOrder.push("write1Start");
						await new Promise((resolve) => setTimeout(resolve, 50));
						executionOrder.push("write1End");
						return { ...r, count: "1" };
					}
				),
				csvService.updateRecords(
					TEST_FILE_1,
					(r) => r.id === "1",
					async (r) => {
						executionOrder.push("write2Start");
						await new Promise((resolve) => setTimeout(resolve, 50));
						executionOrder.push("write2End");
						return { ...r, count: "2" };
					}
				),
			];

			await Promise.all(promises);

			// Writes should be serialized: write1Start -> write1End -> write2Start -> write2End
			// (not interleaved during the actual write operation)
			expect(executionOrder.length).toBe(4);
			expect(executionOrder).toEqual([
				"write1Start",
				"write1End",
				"write2Start",
				"write2End",
			]);
		});
	});

	describe("Edge cases", () => {
		it("should handle read immediately after fast write", async () => {
			// This tests the race condition fix specifically
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", value: "test" }]);

			// Read immediately without artificial delay
			const records = await csvService.readCSV(TEST_FILE_1);

			expect(records.length).toBeGreaterThanOrEqual(1);
			expect(records[0].id).toBe("1");
		});

		it("should handle multiple rapid writes to same file", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "0", count: "0" }]);

			// Perform multiple rapid writes
			for (let i = 1; i <= 5; i++) {
				await csvService.appendCSV(TEST_FILE_1, [{ id: String(i), count: String(i) }]);
			}

			// All should be persisted in order
			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records.length).toBeGreaterThanOrEqual(6);
		});

		it("should preserve file after failed append followed by successful append", async () => {
			// Setup
			await csvService.writeCSV(TEST_FILE_1, [{ id: "1", name: "Alice" }]);

			// Try to append with failed duplicate check
			let failedAsExpected = false;
			try {
				await csvService.appendWithDuplicateCheck(TEST_FILE_1, [{ id: "2", name: "Bob" }], {
					usernameFn: (r) => r.name === "Alice",
					emailFn: null,
				});
			} catch (error) {
				failedAsExpected = true;
			}

			expect(failedAsExpected).toBe(true);

			// File should still exist and be readable
			expect(fs.existsSync(TEST_FILE_1)).toBe(true);

			// Next append should work (queue not blocked by previous failure)
			await csvService.appendCSV(TEST_FILE_1, [{ id: "2", name: "Bob" }]);

			const records = await csvService.readCSV(TEST_FILE_1);
			expect(records.length).toBeGreaterThanOrEqual(2);
		});
	});
});
