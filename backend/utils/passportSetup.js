const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Your Mongoose User model

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Set in your env variables
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g., '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find existing user
        let existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          // User exists, proceed
          return done(null, existingUser);
        }

        // Create new user if doesn't exist
        const newUser = new User({
          googleId: profile.id,
          displayName: profile.displayName,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          email: profile.emails?.[0]?.value || '',
          photo: profile.photos?.[0]?.value || '',
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
