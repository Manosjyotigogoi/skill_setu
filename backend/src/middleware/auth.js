const { verifyToken } = require('../utils/token');
const User = require('../models/User');

function getTokenFromRequest(req) {
  const cookieName = process.env.COOKIE_NAME || 'skillsetu_token';
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

async function protect(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ message: 'Session is no longer valid. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { protect, restrictTo };
