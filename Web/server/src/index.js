/**
 * Shopping List App - Backend API Server
 * Entry point for the Express application
 */

require("dotenv").config();
const app = require("./app");
const configService = require("./services/configService");
const csvService = require("./services/csvService");

const PORT = process.env.PORT || configService.get("server.port");
const ENV = process.env.NODE_ENV || configService.get("server.env");

// Initialize database before starting server
csvService.initializeDatabase();

// Start server
const server = app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(
		`[${new Date().toISOString()}] Shopping List API started on port ${PORT} (${ENV} environment)`
	);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	// eslint-disable-next-line no-console
	console.log("[SIGTERM] Shutting down gracefully...");
	server.close(() => {
		// eslint-disable-next-line no-console
		console.log("Server closed");
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	// eslint-disable-next-line no-console
	console.log("[SIGINT] Shutting down gracefully...");
	server.close(() => {
		// eslint-disable-next-line no-console
		console.log("Server closed");
		process.exit(0);
	});
});

module.exports = server;
