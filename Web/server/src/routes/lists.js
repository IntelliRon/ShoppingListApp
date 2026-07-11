/**
 * Lists Routes
 * GET /lists - Get all lists
 * POST /lists - Create new list
 * PUT /lists/:list_id - Rename list
 * DELETE /lists/:list_id - Delete list
 * GET /lists/:list_id/sections - Get sections for list
 * POST /lists/:list_id/sections - Create section
 * PUT /lists/:list_id/sections/:section_id - Rename section
 * DELETE /lists/:list_id/sections/:section_id - Delete section
 */

const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const listsController = require("../controllers/listsController");

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// List endpoints
router.get("/", listsController.getAllLists);
router.post("/", listsController.createList);
router.put("/:list_id", listsController.updateList);
router.delete("/:list_id", listsController.deleteList);

// Section endpoints
router.get("/:list_id/sections", listsController.getListSections);
router.post("/:list_id/sections", listsController.createSection);
router.put("/:list_id/sections/:section_id", listsController.updateSection);
router.delete("/:list_id/sections/:section_id", listsController.deleteSection);

module.exports = router;
