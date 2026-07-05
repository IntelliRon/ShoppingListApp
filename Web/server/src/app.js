/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config/defaults.json");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors(config.server.cors));

// Rate Limiting
if (config.rateLimit.enabled) {
	const limiter = rateLimit({
		windowMs: config.rateLimit.windowMs,
		max: config.rateLimit.max,
		skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
		message: "Too many requests, please try again later.",
	});
	app.use("/api/", limiter);
}

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
		const dbPath = path.join(__dirname, "..", config.database.path);
		fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);

		res.status(200).json({
			success: true,
			data: {
				status: "healthy",
				timestamp: new Date().toISOString(),
				uptime: Math.floor(process.uptime()),
				environment: process.env.NODE_ENV || "development",
				checks: {
					database: "ok",
					csvAccess: "ok",
				},
			},
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
// TODO: Add remaining routes as implemented in Phase 2+
// app.use('/api/v1/lists', require('./routes/lists'));
// app.use('/api/v1/sync', require('./routes/sync'));

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
