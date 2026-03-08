const LocalStrategy = require('passport-local').Strategy;
const userModel = require('../models/user');

/**
 * Configure Passport.js with Local Strategy
 * @param {Object} passport - Passport instance
 */
module.exports = function(passport) {
  
  // ========================
  // LOCAL STRATEGY CONFIGURATION
  // ========================
  passport.use(
    new LocalStrategy(
      {
        // By default, LocalStrategy uses username and password
        // We'll customize it to accept either username OR email
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true // Allows us to pass the entire request
      },
      async (req, username, password, done) => {
        try {
          // Find user by username or email
          let user = await userModel.findUserByUsername(username);
          
          // If not found by username, try email
          if (!user) {
            user = await userModel.findUserByEmail(username);
          }
          
          // If user not found
          if (!user) {
            return done(null, false, { message: 'User not found' });
          }
          
          // Match password
          const isMatch = await userModel.comparePassword(password, user.password);
          
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
          }
          
          // User matched
          return done(null, user);
          
        } catch (err) {
          console.error('Passport Strategy Error:', err);
          return done(err);
        }
      }
    )
  );

  // ========================
  // SERIALIZE USER
  // ========================
  // Serialize user to store in session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // ========================
  // DESERIALIZE USER
  // ========================
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userModel.findUserById(id);
      done(null, user);
    } catch (err) {
      console.error('Deserialize Error:', err);
      done(err, null);
    }
  });
};

