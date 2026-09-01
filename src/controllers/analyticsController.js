const analyticsService = require('../services/analyticsService');

const analyticsController = {
  getOverview: async (req, res, next) => {
    try {
      const metrics = await analyticsService.getOverviewMetrics(req.query);
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  },

  getSales: async (req, res, next) => {
    try {
      const sales = await analyticsService.getSalesChart(req.query);
      const distribution = await analyticsService.getOrderStatusDistribution(req.query);

      res.json({
        success: true,
        data: {
          period: req.query.period || '30d',
          sales,
          distribution,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getTopProducts: async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 5;
      const topProducts = await analyticsService.getTopProducts(limit, req.query);

      res.json({
        success: true,
        data: topProducts,
      });
    } catch (error) {
      next(error);
    }
  },

  getCategories: async (req, res, next) => {
    try {
      const categories = await analyticsService.getCategoryRevenue(req.query);
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = analyticsController;
