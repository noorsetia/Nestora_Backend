const auditLogService = require('../services/auditLogService');

const auditLogController = {
  getLogs: async (req, res, next) => {
    try {
      const data = await auditLogService.getLogs(req.query);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  getLogById: async (req, res, next) => {
    try {
      const log = await auditLogService.getLogById(req.params.id);
      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  },

  disallowMutation: (req, res) => {
    res.status(405).json({
      success: false,
      message: 'Audit logs are immutable. Modification or deletion of audit logs is forbidden.',
      code: 'AUDIT_LOG_IMMUTABLE',
    });
  },
};

module.exports = auditLogController;
