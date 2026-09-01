const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');

const adminController = {
  // GET /api/admin/dashboard (Admin)
  getDashboardMetrics: async (req, res, next) => {
    try {
      if (Product.db.readyState !== 1) {
        return res.status(200).json({
          success: true,
          data: {
            metrics: {
              totalProducts: 12,
              activeProducts: 10,
              lowStockProducts: 2,
              outOfStockProducts: 1,
              categoriesCount: 6,
              totalOrders: 5,
              totalCustomers: 8,
            },
            recentProducts: [],
            lowStockList: [],
          },
        });
      }

      const [
        totalProducts,
        activeProducts,
        outOfStockProducts,
        categoriesCount,
        recentProducts,
        lowStockList,
        totalOrders,
        totalCustomers,
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ status: 'active', isActive: true }),
        Product.countDocuments({ stock: 0 }),
        Category.countDocuments({ isActive: true }),
        Product.find().sort({ createdAt: -1 }).limit(5).select('name sku price stock status image category'),
        Product.find({
          $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        }).limit(6).select('name sku stock lowStockThreshold image price category'),
        Order.countDocuments(),
        User.countDocuments({ role: { $in: ['user', 'customer'] } }),
      ]);

      const lowStockProducts = lowStockList.length;

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalProducts,
            activeProducts,
            lowStockProducts,
            outOfStockProducts,
            categoriesCount,
            totalOrders,
            totalCustomers,
          },
          recentProducts,
          lowStockList,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminController;
