/**
 * Developer Portal Server
 * Serves the developer UI on a separate port (3001)
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.DEVELOPER_PORT || 3001;

// Middleware
app.use(express.json());

// CORS configuration - only allow localhost (local development)
const corsOptions = {
	origin: "http://localhost:3001",
	credentials: true,
};
app.use(cors(corsOptions));

// Serve developer UI static files
app.use(express.static(path.join(__dirname, "../../developer-ui")));

// Serve index.html for all routes (SPA fallback)
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "../../developer-ui/index.html"));
});

// Error handling
app.use((err, req, res, _next) => {
	// eslint-disable-next-line no-console
	console.error("[Developer Server Error]", err.message);
	res.status(500).json({
		success: false,
		error: {
			code: "SERVER_ERROR",
			message: "Internal server error",
		},
	});
});

// Start server - bind to localhost only for security
app.listen(PORT, "localhost", () => {
	// eslint-disable-next-line no-console
	console.log(`[Developer Portal] Running on http://localhost:${PORT}`);
});
