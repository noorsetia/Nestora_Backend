const categoryService = require('../services/categoryService');

const categoryController = {
  // GET /api/categories
  getCategories: async (req, res, next) => {
    try {
      const includeInactive = req.user && ['admin', 'superadmin'].includes(req.user.role);
      const categories = await categoryService.getCategories(includeInactive);
      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/categories/:slug
  getCategoryBySlug: async (req, res, next) => {
    try {
      const category = await categoryService.getCategoryBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/categories (Admin)
  createCategory: async (req, res, next) => {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/categories/:id (Admin)
  updateCategory: async (req, res, next) => {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/categories/:id (Admin)
  deleteCategory: async (req, res, next) => {
    try {
      const result = await categoryService.deleteCategory(req.params.id);
      res.status(200).json({
        success: true,
        message: result.message || 'Category deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = categoryController;
