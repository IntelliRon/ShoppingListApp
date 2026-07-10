/**
 * Authentication Middleware
 * Verifies JWT tokens and adds user context to requests
 */

const authService = require("../services/authService");

/**
 * Require authentication middleware
 * Verifies JWT token, checks blacklist, and adds userId to request
 */
async function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({
			success: false,
			data: null,
			error: {
				code: "UNAUTHORIZED",
				message: "Missing or invalid authorization header",
			},
			timestamp: new Date().toISOString(),
		});
	}

	const token = authHeader.substring(7); // Remove 'Bearer ' prefix

	const decoded = authService.verifyToken(token);
	if (!decoded) {
		return res.status(401).json({
			success: false,
			data: null,
			error: {
				code: "UNAUTHORIZED",
				message: "Invalid or expired token",
			},
			timestamp: new Date().toISOString(),
		});
	}

	// Check if token has been blacklisted (logged out)
	try {
		const isBlacklisted = await authService.isTokenBlacklisted(token);
		if (isBlacklisted) {
			return res.status(401).json({
				success: false,
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "Token has been revoked",
				},
				timestamp: new Date().toISOString(),
			});
		}
	} catch (error) {
		// If blacklist check fails, log error but allow request to proceed
		// (blacklist file might not exist yet)
		// eslint-disable-next-line no-console
		console.error("[Blacklist Check Error]", error.message);
	}

	req.userId = decoded.userId;
	req.token = token;
	return next();
}

/**
 * Require developer role middleware
 * Must be used after requireAuth
 */
async function requireDeveloper(req, res, next) {
	if (!req.userId) {
		return res.status(401).json({
			success: false,
			data: null,
			error: {
				code: "UNAUTHORIZED",
				message: "Authentication required",
			},
			timestamp: new Date().toISOString(),
		});
	}

	try {
		const user = await authService.getUserById(req.userId);
		if (!user || !user.is_developer) {
			return res.status(403).json({
				success: false,
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Developer role required",
				},
				timestamp: new Date().toISOString(),
			});
		}
		next();
	} catch (error) {
		res.status(500).json({
			success: false,
			data: null,
			error: {
				code: "INTERNAL_ERROR",
				message: "Error checking developer role",
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but doesn't require it
 */
function optionalAuth(req, res, next) {
	const authHeader = req.headers.authorization;

	if (authHeader && authHeader.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		const decoded = authService.verifyToken(token);
		if (decoded) {
			req.userId = decoded.userId;
			req.token = token;
		}
	}

	next();
}

module.exports = {
	requireAuth,
	requireDeveloper,
	optionalAuth,
};
