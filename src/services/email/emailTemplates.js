function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const baseLayout = (contentTitle, contentBody, ctaText = '', ctaUrl = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDFBF7; color: #1C1A17; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #FFFFFF; border: 1px solid #EBE7DF; border-radius: 8px; overflow: hidden; }
    .header { background: #1C1A17; padding: 30px; text-align: center; color: #FDFBF7; }
    .header h1 { font-family: Georgia, serif; font-size: 24px; font-weight: normal; letter-spacing: 2px; margin: 0; }
    .header p { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #B86B49; margin-top: 6px; }
    .content { padding: 40px 30px; }
    .content h2 { font-family: Georgia, serif; font-size: 20px; font-weight: normal; color: #1C1A17; margin-top: 0; }
    .content p { font-size: 14px; line-height: 1.6; color: #5C564F; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #1C1A17; color: #FDFBF7 !important; padding: 14px 28px; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px; display: inline-block; }
    .footer { background: #FAF8F5; padding: 20px 30px; border-top: 1px solid #EBE7DF; text-align: center; font-size: 12px; color: #8C867E; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NESTORA</h1>
      <p>Design your space. Live your story.</p>
    </div>
    <div class="content">
      <h2>${escapeHtml(contentTitle)}</h2>
      ${contentBody}
      ${
        ctaText && ctaUrl
          ? `<div class="button-container"><a href="${escapeHtml(ctaUrl)}" class="button">${escapeHtml(ctaText)}</a></div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Nestora Atelier Ltd. All rights reserved.</p>
      <p>Need support? Contact our client concierge at support@nestora.com</p>
    </div>
  </div>
</body>
</html>
`;

const emailTemplates = {
  welcome: ({ firstName }) => {
    const title = `Welcome to Nestora, ${firstName}`;
    const body = `
      <p>We are delighted to welcome you to the Nestora community. Our mission is to combine architectural aesthetics, refined craftsmanship, and personalized interior design into a seamless discovery experience.</p>
      <p>Explore our curated collections, interactive room planning tools, and personalized recommendations crafted specifically for your home.</p>
    `;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return {
      subject: 'Welcome to Nestora — Design your space. Live your story.',
      html: baseLayout(title, body, 'Explore Nestora', `${clientUrl}/products`),
      text: `Welcome to Nestora, ${firstName}! Discover curated furniture and room design packages at ${clientUrl}.`,
    };
  },

  orderConfirmation: ({ orderNumber, items, total, shippingAddress }) => {
    const title = `Order Confirmation #${orderNumber}`;
    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total);
    const itemListHtml = items
      .map(
        (i) => `
        <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #F3EFEA;">
          <span>${escapeHtml(i.name)} (x${i.quantity})</span>
          <strong>₹${(i.price * i.quantity).toLocaleString('en-IN')}</strong>
        </div>
      `
      )
      .join('');

    const body = `
      <p>Thank you for your purchase. We have received your order <strong>#${escapeHtml(orderNumber)}</strong> and our atelier is preparing your pieces.</p>
      <div style="margin: 20px 0; background: #FAF8F5; padding: 15px; border-radius: 6px;">
        <h4 style="margin-top:0;">Order Items</h4>
        ${itemListHtml}
        <div style="display:flex; justify-content:space-between; margin-top: 15px; font-size: 16px; font-weight: bold;">
          <span>Total Amount</span>
          <span>${formattedTotal}</span>
        </div>
      </div>
      <p><strong>Shipping Address:</strong><br>${escapeHtml(shippingAddress.fullName)}, ${escapeHtml(shippingAddress.addressLine1)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.postalCode)}</p>
    `;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return {
      subject: `Order Confirmed: #${orderNumber} — Nestora`,
      html: baseLayout(title, body, 'Track Your Order', `${clientUrl}/account/orders`),
      text: `Order Confirmation #${orderNumber}. Total: ${formattedTotal}. Track your order at ${clientUrl}/account/orders.`,
    };
  },

  shippingUpdate: ({ orderNumber, trackingId, estimatedDelivery }) => {
    const title = `Your Order #${orderNumber} Has Shipped`;
    const body = `
      <p>Great news! Your Nestora pieces are officially on their way.</p>
      <p><strong>Tracking Number:</strong> ${escapeHtml(trackingId || 'NST-TRK-' + Date.now().toString().slice(-6))}</p>
      ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${escapeHtml(estimatedDelivery)}</p>` : ''}
    `;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return {
      subject: `Shipped: Order #${orderNumber} is on its way — Nestora`,
      html: baseLayout(title, body, 'Track Order', `${clientUrl}/account/orders`),
      text: `Order #${orderNumber} has shipped. Track at ${clientUrl}/account/orders.`,
    };
  },

  deliveryConfirmation: ({ orderNumber }) => {
    const title = `Delivered: Order #${orderNumber}`;
    const body = `
      <p>Your Nestora items for order <strong>#${escapeHtml(orderNumber)}</strong> have been successfully delivered.</p>
      <p>We hope these pieces enrich your living space. We would love to hear your thoughts on your new furniture.</p>
    `;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return {
      subject: `Delivered: Your Nestora pieces have arrived — #${orderNumber}`,
      html: baseLayout(title, body, 'Review Purchases', `${clientUrl}/account/orders`),
      text: `Order #${orderNumber} has been delivered. Review your items at ${clientUrl}/account/orders.`,
    };
  },

  orderCancellation: ({ orderNumber, reason }) => {
    const title = `Order Cancelled: #${orderNumber}`;
    const body = `
      <p>Your order <strong>#${escapeHtml(orderNumber)}</strong> has been cancelled as requested.</p>
      ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
      <p>If payment was collected, a full refund will be processed back to your original payment method within 3-5 business days.</p>
    `;
    return {
      subject: `Cancelled: Order #${orderNumber} — Nestora`,
      html: baseLayout(title, body),
      text: `Order #${orderNumber} has been cancelled.`,
    };
  },

  refundSuccess: ({ orderNumber, amount }) => {
    const title = `Refund Processed: #${orderNumber}`;
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    const body = `
      <p>A refund of <strong>${formattedAmount}</strong> for order <strong>#${escapeHtml(orderNumber)}</strong> has been successfully processed.</p>
      <p>Please allow 3-5 business days for the funds to reflect in your banking account.</p>
    `;
    return {
      subject: `Refund Confirmed: ${formattedAmount} for Order #${orderNumber}`,
      html: baseLayout(title, body),
      text: `Refund of ${formattedAmount} for order #${orderNumber} has been processed.`,
    };
  },

  reviewModeration: ({ productTitle, status }) => {
    const isApproved = status === 'approved';
    const title = isApproved ? 'Your Review is Published' : 'Review Moderation Update';
    const body = isApproved
      ? `<p>Thank you! Your customer review for <strong>${escapeHtml(productTitle)}</strong> has been approved and is now live on Nestora.</p>`
      : `<p>Your review for <strong>${escapeHtml(productTitle)}</strong> was reviewed by our moderation team. Unfortunately, it did not meet our community guidelines.</p>`;
    return {
      subject: `Review Update for ${productTitle} — Nestora`,
      html: baseLayout(title, body),
      text: `Review update for ${productTitle}: ${status}.`,
    };
  },

  promotion: ({ title, message, ctaLink }) => {
    const body = `<p>${escapeHtml(message)}</p>`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return {
      subject: `${title} — Nestora Exclusive`,
      html: baseLayout(title, body, 'Discover Collection', ctaLink || `${clientUrl}/products`),
      text: `${title}: ${message}`,
    };
  },
};

module.exports = emailTemplates;
