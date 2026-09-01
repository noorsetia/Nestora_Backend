const Category = require('../models/Category');
const Product = require('../models/Product');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const memoryCategories = [
  {
    _id: 'cat-1',
    id: 'cat-1',
    name: 'Furniture',
    slug: 'furniture',
    description: 'Bespoke lounge chairs, sofas, and solid wood tables.',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    parentCategory: null,
    isActive: true,
    productCount: 4,
  },
  {
    _id: 'cat-2',
    id: 'cat-2',
    name: 'Lighting',
    slug: 'lighting',
    description: 'Sculptural ambient floor lamps and brass sconces.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    parentCategory: null,
    isActive: true,
    productCount: 2,
  },
  {
    _id: 'cat-3',
    id: 'cat-3',
    name: 'Tables',
    slug: 'tables',
    description: 'Low-profile coffee and dining tables.',
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    parentCategory: 'cat-1',
    isActive: true,
    productCount: 2,
  },
];

const categoryService = {
  memoryCategories,

  getCategories: async (includeInactive = false) => {
    if (Category.db.readyState === 1) {
      try {
        const filter = includeInactive ? {} : { isActive: true };
        const categories = await Category.find(filter)
          .populate('parentCategory', 'name slug')
          .sort({ name: 1 });

        const categoriesWithCount = await Promise.all(
          categories.map(async (cat) => {
            const count = await Product.countDocuments({
              category: { $regex: new RegExp(`^${cat.name}$`, 'i') },
              isActive: true,
            });
            const catObj = cat.toObject ? cat.toObject() : cat;
            catObj.productCount = count;
            return catObj;
          })
        );

        return categoriesWithCount;
      } catch (err) {}
    }

    let list = [...memoryCategories];
    if (!includeInactive) {
      list = list.filter((c) => c.isActive);
    }
    return list;
  },

  getCategoryBySlug: async (slug) => {
    if (Category.db.readyState === 1) {
      try {
        const category = await Category.findOne({ slug }).populate('parentCategory', 'name slug');
        if (category) return category;
      } catch (e) {}
    }

    const cat = memoryCategories.find((c) => c.slug === slug || c._id === slug);
    if (!cat) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }
    return cat;
  },

  createCategory: async (categoryData) => {
    const slug = categoryData.slug ? slugify(categoryData.slug) : slugify(categoryData.name);

    if (Category.db.readyState === 1) {
      const existing = await Category.findOne({ $or: [{ name: categoryData.name }, { slug }] });
      if (existing) {
        const error = new Error('Category with this name or slug already exists');
        error.statusCode = 400;
        throw error;
      }

      const category = await Category.create({
        ...categoryData,
        slug,
        parentCategory: categoryData.parentCategory || null,
      });
      return category;
    }

    const existingMem = memoryCategories.find((c) => c.name === categoryData.name || c.slug === slug);
    if (existingMem) {
      const error = new Error('Category with this name or slug already exists');
      error.statusCode = 400;
      throw error;
    }

    const id = `cat_${Date.now()}`;
    const newCategory = {
      _id: id,
      id,
      ...categoryData,
      slug,
      parentCategory: categoryData.parentCategory || null,
      isActive: categoryData.isActive !== false,
      productCount: 0,
      createdAt: new Date(),
    };
    memoryCategories.push(newCategory);
    return newCategory;
  },

  updateCategory: async (id, categoryData) => {
    if (categoryData.parentCategory && categoryData.parentCategory.toString() === id.toString()) {
      const error = new Error('A category cannot be its own parent');
      error.statusCode = 400;
      throw error;
    }

    if (categoryData.name && !categoryData.slug) {
      categoryData.slug = slugify(categoryData.name);
    }

    if (Category.db.readyState === 1) {
      const category = await Category.findByIdAndUpdate(id, categoryData, {
        new: true,
        runValidators: true,
      }).populate('parentCategory', 'name slug');

      if (!category) {
        const error = new Error('Category not found');
        error.statusCode = 404;
        throw error;
      }

      return category;
    }

    const catIdx = memoryCategories.findIndex((c) => c._id === id || c.id === id);
    if (catIdx === -1) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    memoryCategories[catIdx] = { ...memoryCategories[catIdx], ...categoryData };
    return memoryCategories[catIdx];
  },

  deleteCategory: async (id) => {
    if (Category.db.readyState === 1) {
      const category = await Category.findById(id);
      if (!category) {
        const error = new Error('Category not found');
        error.statusCode = 404;
        throw error;
      }

      const [productCount, childCount] = await Promise.all([
        Product.countDocuments({ category: { $regex: new RegExp(`^${category.name}$`, 'i') } }),
        Category.countDocuments({ parentCategory: category._id }),
      ]);

      if (productCount > 0 || childCount > 0) {
        category.isActive = false;
        await category.save();
        return {
          category,
          deactivated: true,
          message: `Category deactivated because it contains ${productCount} products and ${childCount} subcategories.`,
        };
      }

      await Category.findByIdAndDelete(id);
      return { category, deleted: true, message: 'Category deleted successfully' };
    }

    const catIdx = memoryCategories.findIndex((c) => c._id === id || c.id === id);
    if (catIdx === -1) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    const cat = memoryCategories[catIdx];
    if (cat.productCount > 0) {
      cat.isActive = false;
      return {
        category: cat,
        deactivated: true,
        message: `Category deactivated because it contains ${cat.productCount} products.`,
      };
    }

    memoryCategories.splice(catIdx, 1);
    return { category: cat, deleted: true, message: 'Category deleted successfully' };
  },
};

module.exports = categoryService;
