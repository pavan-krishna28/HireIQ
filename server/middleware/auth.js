const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.recruiter = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const sessionMiddleware = (req, res, next) => {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'Session token required' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
};

module.exports = { authMiddleware, sessionMiddleware };
