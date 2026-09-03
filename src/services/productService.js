const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const AuditLog = require('../models/AuditLog');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const generateSku = (name, category) => {
  const catCode = (category || 'GEN').substring(0, 3).toUpperCase();
  const nameCode = (name || 'PRD').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `NST-${catCode}-${nameCode}-${randomNum}`;
};

// Seed/Memory dataset when MongoDB connection is inactive (e.g. during Jest testing or offline mode)
const memoryProducts = [
  {
    _id: 'prod-1',
    customId: 'prod-1',
    sku: 'NST-CHR-LIN-001',
    name: 'Linen Lounge Chair',
    slug: 'linen-lounge-chair',
    subtitle: 'Tactile relaxation in natural Belgian flax',
    brand: 'Nestora Atelier',
    price: 24999,
    originalPrice: 28999,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room', 'Bedroom'],
    styles: ['Minimal', 'Modern'],
    badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80',
    ],
    description: 'Expertly crafted with a solid ash wood frame and upholstered in premium organic Belgian linen.',
    stock: 15,
    lowStockThreshold: 5,
    rating: 4.8,
    reviewCount: 42,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    _id: 'prod-2',
    customId: 'prod-2',
    sku: 'NST-TBL-OAK-002',
    name: 'Oak Coffee Table',
    slug: 'oak-coffee-table',
    subtitle: 'Low-profile architectural silhouette',
    brand: 'NordicCraft',
    price: 14999,
    originalPrice: 17999,
    category: 'Tables',
    subcategory: 'Coffee Tables',
    rooms: ['Living Room'],
    styles: ['Minimal', 'Scandinavian'],
    badge: "Editor's Pick",
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80',
    ],
    description: 'Carved from sustainably harvested European white oak with soft rounded edges.',
    stock: 12,
    lowStockThreshold: 4,
    rating: 4.6,
    reviewCount: 28,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-05'),
  },
  {
    _id: 'prod-3',
    customId: 'prod-3',
    sku: 'NST-CHR-BOU-003',
    name: 'Bouclé Accent Chair',
    slug: 'boucle-accent-chair',
    subtitle: 'Sculptural curve with plush warmth',
    brand: 'Forma Studio',
    price: 18999,
    originalPrice: null,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room', 'Bedroom'],
    styles: ['Japandi', 'Modern'],
    badge: 'New Season',
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1200&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1200&q=80',
    ],
    description: 'An organic silhouette wrapped in tactile cream bouclé fabric.',
    stock: 3,
    lowStockThreshold: 5,
    rating: 4.9,
    reviewCount: 19,
    isFeatured: false,
    isNewArrival: true,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-02-01'),
  },
  {
    _id: 'prod-4',
    customId: 'prod-4',
    sku: 'NST-LMP-FLR-004',
    name: 'Minimal Floor Lamp',
    slug: 'minimal-floor-lamp',
    subtitle: 'Warm ambient glow with slender steel stem',
    brand: 'Studio Koto',
    price: 8999,
    originalPrice: 10499,
    category: 'Lighting',
    subcategory: 'Floor Lamps',
    rooms: ['Workspace', 'Living Room'],
    styles: ['Minimal'],
    badge: null,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
    ],
    description: 'A slender matte brass floor lamp featuring an adjustable linen shade.',
    stock: 20,
    lowStockThreshold: 5,
    rating: 4.7,
    reviewCount: 35,
    isFeatured: true,
    isNewArrival: true,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-02-05'),
  },
  {
    _id: 'prod-7',
    customId: 'prod-7',
    sku: 'NST-SOF-MOD-007',
    name: 'Modern Lounge Sofa',
    slug: 'modern-lounge-sofa',
    subtitle: 'Deep seating sanctuary in muted stone fabric',
    brand: 'Nestora Atelier',
    price: 54999,
    originalPrice: 62999,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room'],
    styles: ['Modern', 'Contemporary'],
    badge: 'Flagship Piece',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    ],
    description: 'Generous 3-seater modular sofa with plush down-blend filled cushions.',
    stock: 5,
    lowStockThreshold: 2,
    rating: 5.0,
    reviewCount: 64,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-10'),
  },
];

const productService = {
  memoryProducts,

  // Query, filter, sort, paginate products
  getProducts: async (queryParams = {}, isAdmin = false) => {
    const escapeRegex = (str) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // If DB is connected, use Mongoose query
    if (Product.db.readyState === 1) {
      try {
        const {
          category,
          room,
          style,
          brand,
          minPrice,
          maxPrice,
          rating,
          inStock,
          isFeatured,
          isNewArrival,
          status,
          search,
          sort = 'recommended',
          page = 1,
          limit = 12,
        } = queryParams;

        const andConditions = [];

        if (!isAdmin) {
          andConditions.push({ isActive: true, status: 'active' });
        } else if (status) {
          if (status === 'active') andConditions.push({ status: 'active', isActive: true });
          else if (status === 'inactive') andConditions.push({ status: 'inactive', isActive: false });
          else andConditions.push({ status });
        }

        if (category && category !== 'all') {
          const catClean = category.trim();
          let catPattern = escapeRegex(catClean).replace(/-/g, '[ -]');
          if (catClean.toLowerCase() === 'decor' || catClean.toLowerCase() === 'decor-and-objects') {
            catPattern = 'decor|objects|accessories|vases|clocks|lighting|rugs|decorations';
          }
          const catRegex = new RegExp(catPattern, 'i');
          andConditions.push({
            $or: [
              { category: catRegex },
              { subcategory: catRegex },
              { name: catRegex },
              { description: catRegex },
            ],
          });
        }

        if (room && room !== 'all') {
          const roomClean = room.trim();
          let roomPattern = escapeRegex(roomClean).replace(/-/g, '[ -]');
          if (roomClean.toLowerCase() === 'home-office' || roomClean.toLowerCase() === 'workspace') {
            roomPattern = 'home[- ]office|workspace|office';
          }
          const roomRegex = new RegExp(roomPattern, 'i');
          andConditions.push({
            $or: [
              { room: roomRegex },
              { rooms: roomRegex },
            ],
          });
        }

        if (style && style !== 'all') {
          const styleClean = style.trim();
          const stylePattern = escapeRegex(styleClean).replace(/-/g, '[ -]');
          const styleRegex = new RegExp(stylePattern, 'i');
          andConditions.push({
            $or: [
              { style: styleRegex },
              { styles: styleRegex },
            ],
          });
        }

        if (brand && brand !== 'all') {
          const brandClean = brand.trim();
          const brandPattern = escapeRegex(brandClean).replace(/&/g, '(&|and)').replace(/-/g, '[ -]');
          const brandRegex = new RegExp('^' + brandPattern + '$', 'i');
          andConditions.push({ brand: brandRegex });
        }

        if (minPrice !== undefined && minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice)) && Number(minPrice) > 0) {
          andConditions.push({ price: { $gte: Number(minPrice) } });
        }
        if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice)) && Number(maxPrice) < 200000) {
          andConditions.push({ price: { $lte: Number(maxPrice) } });
        }

        if (rating !== undefined && rating !== null && rating !== '' && !isNaN(Number(rating)) && Number(rating) > 0) {
          const rNum = Number(rating);
          andConditions.push({
            $or: [
              { rating: { $gte: rNum } },
              { rating: { $exists: false } },
              { rating: null },
            ],
          });
        }

        if (inStock === 'true' || inStock === true) {
          andConditions.push({ stock: { $gt: 0 } });
        }

        if (isFeatured === 'true' || isFeatured === true) {
          andConditions.push({ isFeatured: true });
        }

        if (isNewArrival === 'true' || isNewArrival === true) {
          andConditions.push({ isNewArrival: true });
        }

        if (search && search.trim()) {
          const sPattern = escapeRegex(search.trim());
          const searchRegex = new RegExp(sPattern, 'i');
          andConditions.push({
            $or: [
              { name: searchRegex },
              { brand: searchRegex },
              { category: searchRegex },
              { subcategory: searchRegex },
              { style: searchRegex },
              { description: searchRegex },
              { sku: searchRegex },
            ],
          });
        }

        const filter = andConditions.length > 0 ? { $and: andConditions } : {};

        let sortOptions = {};
        switch (sort) {
          case 'newest':
            sortOptions = { createdAt: -1 };
            break;
          case 'price_low':
            sortOptions = { price: 1 };
            break;
          case 'price_high':
            sortOptions = { price: -1 };
            break;
          case 'rating':
            sortOptions = { rating: -1 };
            break;
          case 'popular':
            sortOptions = { reviewCount: -1 };
            break;
          case 'discount':
            sortOptions = { discountPercentage: -1 };
            break;
          case 'recommended':
          default:
            sortOptions = { isFeatured: -1, createdAt: -1 };
            break;
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
        const skip = (pageNum - 1) * limitNum;

        const [products, totalProducts] = await Promise.all([
          Product.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
          Product.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalProducts / limitNum) || 1;

        return {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalProducts,
            totalPages,
          },
        };
      } catch (err) {
        // Fall back to memory dataset if query error occurs
      }
    }

    // In-memory fallback filtering
    let result = [...memoryProducts];

    if (!isAdmin) {
      result = result.filter((p) => p.isActive && p.status === 'active');
    } else if (queryParams.status) {
      result = result.filter((p) => p.status === queryParams.status);
    }

    if (queryParams.category && queryParams.category !== 'all') {
      const catClean = queryParams.category.toLowerCase().trim();
      result = result.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const sub = (p.subcategory || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        if (catClean === 'decor' || catClean === 'decor-and-objects') {
          return cat.includes('decor') || sub.includes('decor') || cat.includes('lighting') || cat.includes('rugs') || name.includes('decor') || desc.includes('decor');
        }
        const searchCat = catClean.replace(/-/g, ' ');
        return cat.includes(searchCat) || sub.includes(searchCat) || searchCat.includes(cat) || searchCat.includes(sub);
      });
    }

    if (queryParams.room && queryParams.room !== 'all') {
      const roomClean = queryParams.room.toLowerCase().trim();
      result = result.filter((p) => {
        const mainRoom = (p.room || '').toLowerCase();
        const roomsArr = (p.rooms || []).map((r) => r.toLowerCase());
        if (roomClean === 'home-office' || roomClean === 'workspace') {
          return mainRoom.includes('home-office') || mainRoom.includes('workspace') || roomsArr.some(r => r.includes('workspace') || r.includes('home office') || r.includes('home-office'));
        }
        const searchRoom = roomClean.replace(/-/g, ' ');
        return mainRoom.includes(searchRoom) || roomsArr.some(r => r.includes(searchRoom) || searchRoom.includes(r));
      });
    }

    if (queryParams.style && queryParams.style !== 'all') {
      const styleClean = queryParams.style.toLowerCase().trim();
      result = result.filter((p) => {
        const mainStyle = (p.style || '').toLowerCase();
        const stylesArr = (p.styles || []).map((s) => s.toLowerCase());
        const searchStyle = styleClean.replace(/-/g, ' ');
        return mainStyle.includes(searchStyle) || stylesArr.some(s => s.toLowerCase().includes(searchStyle));
      });
    }

    if (queryParams.brand && queryParams.brand !== 'all') {
      const brandClean = queryParams.brand.toLowerCase().trim();
      result = result.filter((p) => {
        const b = (p.brand || '').toLowerCase();
        return b === brandClean || b.replace(/&/g, 'and') === brandClean.replace(/&/g, 'and');
      });
    }

    if (queryParams.minPrice && !isNaN(Number(queryParams.minPrice)) && Number(queryParams.minPrice) > 0) {
      result = result.filter((p) => p.price >= Number(queryParams.minPrice));
    }
    if (queryParams.maxPrice && !isNaN(Number(queryParams.maxPrice)) && Number(queryParams.maxPrice) < 200000) {
      result = result.filter((p) => p.price <= Number(queryParams.maxPrice));
    }

    if (queryParams.rating && !isNaN(Number(queryParams.rating)) && Number(queryParams.rating) > 0) {
      result = result.filter((p) => (p.rating || 4.8) >= Number(queryParams.rating));
    }

    if (queryParams.inStock === 'true' || queryParams.inStock === true) {
      result = result.filter((p) => p.stock > 0);
    }

    if (queryParams.isFeatured === 'true' || queryParams.isFeatured === true) {
      result = result.filter((p) => p.isFeatured);
    }
    if (queryParams.isNewArrival === 'true' || queryParams.isNewArrival === true) {
      result = result.filter((p) => p.isNewArrival);
    }

    if (queryParams.search && queryParams.search.trim()) {
      const q = queryParams.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sort = queryParams.sort || 'recommended';
    if (sort === 'price_low') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_high') result.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pageNum = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 12));
    const totalProducts = result.length;
    const totalPages = Math.ceil(totalProducts / limitNum) || 1;
    const paginated = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return {
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalProducts,
        totalPages,
      },
    };
  },

  // Get single product by slug or customId or _id
  getProductBySlug: async (slugOrId, isAdmin = false) => {
    let product = null;

    if (Product.db.readyState === 1) {
      try {
        let query = { slug: slugOrId.toLowerCase() };
        if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
          query = { $or: [{ slug: slugOrId }, { _id: slugOrId }] };
        } else if (slugOrId.startsWith('prod-')) {
          query = { $or: [{ slug: slugOrId }, { customId: slugOrId }] };
        }
        product = await Product.findOne(query);
      } catch (e) {}
    }

    if (!product) {
      product = memoryProducts.find(
        (p) =>
          p.slug === slugOrId.toLowerCase() ||
          p._id === slugOrId ||
          p.customId === slugOrId
      );
    }

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    if (!isAdmin && (!product.isActive || product.status !== 'active')) {
      const error = new Error('Product is currently unavailable');
      error.statusCode = 404;
      error.code = 'PRODUCT_INACTIVE';
      throw error;
    }

    return product;
  },

  // Create new product (Admin)
  createProduct: async (productData, adminUserId = null) => {
    const slug = productData.slug ? slugify(productData.slug) : slugify(productData.name);
    const sku = productData.sku ? productData.sku.toUpperCase() : generateSku(productData.name, productData.category);

    if (Product.db.readyState === 1) {
      const existingSlug = await Product.findOne({ slug });
      if (existingSlug) {
        const error = new Error(`Product slug "${slug}" already exists`);
        error.statusCode = 400;
        throw error;
      }

      const existingSku = await Product.findOne({ sku });
      if (existingSku) {
        const error = new Error(`SKU "${sku}" already exists`);
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.create({
        ...productData,
        slug,
        sku,
        stock: productData.stock !== undefined ? productData.stock : 10,
        rooms: productData.rooms || (productData.room ? [productData.room] : ['Living Room']),
        styles: productData.styles || (productData.style ? [productData.style] : ['Modern']),
        images: productData.images?.length > 0 ? productData.images : [productData.image],
      });

      await InventoryLog.create({
        product: product._id,
        previousStock: 0,
        newStock: product.stock,
        change: product.stock,
        operation: 'set',
        reason: 'Initial Product Creation',
        updatedBy: adminUserId,
      });

      await AuditLog.create({
        user: adminUserId,
        action: 'CREATE_PRODUCT',
        entity: 'Product',
        entityId: product._id.toString(),
        metadata: { name: product.name, sku: product.sku },
      });

      return product;
    }

    // Memory creation fallback
    const id = `prod_${Date.now()}`;
    const newProd = {
      _id: id,
      customId: id,
      ...productData,
      slug,
      sku,
      stock: productData.stock !== undefined ? productData.stock : 10,
      rooms: productData.rooms || (productData.room ? [productData.room] : ['Living Room']),
      styles: productData.styles || (productData.style ? [productData.style] : ['Modern']),
      images: productData.images?.length > 0 ? productData.images : [productData.image],
      status: productData.status || 'active',
      isActive: productData.isActive !== false,
      createdAt: new Date(),
    };
    memoryProducts.push(newProd);
    return newProd;
  },

  // Update existing product (Admin)
  updateProduct: async (id, productData, adminUserId = null) => {
    if (Product.db.readyState === 1) {
      const product = await Product.findById(id);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      if (productData.sku && productData.sku.toUpperCase() !== product.sku) {
        const existingSku = await Product.findOne({ sku: productData.sku.toUpperCase() });
        if (existingSku) {
          const error = new Error(`SKU "${productData.sku}" already exists`);
          error.statusCode = 400;
          throw error;
        }
      }

      if (productData.stock !== undefined && productData.stock !== product.stock) {
        const stockDiff = productData.stock - product.stock;
        await InventoryLog.create({
          product: product._id,
          previousStock: product.stock,
          newStock: productData.stock,
          change: stockDiff,
          operation: stockDiff > 0 ? 'increase' : 'decrease',
          reason: 'Admin Product Edit Update',
          updatedBy: adminUserId,
        });
      }

      Object.assign(product, productData);
      if (productData.name && !productData.slug) {
        product.slug = slugify(productData.name);
      }

      await product.save();

      await AuditLog.create({
        user: adminUserId,
        action: 'UPDATE_PRODUCT',
        entity: 'Product',
        entityId: product._id.toString(),
        metadata: { name: product.name, sku: product.sku },
      });

      return product;
    }

    const prodIdx = memoryProducts.findIndex((p) => p._id === id || p.customId === id);
    if (prodIdx === -1) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    memoryProducts[prodIdx] = { ...memoryProducts[prodIdx], ...productData };
    return memoryProducts[prodIdx];
  },

  // Update status (Active, Inactive, Draft)
  updateProductStatus: async (id, status, adminUserId = null) => {
    if (Product.db.readyState === 1) {
      const product = await Product.findById(id);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      product.status = status;
      product.isActive = status === 'active';
      await product.save();

      await AuditLog.create({
        user: adminUserId,
        action: 'UPDATE_PRODUCT_STATUS',
        entity: 'Product',
        entityId: product._id.toString(),
        metadata: { status },
      });

      return product;
    }

    const prod = memoryProducts.find((p) => p._id === id || p.customId === id);
    if (!prod) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    prod.status = status;
    prod.isActive = status === 'active';
    return prod;
  },

  // Delete/Deactivate product
  deleteProduct: async (id, adminUserId = null) => {
    if (Product.db.readyState === 1) {
      const product = await Product.findById(id);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      product.isActive = false;
      product.status = 'inactive';
      await product.save();

      await AuditLog.create({
        user: adminUserId,
        action: 'DEACTIVATE_PRODUCT',
        entity: 'Product',
        entityId: product._id.toString(),
        metadata: { name: product.name },
      });

      return { success: true, message: `Product "${product.name}" has been deactivated.` };
    }

    const prod = memoryProducts.find((p) => p._id === id || p.customId === id);
    if (!prod) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    prod.isActive = false;
    prod.status = 'inactive';
    return { success: true, message: `Product "${prod.name}" has been deactivated.` };
  },
};

module.exports = productService;

