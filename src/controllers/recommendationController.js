const recommendationService = require('../services/recommendationService');

class RecommendationController {
  async getSpaceRecommendations(req, res, next) {
    try {
      const { room, style, budget, requirements } = req.query;
      const reqList = requirements ? requirements.split(',') : [];
      const result = await recommendationService.getSpaceRecommendations({
        room,
        style,
        budget,
        requirements: reqList,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getCompleteLook(req, res, next) {
    try {
      const result = await recommendationService.getCompleteLookRecommendations(req.params.productId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getSimilarProducts(req, res, next) {
    try {
      const limit = req.query.limit || 4;
      const products = await recommendationService.getSimilarProducts(req.params.productId, limit);
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  async getPersonalized(req, res, next) {
    try {
      const userId = req.user ? req.user._id : null;
      const limit = req.query.limit || 8;
      const products = await recommendationService.getPersonalizedRecommendations(userId, limit);
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecommendationController();
