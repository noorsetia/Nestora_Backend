const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const memoryAuditLogs = [];

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'jwt',
  'apikey',
  'secret',
  'razorpaysecret',
  'razorpaysignature',
  'privatetoken',
  'creditcard',
];

const sanitizeMetadata = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));
};

const auditLogService = {
  memoryAuditLogs,
  sanitizeMetadata,

  createLog: async ({ user, action, entity, entityId = '', metadata = {} }) => {
    const cleanMeta = sanitizeMetadata(metadata);
    const isDb = AuditLog.db.readyState === 1;

    if (isDb) {
      const log = await AuditLog.create({
        user: user ? (user._id || user) : null,
        action,
        entity,
        entityId: String(entityId),
        metadata: cleanMeta,
      });
      return log;
    }

    const log = {
      _id: new mongoose.Types.ObjectId().toString(),
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user: user
        ? typeof user === 'object'
          ? { _id: user._id || user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
          : user
        : null,
      action,
      entity,
      entityId: String(entityId),
      metadata: cleanMeta,
      createdAt: new Date(),
    };
    memoryAuditLogs.push(log);
    return log;
  },

  getLogs: async ({
    page = 1,
    limit = 25,
    action,
    entity,
    user,
    startDate,
    endDate,
    sort = 'newest',
    search,
  } = {}) => {
    const isDb = AuditLog.db.readyState === 1;
    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    // Date range validation
    let start, end;
    if (startDate || endDate) {
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          const error = new Error('Invalid date format for startDate or endDate.');
          error.statusCode = 400;
          throw error;
        }
        if (start > end) {
          const error = new Error('Start date cannot be after end date.');
          error.statusCode = 400;
          throw error;
        }
        end.setHours(23, 59, 59, 999);
      } else if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          const error = new Error('Invalid startDate format.');
          error.statusCode = 400;
          throw error;
        }
      } else if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          const error = new Error('Invalid endDate format.');
          error.statusCode = 400;
          throw error;
        }
        end.setHours(23, 59, 59, 999);
      }
    }

    if (isDb) {
      const query = {};

      if (action && action !== 'all') {
        query.action = action;
      }
      if (entity && entity !== 'all') {
        query.entity = entity;
      }
      if (user && user !== 'all') {
        if (isValidObjectId(user)) {
          query.user = user;
        }
      }

      if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = start;
        if (end) query.createdAt.$lte = end;
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [{ action: searchRegex }, { entity: searchRegex }, { entityId: searchRegex }];
      }

      const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

      const [logs, totalLogs] = await Promise.all([
        AuditLog.find(query)
          .populate('user', 'firstName lastName email role')
          .sort(sortOrder)
          .skip(skip)
          .limit(numericLimit),
        AuditLog.countDocuments(query),
      ]);

      const sanitizedLogs = logs.map((log) => {
        const obj = log.toObject();
        obj.metadata = sanitizeMetadata(obj.metadata);
        return obj;
      });

      return {
        logs: sanitizedLogs,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalLogs,
          totalPages: Math.ceil(totalLogs / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback
    let list = [...memoryAuditLogs];

    if (action && action !== 'all') {
      list = list.filter((l) => l.action === action);
    }
    if (entity && entity !== 'all') {
      list = list.filter((l) => l.entity === entity);
    }
    if (user && user !== 'all') {
      list = list.filter((l) => (l.user?._id || l.user)?.toString() === user.toString());
    }
    if (start) {
      list = list.filter((l) => new Date(l.createdAt) >= start);
    }
    if (end) {
      list = list.filter((l) => new Date(l.createdAt) <= end);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.action?.toLowerCase().includes(q) ||
          l.entity?.toLowerCase().includes(q) ||
          l.entityId?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sort === 'oldest' ? tA - tB : tB - tA;
    });

    const totalLogs = list.length;
    const paginated = list.slice(skip, skip + numericLimit).map((l) => ({
      ...l,
      metadata: sanitizeMetadata(l.metadata),
    }));

    return {
      logs: paginated,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        totalLogs,
        totalPages: Math.ceil(totalLogs / numericLimit) || 1,
      },
    };
  },

  getLogById: async (id) => {
    const isDb = AuditLog.db.readyState === 1;

    if (isDb) {
      if (!isValidObjectId(id)) {
        const error = new Error('Invalid audit log identifier.');
        error.statusCode = 400;
        throw error;
      }

      const log = await AuditLog.findById(id).populate('user', 'firstName lastName email role');
      if (!log) {
        const error = new Error('Audit log entry not found.');
        error.statusCode = 404;
        throw error;
      }

      const obj = log.toObject();
      obj.metadata = sanitizeMetadata(obj.metadata);
      return obj;
    }

    // Memory Fallback
    const log = memoryAuditLogs.find((l) => (l._id?.toString() || l.id?.toString()) === id.toString());
    if (!log) {
      const error = new Error('Audit log entry not found.');
      error.statusCode = 404;
      throw error;
    }

    return {
      ...log,
      metadata: sanitizeMetadata(log.metadata),
    };
  },
};

module.exports = auditLogService;
