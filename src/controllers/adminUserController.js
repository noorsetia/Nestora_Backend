const adminUserService = require('../services/adminUserService');

const adminUserController = {
  getUsers: async (req, res, next) => {
    try {
      const data = await adminUserService.listUsers(req.query);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const data = await adminUserService.getUserById(req.params.id);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const updatedUser = await adminUserService.updateUserStatus(req.params.id, status, req.user);
      res.json({
        success: true,
        message: `User status changed to ${status}.`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  updateRole: async (req, res, next) => {
    try {
      const { role } = req.body;
      const updatedUser = await adminUserService.updateUserRole(req.params.id, role, req.user);
      res.json({
        success: true,
        message: `User role updated to ${role}.`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminUserController;
