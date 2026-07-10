/**
 * Integration Tests for Routes and Error Handling
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

let TEST_DIR;
let TEST_USERS_FILE;

describe("API Error Handling", () => {
	let request;
	let app;

	beforeAll(() => {
		// Create temp directory and set env vars BEFORE requiring app
		// (so authService initializes with correct TEST_USERS_FILE path)
		TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "api-error-test-"));
		TEST_USERS_FILE = path.join(TEST_DIR, "users.csv");
		process.env.TEST_USERS_FILE = TEST_USERS_FILE;
		process.env.TEST_BLACKLIST_FILE = path.join(TEST_DIR, "token-blacklist.csv");

		// Clear the require cache and require app AFTER env vars are set
		delete require.cache[require.resolve("../../src/app")];
		delete require.cache[require.resolve("../../src/services/authService")];
		delete require.cache[require.resolve("../../src/middleware/authMiddleware")];

		// Require AFTER clearing cache and setting env vars
		request = require("supertest");
		app = require("../../src/app");
	});

	afterAll(() => {
		delete process.env.TEST_USERS_FILE;
		delete process.env.TEST_BLACKLIST_FILE;
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe("Missing Content-Type", () => {
		it("should handle requests without proper content-type", async () => {
			const response = await request(app)
				.post("/api/v1/auth/register")
				.set("Content-Type", "text/plain")
				.send("invalid");

			expect(response.status).toBe(400);
		});
	});

	describe("Protected Routes", () => {
		it("should return 401 for missing auth header", async () => {
			const response = await request(app).post("/api/v1/auth/change-password").send({
				old_password: "OldPass123",
				new_password: "NewPass123",
			});

			expect(response.status).toBe(401);
			expect(response.body.error.code).toBe("UNAUTHORIZED");
		});

		it("should return 401 for invalid token", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", "Bearer invalid.token.here")
				.send({
					old_password: "OldPass123",
					new_password: "NewPass123",
				});

			expect(response.status).toBe(401);
		});
	});

	describe("Validation Errors", () => {
		it("should return 400 for missing password in register", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "john_doe",
				email: "john@example.com",
			});

			expect(response.status).toBe(400);
		});

		it("should return 400 for invalid email in register", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "john_doe",
				password: "SecurePass123",
				email: "not-an-email",
			});

			expect(response.status).toBe(400);
		});

		it("should return 400 for short password", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "john_doe",
				password: "short",
				email: "john@example.com",
			});

			expect(response.status).toBe(400);
		});
	});

	describe("Invalid Routes", () => {
		it("should return 404 for unknown endpoint", async () => {
			const response = await request(app).get("/api/v1/unknown-endpoint");

			expect(response.status).toBe(404);
		});
	});
});
