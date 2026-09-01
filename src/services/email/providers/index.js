const ConsoleEmailProvider = require('./consoleProvider');

const getEmailProvider = () => {
  const providerType = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

  switch (providerType) {
    case 'console':
    default:
      return new ConsoleEmailProvider();
  }
};

module.exports = getEmailProvider();
