const logger = require('../../../config/logger');

class ConsoleEmailProvider {
  async send({ to, subject, html, text, from }) {
    const sender = from || 'Nestora Atelier <no-reply@nestora.com>';
    logger.info(`[ConsoleEmailProvider] Email dispatch to: ${to}`, {
      to,
      subject,
      from: sender,
    });
    console.log(`
==================================================
✉️  NESTORA EMAIL DISPATCH (DEV CONSOLE PROVIDER)
--------------------------------------------------
To: ${to}
From: ${sender}
Subject: ${subject}
--------------------------------------------------
${text || html.replace(/<[^>]+>/g, '')}
==================================================
    `);
    return { success: true, messageId: `msg_console_${Date.now()}` };
  }
}

module.exports = ConsoleEmailProvider;
