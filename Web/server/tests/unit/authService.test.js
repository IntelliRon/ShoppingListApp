/**
 * Authentication Service Unit Tests
 */

const authService = require("../../src/services/authService");
const csvService = require("../../src/services/csvService");

// Mock the CSV service
jest.mock("../../src/services/csvService", () => ({
	findRecord: jest.fn(),
	appendCSV: jest.fn(),
	updateRecords: jest.fn(),
}));

describe("AuthService", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("validateUsername", () => {
		it("should validate a correct username", () => {
			const result = authService.validateUsername("john_doe");
			expect(result.valid).toBe(true);
		});

		it("should reject username with less than 3 characters", () => {
			const result = authService.validateUsername("ab");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("at least 3");
		});

		it("should reject username with invalid characters", () => {
			const result = authService.validateUsername("john-doe");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("alphanumeric");
		});

		it("should reject empty username", () => {
			const result = authService.validateUsername("");
			expect(result.valid).toBe(false);
		});
	});

	describe("validatePassword", () => {
		it("should validate a correct password", () => {
			const result = authService.validatePassword("securePassword123");
			expect(result.valid).toBe(true);
		});

		it("should reject password with less than 8 characters", () => {
			const result = authService.validatePassword("pass123");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("at least 8");
		});

		it("should reject empty password", () => {
			const result = authService.validatePassword("");
			expect(result.valid).toBe(false);
		});
	});

	describe("hashPassword", () => {
		it("should hash password and return different string", async () => {
			const password = "testPassword123";
			const hash = await authService.hashPassword(password);

			expect(hash).not.toBe(password);
			expect(typeof hash).toBe("string");
			expect(hash.length).toBeGreaterThan(0);
		});

		it("should return consistent hash for same password", async () => {
			const password = "testPassword123";
			const hash1 = await authService.hashPassword(password);
			const hash2 = await authService.hashPassword(password);

			// Hashes should be different (bcrypt uses salt)
			expect(hash1).not.toBe(hash2);
		});
	});

	describe("comparePassword", () => {
		it("should verify correct password", async () => {
			const password = "testPassword123";
			const hash = await authService.hashPassword(password);

			const match = await authService.comparePassword(password, hash);
			expect(match).toBe(true);
		});

		it("should reject incorrect password", async () => {
			const password = "testPassword123";
			const hash = await authService.hashPassword(password);

			const match = await authService.comparePassword("wrongPassword", hash);
			expect(match).toBe(false);
		});
	});

	describe("generateToken", () => {
		it("should generate valid JWT token", () => {
			const token = authService.generateToken("u_123");

			expect(token).toBeTruthy();
			expect(typeof token).toBe("string");
			expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
		});

		it("should generate different tokens for different users", () => {
			const token1 = authService.generateToken("u_123");
			const token2 = authService.generateToken("u_456");

			expect(token1).not.toBe(token2);
		});
	});

	describe("verifyToken", () => {
		it("should verify valid token", () => {
			const userId = "u_123";
			const token = authService.generateToken(userId);

			const decoded = authService.verifyToken(token);
			expect(decoded).toBeTruthy();
			expect(decoded.userId).toBe(userId);
		});

		it("should reject invalid token", () => {
			const decoded = authService.verifyToken("invalid.token.here");
			expect(decoded).toBeNull();
		});

		it("should reject expired token", (done) => {
			// Create an expired token by manipulating time
			const userId = "u_123";
			const secret =
				process.env.JWT_SECRET || require("../../src/config/defaults.json").auth.jwt_secret;
			const jwt = require("jsonwebtoken");

			const token = jwt.sign({ userId }, secret, { expiresIn: "-1s" });

			const decoded = authService.verifyToken(token);
			expect(decoded).toBeNull();

			done();
		});
	});

	describe("registerUser", () => {
		it("should register user successfully", async () => {
			csvService.findRecord.mockImplementationOnce(async () => null); // User doesn't exist
			csvService.appendCSV.mockImplementationOnce(async () => {});

			const result = await authService.registerUser("john_doe", "password123");

			expect(result).toHaveProperty("user_id");
			expect(result).toHaveProperty("username", "john_doe");
			expect(result).toHaveProperty("token");
			expect(result).toHaveProperty("created_at");
			expect(csvService.appendCSV).toHaveBeenCalled();
		});

		it("should reject if username already exists", async () => {
			csvService.findRecord.mockImplementationOnce(async () => ({ username: "john_doe" }));

			await expect(authService.registerUser("john_doe", "password123")).rejects.toThrow(
				"Username already exists"
			);
		});

		it("should reject invalid username", async () => {
			await expect(authService.registerUser("ab", "password123")).rejects.toThrow(
				"at least 3"
			);
		});

		it("should reject invalid password", async () => {
			csvService.findRecord.mockImplementationOnce(async () => null);

			await expect(authService.registerUser("john_doe", "pass")).rejects.toThrow(
				"at least 8"
			);
		});
	});

	describe("loginUser", () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it("should login user successfully", async () => {
			const password = "password123";
			const hash = await authService.hashPassword(password);

			csvService.findRecord.mockImplementationOnce(async () => ({
				user_id: "u_123",
				username: "john_doe",
				password_hash: hash,
			}));

			const result = await authService.loginUser("john_doe", password);

			expect(result).toHaveProperty("user_id", "u_123");
			expect(result).toHaveProperty("username", "john_doe");
			expect(result).toHaveProperty("token");
		});

		it("should reject if user not found", async () => {
			csvService.findRecord.mockImplementationOnce(async () => null);

			try {
				await authService.loginUser("nonexistent", "password123");
				throw new Error("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("Invalid username or password");
			}
		});

		it("should reject wrong password", async () => {
			const password = "password123";
			const hash = await authService.hashPassword(password);

			csvService.findRecord.mockImplementationOnce(async () => ({
				user_id: "u_123",
				username: "john_doe",
				password_hash: hash,
			}));

			try {
				await authService.loginUser("john_doe", "wrongPassword");
				throw new Error("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("Invalid username or password");
			}
		});
	});

	describe("getUserById", () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it("should get user by ID", async () => {
			csvService.findRecord.mockImplementationOnce(async () => ({
				user_id: "u_123",
				username: "john_doe",
				is_developer: "false",
				created_at: "2026-07-05T00:00:00.000Z",
			}));

			const result = await authService.getUserById("u_123");

			expect(result).toHaveProperty("user_id", "u_123");
			expect(result).toHaveProperty("username", "john_doe");
			expect(result).toHaveProperty("is_developer", false);
		});

		it("should return null if user not found", async () => {
			csvService.findRecord.mockImplementationOnce(async () => null);

			const result = await authService.getUserById("u_nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("changePassword", () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it("should change password successfully", async () => {
			const oldPassword = "oldPassword123";
			const newPassword = "newPassword456";
			const oldHash = await authService.hashPassword(oldPassword);

			csvService.findRecord.mockImplementationOnce(async () => ({
				user_id: "u_123",
				username: "john_doe",
				password_hash: oldHash,
			}));
			csvService.updateRecords.mockImplementationOnce(async () => {});

			await authService.changePassword("u_123", oldPassword, newPassword);

			expect(csvService.updateRecords).toHaveBeenCalled();
		});

		it("should reject if old password is incorrect", async () => {
			const oldPassword = "oldPassword123";
			const hash = await authService.hashPassword(oldPassword);

			csvService.findRecord.mockImplementationOnce(async () => ({
				user_id: "u_123",
				username: "john_doe",
				password_hash: hash,
			}));

			try {
				await authService.changePassword("u_123", "wrongPassword", "newPassword456");
				throw new Error("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("Current password is incorrect");
			}
		});

		it("should reject if user not found", async () => {
			csvService.findRecord.mockImplementationOnce(async () => null);

			try {
				await authService.changePassword(
					"u_nonexistent",
					"oldPassword123",
					"newPassword456"
				);
				throw new Error("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("User not found");
			}
		});
	});
});
