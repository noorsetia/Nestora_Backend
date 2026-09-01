const mongoose = require('mongoose');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const AuditLog = require('../models/AuditLog');
const productService = require('./productService');

// Memory store for inventory logs when MongoDB is inactive
const memoryInventoryLogs = [];

const inventoryService = {
  memoryInventoryLogs,

  // Get overall inventory list with stock statuses and summary counts
  getInventory: async (queryParams = {}) => {
    const { page = 1, limit = 20, search, status } = queryParams;

    if (Product.db.readyState === 1) {
      try {
        const filter = {};

        if (search) {
          const regex = new RegExp(search.trim(), 'i');
          filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
        }

        if (status === 'low_stock' || status === 'low-stock') {
          filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
          filter.stock = { $gt: 0 };
        } else if (status === 'out_of_stock' || status === 'out-of-stock') {
          filter.stock = 0;
        } else if (status === 'in_stock' || status === 'in-stock') {
          filter.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [products, totalItems, inStockCount, lowStockCount, outOfStockCount] = await Promise.all([
          Product.find(filter)
            .select('name sku price stock lowStockThreshold status isActive image category updatedAt')
            .sort({ stock: 1 })
            .skip(skip)
            .limit(limitNum),
          Product.countDocuments(filter),
          Product.countDocuments({ $expr: { $gt: ['$stock', '$lowStockThreshold'] } }),
          Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, stock: { $gt: 0 } }),
          Product.countDocuments({ stock: 0 }),
        ]);

        const inventoryList = products.map((p) => {
          let stockStatus = 'In Stock';
          if (p.stock === 0) stockStatus = 'Out of Stock';
          else if (p.stock <= p.lowStockThreshold) stockStatus = 'Low Stock';

          return {
            _id: p._id,
            name: p.name,
            sku: p.sku || `NST-SKU-${p._id.toString().substring(0, 4)}`,
            category: p.category || 'General',
            image: p.image,
            price: p.price,
            stock: p.stock,
            lowStockThreshold: p.lowStockThreshold || 5,
            status: p.status || 'active',
            isActive: p.isActive !== false,
            stockStatus,
            lastUpdated: p.updatedAt,
          };
        });

        return {
          inventory: inventoryList,
          summary: {
            totalItems,
            inStockCount,
            lowStockCount,
            outOfStockCount,
          },
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems,
            totalPages: Math.ceil(totalItems / limitNum) || 1,
          },
        };
      } catch (err) {
        console.error('Error fetching DB inventory:', err);
      }
    }

    // Memory Fallback
    let memoryList = (productService.memoryProducts || []).map((p) => {
      let stockStatus = 'In Stock';
      if (p.stock === 0) stockStatus = 'Out of Stock';
      else if (p.stock <= (p.lowStockThreshold || 5)) stockStatus = 'Low Stock';

      return {
        _id: p._id || p.customId,
        id: p._id || p.customId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        image: p.image,
        price: p.price,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold || 5,
        status: p.status || 'active',
        isActive: p.isActive !== false,
        stockStatus,
        lastUpdated: p.updatedAt || new Date(),
      };
    });

    if (search) {
      const q = search.toLowerCase().trim();
      memoryList = memoryList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    if (status === 'low_stock' || status === 'low-stock') {
      memoryList = memoryList.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    } else if (status === 'out_of_stock' || status === 'out-of-stock') {
      memoryList = memoryList.filter((p) => p.stock === 0);
    } else if (status === 'in_stock' || status === 'in-stock') {
      memoryList = memoryList.filter((p) => p.stock > p.lowStockThreshold);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const totalItems = memoryList.length;
    const paginated = memoryList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const allMem = productService.memoryProducts || [];
    const inStockCount = allMem.filter((p) => p.stock > (p.lowStockThreshold || 5)).length;
    const lowStockCount = allMem.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length;
    const outOfStockCount = allMem.filter((p) => p.stock === 0).length;

    return {
      inventory: paginated,
      summary: {
        totalItems: allMem.length,
        inStockCount,
        lowStockCount,
        outOfStockCount,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
      },
    };
  },

  // Get items at or below low stock threshold
  getLowStockItems: async () => {
    if (Product.db.readyState === 1) {
      const products = await Product.find({
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        isActive: true,
      }).select('name sku stock lowStockThreshold image category price');

      return products;
    }

    return (productService.memoryProducts || []).filter(
      (p) => p.stock <= (p.lowStockThreshold || 5) && p.isActive !== false
    );
  },

  // Update product stock with log creation & atomic safety
  updateStock: async (productId, { operation, quantity, reason = 'Manual Inventory Update' }, adminUserId = null) => {
    // 1. Validate quantity strictly
    const qty = Number(quantity);
    if (isNaN(qty) || !Number.isFinite(qty) || qty < 0) {
      const error = new Error('Quantity must be a non-negative number');
      error.statusCode = 400;
      throw error;
    }

    if (!['increase', 'decrease', 'set'].includes(operation)) {
      const error = new Error('Invalid operation. Must be "increase", "decrease", or "set".');
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch product from DB or memory
    let product = null;
    let isDb = Product.db.readyState === 1;

    if (isDb) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        const error = new Error('Invalid product ID format');
        error.statusCode = 400;
        throw error;
      }
      product = await Product.findById(productId);
    } else {
      product = (productService.memoryProducts || []).find((p) => p._id === productId || p.customId === productId || p.id === productId);
    }

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const previousStock = Number(product.stock !== undefined ? product.stock : 0);
    let newStock = previousStock;
    let change = 0;

    switch (operation) {
      case 'increase':
        newStock = previousStock + qty;
        change = qty;
        break;
      case 'decrease':
        if (previousStock - qty < 0) {
          const error = new Error(`Cannot decrease stock below 0. Current stock is ${previousStock}.`);
          error.statusCode = 400;
          throw error;
        }
        newStock = previousStock - qty;
        change = -qty;
        break;
      case 'set':
        if (qty < 0) {
          const error = new Error('Stock cannot be negative');
          error.statusCode = 400;
          throw error;
        }
        newStock = qty;
        change = newStock - previousStock;
        break;
    }

    if (newStock < 0) {
      const error = new Error('Stock cannot be negative');
      error.statusCode = 400;
      throw error;
    }

    // Apply mutation
    product.stock = newStock;
    product.stockCount = newStock;
    product.inStock = newStock > 0;
    product.updatedAt = new Date();

    if (isDb) {
      await product.save();

      // Log Inventory change in MongoDB
      await InventoryLog.create({
        product: product._id,
        previousStock,
        newStock,
        change,
        operation,
        reason,
        updatedBy: adminUserId || null,
      });

      // Log Audit action
      await AuditLog.create({
        user: adminUserId || null,
        action: 'UPDATE_INVENTORY',
        entity: 'Product',
        entityId: product._id.toString(),
        metadata: { previousStock, newStock, operation, reason },
      });
    } else {
      memoryInventoryLogs.push({
        _id: `log_${Date.now()}`,
        product: product._id || product.customId,
        previousStock,
        newStock,
        change,
        operation,
        reason,
        updatedBy: adminUserId,
        createdAt: new Date(),
      });
    }

    let stockStatus = 'In Stock';
    if (newStock === 0) stockStatus = 'Out of Stock';
    else if (newStock <= (product.lowStockThreshold || 5)) stockStatus = 'Low Stock';

    return {
      _id: product._id || product.customId,
      name: product.name,
      sku: product.sku,
      previousStock,
      newStock,
      stockStatus,
      updatedAt: product.updatedAt,
    };
  },

  // Get Inventory Logs for audit trail
  getInventoryLogs: async (queryParams = {}) => {
    const { limit = 30, productId } = queryParams;

    if (Product.db.readyState === 1) {
      const filter = {};
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        filter.product = productId;
      }

      const logs = await InventoryLog.find(filter)
        .populate('product', 'name sku image')
        .populate('updatedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10) || 30);

      return logs;
    }

    let logs = [...memoryInventoryLogs];
    if (productId) {
      logs = logs.filter((l) => l.product === productId);
    }
    return logs.reverse().slice(0, parseInt(limit, 10) || 30);
  },
};

module.exports = inventoryService;
