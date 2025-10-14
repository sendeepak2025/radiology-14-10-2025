const jwt = require('jsonwebtoken')

module.exports = function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing Authorization header' })
  }
  const token = auth.substring('Bearer '.length)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = payload
    next()
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}