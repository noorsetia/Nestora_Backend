const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const { protect } = require('../middleware/authMiddleware');

// Public shared space link endpoint
router.get('/share/:token', spaceController.getSpaceByShareToken);

// Protected routes below
router.use(protect);

router.get('/', spaceController.getUserSpaces);
router.post('/', spaceController.createSpace);

router.get('/:id', spaceController.getSpaceById);
router.put('/:id', spaceController.updateSpace);
router.delete('/:id', spaceController.deleteSpace);

router.post('/:id/products', spaceController.addProductToSpace);
router.delete('/:id/products/:productId', spaceController.removeProductFromSpace);

router.post('/:id/favorite', spaceController.toggleFavorite);
router.post('/:id/duplicate', spaceController.duplicateSpace);

module.exports = router;
