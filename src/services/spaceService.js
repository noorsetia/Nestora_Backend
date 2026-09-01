const mongoose = require('mongoose');
const Space = require('../models/Space');
const Product = require('../models/Product');
const crypto = require('crypto');

class SpaceService {
  /**
   * Recalculates estimated total for a space
   */
  async calculateSpaceTotal(products) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return 0;
    }
    const productIds = products
      .map((p) => p.product._id || p.product)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (productIds.length === 0) return 0;

    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const priceMap = new Map();
    dbProducts.forEach((p) => priceMap.set(p._id.toString(), p.price));

    let total = 0;
    for (const item of products) {
      const pid = (item.product._id || item.product).toString();
      const price = priceMap.get(pid) || 0;
      total += price * (item.quantity || 1);
    }
    return total;
  }

  /**
   * Create a new Space
   */
  async createSpace(userId, spaceData) {
    const { name, roomType, style, budget, products, coverImage } = spaceData;

    const initialProducts = products || [];
    const estimatedTotal = await this.calculateSpaceTotal(initialProducts);

    const shareToken = crypto.randomBytes(8).toString('hex');

    const space = await Space.create({
      user: userId,
      name: name || 'My Custom Room',
      roomType: roomType || 'Living Room',
      style: style || 'Modern',
      budget: budget || 50000,
      estimatedTotal,
      products: initialProducts,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      shareToken,
    });

    return await Space.findById(space._id).populate('products.product');
  }

  /**
   * Get all spaces for a user
   */
  async getUserSpaces(userId) {
    if (Space.db.readyState !== 1) return [];
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];

    return await Space.find({ user: userId })
      .sort({ updatedAt: -1 })
      .populate('products.product');
  }

  /**
   * Get space by ID (ownership security check)
   */
  async getSpaceById(spaceId, userId) {
    if (!spaceId || !mongoose.Types.ObjectId.isValid(spaceId)) {
      const error = new Error('Space not found');
      error.statusCode = 404;
      throw error;
    }

    const space = await Space.findById(spaceId).populate('products.product');
    if (!space) {
      const error = new Error('Space not found');
      error.statusCode = 404;
      throw error;
    }
    if (space.user.toString() !== userId.toString()) {
      const error = new Error('Access denied to private space');
      error.statusCode = 403;
      throw error;
    }
    return space;
  }

  /**
   * Get space by public share token (safe for unauthenticated/shared viewing)
   */
  async getSpaceByShareToken(shareToken) {
    const space = await Space.findOne({ shareToken }).populate('products.product');
    if (!space) {
      const error = new Error('Shared space link is invalid or expired');
      error.statusCode = 404;
      throw error;
    }
    // Return sanitized space object without user details
    const spaceObj = space.toObject();
    delete spaceObj.user;
    return spaceObj;
  }

  /**
   * Update space metadata
   */
  async updateSpace(spaceId, userId, updateData) {
    const space = await this.getSpaceById(spaceId, userId);

    if (updateData.name !== undefined) space.name = updateData.name;
    if (updateData.roomType !== undefined) space.roomType = updateData.roomType;
    if (updateData.style !== undefined) space.style = updateData.style;
    if (updateData.budget !== undefined) space.budget = updateData.budget;
    if (updateData.coverImage !== undefined) space.coverImage = updateData.coverImage;

    space.estimatedTotal = await this.calculateSpaceTotal(space.products);
    await space.save();

    return await Space.findById(space._id).populate('products.product');
  }

  /**
   * Delete a space
   */
  async deleteSpace(spaceId, userId) {
    const space = await this.getSpaceById(spaceId, userId);
    await space.deleteOne();
    return { success: true, message: 'Space deleted successfully' };
  }

  /**
   * Add a product to a space
   */
  async addProductToSpace(spaceId, userId, { productId, quantity = 1, variant = '' }) {
    const space = await this.getSpaceById(spaceId, userId);
    const existingIndex = space.products.findIndex((p) => {
      const pId = p.product?._id ? p.product._id.toString() : p.product?.toString();
      return pId === productId.toString();
    });

    if (existingIndex > -1) {
      space.products[existingIndex].quantity += Number(quantity);
    } else {
      space.products.push({
        product: productId,
        quantity: Number(quantity),
        variant,
      });
    }

    space.estimatedTotal = await this.calculateSpaceTotal(space.products);
    await space.save();

    return await Space.findById(space._id).populate('products.product');
  }

  /**
   * Remove a product from a space
   */
  async removeProductFromSpace(spaceId, userId, productId) {
    const space = await this.getSpaceById(spaceId, userId);
    space.products = space.products.filter((p) => {
      const pId = p.product?._id ? p.product._id.toString() : p.product?.toString();
      return pId !== productId.toString();
    });

    space.estimatedTotal = await this.calculateSpaceTotal(space.products);
    await space.save();

    return await Space.findById(space._id).populate('products.product');
  }

  /**
   * Toggle favorite status of a space
   */
  async toggleFavoriteSpace(spaceId, userId) {
    const space = await this.getSpaceById(spaceId, userId);
    space.isFavorite = !space.isFavorite;
    await space.save();
    return space;
  }

  /**
   * Duplicate a space
   */
  async duplicateSpace(spaceId, userId, newName) {
    const original = await this.getSpaceById(spaceId, userId);
    const shareToken = crypto.randomBytes(8).toString('hex');

    const copy = await Space.create({
      user: userId,
      name: newName || `${original.name} (Copy)`,
      roomType: original.roomType,
      style: original.style,
      budget: original.budget,
      estimatedTotal: original.estimatedTotal,
      products: original.products.map((p) => ({
        product: p.product._id || p.product,
        quantity: p.quantity,
        variant: p.variant,
      })),
      coverImage: original.coverImage,
      shareToken,
    });

    return await Space.findById(copy._id).populate('products.product');
  }
}

module.exports = new SpaceService();
