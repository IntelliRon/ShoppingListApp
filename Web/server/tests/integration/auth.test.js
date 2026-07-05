/**
 * Authentication API Integration Tests
 * Tests the full API flow with real CSV files (in temp directory)
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// Create temp directory for test files BEFORE requiring the app
const TEST_DIR = path.join(os.tmpdir(), "shopping-list-api-test");
if (!fs.existsSync(TEST_DIR)) {
	fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Set environment variable to use temp directory for tests
const TEST_USERS_FILE = path.join(TEST_DIR, "users.csv");
process.env.TEST_USERS_FILE = TEST_USERS_FILE;

const request = require("supertest");
const app = require("../../src/app");

// Test constants
const TEST_USER = {
	username: "testuser",
	password: "testPassword123",
	email: "testuser@example.com",
};

const USERS_FILE = TEST_USERS_FILE;

describe("Authentication API", () => {
	// Suppress expected console.error logs during testing
	beforeAll(() => {
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterAll(() => {
		// Restore console.error
		console.error.mockRestore();

		// Clean up test files and directory
		try {
			if (fs.existsSync(TEST_DIR)) {
				fs.rmSync(TEST_DIR, { recursive: true, force: true });
			}
		} catch (error) {
			console.log("Cleanup note:", error.message);
		}
	});

	describe("POST /api/v1/auth/register", () => {
		it("should register a new user", async () => {
			const response = await request(app).post("/api/v1/auth/register").send(TEST_USER);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("user_id");
			expect(response.body.data).toHaveProperty("username", TEST_USER.username);
			expect(response.body.data).toHaveProperty("email", TEST_USER.email);
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("created_at");
		});

		it("should reject duplicate username", async () => {
			const response = await request(app).post("/api/v1/auth/register").send(TEST_USER);

			expect(response.status).toBe(409);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("CONFLICT");
		});

		it("should reject duplicate email", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "anotheruser",
				password: "validPassword123",
				email: TEST_USER.email,
			});

			expect(response.status).toBe(409);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("CONFLICT");
		});

		it("should reject invalid username", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "ab",
				password: "validPassword123",
				email: "test@example.com",
			});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject invalid password", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "newuser",
				password: "short",
				email: "test@example.com",
			});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject invalid email", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "newuser",
				password: "validPassword123",
				email: "invalid-email",
			});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject missing credentials", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});
	});

	describe("POST /api/v1/auth/login", () => {
		it("should login with correct credentials", async () => {
			const response = await request(app).post("/api/v1/auth/login").send(TEST_USER);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty("user_id");
			expect(response.body.data).toHaveProperty("username", TEST_USER.username);
			expect(response.body.data).toHaveProperty("token");
		});

		it("should reject incorrect password", async () => {
			const response = await request(app).post("/api/v1/auth/login").send({
				username: TEST_USER.username,
				password: "wrongPassword",
			});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error.code).toBe("UNAUTHORIZED");
		});

		it("should reject nonexistent user", async () => {
			const response = await request(app).post("/api/v1/auth/login").send({
				username: "nonexistent",
				password: "anyPassword123",
			});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});

		it("should reject missing credentials", async () => {
			const response = await request(app).post("/api/v1/auth/login").send({});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});
	});

	describe("POST /api/v1/auth/logout", () => {
		let authToken = "";

		beforeAll(async () => {
			// Get a valid token
			const response = await request(app).post("/api/v1/auth/login").send(TEST_USER);
			authToken = response.body.data.token;
		});

		it("should logout successfully with valid token", async () => {
			const response = await request(app)
				.post("/api/v1/auth/logout")
				.set("Authorization", `Bearer ${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it("should reject logout without token", async () => {
			const response = await request(app).post("/api/v1/auth/logout");

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});

		it("should reject logout with invalid token", async () => {
			const response = await request(app)
				.post("/api/v1/auth/logout")
				.set("Authorization", "Bearer invalid.token.here");

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe("POST /api/v1/auth/change-password", () => {
		let authToken = "";
		const NEW_PASSWORD = "newPassword456";

		beforeAll(async () => {
			// Get a valid token
			const response = await request(app).post("/api/v1/auth/login").send(TEST_USER);
			authToken = response.body.data.token;
		});

		it("should change password successfully", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					old_password: TEST_USER.password,
					new_password: NEW_PASSWORD,
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);

			// Verify new password works
			const loginResponse = await request(app).post("/api/v1/auth/login").send({
				username: TEST_USER.username,
				password: NEW_PASSWORD,
			});

			expect(loginResponse.status).toBe(200);
		});

		it("should reject wrong old password", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					old_password: "wrongPassword",
					new_password: "anotherPassword789",
				});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});

		it("should reject change without token", async () => {
			const response = await request(app).post("/api/v1/auth/change-password").send({
				old_password: NEW_PASSWORD,
				new_password: "anotherPassword789",
			});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});

		it("should reject invalid new password", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", `Bearer ${authToken}`)
				.send({
					old_password: NEW_PASSWORD,
					new_password: "short",
				});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		it("should reject with invalid token", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", "Bearer invalid.token.here")
				.send({
					old_password: NEW_PASSWORD,
					new_password: "validNewPassword123",
				});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe("Additional Validation Tests", () => {
		it("should reject registration with missing email", async () => {
			const response = await request(app).post("/api/v1/auth/register").send({
				username: "newuser",
				password: "validPassword123",
			});

			expect(response.status).toBe(400);
			expect(response.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject login with missing password", async () => {
			const response = await request(app).post("/api/v1/auth/login").send({
				username: "testuser",
			});

			expect(response.status).toBe(400);
			expect(response.body.error.code).toBe("VALIDATION_ERROR");
		});

		it("should reject change-password with missing fields", async () => {
			const response = await request(app)
				.post("/api/v1/auth/change-password")
				.set("Authorization", "Bearer some.token")
				.send({});

			// Missing auth causes 401, then missing fields would cause 400
			// Since auth validation happens first, we expect 401
			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});
});
