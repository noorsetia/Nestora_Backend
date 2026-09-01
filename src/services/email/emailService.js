const emailProvider = require('./providers');
const emailTemplates = require('./emailTemplates');
const User = require('../../models/User');
const logger = require('../../config/logger');

class EmailService {
  /**
   * Safe email sender with retry logic and exception isolation
   */
  async sendEmailWithRetry({ to, subject, html, text }, retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const result = await emailProvider.send({ to, subject, html, text });
        return result;
      } catch (err) {
        attempt++;
        logger.warn(`[EmailService Attempt ${attempt} Failed]: ${err.message}`, { to, subject });
        if (attempt > retries) {
          logger.error(`[EmailService Max Retries Exceeded] Failed to send email to ${to}`);
          return { success: false, error: err.message };
        }
        // Small backoff before retry
        await new Promise((res) => setTimeout(res, 500 * attempt));
      }
    }
  }

  /**
   * Helper to check user email preference
   */
  async checkPreference(userId, category) {
    try {
      if (User.db.readyState !== 1) return true;
      const user = await User.findById(userId);
      if (!user || !user.notificationPreferences) return true;
      return user.notificationPreferences.email[category] !== false;
    } catch (err) {
      return true; // Default to send on error
    }
  }

  // 1. Welcome Email
  async sendWelcomeEmail(user) {
    try {
      const template = emailTemplates.welcome({ firstName: user.firstName });
      return await this.sendEmailWithRetry({ to: user.email, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendWelcomeEmail]: ${err.message}`);
    }
  }

  // 2. Order Confirmation Email
  async sendOrderConfirmationEmail({ user, order }) {
    try {
      const userEmail = user.email || order.shippingAddress.email;
      if (!userEmail) return;

      const template = emailTemplates.orderConfirmation({
        orderNumber: order.orderNumber,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
      });

      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendOrderConfirmationEmail]: ${err.message}`);
    }
  }

  // 3. Shipping Update Email
  async sendShippingUpdateEmail({ userEmail, orderNumber, trackingId, estimatedDelivery }) {
    try {
      const template = emailTemplates.shippingUpdate({
        orderNumber,
        trackingId,
        estimatedDelivery,
      });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendShippingUpdateEmail]: ${err.message}`);
    }
  }

  // 4. Delivery Confirmation Email
  async sendDeliveryConfirmationEmail({ userEmail, orderNumber }) {
    try {
      const template = emailTemplates.deliveryConfirmation({ orderNumber });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendDeliveryConfirmationEmail]: ${err.message}`);
    }
  }

  // 5. Order Cancellation Email
  async sendCancellationEmail({ userEmail, orderNumber, reason }) {
    try {
      const template = emailTemplates.orderCancellation({ orderNumber, reason });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendCancellationEmail]: ${err.message}`);
    }
  }

  // 6. Refund Email
  async sendRefundEmail({ userEmail, orderNumber, amount }) {
    try {
      const template = emailTemplates.refundSuccess({ orderNumber, amount });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendRefundEmail]: ${err.message}`);
    }
  }

  // 7. Review Moderation Email
  async sendReviewModerationEmail({ userEmail, productTitle, status }) {
    try {
      const template = emailTemplates.reviewModeration({ productTitle, status });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendReviewModerationEmail]: ${err.message}`);
    }
  }

  // 8. Promotional Email (Checks preferences)
  async sendPromotionalEmail({ userId, userEmail, title, message, ctaLink }) {
    try {
      if (userId) {
        const allowed = await this.checkPreference(userId, 'promotions');
        if (!allowed) {
          logger.info(`[EmailService] Promotional email skipped for user ${userId} per opt-out preference.`);
          return;
        }
      }

      const template = emailTemplates.promotion({ title, message, ctaLink });
      return await this.sendEmailWithRetry({ to: userEmail, ...template });
    } catch (err) {
      logger.error(`[EmailService Error sendPromotionalEmail]: ${err.message}`);
    }
  }
}

module.exports = new EmailService();
