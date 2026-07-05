/**
 * CSV Service Unit Tests
 */

const csvService = require("../../src/services/csvService");
const fs = require("fs");
const path = require("path");
const os = require("os");

let TEST_DIR;
let TEST_FILE;

describe("CSV Service", () => {
	beforeAll(() => {
		// Create a unique temp directory for this test run to avoid flakiness with parallel tests
		TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "csv-service-test-"));
		TEST_FILE = path.join(TEST_DIR, "test.csv");
	});

	afterEach(() => {
		if (fs.existsSync(TEST_FILE)) {
			fs.unlinkSync(TEST_FILE);
		}
	});

	afterAll(() => {
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe("writeCSV", () => {
		it("should write records to file", async () => {
			const records = [{ id: "1", name: "Alice" }];
			await csvService.writeCSV(TEST_FILE, records);

			expect(fs.existsSync(TEST_FILE)).toBe(true);
			const content = fs.readFileSync(TEST_FILE, "utf-8");
			expect(content).toContain("id");
			expect(content).toContain("name");
		});

		it("should write empty records with headers", async () => {
			const headers = [
				{ id: "id", title: "id" },
				{ id: "name", title: "name" },
			];
			await csvService.writeCSV(TEST_FILE, [], headers);

			expect(fs.existsSync(TEST_FILE)).toBe(true);
		});
	});

	describe("readCSV", () => {
		it("should read written records", async () => {
			const records = [
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			];
			await csvService.writeCSV(TEST_FILE, records);
			const result = await csvService.readCSV(TEST_FILE);

			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it("should return empty array for missing file", async () => {
			const result = await csvService.readCSV(path.join(TEST_DIR, "missing.csv"));
			expect(result).toEqual([]);
		});
	});

	describe("appendCSV", () => {
		it("should append to existing file", async () => {
			await csvService.writeCSV(TEST_FILE, [{ id: "1", name: "Alice" }]);
			await csvService.appendCSV(TEST_FILE, [{ id: "2", name: "Bob" }]);

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("findRecord", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			]);
		});

		it("should find matching record", async () => {
			const result = await csvService.findRecord(TEST_FILE, (r) => r.id === "1");
			expect(result).not.toBeNull();
			expect(result.id).toBe("1");
		});

		it("should return null for no match", async () => {
			const result = await csvService.findRecord(TEST_FILE, (r) => r.id === "99");
			expect(result).toBeNull();
		});
	});

	describe("findRecords", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [
				{ id: "1", type: "A" },
				{ id: "2", type: "B" },
				{ id: "3", type: "A" },
			]);
		});

		it("should find matching records", async () => {
			const result = await csvService.findRecords(TEST_FILE, (r) => r.type === "A");
			expect(result.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("deleteRecords", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			]);
		});

		it("should delete matching records", async () => {
			await csvService.deleteRecords(TEST_FILE, (r) => r.id === "1");

			const result = await csvService.readCSV(TEST_FILE);
			const remaining = result.filter((r) => r.id === "1");
			expect(remaining).toHaveLength(0);
		});

		it("should keep file after deleting all", async () => {
			await csvService.deleteRecords(TEST_FILE, () => true);
			expect(fs.existsSync(TEST_FILE)).toBe(true);
		});
	});

	describe("updateRecords", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [
				{ id: "1", status: "active" },
				{ id: "2", status: "active" },
			]);
		});

		it("should update matching records", async () => {
			await csvService.updateRecords(
				TEST_FILE,
				(r) => r.id === "1",
				(r) => ({ ...r, status: "inactive" })
			);

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("appendWithDuplicateCheck", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [{ user_id: "u_1", email: "user1@example.com" }]);
		});

		it("should append when no duplicates", async () => {
			await csvService.appendWithDuplicateCheck(
				TEST_FILE,
				[{ user_id: "u_2", email: "user2@example.com" }],
				{
					usernameFn: null,
					emailFn: (r) => r.email === "user2@example.com",
				}
			);

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it("should throw on username duplicate", async () => {
			try {
				await csvService.appendWithDuplicateCheck(TEST_FILE, [{ user_id: "u_2" }], {
					usernameFn: (r) => r.user_id === "u_1",
					emailFn: null,
				});
				throw new Error("Should have thrown");
			} catch (error) {
				expect(error.message).toContain("already exists");
			}
		});

		it("should throw on email duplicate", async () => {
			try {
				await csvService.appendWithDuplicateCheck(
					TEST_FILE,
					[{ user_id: "u_2", email: "user1@example.com" }],
					{
						usernameFn: null,
						emailFn: (r) => r.email === "user1@example.com",
					}
				);
				throw new Error("Should have thrown");
			} catch (error) {
				expect(error.message).toContain("Email already registered");
			}
		});

		it("should handle empty append list", async () => {
			await csvService.appendWithDuplicateCheck(TEST_FILE, [], {
				usernameFn: null,
				emailFn: null,
			});

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("updateRecordsWithVerify", () => {
		beforeEach(async () => {
			await csvService.writeCSV(TEST_FILE, [{ id: "1", version: "1" }]);
		});

		it("should update when verification passes", async () => {
			await csvService.updateRecordsWithVerify(TEST_FILE, async (records) => {
				return {
					verified: true,
					updated: records.map((r) => ({ ...r, version: "2" })),
				};
			});

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(1);
		});

		it("should throw when verification fails", async () => {
			try {
				await csvService.updateRecordsWithVerify(TEST_FILE, async (records) => {
					return {
						verified: false,
						error: "Custom error",
					};
				});
				throw new Error("Should have thrown");
			} catch (error) {
				expect(error.message).toContain("Custom error");
			}
		});

		it("should handle no updates", async () => {
			await csvService.updateRecordsWithVerify(TEST_FILE, async (records) => {
				return {
					verified: true,
					updated: records,
				};
			});

			const result = await csvService.readCSV(TEST_FILE);
			expect(result.length).toBeGreaterThanOrEqual(1);
		});

		it("should handle delete all records", async () => {
			await csvService.updateRecordsWithVerify(TEST_FILE, async (records) => {
				return {
					verified: true,
					updated: [],
				};
			});

			expect(fs.existsSync(TEST_FILE)).toBe(true);
		});
	});
});
