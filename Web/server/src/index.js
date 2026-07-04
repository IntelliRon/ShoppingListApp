/**
 * Shopping List App - Backend API Server
 * Entry point for the Express application
 */

require("dotenv").config();
const app = require("./app");
const config = require("./config/defaults.json");

const PORT = process.env.PORT || config.server.port;
const ENV = process.env.NODE_ENV || config.server.env;

// Start server
const server = app.listen(PORT, () => {
	console.log(
		`[${new Date().toISOString()}] Shopping List API started on port ${PORT} (${ENV} environment)`
	);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("[SIGTERM] Shutting down gracefully...");
	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	console.log("[SIGINT] Shutting down gracefully...");
	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

module.exports = server;
