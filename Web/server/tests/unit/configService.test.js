/**
 * Configuration Service Tests
 */

const fs = require("fs");
const path = require("path");
const configService = require("../../src/services/configService");

// Mock config for testing - should match the actual defaults.json structure
const mockConfig = {
	server: {
		port: 3000,
		env: "development",
		cors: {
			origin: ["http://localhost:8080", "http://localhost:3001"],
			credentials: true,
		},
	},
	database: {
		path: "./db",
		users_file: "./db/users.csv",
		blacklist_file: "./db/token-blacklist.csv",
		sessions_file: "./db/sessions.csv",
		shopping_lists_dir: "./db/shopping-lists",
	},
	auth: {
		bcrypt_rounds: 10,
		password_min_length: 10,
		session_expiry_days: 30,
		session_rotation_days: 7,
		jwt_secret: "your-secret-key-change-in-production",
	},
	limits: {
		max_items_per_list: 2000,
		max_sections_per_list: 50,
		max_lists_per_user: 100,
		max_username_length: 32,
		max_list_name_length: 100,
		max_item_name_length: 200,
		max_section_name_length: 50,
	},
	rateLimit: {
		enabled: true,
		windowMs: 60000,
		max: 100,
		skipSuccessfulRequests: false,
	},
	logging: {
		level: "info",
		format: "json",
	},
};

describe("ConfigService", () => {
	// Mock the file write operations to prevent actual file modifications
	beforeAll(() => {
		jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
			// Don't actually write to file during tests
		});
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe("get()", () => {
		it("should return entire config when no key provided", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			const config = configService.get();
			expect(config).toEqual(mockConfig);
		});

		it("should return config value for valid key", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			const port = configService.get("server.port");
			expect(port).toBe(3000);
		});

		it("should return nested config value", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			const rounds = configService.get("auth.bcrypt_rounds");
			expect(rounds).toBe(10);
		});

		it("should return undefined for invalid key", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			const value = configService.get("nonexistent.key");
			expect(value).toBeUndefined();
		});

		it("should handle partial path traversal", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			const server = configService.get("server");
			expect(server).toEqual(mockConfig.server);
		});
	});

	describe("set()", () => {
		beforeEach(() => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
		});

		it("should set a configuration value", () => {
			configService.set("server.port", 4000);
			expect(configService.get("server.port")).toBe(4000);
		});

		it("should set nested configuration value", () => {
			configService.set("auth.password_min_length", 12);
			expect(configService.get("auth.password_min_length")).toBe(12);
		});

		it("should create nested path if it doesn't exist", () => {
			configService.set("newkey.nested", "value");
			expect(configService.get("newkey.nested")).toBe("value");
		});
	});

	describe("update()", () => {
		beforeEach(() => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
		});

		it("should update multiple configuration values", () => {
			const updates = {
				server: { port: 4000 },
				auth: { password_min_length: 12 },
			};
			configService.update(updates);

			expect(configService.get("server.port")).toBe(4000);
			expect(configService.get("auth.password_min_length")).toBe(12);
		});

		it("should preserve existing values when updating", () => {
			const originalEnv = configService.get("server.env");
			configService.update({
				server: { port: 5000 },
			});

			expect(configService.get("server.env")).toBe(originalEnv);
			expect(configService.get("server.port")).toBe(5000);
		});

		it("should return updated configuration", () => {
			const result = configService.update({
				auth: { password_min_length: 16 },
			});

			expect(result.auth.password_min_length).toBe(16);
		});
	});

	describe("reload()", () => {
		beforeEach(() => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
		});

		it("should reload configuration from internal state", () => {
			const reloadedConfig = configService.reload();

			expect(reloadedConfig).toEqual(mockConfig);
		});

		it("should reset to original config after changes", () => {
			configService.set("server.port", 9999);

			expect(configService.get("server.port")).toBe(9999);

			// Reset and reload
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			configService.reload();

			expect(configService.get("server.port")).toBe(3000);
		});
	});

	describe("persistence", () => {
		it("should call writeFileSync when persisting", () => {
			configService._setConfig(JSON.parse(JSON.stringify(mockConfig)));
			configService.set("server.port", 5000);

			expect(fs.writeFileSync).toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty config", () => {
			configService._setConfig({});
			expect(configService.get()).toEqual({});
		});

		it("should handle null values gracefully", () => {
			const config = { key: { nested: null } };
			configService._setConfig(config);
			expect(configService.get("key.nested")).toBeNull();
		});

		it("should handle array values in config", () => {
			const config = {
				server: {
					port: 3000,
					origins: ["http://localhost:3000", "http://localhost:8000"],
				},
			};
			configService._setConfig(config);
			expect(configService.get("server.origins")).toEqual([
				"http://localhost:3000",
				"http://localhost:8000",
			]);
		});
	});
});
