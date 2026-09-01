const Product = require('../models/Product');
const couponService = require('./couponService');

const FALLBACK_PROMO_CODES = {
  NESTORA10: { type: 'percentage', value: 10, minSubtotal: 0 },
  WELCOME500: { type: 'fixed', value: 500, minSubtotal: 2000 },
};

const orderCalculationService = {
  validateAndCalculateCart: async (cartItems, deliveryMethod = 'standard', promoCodeStr = null, userId = null) => {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      const error = new Error('Your cart is empty');
      error.statusCode = 400;
      error.code = 'CART_EMPTY';
      throw error;
    }

    let subtotal = 0;
    let productSavings = 0;
    const validatedItems = [];

    for (const item of cartItems) {
      let dbProduct = null;
      if (item.id) {
        dbProduct = await Product.findOne({
          $or: [{ customId: item.id }, { slug: item.id }, { _id: item.id.match(/^[0-9a-fA-F]{24}$/) ? item.id : null }],
        });
      } else if (item.product) {
        dbProduct = await Product.findById(item.product);
      }

      if (!dbProduct || dbProduct.isActive === false || (dbProduct.status && dbProduct.status !== 'active')) {
        const error = new Error(`Product "${item.name || 'Selected item'}" is no longer available.`);
        error.statusCode = 400;
        error.code = 'PRODUCT_NOT_FOUND';
        throw error;
      }

      const requestedQty = parseInt(item.quantity, 10);
      if (isNaN(requestedQty) || requestedQty <= 0) {
        const error = new Error(`Invalid quantity requested for "${dbProduct.name}".`);
        error.statusCode = 400;
        error.code = 'INVALID_QUANTITY';
        throw error;
      }

      if (!dbProduct.inStock || dbProduct.stock <= 0) {
        const error = new Error(`"${dbProduct.name}" is currently out of stock.`);
        error.statusCode = 400;
        error.code = 'OUT_OF_STOCK';
        throw error;
      }

      if (requestedQty > dbProduct.stock) {
        const error = new Error(`Only ${dbProduct.stock} units of "${dbProduct.name}" are currently available.`);
        error.statusCode = 400;
        error.code = 'OUT_OF_STOCK';
        throw error;
      }

      if (item.price !== undefined && item.price !== null && Math.abs(Number(item.price) - dbProduct.price) > 0.01) {
        const error = new Error(`The price of "${dbProduct.name}" has changed. Please review your cart.`);
        error.statusCode = 400;
        error.code = 'PRICE_CHANGED';
        throw error;
      }

      const itemPrice = dbProduct.price;
      const itemSubtotal = itemPrice * requestedQty;
      subtotal += itemSubtotal;

      if (dbProduct.originalPrice && dbProduct.originalPrice > dbProduct.price) {
        productSavings += (dbProduct.originalPrice - dbProduct.price) * requestedQty;
      }

      validatedItems.push({
        product: dbProduct._id,
        customId: dbProduct.customId || dbProduct._id.toString(),
        name: dbProduct.name,
        slug: dbProduct.slug,
        category: dbProduct.category,
        price: dbProduct.price,
        originalPrice: dbProduct.originalPrice,
        quantity: requestedQty,
        image: dbProduct.image,
        variant: item.selectedVariant || item.variant || null,
      });
    }

    // Calculate Promo / Coupon Discount via couponService
    let discount = 0;
    let appliedPromo = null;
    if (promoCodeStr && promoCodeStr.trim()) {
      try {
        const validation = await couponService.validateCoupon({
          code: promoCodeStr,
          userId,
          cartItems: validatedItems,
          subtotal,
        });
        discount = validation.discountAmount;
        appliedPromo = validation.code;
      } catch (couponErr) {
        // Fallback to static promo rules if not found in MongoDB
        const codeClean = promoCodeStr.trim().toUpperCase();
        const promo = FALLBACK_PROMO_CODES[codeClean];
        if (promo && subtotal >= promo.minSubtotal) {
          if (promo.type === 'percentage') {
            discount = Math.round((subtotal * promo.value) / 100);
          } else if (promo.type === 'fixed') {
            discount = promo.value;
          }
          appliedPromo = codeClean;
        } else {
          throw couponErr;
        }
      }
    }

    // Calculate Shipping
    let shippingFee = 0;
    if (deliveryMethod === 'express') {
      shippingFee = 499;
    } else {
      shippingFee = subtotal >= 5000 ? 0 : 199;
    }

    const total = Math.max(0, subtotal - discount + shippingFee);

    return {
      items: validatedItems,
      subtotal,
      discount,
      productSavings,
      shippingFee,
      total,
      promoCode: appliedPromo,
      deliveryMethod,
    };
  },
};

module.exports = orderCalculationService;
