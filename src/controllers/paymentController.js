const paymentService = require('../services/paymentService');

const paymentController = {
  // POST /api/payments/create-order
  createOrder: async (req, res, next) => {
    try {
      const { cartItems, deliveryMethod, promoCode } = req.body;

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Your cart is empty. Add items to cart before proceeding to checkout.',
          code: 'CART_EMPTY',
        });
      }

      const result = await paymentService.createRazorpayOrder({
        user: req.user,
        cartItems,
        deliveryMethod: deliveryMethod || 'standard',
        promoCode: promoCode || null,
      });

      res.status(200).json({
        success: true,
        message: 'Payment order created successfully',
        data: {
          razorpayOrderId: result.razorpayOrder.id,
          amount: result.razorpayOrder.amount,
          currency: result.razorpayOrder.currency,
          keyId: result.keyId,
          isRealRazorpayOrder: result.isRealRazorpayOrder,
          calculation: result.calculation,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/payments/verify
  verifyPayment: async (req, res, next) => {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        cartItems,
        shippingAddress,
        deliveryMethod,
        promoCode,
      } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Missing required payment verification parameters',
          code: 'PAYMENT_VERIFICATION_FAILED',
        });
      }

      const order = await paymentService.verifyAndCreateOrder({
        userId: req.user._id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        cartItems,
        shippingAddress,
        deliveryMethod,
        promoCode,
      });

      res.status(201).json({
        success: true,
        message: 'Payment verified and order created successfully',
        data: { order },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/payments/sign-test-payment
  signTestPayment: async (req, res, next) => {
    try {
      const { razorpayOrderId, razorpayPaymentId } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing razorpayOrderId or razorpayPaymentId for test signing.',
          code: 'INVALID_SIGNATURE_REQUEST',
        });
      }

      const signature = paymentService.generateTestSignature(razorpayOrderId, razorpayPaymentId);

      res.status(200).json({
        success: true,
        message: 'Test payment signed successfully',
        data: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signature,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = paymentController;

