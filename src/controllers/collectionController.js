const Collection = require('../models/Collection');

class CollectionController {
  async getCollections(req, res, next) {
    try {
      const collections = await Collection.find({ isActive: true }).populate('products');
      res.status(200).json({ success: true, data: collections });
    } catch (err) {
      next(err);
    }
  }

  async getCollectionBySlug(req, res, next) {
    try {
      const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).populate('products');
      if (!collection) {
        return res.status(404).json({ success: false, message: 'Collection not found' });
      }
      res.status(200).json({ success: true, data: collection });
    } catch (err) {
      next(err);
    }
  }

  // Admin CRUD
  async createCollection(req, res, next) {
    try {
      const collection = await Collection.create(req.body);
      res.status(201).json({ success: true, data: collection });
    } catch (err) {
      next(err);
    }
  }

  async updateCollection(req, res, next) {
    try {
      const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json({ success: true, data: collection });
    } catch (err) {
      next(err);
    }
  }

  async deleteCollection(req, res, next) {
    try {
      await Collection.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Collection deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CollectionController();
