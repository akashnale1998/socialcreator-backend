const Passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const User = require('../models/User');

const configurePassport = () => {
  // Google Strategy
  Passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
        callbackURL: '/api/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by googleId
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if user exists by email (Account Linking)
          const email = profile.emails[0].value;
          user = await User.findOne({ email });

          if (user) {
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }

          // Create new user if not found
          const referral_code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          user = await User.create({
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            referral_code,
            is_verified: true // OAuth users are verified
          });

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  // GitHub Strategy
  Passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID || 'dummy_id',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
        callbackURL: '/api/auth/github/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ githubId: profile.id });

          if (user) {
            return done(null, user);
          }

          const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
          user = await User.findOne({ email });

          if (user) {
            user.githubId = profile.id;
            await user.save();
            return done(null, user);
          }

          const referral_code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          user = await User.create({
            name: profile.displayName || profile.username,
            email: email,
            githubId: profile.id,
            referral_code,
            is_verified: true
          });

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  // Twitter Strategy
  Passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY || 'dummy_key',
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET || 'dummy_secret',
        callbackURL: '/api/auth/twitter/callback',
        includeEmail: true,
        proxy: true
      },
      async (token, tokenSecret, profile, done) => {
        try {
          let user = await User.findOne({ twitterId: profile.id });

          if (user) {
            return done(null, user);
          }

          const email = profile.emails[0].value;
          user = await User.findOne({ email });

          if (user) {
            user.twitterId = profile.id;
            await user.save();
            return done(null, user);
          }

          const referral_code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          user = await User.create({
            name: profile.displayName,
            email: email,
            twitterId: profile.id,
            referral_code,
            is_verified: true
          });

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
};

module.exports = configurePassport;
