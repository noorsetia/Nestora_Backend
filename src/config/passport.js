const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('./env');
const authService = require('../services/authService');

const setupPassport = () => {
  if (env.googleClientId && env.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.googleClientId,
          clientSecret: env.googleClientSecret,
          callbackURL: env.googleCallbackUrl,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : null;
            const googleId = profile.id;
            const firstName = profile.name?.givenName || profile.displayName || 'Google User';
            const lastName = profile.name?.familyName || '';
            const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

            const result = await authService.loginWithGoogle({
              googleId,
              email,
              firstName,
              lastName,
              avatar,
            });

            if (result && result.user) {
              result.user.isNewUser = result.isNewUser;
              return done(null, result.user);
            }
            return done(null, false, { message: 'google_failed' });
          } catch (err) {
            if (err.code === 'ACCOUNT_SUSPENDED' || err.message?.includes('suspended')) {
              return done(null, false, { message: 'ACCOUNT_SUSPENDED' });
            }
            return done(err, null);
          }
        }
      )
    );
  }
};

module.exports = setupPassport;

