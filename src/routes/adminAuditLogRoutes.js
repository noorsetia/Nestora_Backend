const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(protect, requireRole('admin', 'superadmin'));

router.get('/', auditLogController.getLogs);
router.get('/:id', auditLogController.getLogById);

// Immutability enforcement: reject any mutation attempt
router.post('*', auditLogController.disallowMutation);
router.put('*', auditLogController.disallowMutation);
router.patch('*', auditLogController.disallowMutation);
router.delete('*', auditLogController.disallowMutation);

module.exports = router;
