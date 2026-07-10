/**
 * Authentication Routes
 * POST /auth/register - Register new user
 * POST /auth/login - Login user
 * POST /auth/logout - Logout user
 * POST /auth/change-password - Change user password
 */

const express = require("express");
const authService = require("../services/authService");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
	try {
		const { username, password, email } = req.body || {};

		if (!username || !password || !email) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid request data",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const user = await authService.registerUser(username, password, email);

		res.status(201).json({
			success: true,
			data: user,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Auth Error]", error.message);

		// Return generic conflict message for both username and email conflicts
		// to prevent account enumeration attacks (PLAN.md:1036-1039)
		if (
			error.message.includes("Username already exists") ||
			error.message.includes("Email already registered")
		) {
			return res.status(409).json({
				success: false,
				data: null,
				error: {
					code: "CONFLICT",
					message: "Username or email already in use",
				},
				timestamp: new Date().toISOString(),
			});
		}

		if (
			error.message.includes("Username") ||
			error.message.includes("Password") ||
			error.message.includes("Email")
		) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid or missing field values",
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to register user",
			},
			timestamp: new Date().toISOString(),
		});
	}
});

/**
 * POST /auth/login
 * Login user and return JWT token
 */
router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body || {};

		if (!username || !password) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "Username and password are required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		const user = await authService.loginUser(username, password);

		res.status(200).json({
			success: true,
			data: user,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Auth Error]", error.message);

		if (error.message.includes("Invalid username or password")) {
			return res.status(401).json({
				success: false,
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "Invalid username or password",
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to login",
			},
			timestamp: new Date().toISOString(),
		});
	}
});

/**
 * POST /auth/logout
 * Logout user - invalidates the provided token by adding it to blacklist
 */
router.post("/logout", requireAuth, async (req, res) => {
	try {
		const token = req.token;
		if (token) {
			// Add token to blacklist to prevent reuse
			await authService.blacklistToken(token);
		}

		res.status(200).json({
			success: true,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Auth Error]", error.message);

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to logout",
			},
			timestamp: new Date().toISOString(),
		});
	}
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post("/change-password", requireAuth, async (req, res) => {
	try {
		const { old_password, new_password } = req.body || {};
		const userId = req.userId;

		if (!old_password || !new_password) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "Old password and new password are required",
				},
				timestamp: new Date().toISOString(),
			});
		}

		await authService.changePassword(userId, old_password, new_password);

		res.status(200).json({
			success: true,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Auth Error]", error.message);

		if (error.message.includes("Current password is incorrect")) {
			return res.status(401).json({
				success: false,
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "Current password is incorrect",
				},
				timestamp: new Date().toISOString(),
			});
		}

		// "User not found" means authenticated user no longer exists = auth failure, not validation
		if (error.message.includes("User not found")) {
			return res.status(401).json({
				success: false,
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "User account not found",
				},
				timestamp: new Date().toISOString(),
			});
		}

		if (error.message.includes("Password")) {
			return res.status(400).json({
				success: false,
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
				timestamp: new Date().toISOString(),
			});
		}

		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Failed to change password",
			},
			timestamp: new Date().toISOString(),
		});
	}
});

module.exports = router;
