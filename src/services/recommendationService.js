const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

const findProductByIdOrSlug = async (productIdOrSlug) => {
  if (!productIdOrSlug) return null;
  const str = String(productIdOrSlug);
  let query = { slug: str.toLowerCase() };
  if (mongoose.Types.ObjectId.isValid(str)) {
    query = { $or: [{ _id: str }, { slug: str }] };
  } else if (str.startsWith('prod-')) {
    query = { $or: [{ customId: str }, { slug: str }] };
  }
  return await Product.findOne(query);
};

class RecommendationService {
  /**
   * Generates a curated space combination fitting the target room, style, and budget limit.
   */
  async getSpaceRecommendations({ room = 'Living Room', style = 'Modern', budget = 50000, requirements = [] }) {
    const targetBudget = Number(budget) || 50000;

    // Fetch active products matching room or style
    const products = await Product.find({
      isActive: true,
      $or: [
        { rooms: { $in: [room] } },
        { room: room },
        { styles: { $in: [style] } },
        { style: style },
      ],
    }).sort({ rating: -1, reviewCount: -1 });

    if (products.length === 0) {
      // Fallback: get top products regardless of room/style
      const fallbackProducts = await Product.find({ isActive: true }).limit(10);
      return {
        selectedProducts: fallbackProducts.slice(0, 4).map((p) => ({ product: p, quantity: 1 })),
        totalSpent: fallbackProducts.slice(0, 4).reduce((sum, p) => sum + p.price, 0),
        remainingBudget: Math.max(0, targetBudget - fallbackProducts.slice(0, 4).reduce((sum, p) => sum + p.price, 0)),
        additionalRecommendations: fallbackProducts.slice(4),
      };
    }

    // Categorize items
    const selectedMap = new Map();
    let currentTotal = 0;

    // Pick top items across distinct categories while budget permits
    for (const prod of products) {
      if (currentTotal + prod.price <= targetBudget && !selectedMap.has(prod.category)) {
        selectedMap.set(prod.category, prod);
        currentTotal += prod.price;
      }
    }

    const selectedProducts = Array.from(selectedMap.values()).map((p) => ({
      product: p,
      quantity: 1,
    }));

    const remainingBudget = Math.max(0, targetBudget - currentTotal);

    // Find affordable extras within remaining budget
    const additionalRecommendations = products.filter(
      (p) => !selectedMap.has(p.category) && p.price <= remainingBudget + 5000
    ).slice(0, 4);

    return {
      room,
      style,
      targetBudget,
      totalSpent: currentTotal,
      remainingBudget,
      selectedProducts,
      additionalRecommendations,
    };
  }

  /**
   * Get complementary products for "Complete the Look"
   */
  async getCompleteLookRecommendations(productId) {
    const primaryProduct = await findProductByIdOrSlug(productId);
    if (!primaryProduct) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const room = primaryProduct.rooms?.[0] || primaryProduct.room || 'Living Room';
    const style = primaryProduct.styles?.[0] || primaryProduct.style || 'Modern';

    // Find complementary products in same room/style but different category
    const complementaryProducts = await Product.find({
      _id: { $ne: primaryProduct._id },
      category: { $ne: primaryProduct.category },
      isActive: true,
      $or: [
        { rooms: { $in: [room] } },
        { room: room },
        { styles: { $in: [style] } },
      ],
    })
      .sort({ rating: -1 })
      .limit(3);

    const allItems = [primaryProduct, ...complementaryProducts];
    const rawTotal = allItems.reduce((sum, p) => sum + p.price, 0);
    const bundleDiscount = Math.round(rawTotal * 0.1); // 10% bundle savings
    const bundleTotal = rawTotal - bundleDiscount;

    return {
      primaryProduct,
      recommendedProducts: complementaryProducts,
      rawTotal,
      bundleDiscount,
      bundleTotal,
    };
  }

  /**
   * Get similar products for single product page
   */
  async getSimilarProducts(productId, limit = 4) {
    const mainProduct = await findProductByIdOrSlug(productId);
    if (!mainProduct) return [];

    return await Product.find({
      _id: { $ne: mainProduct._id },
      category: mainProduct.category,
      isActive: true,
    })
      .limit(Number(limit))
      .sort({ rating: -1 });
  }

  /**
   * Personalized recommendations for user ("Picked for You")
   */
  async getPersonalizedRecommendations(userId = null, limit = 8) {
    if (userId) {
      try {
        const user = await User.findById(userId).populate('wishlist');
        if (user) {
          let preferredStyles = [];
          let preferredRooms = [];

          if (user.preferences?.favoriteStyles?.length > 0) {
            preferredStyles.push(...user.preferences.favoriteStyles);
          }
          if (user.preferences?.quizStyle) {
            preferredStyles.push(user.preferences.quizStyle);
          }
          if (user.preferences?.favoriteRooms?.length > 0) {
            preferredRooms.push(...user.preferences.favoriteRooms);
          }

          if (user.wishlist && Array.isArray(user.wishlist) && user.wishlist.length > 0) {
            user.wishlist.forEach((item) => {
              if (item && typeof item === 'object') {
                if (item.style) preferredStyles.push(item.style);
                if (item.styles) preferredStyles.push(...item.styles);
                if (item.room) preferredRooms.push(item.room);
                if (item.rooms) preferredRooms.push(...item.rooms);
              }
            });
          }

          try {
            const Order = require('../models/Order');
            const userOrders = await Order.find({ user: userId }).populate('items.product').limit(5);
            userOrders.forEach((order) => {
              order.items?.forEach((it) => {
                if (it.product) {
                  if (it.product.style) preferredStyles.push(it.product.style);
                  if (it.product.styles) preferredStyles.push(...it.product.styles);
                  if (it.product.room) preferredRooms.push(it.product.room);
                  if (it.product.rooms) preferredRooms.push(...it.product.rooms);
                }
              });
            });
          } catch (e) {}

          preferredStyles = [...new Set(preferredStyles.filter(Boolean))];
          preferredRooms = [...new Set(preferredRooms.filter(Boolean))];

          const query = { isActive: true };
          if (preferredStyles.length > 0 || preferredRooms.length > 0) {
            query.$or = [];
            if (preferredStyles.length > 0) {
              query.$or.push({ styles: { $in: preferredStyles } }, { style: { $in: preferredStyles } });
            }
            if (preferredRooms.length > 0) {
              query.$or.push({ rooms: { $in: preferredRooms } }, { room: { $in: preferredRooms } });
            }
          }

          const products = await Product.find(query)
            .limit(Number(limit))
            .sort({ rating: -1, reviewCount: -1 });

          if (products && products.length > 0) return products;
        }
      } catch (e) {
        console.error('Error fetching personalized recommendations:', e);
      }
    }

    // Fallback: featured / popular products
    return await Product.find({ isActive: true, isFeatured: true })
      .limit(Number(limit))
      .sort({ rating: -1, reviewCount: -1 });
  }
}

module.exports = new RecommendationService();
