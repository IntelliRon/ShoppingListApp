/**
 * Configuration Service
 * Manages application configuration loading, retrieval, and runtime updates
 * Persists configuration changes to defaults.json
 */

const fs = require("fs");
const path = require("path");

// Configuration state (loaded on startup)
let config = null;

/**
 * Load configuration from defaults.json or defaults.example.json
 * Supports environment-specific overrides (defaults.{NODE_ENV}.json)
 *
 * Priority:
 * 1. defaults.json (local server override, not tracked in git)
 * 2. defaults.example.json (tracked template as fallback)
 * 3. Environment-specific overrides (defaults.{NODE_ENV}.json)
 */
function loadConfig() {
	try {
		const configDir = path.join(__dirname, "..", "config");
		const env = process.env.NODE_ENV || "development";
		const defaultsPath = path.join(configDir, "defaults.json");
		const defaultsExamplePath = path.join(configDir, "defaults.example.json");

		// Load base configuration: try defaults.json, fall back to defaults.example.json
		let baseConfigPath;
		if (fs.existsSync(defaultsPath)) {
			baseConfigPath = defaultsPath;
		} else if (fs.existsSync(defaultsExamplePath)) {
			baseConfigPath = defaultsExamplePath;
		} else {
			throw new Error(
				"Neither defaults.json nor defaults.example.json found in config directory"
			);
		}

		config = JSON.parse(fs.readFileSync(baseConfigPath, "utf8"));

		// Try environment-specific overrides
		const envConfigPath = path.join(configDir, `defaults.${env}.json`);
		if (fs.existsSync(envConfigPath)) {
			const envConfig = JSON.parse(fs.readFileSync(envConfigPath, "utf8"));
			config = deepMerge(config, envConfig);
			// eslint-disable-next-line no-console
			console.log(`[ConfigService] Loaded configuration with ${env} overrides`);
		} else {
			// eslint-disable-next-line no-console
			console.log(
				`[ConfigService] Loaded configuration from ${path.basename(baseConfigPath)}`
			);
		}

		return config;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[ConfigService] Failed to load configuration:", error.message);
		throw new Error(`Configuration load failed: ${error.message}`);
	}
}

/**
 * Deep merge objects (for environment overrides)
 */
function deepMerge(target, source) {
	const result = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			if (
				typeof source[key] === "object" &&
				source[key] !== null &&
				!Array.isArray(source[key])
			) {
				result[key] = deepMerge(result[key] || {}, source[key]);
			} else {
				result[key] = source[key];
			}
		}
	}

	return result;
}

/**
 * Get configuration value
 * Supports nested keys using dot notation (e.g., "limits.max_items_per_list")
 */
function get(key) {
	if (!config) {
		loadConfig();
	}

	if (!key) {
		return config;
	}

	const keys = key.split(".");
	let value = config;

	for (const k of keys) {
		if (value && typeof value === "object" && k in value) {
			value = value[k];
		} else {
			return undefined;
		}
	}

	return value;
}

/**
 * Update configuration value
 * Supports nested keys using dot notation
 * Persists changes to defaults.json
 */
function set(key, value) {
	if (!config) {
		loadConfig();
	}

	const keys = key.split(".");
	let obj = config;

	// Navigate to parent object
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (!(k in obj)) {
			obj[k] = {};
		}
		obj = obj[k];
	}

	// Set the value
	obj[keys[keys.length - 1]] = value;

	// Persist to file
	_persistConfig();
}

/**
 * Update multiple configuration values
 * Accepts both nested objects and flat dot-notation keys
 * Examples:
 *   - { server: { port: 5000 } } (nested objects)
 *   - { "server.port": 5000 } (flat keys with dots)
 * Persists changes to defaults.json
 */
function update(updates) {
	if (!config) {
		loadConfig();
	}

	// Apply updates
	for (const [key, value] of Object.entries(updates)) {
		// Check if value is a nested object (not array, not null)
		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			// Nested object: { server: { port: 5000 } }
			if (key in config && typeof config[key] === "object") {
				// Merge with existing nested values
				config[key] = { ...config[key], ...value };
			} else {
				// Create new nested object
				config[key] = value;
			}
		} else {
			// Primitive value: could be flat key like "server.port" or top-level key
			if (key.includes(".")) {
				// Flat key with dot notation: "server.port": 5000
				const keys = key.split(".");
				let obj = config;

				// Navigate to parent object, creating nested objects as needed
				for (let i = 0; i < keys.length - 1; i++) {
					const k = keys[i];
					if (!(k in obj) || typeof obj[k] !== "object") {
						obj[k] = {};
					}
					obj = obj[k];
				}

				// Set the value at the final key
				obj[keys[keys.length - 1]] = value;
			} else {
				// Top-level key (no dots)
				config[key] = value;
			}
		}
	}

	// Persist to file
	_persistConfig();

	return config;
}

/**
 * Reload configuration from disk
 * Useful for refreshing config after external changes
 */
function reload() {
	config = null;
	loadConfig();
	// eslint-disable-next-line no-console
	console.log("[ConfigService] Configuration reloaded from disk");
	return config;
}

/**
 * Persist configuration to defaults.json
 * Uses synchronous write to ensure changes are durable before returning
 * Note: For production use, consider atomic writes (temp file + rename)
 * to prevent corruption if process crashes mid-write
 * Private function used internally
 */
function _persistConfig() {
	try {
		const configPath = path.join(__dirname, "..", "config", "defaults.json");
		fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"), "utf8");
		// eslint-disable-next-line no-console
		console.log("[ConfigService] Configuration persisted to defaults.json");
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[ConfigService] Failed to persist configuration:", error.message);
		throw new Error(`Configuration persist failed: ${error.message}`);
	}
}

// Initialize config on module load
loadConfig();

module.exports = {
	get,
	set,
	update,
	reload,
	// For testing purposes
	_loadConfig: loadConfig,
	_setConfig: (newConfig) => {
		config = newConfig;
	},
};
