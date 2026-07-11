/**
 * Sync Routes
 * POST /sync/items - Sync items with conflict resolution
 */

const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const syncController = require("../controllers/syncController");

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Sync endpoints
router.post("/items", syncController.syncItems);

module.exports = router;
