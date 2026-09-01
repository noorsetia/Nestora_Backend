const productService = require('../services/productService');
const { validateProductPayload } = require('../validators/productValidator');

const productController = {
  // GET /api/products
  getProducts: async (req, res, next) => {
    try {
      const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
      const result = await productService.getProducts(req.query, isAdmin);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/products/featured
  getFeaturedProducts: async (req, res, next) => {
    try {
      const result = await productService.getProducts({ isFeatured: true, limit: 8 });
      res.status(200).json({
        success: true,
        data: { products: result.products },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/products/new-arrivals
  getNewArrivals: async (req, res, next) => {
    try {
      const result = await productService.getProducts({ isNewArrival: true, sort: 'newest', limit: 8 });
      res.status(200).json({
        success: true,
        data: { products: result.products },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/products/:slug
  getProductBySlug: async (req, res, next) => {
    try {
      const isAdmin = req.user && ['admin', 'superadmin'].includes(req.user.role);
      const product = await productService.getProductBySlug(req.params.slug, isAdmin);
      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/categories/:slug/products
  getCategoryProducts: async (req, res, next) => {
    try {
      const { slug } = req.params;
      const categoryName = slug.replace(/-/g, ' ');
      const result = await productService.getProducts({ ...req.query, category: categoryName });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/products (Admin)
  createProduct: async (req, res, next) => {
    try {
      const validation = validateProductPayload(req.body, false);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Product validation failed',
          errors: validation.errors,
        });
      }

      const product = await productService.createProduct(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/products/:id (Admin)
  updateProduct: async (req, res, next) => {
    try {
      const validation = validateProductPayload(req.body, true);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Product update validation failed',
          errors: validation.errors,
        });
      }

      const product = await productService.updateProduct(req.params.id, req.body, req.user._id);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/products/:id/status (Admin)
  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!status || !['active', 'inactive', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "active", "inactive", or "draft".',
        });
      }

      const product = await productService.updateProductStatus(req.params.id, status, req.user._id);
      res.status(200).json({
        success: true,
        message: `Product status changed to ${status}`,
        data: { product },
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/products/:id (Admin)
  deleteProduct: async (req, res, next) => {
    try {
      const result = await productService.deleteProduct(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productController;
