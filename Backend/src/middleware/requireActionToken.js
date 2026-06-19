const jwt = require('jsonwebtoken');

module.exports = function requireActionToken(req, res, next) {
  const token = req.headers['x-action-token'];
  if (!token) {
    return res.status(401).json({
      error: 'Identity verification required for this action',
      requiresVerification: true,
    });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.scope !== 'sensitive-action') throw new Error('wrong scope');
    if (payload.userId !== req.user.userId)   throw new Error('user mismatch');
    next();
  } catch {
    return res.status(401).json({
      error: 'Verification expired — please verify your identity again',
      requiresVerification: true,
    });
  }
};
