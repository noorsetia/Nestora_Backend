const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', collectionController.getCollections);
router.get('/:slug', collectionController.getCollectionBySlug);

router.post('/', protect, authorize('admin', 'superadmin'), collectionController.createCollection);
router.put('/:id', protect, authorize('admin', 'superadmin'), collectionController.updateCollection);
router.delete('/:id', protect, authorize('admin', 'superadmin'), collectionController.deleteCollection);

module.exports = router;
