/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 *
 * NOTE: Configuration is loaded at startup from defaults.json via configService.
 * IMPORTANT: Middleware like CORS and rate limiting are configured once at startup.
 * Config changes via the developer API are persisted to disk but won't take effect until server restart.
 * Per-request checks (auth, item limits, etc.) that call configService.get() on each request
 * can reflect config changes without restart, but infrastructure settings require a restart to apply.
 *
 * Automated deployment pipeline is operational and ready for production use
 */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const configService = require("./services/configService");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors(configService.get("server.cors")));

// Rate Limiting (per-IP; disabled in test environment)
if (configService.get("rateLimit.enabled") && process.env.NODE_ENV !== "test") {
	const limiter = rateLimit({
		windowMs: configService.get("rateLimit.windowMs"),
		max: configService.get("rateLimit.max"),
		skipSuccessfulRequests: configService.get("rateLimit.skipSuccessfulRequests"),
		message: "Too many requests, please try again later.",
	});
	app.use("/api/", limiter);
}

// Brute-force protection for login endpoint
// More restrictive: 5 requests per 15 minutes (per IP/user)
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 attempts per window
	skipSuccessfulRequests: true, // Only count failed requests
	message: "Too many login attempts, please try again later.",
});
app.use("/api/v1/auth/login", loginLimiter);

// Request logging middleware (development)
if (process.env.NODE_ENV === "development") {
	app.use((req, res, next) => {
		// eslint-disable-next-line no-console
		console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
		next();
	});
}

// Health Check Endpoint (no auth required)
app.get("/api/v1/health", (req, res) => {
	try {
		const fs = require("fs");
		const path = require("path");

		// Verify CSV database directory is accessible
		// app.js is in src/, so use ".." to reach server/ directory
		// (itemService/listService are in src/services/, so they use "../.." to reach server/)
		const dbPath =
			process.env.TEST_DB_PATH ||
			path.join(__dirname, "..", configService.get("database.path"));
		fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);

		res.status(200).json({
			success: true,
			data: {
				status: "healthy",
				uptime: Math.floor(process.uptime()),
				environment: process.env.NODE_ENV || "development",
				checks: {
					database: "ok",
					csvAccess: "ok",
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("[Health Check Error]", error.message);
		res.status(503).json({
			success: false,
			data: null,
			error: {
				code: "HEALTH_CHECK_FAILED",
				message: "Database or file system check failed",
			},
			timestamp: new Date().toISOString(),
		});
	}
});

// Routes
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/lists", require("./routes/lists"));
app.use("/api/v1/sync", require("./routes/sync"));
app.use("/api/v1/developer", require("./routes/developer"));

// 404 Handler
app.use((req, res) => {
	res.status(404).json({
		success: false,
		data: null,
		error: {
			code: "NOT_FOUND",
			message: "Endpoint not found",
		},
		timestamp: new Date().toISOString(),
	});
});

// Error Handler
app.use((err, req, res, _next) => {
	// eslint-disable-next-line no-console
	console.error("[Error]", err.message);

	const statusCode = err.statusCode || 500;
	const message = err.message || "Internal server error";

	res.status(statusCode).json({
		success: false,
		data: null,
		error: {
			code: err.code || "INTERNAL_ERROR",
			message: process.env.NODE_ENV === "production" ? "Internal server error" : message,
		},
		timestamp: new Date().toISOString(),
	});
});

module.exports = app;
