const orderService = require('../services/orderService');

const orderController = {
  // GET /api/orders
  getUserOrders: async (req, res, next) => {
    try {
      const orders = await orderService.getUserOrders(req.user._id);
      res.status(200).json({
        success: true,
        data: { orders },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/orders/:id
  getOrderById: async (req, res, next) => {
    try {
      const order = await orderService.getOrderById(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = orderController;
