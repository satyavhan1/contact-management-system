/**
 * Authentication Middleware
 * Protects routes from unauthenticated access
 */

/**
 * Middleware to check if user is authenticated
 * If not authenticated, returns 401 Unauthorized (for API routes)
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // User is authenticated, proceed to next middleware/route
    return next();
  }
  
  // User is not authenticated
  res.status(401).json({ 
    error: 'Unauthorized',
    message: 'Please login to access this resource' 
  });
}

/**
 * Middleware to check if user is authenticated
 * If not authenticated, redirects to /login (for page routes)
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/login');
}

/**
 * Middleware to check if user is NOT authenticated
 * Use for routes like login/register when already logged in users should be redirected
 */
function isGuest(req, res, next) {
  if (!req.isAuthenticated()) {
    // User is not authenticated, proceed
    return next();
  }
  
  // User is already authenticated, redirect or return error
  res.status(400).json({ 
    error: 'Already logged in',
    message: 'You are already logged in' 
  });
}

module.exports = {
  isAuthenticated,
  ensureAuthenticated,
  isGuest
};

