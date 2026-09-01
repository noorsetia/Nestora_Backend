const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const notificationService = require('./notificationService');
const emailService = require('./email/emailService');

const memoryReviews = [];

const recalculateProductRating = async (productId) => {
  if (Review.db.readyState === 1) {
    const stats = await Review.aggregate([
      { $match: { product: productId, status: 'approved' } },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$rating' },
          numReviews: { $sum: 1 },
        },
      },
    ]);

    const rating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    const reviewCount = stats.length > 0 ? stats[0].numReviews : 0;

    await Product.findByIdAndUpdate(productId, {
      rating,
      reviewCount,
      reviewsCount: reviewCount,
    });

    return { rating, reviewCount };
  } else {
    // Memory fallback
    const productService = require('./productService');
    const approvedReviews = memoryReviews.filter(
      (r) => (r.product?.toString() === productId.toString() || r.product === productId) && r.status === 'approved'
    );

    const total = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
    const rating = approvedReviews.length > 0 ? Math.round((total / approvedReviews.length) * 10) / 10 : 0;
    const reviewCount = approvedReviews.length;

    const prod = (productService.memoryProducts || []).find((p) => p._id?.toString() === productId.toString() || p.id === productId);
    if (prod) {
      prod.rating = rating;
      prod.reviewCount = reviewCount;
      prod.reviewsCount = reviewCount;
    }
    return { rating, reviewCount };
  }
};

const reviewService = {
  memoryReviews,
  recalculateProductRating,

  checkReviewEligibility: async (productId, userId) => {
    const isDb = Review.db.readyState === 1;

    if (isDb) {
      if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          canReview: false,
          hasDeliveredOrder: false,
          hasAlreadyReviewed: false,
          orderId: null,
          existingReview: null,
        };
      }
      const deliveredOrder = await Order.findOne({
        user: userId,
        orderStatus: 'delivered',
        'items.product': productId,
      });

      const existingReview = await Review.findOne({
        user: userId,
        product: productId,
      });

      return {
        canReview: Boolean(deliveredOrder) && !existingReview,
        hasDeliveredOrder: Boolean(deliveredOrder),
        hasAlreadyReviewed: Boolean(existingReview),
        orderId: deliveredOrder ? deliveredOrder._id : null,
        existingReview,
      };
    }

    // Memory Fallback
    const existingReview = memoryReviews.find(
      (r) => (r.user?.toString() === userId || r.user === userId) && (r.product?.toString() === productId || r.product === productId)
    );

    return {
      canReview: !existingReview,
      hasDeliveredOrder: true,
      hasAlreadyReviewed: Boolean(existingReview),
      orderId: null,
      existingReview: existingReview || null,
    };
  },

  createReview: async ({ productId, userId, rating, title, comment, images }) => {
    const isDb = Review.db.readyState === 1;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      const error = new Error('Rating must be between 1 and 5 stars.');
      error.statusCode = 400;
      throw error;
    }

    if (!title || !title.trim()) {
      const error = new Error('Review title is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!comment || !comment.trim()) {
      const error = new Error('Review comment is required.');
      error.statusCode = 400;
      throw error;
    }

    if (isDb) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        const error = new Error('Invalid product identifier.');
        error.statusCode = 400;
        throw error;
      }
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found.');
        error.statusCode = 404;
        throw error;
      }

      const deliveredOrder = await Order.findOne({
        user: userId,
        orderStatus: 'delivered',
        'items.product': productId,
      });

      const existingReview = await Review.findOne({
        user: userId,
        product: productId,
      });

      if (existingReview) {
        const error = new Error('You have already submitted a review for this product.');
        error.statusCode = 400;
        error.code = 'DUPLICATE_REVIEW';
        throw error;
      }

      const isVerifiedPurchase = Boolean(deliveredOrder);

      const review = await Review.create({
        product: productId,
        user: userId,
        order: deliveredOrder ? deliveredOrder._id : null,
        rating: Number(rating),
        title,
        comment,
        images: Array.isArray(images) ? images : [],
        isVerifiedPurchase,
        status: 'pending',
      });

      return review;
    }

    // Memory Fallback
    const existingReview = memoryReviews.find(
      (r) => (r.user?.toString() === userId || r.user === userId) && (r.product?.toString() === productId || r.product === productId)
    );
    if (existingReview) {
      const error = new Error('You have already submitted a review for this product.');
      error.statusCode = 400;
      error.code = 'DUPLICATE_REVIEW';
      throw error;
    }

    const review = {
      _id: new mongoose.Types.ObjectId().toString(),
      id: `rev_${Date.now()}`,
      product: productId,
      user: userId,
      rating: Number(rating),
      title,
      comment,
      images: Array.isArray(images) ? images : [],
      isVerifiedPurchase: true,
      status: 'pending',
      createdAt: new Date(),
    };

    memoryReviews.push(review);
    return review;
  },

  getProductReviews: async (productId, { page = 1, limit = 10 }) => {
    const isDb = Review.db.readyState === 1;

    if (isDb) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return {
          reviews: [],
          summary: {
            totalReviews: 0,
            averageRating: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
          pagination: { page: 1, limit: 10, totalReviews: 0, totalPages: 1 },
        };
      }
      const query = { product: productId, status: 'approved' };
      const numericPage = Math.max(1, parseInt(page, 10));
      const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
      const skip = (numericPage - 1) * numericLimit;

      const [reviews, totalReviews, breakdown] = await Promise.all([
        Review.find(query)
          .populate('user', 'firstName lastName avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(numericLimit),
        Review.countDocuments(query),
        Review.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$rating',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sumRating = 0;
      breakdown.forEach((b) => {
        ratingCounts[b._id] = b.count;
        sumRating += b._id * b.count;
      });

      const averageRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

      return {
        reviews,
        summary: {
          totalReviews,
          averageRating,
          ratingCounts,
        },
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalReviews,
          totalPages: Math.ceil(totalReviews / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback
    const list = memoryReviews.filter(
      (r) => (r.product?.toString() === productId.toString() || r.product === productId) && r.status === 'approved'
    );
    const totalReviews = list.length;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;
    list.forEach((r) => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
      sumRating += r.rating;
    });
    const averageRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

    return {
      reviews: list,
      summary: { totalReviews, averageRating, ratingCounts },
      pagination: { page: 1, limit: 10, totalReviews, totalPages: 1 },
    };
  },

  listAllReviewsAdmin: async ({ page = 1, limit = 20, status, rating, isVerified, search }) => {
    const isDb = Review.db.readyState === 1;

    if (isDb) {
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }
      if (rating && rating !== 'all') {
        query.rating = Number(rating);
      }
      if (isVerified === 'true' || isVerified === true) {
        query.isVerifiedPurchase = true;
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [{ title: searchRegex }, { comment: searchRegex }];
      }

      const numericPage = Math.max(1, parseInt(page, 10));
      const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (numericPage - 1) * numericLimit;

      const [reviews, totalReviews] = await Promise.all([
        Review.find(query)
          .populate('user', 'firstName lastName email')
          .populate('product', 'name sku image category slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(numericLimit),
        Review.countDocuments(query),
      ]);

      return {
        reviews,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalReviews,
          totalPages: Math.ceil(totalReviews / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback
    let list = [...memoryReviews];
    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    if (rating && rating !== 'all') {
      list = list.filter((r) => r.rating === Number(rating));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.title?.toLowerCase().includes(q) || r.comment?.toLowerCase().includes(q));
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const totalReviews = list.length;
    const paginated = list.slice((numericPage - 1) * numericLimit, numericPage * numericLimit);

    return {
      reviews: paginated,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        totalReviews,
        totalPages: Math.ceil(totalReviews / numericLimit) || 1,
      },
    };
  },

  updateReviewStatus: async (reviewId, status, adminUser) => {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      const error = new Error('Invalid review status. Status must be approved, rejected, or pending.');
      error.statusCode = 400;
      throw error;
    }

    const isDb = Review.db.readyState === 1;

    if (isDb) {
      const review = await Review.findById(reviewId).populate('product', 'name slug');
      if (!review) {
        const error = new Error('Review not found.');
        error.statusCode = 404;
        throw error;
      }

      review.status = status;
      await review.save();

      if (review.product) {
        await recalculateProductRating(review.product._id);
      }

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'MODERATE_REVIEW',
        entity: 'Review',
        entityId: review._id.toString(),
        metadata: {
          newStatus: status,
          productId: review.product ? review.product._id.toString() : null,
        },
      });

      // Notification
      try {
        const userObj = await User.findById(review.user);
        const isApproved = status === 'approved';
        const notificationType = isApproved ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED';
        const title = isApproved ? 'Review Approved' : 'Review Moderated';
        const message = isApproved
          ? `Your review for "${review.product ? review.product.name : 'Product'}" was approved.`
          : `Your review for "${review.product ? review.product.name : 'Product'}" did not meet guidelines.`;

        await notificationService.createNotification({
          userId: review.user,
          type: notificationType,
          title,
          message,
          data: { productSlug: review.product ? review.product.slug : '', link: `/products` },
        });

        if (userObj) {
          emailService.sendReviewModerationEmail({
            userEmail: userObj.email,
            productTitle: review.product ? review.product.name : 'Product',
            status,
          });
        }
      } catch (nErr) {
        console.warn('[Review Notification Warning]', nErr.message);
      }

      return review;
    }

    // Memory Fallback
    const review = memoryReviews.find((r) => r._id?.toString() === reviewId || r.id === reviewId);
    if (!review) {
      const error = new Error('Review not found.');
      error.statusCode = 404;
      throw error;
    }

    review.status = status;
    await recalculateProductRating(review.product);
    return review;
  },

  respondToReview: async (reviewId, comment, adminUser) => {
    if (!comment || !comment.trim()) {
      const error = new Error('Admin response comment is required.');
      error.statusCode = 400;
      throw error;
    }

    const isDb = Review.db.readyState === 1;

    if (isDb) {
      const review = await Review.findById(reviewId);
      if (!review) {
        const error = new Error('Review not found.');
        error.statusCode = 404;
        throw error;
      }

      review.adminResponse = {
        comment: comment.trim(),
        respondedBy: adminUser ? adminUser._id : null,
        respondedAt: new Date(),
      };
      await review.save();

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'RESPOND_TO_REVIEW',
        entity: 'Review',
        entityId: review._id.toString(),
        metadata: {
          productId: review.product.toString(),
        },
      });

      return review;
    }

    // Memory Fallback
    const review = memoryReviews.find((r) => r._id?.toString() === reviewId || r.id === reviewId);
    if (!review) {
      const error = new Error('Review not found.');
      error.statusCode = 404;
      throw error;
    }

    review.adminResponse = {
      comment: comment.trim(),
      respondedBy: adminUser ? adminUser._id : 'admin',
      respondedAt: new Date(),
    };
    return review;
  },
};

module.exports = reviewService;
