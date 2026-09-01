const reviewService = require('../services/reviewService');

const reviewController = {
  // Public product reviews
  getProductReviews: async (req, res, next) => {
    try {
      const data = await reviewService.getProductReviews(req.params.productId, req.query);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // Check user review eligibility
  checkEligibility: async (req, res, next) => {
    try {
      const data = await reviewService.checkReviewEligibility(req.params.productId, req.user._id);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create review
  createReview: async (req, res, next) => {
    try {
      const { rating, title, comment, images } = req.body;
      const review = await reviewService.createReview({
        productId: req.params.productId,
        userId: req.user._id,
        rating,
        title,
        comment,
        images,
      });

      res.status(201).json({
        success: true,
        message: 'Your review has been submitted for moderation. Thank you!',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: List all reviews
  getAdminReviews: async (req, res, next) => {
    try {
      const data = await reviewService.listAllReviewsAdmin(req.query);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: Update status
  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const updated = await reviewService.updateReviewStatus(req.params.id, status, req.user);
      res.json({
        success: true,
        message: `Review status changed to ${status}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: Respond to review
  respondToReview: async (req, res, next) => {
    try {
      const { comment } = req.body;
      if (!comment || !comment.trim()) {
        return res.status(400).json({ success: false, message: 'Response comment is required.' });
      }

      const updated = await reviewService.respondToReview(req.params.id, comment.trim(), req.user);
      res.json({
        success: true,
        message: 'Admin response added to review.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reviewController;
