const supabase = require('../supabaseClient');

/**
 * Middleware to check authentication for API requests
 * Expects Bearer token in Authorization header
 */
const checkApiAuth = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check authentication for page requests
 * Checks for session cookie and redirects to login if not authenticated
 */
const checkPageAuth = async (req, res, next) => {
  try {
    // Get the session from cookies
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // If this is an HTML page request, redirect to login
      if (req.accepts('html')) {
        return res.redirect('/index.html');
      }
      // For non-HTML requests, return 401
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Attach the session to the request object
    req.session = session;
    next();
  } catch (error) {
    console.error('Page auth middleware error:', error);
    if (req.accepts('html')) {
      return res.redirect('/index.html');
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  checkApiAuth,
  checkPageAuth
}; 