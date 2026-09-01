const spaceService = require('../services/spaceService');

class SpaceController {
  async getUserSpaces(req, res, next) {
    try {
      const spaces = await spaceService.getUserSpaces(req.user._id);
      res.status(200).json({ success: true, data: spaces });
    } catch (err) {
      next(err);
    }
  }

  async getSpaceById(req, res, next) {
    try {
      const space = await spaceService.getSpaceById(req.params.id, req.user._id);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async getSpaceByShareToken(req, res, next) {
    try {
      const space = await spaceService.getSpaceByShareToken(req.params.token);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async createSpace(req, res, next) {
    try {
      const space = await spaceService.createSpace(req.user._id, req.body);
      res.status(201).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async updateSpace(req, res, next) {
    try {
      const space = await spaceService.updateSpace(req.params.id, req.user._id, req.body);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async deleteSpace(req, res, next) {
    try {
      const result = await spaceService.deleteSpace(req.params.id, req.user._id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async addProductToSpace(req, res, next) {
    try {
      const space = await spaceService.addProductToSpace(req.params.id, req.user._id, req.body);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async removeProductFromSpace(req, res, next) {
    try {
      const space = await spaceService.removeProductFromSpace(
        req.params.id,
        req.user._id,
        req.params.productId
      );
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async toggleFavorite(req, res, next) {
    try {
      const space = await spaceService.toggleFavoriteSpace(req.params.id, req.user._id);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }

  async duplicateSpace(req, res, next) {
    try {
      const space = await spaceService.duplicateSpace(req.params.id, req.user._id, req.body.name);
      res.status(201).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SpaceController();
