const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

const verifyAuth = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const withAuth = (handler) => async (req, res) => {
  if (req.method === 'OPTIONS') return handler(req, res);
  const user = verifyAuth(req);
  if (!user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  req.user = user;
  return handler(req, res);
};

module.exports = { verifyAuth, withAuth };
