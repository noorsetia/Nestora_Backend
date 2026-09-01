const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(protect, requireRole('admin', 'superadmin'));

router.get('/', adminUserController.getUsers);
router.get('/:id', adminUserController.getUserById);
router.patch('/:id/status', adminUserController.updateStatus);
router.patch('/:id/role', adminUserController.updateRole);

module.exports = router;
