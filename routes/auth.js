const express = require('express');
const passport = require('passport');
const userModel = require('../models/user');

const router = express.Router();

// ========================
// VALIDATION FUNCTIONS
// ========================

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate username (alphanumeric and underscores, 3-20 chars)
const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Validate password (min 6 characters)
const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Validate registration input
const validateRegisterInput = (username, email, password) => {
  const errors = [];
  
  if (!username || !validateUsername(username)) {
    errors.push({ 
      field: 'username', 
      message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
    });
  }
  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  if (!validatePassword(password)) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  }
  
  return errors;
};

// ========================
// AUTH ROUTES
// ========================

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    const validationErrors = validateRegisterInput(username, email, password);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        validationErrors 
      });
    }
    
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    // Check if username already exists
    const existingUsername = await userModel.findUserByUsername(trimmedUsername);
    if (existingUsername) {
      return res.status(400).json({ 
        error: 'Username already exists',
        field: 'username'
      });
    }
    
    // Check if email already exists
    const existingEmail = await userModel.findUserByEmail(trimmedEmail);
    if (existingEmail) {
      return res.status(400).json({ 
        error: 'Email already exists',
        field: 'email'
      });
    }
    
    // Create new user
    const newUser = await userModel.createUser({
      username: trimmedUsername,
      email: trimmedEmail,
      password: trimmedPassword
    });
    
    // Automatically log in after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error('Login after registration error:', err);
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }
      
      // Return user info (excluding password)
      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        }
      });
    });
    
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /auth/login
 * Login user with username or email
 */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    // If user not found or password incorrect
    if (!user) {
      return res.status(401).json({ 
        error: info.message || 'Authentication failed',
        field: 'credentials'
      });
    }
    
    // Establish login session
    req.login(user, (err) => {
      if (err) {
        console.error('Session error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Return user info (excluding password)
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  })(req, res, next);
});

/**
 * POST /auth/logout
 * Logout current user and destroy session
 */
router.post('/logout', (req, res) => {
  // First logout the user from Passport
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
    
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to destroy session' 
        });
      }
      
      // Return success response
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

/**
 * GET /auth/current
 * Get current authenticated user
 */
router.get('/current', (req, res) => {
  if (req.isAuthenticated()) {
    // User is logged in, return user info
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      }
    });
  } else {
    // User is not authenticated
    res.json({
      authenticated: false,
      user: null
    });
  }
});

/**
 * GET /auth/me
 * Get authenticated user info - requires authentication
 * Returns: { id, username, email }
 * Returns 401 if not authenticated
 */
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    });
  } else {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated'
    });
  }
});

module.exports = router;

