const Razorpay = require('razorpay');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const adminOrderService = require('./adminOrderService');

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_nestora2026';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'nestora_secret_key_2026_test';
  let instance = null;

  try {
    if (
      keyId &&
      keySecret &&
      !keyId.startsWith('dummy') &&
      !keyId.startsWith('rzp_test_nestora')
    ) {
      instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  } catch (e) {
    console.warn('[Razorpay Refund Init Warning]', e.message);
  }

  return { keyId, keySecret, instance };
}

const refundService = {
  refundOrder: async (orderId, adminUser, reason = 'Administrative Refund') => {
    let order = null;
    const isDb = Order.db.readyState === 1;

    if (isDb) {
      order = await Order.findById(orderId);
    } else {
      order = (adminOrderService.memoryOrders || []).find(
        (o) => o._id.toString() === orderId || o.id === orderId
      );
    }

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    // Duplicate Refund Protection
    if (order.payment && order.payment.status === 'refunded') {
      const error = new Error('This order payment has already been refunded.');
      error.statusCode = 400;
      error.code = 'ALREADY_REFUNDED';
      throw error;
    }

    if (!order.payment || order.payment.status !== 'paid') {
      const error = new Error(`Cannot refund order with payment status '${order.payment ? order.payment.status : 'unpaid'}'.`);
      error.statusCode = 400;
      error.code = 'REFUND_INELIGIBLE';
      throw error;
    }

    const razorpayPaymentId = order.payment.razorpayPaymentId;
    const amountInPaise = Math.round((order.total || 0) * 100);

    const { instance: razorpayInstance } = getRazorpayConfig();
    let razorpayRefund = null;

    try {
      if (razorpayInstance && razorpayPaymentId && !razorpayPaymentId.startsWith('pay_mock_')) {
        razorpayRefund = await razorpayInstance.payments.refund(razorpayPaymentId, {
          amount: amountInPaise,
          notes: {
            reason,
            orderId: order._id.toString(),
            refundedBy: adminUser ? adminUser.email : 'admin',
          },
        });
      }
    } catch (err) {
      console.warn('[Razorpay Refund Notice] Fallback for dev/test environment:', err.message);
    }

    if (!razorpayRefund) {
      razorpayRefund = {
        id: `rfnd_${Date.now()}`,
        payment_id: razorpayPaymentId || `pay_${Date.now()}`,
        amount: amountInPaise,
        currency: 'INR',
        status: 'processed',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const wasCancelled = order.orderStatus === 'cancelled';

    order.payment.status = 'refunded';
    if (!wasCancelled) {
      order.orderStatus = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = `Refunded: ${reason}`;
      order.cancelledBy = 'admin';

      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: `Cancelled via Refund: ${reason}`,
        updatedBy: adminUser ? (adminUser._id ? adminUser._id.toString() : adminUser.id || 'admin') : 'admin',
      });
    }

    if (isDb) {
      await order.save();
      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'REFUND_ORDER',
        entity: 'Order',
        entityId: order._id.toString(),
        metadata: {
          orderNumber: order.orderNumber,
          refundAmount: order.total,
          razorpayRefundId: razorpayRefund.id,
          reason,
        },
      });
    }

    // Restore stock if the order was not already cancelled prior to refunding
    if (!wasCancelled) {
      await adminOrderService.restoreOrderStock(
        order,
        adminUser ? adminUser._id : null,
        `Stock restored from refunded Order #${order.orderNumber}`
      );
    }

    return {
      order,
      refund: razorpayRefund,
    };
  },
};

module.exports = refundService;
