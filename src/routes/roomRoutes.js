const express = require('express');
const router = express.Router();
const roomSetController = require('../controllers/roomSetController');

router.get('/', roomSetController.getRoomSets);
router.get('/:slug', roomSetController.getRoomSetBySlug);

module.exports = router;
