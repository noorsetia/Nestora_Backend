const RoomSet = require('../models/RoomSet');

class RoomSetController {
  async getRoomSets(req, res, next) {
    try {
      const roomSets = await RoomSet.find({ isActive: true }).populate('hotspots.product');
      res.status(200).json({ success: true, data: roomSets });
    } catch (err) {
      next(err);
    }
  }

  async getRoomSetBySlug(req, res, next) {
    try {
      const roomSet = await RoomSet.findOne({ slug: req.params.slug, isActive: true }).populate('hotspots.product');
      if (!roomSet) {
        return res.status(404).json({ success: false, message: 'Room set not found' });
      }
      res.status(200).json({ success: true, data: roomSet });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RoomSetController();
