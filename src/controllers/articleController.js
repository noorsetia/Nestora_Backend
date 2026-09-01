const Article = require('../models/Article');

class ArticleController {
  async getArticles(req, res, next) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      const query = { isPublished: true };
      if (req.query.category && req.query.category !== 'all') {
        query.category = req.query.category;
      }
      if (req.query.search) {
        query.title = { $regex: req.query.search, $options: 'i' };
      }

      const total = await Article.countDocuments(query);
      const articles = await Article.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedProducts');

      res.status(200).json({
        success: true,
        data: {
          articles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getArticleBySlug(req, res, next) {
    try {
      const article = await Article.findOne({ slug: req.params.slug }).populate('relatedProducts');
      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }
      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }

  async getArticlesByCategory(req, res, next) {
    try {
      const articles = await Article.find({
        category: req.params.category,
        isPublished: true,
      }).sort({ publishedAt: -1 });
      res.status(200).json({ success: true, data: articles });
    } catch (err) {
      next(err);
    }
  }

  // Admin Operations
  async createArticle(req, res, next) {
    try {
      const article = await Article.create(req.body);
      res.status(201).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }

  async updateArticle(req, res, next) {
    try {
      const article = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }
      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }

  async deleteArticle(req, res, next) {
    try {
      await Article.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Article deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ArticleController();
