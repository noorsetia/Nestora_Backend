const User = require('../models/User');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

const adminUserService = {
  listUsers: async ({ page = 1, limit = 20, search, status, role }) => {
    if (User.db.readyState === 1) {
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }
      if (role && role !== 'all') {
        query.role = role;
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      const numericPage = Math.max(1, parseInt(page, 10));
      const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (numericPage - 1) * numericLimit;

      const [users, totalUsers] = await Promise.all([
        User.find(query)
          .select('-password -verificationToken -verificationTokenExpire -resetPasswordToken -resetPasswordExpire')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(numericLimit),
        User.countDocuments(query),
      ]);

      // Attach order analytics (total orders & total spent) for each user
      const userIds = users.map((u) => u._id);
      let statsMap = {};

      if (Order.db.readyState === 1) {
        const orderStats = await Order.aggregate([
          { $match: { user: { $in: userIds }, 'payment.status': 'paid' } },
          {
            $group: {
              _id: '$user',
              totalSpent: { $sum: '$total' },
              orderCount: { $sum: 1 },
            },
          },
        ]);

        orderStats.forEach((stat) => {
          statsMap[stat._id.toString()] = stat;
        });
      }

      const enrichedUsers = users.map((u) => {
        const obj = u.toJSON();
        const userStat = statsMap[u._id.toString()] || { totalSpent: 0, orderCount: 0 };
        obj.totalSpent = userStat.totalSpent;
        obj.orderCount = userStat.orderCount;
        return obj;
      });

      return {
        users: enrichedUsers,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalUsers,
          totalPages: Math.ceil(totalUsers / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback for testing environments
    const { memoryUsers } = require('./authService');
    let list = Object.values(memoryUsers || {});

    if (status && status !== 'all') {
      list = list.filter((u) => u.status === status);
    }
    if (role && role !== 'all') {
      list = list.filter((u) => u.role === role);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.firstName && u.firstName.toLowerCase().includes(q)) ||
          (u.lastName && u.lastName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const totalUsers = list.length;
    const paginated = list.slice((numericPage - 1) * numericLimit, numericPage * numericLimit);

    const safeUsers = paginated.map((u) => {
      const copy = { ...u };
      delete copy.password;
      delete copy.verificationToken;
      delete copy.resetPasswordToken;
      copy.totalSpent = copy.totalSpent || 0;
      copy.orderCount = copy.orderCount || 0;
      return copy;
    });

    return {
      users: safeUsers,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / numericLimit) || 1,
      },
    };
  },

  getUserById: async (userId) => {
    if (User.db.readyState === 1) {
      const user = await User.findById(userId).select(
        '-password -verificationToken -verificationTokenExpire -resetPasswordToken -resetPasswordExpire'
      );

      if (!user) {
        const error = new Error('Customer user account not found.');
        error.statusCode = 404;
        throw error;
      }

      const userOrders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20);

      const totalSpentResult = await Order.aggregate([
        { $match: { user: user._id, 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);

      const totalSpent = totalSpentResult[0]?.total || 0;

      return {
        user: user.toJSON(),
        orders: userOrders,
        totalSpent,
        totalOrders: userOrders.length,
      };
    }

    // Memory Fallback
    const { memoryUsers } = require('./authService');
    const user = memoryUsers[userId] || Object.values(memoryUsers).find((u) => u._id?.toString() === userId || u.id === userId);

    if (!user) {
      const error = new Error('Customer user account not found.');
      error.statusCode = 404;
      throw error;
    }

    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.verificationToken;
    delete safeUser.resetPasswordToken;

    return {
      user: safeUser,
      orders: [],
      totalSpent: 0,
      totalOrders: 0,
    };
  },

  updateUserStatus: async (userId, status, adminUser) => {
    if (!['active', 'suspended'].includes(status)) {
      const error = new Error('Invalid status. Status must be "active" or "suspended".');
      error.statusCode = 400;
      throw error;
    }

    const isDb = User.db.readyState === 1;
    let targetUser = null;

    if (isDb) {
      targetUser = await User.findById(userId);
    } else {
      const { memoryUsers } = require('./authService');
      targetUser = memoryUsers[userId] || Object.values(memoryUsers).find((u) => u._id?.toString() === userId || u.id === userId);
    }

    if (!targetUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const targetIdStr = targetUser._id ? targetUser._id.toString() : targetUser.id;
    const adminIdStr = adminUser._id ? adminUser._id.toString() : adminUser.id;

    if (targetIdStr === adminIdStr) {
      const error = new Error('You cannot suspend your own account.');
      error.statusCode = 400;
      throw error;
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;

    if (isDb) {
      await targetUser.save();

      await AuditLog.create({
        user: adminUser._id,
        action: 'UPDATE_USER_STATUS',
        entity: 'User',
        entityId: targetUser._id.toString(),
        metadata: {
          targetUserEmail: targetUser.email,
          oldStatus,
          newStatus: status,
        },
      });
      return targetUser.toJSON();
    }

    const safeUser = { ...targetUser };
    delete safeUser.password;
    return safeUser;
  },

  updateUserRole: async (userId, newRole, adminUser) => {
    if (!['user', 'admin', 'superadmin'].includes(newRole)) {
      const error = new Error('Invalid role specified.');
      error.statusCode = 400;
      throw error;
    }

    // Role Enforcement Rule: Only superadmin can manage role assignments!
    if (adminUser.role !== 'superadmin') {
      const error = new Error('Access denied: Only Superadmin can change user administrative roles.');
      error.statusCode = 403;
      error.code = 'SUPERADMIN_REQUIRED';
      throw error;
    }

    const isDb = User.db.readyState === 1;
    let targetUser = null;

    if (isDb) {
      targetUser = await User.findById(userId);
    } else {
      const { memoryUsers } = require('./authService');
      targetUser = memoryUsers[userId] || Object.values(memoryUsers).find((u) => u._id?.toString() === userId || u.id === userId);
    }

    if (!targetUser) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const targetIdStr = targetUser._id ? targetUser._id.toString() : targetUser.id;
    const adminIdStr = adminUser._id ? adminUser._id.toString() : adminUser.id;

    if (targetIdStr === adminIdStr) {
      const error = new Error('You cannot change your own role.');
      error.statusCode = 400;
      throw error;
    }

    const oldRole = targetUser.role;
    targetUser.role = newRole;

    if (isDb) {
      await targetUser.save();

      await AuditLog.create({
        user: adminUser._id,
        action: 'UPDATE_USER_ROLE',
        entity: 'User',
        entityId: targetUser._id.toString(),
        metadata: {
          targetUserEmail: targetUser.email,
          oldRole,
          newRole,
        },
      });
      return targetUser.toJSON();
    }

    const safeUser = { ...targetUser };
    delete safeUser.password;
    return safeUser;
  },
};

module.exports = adminUserService;
