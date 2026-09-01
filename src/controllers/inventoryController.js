const inventoryService = require('../services/inventoryService');

const inventoryController = {
  // GET /api/inventory (Admin)
  getInventory: async (req, res, next) => {
    try {
      const data = await inventoryService.getInventory(req.query);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/inventory/low-stock (Admin)
  getLowStock: async (req, res, next) => {
    try {
      const items = await inventoryService.getLowStockItems();
      res.status(200).json({
        success: true,
        data: { items, count: items.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/inventory/logs (Admin)
  getLogs: async (req, res, next) => {
    try {
      const logs = await inventoryService.getInventoryLogs(req.query);
      res.status(200).json({
        success: true,
        data: { logs, count: logs.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/inventory/:productId (Admin)
  updateStock: async (req, res, next) => {
    try {
      const { operation, quantity, reason } = req.body;
      if (!operation || quantity === undefined || quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'Operation and quantity are required',
        });
      }

      const result = await inventoryService.updateStock(
        req.params.productId,
        { operation, quantity, reason },
        req.user ? req.user._id : null
      );

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = inventoryController;
