const adminOrderService = require('../services/adminOrderService');
const refundService = require('../services/refundService');

const adminOrderController = {
  getOrders: async (req, res, next) => {
    try {
      const data = await adminOrderService.listOrders(req.query);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  getOrderById: async (req, res, next) => {
    try {
      const order = await adminOrderService.getOrderById(req.params.id);
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }

      const updatedOrder = await adminOrderService.updateOrderStatus(req.params.id, status, req.user);
      res.json({
        success: true,
        message: `Order status updated to '${status}'.`,
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  cancelOrder: async (req, res, next) => {
    try {
      const { reason } = req.body;
      const cancelledOrder = await adminOrderService.cancelOrderAdmin(req.params.id, reason, req.user);
      res.json({
        success: true,
        message: 'Order cancelled successfully and stock restored.',
        data: cancelledOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  refundOrder: async (req, res, next) => {
    try {
      const { reason } = req.body;
      const result = await refundService.refundOrder(req.params.id, req.user, reason);
      res.json({
        success: true,
        message: 'Payment refunded successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Customer order cancellation
  cancelCustomerOrder: async (req, res, next) => {
    try {
      const { reason } = req.body;
      const cancelledOrder = await adminOrderService.cancelOrderCustomer(req.params.id, req.user._id, reason);
      res.json({
        success: true,
        message: 'Your order has been cancelled.',
        data: cancelledOrder,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminOrderController;
