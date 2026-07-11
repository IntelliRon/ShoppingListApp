/**
 * Developer Controller
 * Handles configuration management endpoints
 */

const configService = require("../services/configService");

/**
 * Get current configuration
 * Returns the current runtime configuration
 */
async function getConfig(req, res) {
	try {
		const config = configService.get();

		// Return selected config values (exclude sensitive data and paths)
		const safeConfig = {
			server: {
				port: config.server.port,
				env: config.server.env,
			},
			auth: {
				bcrypt_rounds: config.auth.bcrypt_rounds,
				password_min_length: config.auth.password_min_length,
				session_expiry_days: config.auth.session_expiry_days,
				session_rotation_days: config.auth.session_rotation_days,
			},
			limits: config.limits,
			rateLimit: {
				enabled: config.rateLimit.enabled,
				windowMs: config.rateLimit.windowMs,
				max: config.rateLimit.max,
			},
			logging: config.logging,
		};

		res.status(200).json({
			success: true,
			data: safeConfig,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Developer] Get config error:", error.message);
		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "CONFIG_READ_ERROR",
				message: "Failed to retrieve configuration",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Update configuration values
 * Only allows updates to safe configuration values
 * Does not allow updates to paths, secrets, or database settings
 */
async function updateConfig(req, res) {
	try {
		const { updates } = req.body;

		if (!updates || typeof updates !== "object") {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "INVALID_REQUEST",
					message: "Request body must contain 'updates' object",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Whitelist of updatable configuration keys (17 safe keys)
		const allowedKeys = [
			"server.port",
			"server.env",
			"auth.bcrypt_rounds",
			"auth.password_min_length",
			"auth.session_expiry_days",
			"auth.session_rotation_days",
			"limits.max_items_per_list",
			"limits.max_sections_per_list",
			"limits.max_lists_per_user",
			"limits.max_username_length",
			"limits.max_list_name_length",
			"limits.max_item_name_length",
			"limits.max_section_name_length",
			"rateLimit.enabled",
			"rateLimit.windowMs",
			"rateLimit.max",
			"logging.level",
		];

		// Validate all provided keys are in whitelist
		for (const key of Object.keys(updates)) {
			if (!allowedKeys.includes(key)) {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "INVALID_CONFIG_KEY",
						message: `Configuration key '${key}' cannot be updated`,
					},
					timestamp: new Date().toISOString(),
				});
			}
		}

		// Validate value types
		for (const [key, value] of Object.entries(updates)) {
			if (typeof value === "object" && value !== null && !Array.isArray(value)) {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "INVALID_VALUE_TYPE",
						message: `Configuration value for '${key}' must be a primitive type`,
					},
					timestamp: new Date().toISOString(),
				});
			}

			// Type-specific validation
			if (key.includes("port")) {
				if (!Number.isInteger(value)) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_TYPE",
							message: `Configuration value for '${key}' must be an integer`,
						},
						timestamp: new Date().toISOString(),
					});
				}
				// Validate port range
				if (value < 1 || value > 65535) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_RANGE",
							message: "Port must be between 1 and 65535",
						},
						timestamp: new Date().toISOString(),
					});
				}
			}

			if (key.includes("bcrypt_rounds")) {
				if (!Number.isInteger(value)) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_TYPE",
							message: `Configuration value for '${key}' must be an integer`,
						},
						timestamp: new Date().toISOString(),
					});
				}
				// Validate bcrypt rounds range
				if (value < 4 || value > 15) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_RANGE",
							message: "Bcrypt rounds must be between 4 and 15",
						},
						timestamp: new Date().toISOString(),
					});
				}
			}

			if (key.includes("password_min_length")) {
				if (!Number.isInteger(value)) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_TYPE",
							message: `Configuration value for '${key}' must be an integer`,
						},
						timestamp: new Date().toISOString(),
					});
				}
				if (value < 4 || value > 128) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_RANGE",
							message: "Password min length must be between 4 and 128",
						},
						timestamp: new Date().toISOString(),
					});
				}
			}

			if (key.includes("enabled") && typeof value !== "boolean") {
				return res.status(400).json({
					success: false,
					data: null,
					error: {
						code: "INVALID_VALUE_TYPE",
						message: `Configuration value for '${key}' must be a boolean`,
					},
					timestamp: new Date().toISOString(),
				});
			}

			// Validate numeric ranges for limits
			if (key.startsWith("limits.")) {
				if (!Number.isInteger(value)) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_TYPE",
							message: `Configuration value for '${key}' must be an integer`,
						},
						timestamp: new Date().toISOString(),
					});
				}
				if (value < 1 || value > 10000) {
					return res.status(400).json({
						success: false,
						data: null,
						error: {
							code: "INVALID_VALUE_RANGE",
							message: "Configuration limits must be between 1 and 10000",
						},
						timestamp: new Date().toISOString(),
					});
				}
			}

			if (key.startsWith("rateLimit.")) {
				if (key.includes("windowMs")) {
					if (!Number.isInteger(value)) {
						return res.status(400).json({
							success: false,
							data: null,
							error: {
								code: "INVALID_VALUE_TYPE",
								message: `Configuration value for '${key}' must be an integer`,
							},
							timestamp: new Date().toISOString(),
						});
					}
					if (value < 1000 || value > 3600000) {
						return res.status(400).json({
							success: false,
							data: null,
							error: {
								code: "INVALID_VALUE_RANGE",
								message: "Rate limit window must be between 1000ms and 3600000ms",
							},
							timestamp: new Date().toISOString(),
						});
					}
				}
				if (key.includes("max")) {
					if (!Number.isInteger(value)) {
						return res.status(400).json({
							success: false,
							data: null,
							error: {
								code: "INVALID_VALUE_TYPE",
								message: `Configuration value for '${key}' must be an integer`,
							},
							timestamp: new Date().toISOString(),
						});
					}
					if (value < 1 || value > 10000) {
						return res.status(400).json({
							success: false,
							data: null,
							error: {
								code: "INVALID_VALUE_RANGE",
								message: "Rate limit max requests must be between 1 and 10000",
							},
							timestamp: new Date().toISOString(),
						});
					}
				}
			}
		}

		// Apply updates
		const updatedConfig = configService.update(updates);

		// Return safe config subset
		const safeConfig = {
			server: {
				port: updatedConfig.server.port,
				env: updatedConfig.server.env,
			},
			auth: {
				bcrypt_rounds: updatedConfig.auth.bcrypt_rounds,
				password_min_length: updatedConfig.auth.password_min_length,
				session_expiry_days: updatedConfig.auth.session_expiry_days,
				session_rotation_days: updatedConfig.auth.session_rotation_days,
			},
			limits: updatedConfig.limits,
			rateLimit: {
				enabled: updatedConfig.rateLimit.enabled,
				windowMs: updatedConfig.rateLimit.windowMs,
				max: updatedConfig.rateLimit.max,
			},
			logging: updatedConfig.logging,
		};

		res.status(200).json({
			success: true,
			data: {
				updated: true,
				config: safeConfig,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Developer] Update config error:", error.message);
		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "CONFIG_UPDATE_ERROR",
				message: "Failed to update configuration",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Reload configuration from disk
 * Reads the latest defaults.json from filesystem
 */
async function reloadConfig(req, res) {
	try {
		const reloadedConfig = configService.reload();

		// Return safe config subset
		const safeConfig = {
			server: {
				port: reloadedConfig.server.port,
				env: reloadedConfig.server.env,
			},
			auth: {
				bcrypt_rounds: reloadedConfig.auth.bcrypt_rounds,
				password_min_length: reloadedConfig.auth.password_min_length,
				session_expiry_days: reloadedConfig.auth.session_expiry_days,
				session_rotation_days: reloadedConfig.auth.session_rotation_days,
			},
			limits: reloadedConfig.limits,
			rateLimit: {
				enabled: reloadedConfig.rateLimit.enabled,
				windowMs: reloadedConfig.rateLimit.windowMs,
				max: reloadedConfig.rateLimit.max,
			},
			logging: reloadedConfig.logging,
		};

		res.status(200).json({
			success: true,
			data: {
				reloaded: true,
				config: safeConfig,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Developer] Reload config error:", error.message);
		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "CONFIG_RELOAD_ERROR",
				message: "Failed to reload configuration",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

module.exports = {
	getConfig,
	updateConfig,
	reloadConfig,
};
