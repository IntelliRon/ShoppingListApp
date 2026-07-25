/**
 * Developer Routes
 * Configuration management endpoints (requires developer role)
 */

const express = require("express");
const { requireAuth, requireDeveloper } = require("../middleware/authMiddleware");
const developerController = require("../controllers/developerController");

const router = express.Router();

/**
 * GET /developer/config
 * Get current configuration
 * Requires: Developer role
 */
router.get("/config", requireAuth, requireDeveloper, developerController.getConfig);

/**
 * POST /developer/config
 * Update configuration values
 * Requires: Developer role
 * Body: { updates: { "key": value, ... } }
 */
router.post("/config", requireAuth, requireDeveloper, developerController.updateConfig);

/**
 * POST /developer/config/reload
 * Reload configuration from disk
 * Requires: Developer role
 */
router.post("/config/reload", requireAuth, requireDeveloper, developerController.reloadConfig);

module.exports = router;
